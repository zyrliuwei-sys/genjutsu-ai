import { and, desc, eq, gt, isNull, notInArray, notLike } from 'drizzle-orm';

import { db } from '@/core/db';
import { runD1AtomicBatch } from '@/core/db/d1';
import { envConfigs } from '@/config';
import { aiTask, credit } from '@/config/db/schema';
import {
  consume,
  prepareTaskConsumption,
  revoke,
} from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

/**
 * Create an AI task with optional credit consumption.
 */
export async function createTask(params: {
  id?: string;
  userId: string;
  mediaType: string;
  provider: string;
  model: string;
  prompt: string;
  costCredits?: number;
  options?: any;
}): Promise<any> {
  const { userId, mediaType, provider, model, prompt, costCredits, options } =
    params;

  if (envConfigs.database_provider === 'd1') {
    const id = params.id || getUuid();
    const plan = costCredits
      ? await prepareTaskConsumption({
          userId,
          credits: costCredits,
          taskId: id,
          description: `AI ${mediaType} generation`,
        })
      : undefined;
    const data = {
      id,
      userId,
      mediaType,
      provider,
      model,
      prompt,
      status: AITaskStatus.PENDING,
      costCredits: costCredits || 0,
      options:
        typeof options === 'string'
          ? options
          : options === undefined
            ? null
            : JSON.stringify(options),
      taskInfo: plan
        ? JSON.stringify({ creditId: plan.consumedCredit.id })
        : null,
    };
    await runD1AtomicBatch([
      db().insert(aiTask).values(data),
      ...(plan
        ? [...plan.updates, db().insert(credit).values(plan.consumedCredit)]
        : []),
    ]);
    return findTask(id);
  }

  return db().transaction(async (tx: any) => {
    // 1. Insert task
    const taskData: any = {
      id: params.id || getUuid(),
      userId,
      mediaType,
      provider,
      model,
      prompt,
      status: AITaskStatus.PENDING,
      costCredits: costCredits || 0,
      options:
        options === undefined || typeof options === 'string'
          ? (options ?? null)
          : JSON.stringify(options),
    };

    const [task] = await tx.insert(aiTask).values(taskData).returning();

    // 2. Consume credits if cost > 0
    if (costCredits && costCredits > 0) {
      const result = await consume({
        userId,
        credits: costCredits,
        scene: 'ai_task',
        description: `AI ${mediaType} generation`,
        metadata: JSON.stringify({ taskId: task.id }),
        tx,
      });

      if (!result.success) {
        throw new Error('Insufficient credits');
      }

      // Store consumed credit ID for potential revocation
      if (result.consumedCredit) {
        await tx
          .update(aiTask)
          .set({
            taskInfo: JSON.stringify({ creditId: result.consumedCredit.id }),
          })
          .where(eq(aiTask.id, task.id));
      }
    }

    return task;
  });
}

/** The task primary key is the durable submission claim, across workers. */
export async function createTaskOnce(
  params: Parameters<typeof createTask>[0] & { id: string }
) {
  try {
    return { task: await createTask(params), created: true };
  } catch (error) {
    const existing = await findTask(params.id);
    if (
      !existing ||
      existing.userId !== params.userId ||
      existing.model !== params.model
    )
      throw error;
    return { task: existing, created: false };
  }
}

/** Revoke is itself atomic/idempotent. Never swallow a database failure. */
export async function retryFailedRefund(taskId: string) {
  const task = await findTask(taskId);
  if (task?.status !== AITaskStatus.FAILED || !task.taskInfo) return;
  const info = JSON.parse(task.taskInfo as string);
  if (info.refundSettled) return;
  if (info.creditId) {
    await revoke(info.creditId);
    await db()
      .update(aiTask)
      .set({ taskInfo: JSON.stringify({ ...info, refundSettled: true }) })
      .where(
        and(
          eq(aiTask.id, taskId),
          eq(aiTask.status, AITaskStatus.FAILED),
          eq(aiTask.taskInfo, task.taskInfo)
        )
      );
  }
}

/**
 * Update task status. Revokes credits on failure.
 */
export async function updateTask(params: {
  taskId: string;
  status: AITaskStatus;
  taskResult?: any;
}) {
  const { taskId, status, taskResult } = params;

  const [task] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);

  if (!task) throw new Error('Task not found');

  // Update task
  const updateData: any = { status };
  if (taskResult) {
    updateData.taskResult = JSON.stringify(taskResult);
  }

  // A stale poll cannot overwrite a terminal decision. Same-state updates
  // are allowed for result archival retries.
  await db()
    .update(aiTask)
    .set(updateData)
    .where(
      and(
        eq(aiTask.id, taskId),
        status === task.status &&
          [
            AITaskStatus.SUCCESS,
            AITaskStatus.FAILED,
            AITaskStatus.CANCELED,
          ].includes(status)
          ? eq(aiTask.status, status)
          : notInArray(aiTask.status, [
              AITaskStatus.SUCCESS,
              AITaskStatus.FAILED,
              AITaskStatus.CANCELED,
            ])
      )
    );
  await retryFailedRefund(taskId);
}

/**
 * Record the provider-side task id (e.g. fal request_id) for later polling.
 */
export async function setProviderTaskId(
  taskId: string,
  providerTaskId: string
) {
  await db()
    .update(aiTask)
    .set({ taskId: providerTaskId })
    .where(eq(aiTask.id, taskId));
}

/**
 * Merge fields into a task's taskInfo JSON (keeps creditId for revocation).
 */
export async function mergeTaskInfo(
  taskId: string,
  patch: Record<string, unknown>
) {
  const task = await findTask(taskId);
  if (!task) throw new Error('Task not found');
  let info: Record<string, unknown> = {};
  try {
    info = task.taskInfo ? JSON.parse(task.taskInfo as string) : {};
  } catch {
    // Ignore parse errors
  }
  await db()
    .update(aiTask)
    .set({ taskInfo: JSON.stringify({ ...info, ...patch }) })
    .where(eq(aiTask.id, taskId));
}

/**
 * Atomically move a task from one status to another. Returns false if another
 * caller already moved it — use it to make multi-step pipelines idempotent.
 */
export async function claimTaskStatus(
  taskId: string,
  from: AITaskStatus,
  to: AITaskStatus
): Promise<boolean> {
  const rows = await db()
    .update(aiTask)
    .set({ status: to })
    .where(and(eq(aiTask.id, taskId), eq(aiTask.status, from)))
    .returning({ id: aiTask.id });
  return rows.length > 0;
}

/**
 * Get tasks for a user.
 */
export async function getTasks(params: {
  userId: string;
  mediaType?: string;
  status?: string;
  page?: number;
  limit?: number;
  refundPending?: boolean;
}) {
  const { userId, mediaType, status, page = 1, limit = 20 } = params;

  return db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        status ? eq(aiTask.status, status) : undefined,
        params.refundPending
          ? notLike(aiTask.taskInfo, '%"refundSettled":true%')
          : undefined,
        params.refundPending ? gt(aiTask.costCredits, 0) : undefined,
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

/**
 * Find task by ID.
 */
export async function findTask(taskId: string) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);
  return result;
}
