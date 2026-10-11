import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Film, ImagePlus, LoaderCircle, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { singleVideoProduct } from '@/config/pricing';
import {
  getStudioModel,
  STUDIO_ASPECTS,
  studioCredits,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS,
  type StudioOptions,
} from '@/config/studio-models';
import { apiGet, apiPost, apiUploadImages } from '@/lib/api-client';
import { currentPathWithQuery } from '@/lib/redirect';
import {
  loadTextVideoDraft,
  saveTextVideoDraft,
  type FrameAsset,
  type TextVideoDraft,
} from '@/lib/text-video-draft';
import { Pricing } from '@/blocks/pricing';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export type TextVideoCopy = Record<
  | 'title'
  | 'intro'
  | 'prompt'
  | 'placeholder'
  | 'duration'
  | 'size'
  | 'quality'
  | 'audio'
  | 'generate'
  | 'working'
  | 'empty'
  | 'result'
  | 'download'
  | 'newVideo'
  | 'unavailable'
  | 'refund'
  | 'retry'
  | 'saveError'
  | 'history'
  | 'failed'
  | 'restore',
  string
> & {
  price: (price: string) => string;
  firstFrame: string;
  lastFrame: string;
  frameHint: string;
  uploadFrame: string;
  removeFrame: string;
  invalidFrame: string;
  missingFirst: string;
};
type Task = {
  id: string;
  status: string;
  model: string;
  prompt: string;
  url: string | null;
  error: string | null;
  archivePending?: boolean;
};
type Draft = TextVideoDraft;
const DRAFT_KEY = 'seedance-text-draft-v1';
const DEFAULTS: StudioOptions = {
  duration: 5,
  aspect: '9:16',
  resolution: '480p',
};

export function TextVideoGenerator({
  copy,
  locale,
}: {
  copy: TextVideoCopy;
  locale: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const owner = session?.user.id;
  const [frames, setFrames] = useState<[FrameAsset | null, FrameAsset | null]>([
    null,
    null,
  ]);
  const [validating, setValidating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<StudioOptions>(DEFAULTS);
  const [requestId, setRequestId] = useState<string>();
  const [taskId, setTaskId] = useState<string>();
  const [restored, setRestored] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [checking, setChecking] = useState(false);
  const failedShown = useRef<string | undefined>(undefined);
  const generationLock = useRef(false);
  const cost = studioCredits(getStudioModel('seedance-2')!, options);
  const product = singleVideoProduct(options);
  const price = `$${(product.priceInCents / 100).toFixed(2)}`;

  async function persist(next: Partial<Draft> = {}) {
    await saveTextVideoDraft({
      owner,
      prompt,
      options,
      requestId,
      taskId,
      frames,
      savedAt: Date.now(),
      ...next,
    });
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        owner,
        prompt,
        options,
        requestId,
        taskId,
        savedAt: Date.now(),
        ...next,
      })
    );
  }
  useEffect(() => {
    if (sessionPending) return;
    setRestored(false);
    let cancelled = false;
    (async () => {
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        const draft: Draft | undefined =
          (await loadTextVideoDraft(owner)) ??
          (raw ? { ...JSON.parse(raw), frames: [null, null] } : undefined);
        if (cancelled) return;
        if (
          draft &&
          (!draft.owner || draft.owner === owner) &&
          Date.now() - draft.savedAt < 86400000
        ) {
          setPrompt(draft.prompt.slice(0, 2000));
          setOptions({
            duration: VIDEO_DURATIONS.includes(draft.options.duration)
              ? draft.options.duration
              : 5,
            aspect: STUDIO_ASPECTS.includes(draft.options.aspect)
              ? draft.options.aspect
              : '9:16',
            resolution: VIDEO_RESOLUTIONS.includes(draft.options.resolution)
              ? draft.options.resolution
              : '480p',
          });
          setRequestId(draft.requestId);
          setTaskId(draft.taskId);
          setFrames(draft.frames ?? [null, null]);
        } else {
          setPrompt('');
          setOptions(DEFAULTS);
          setRequestId(undefined);
          setTaskId(undefined);
          setFrames([null, null]);
        }
      } catch {
        /* A blocked browser store must not break rendering. */
      }
      if (!cancelled) setRestored(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, sessionPending]);
  useEffect(() => {
    if (restored) {
      try {
        void persist().catch(() => undefined);
      } catch {
        /* Explicit navigation reports save failures. */
      }
    }
  }, [restored, prompt, options, requestId, taskId, frames]);

  const readiness = useQuery({
    queryKey: ['text-video-ready'],
    queryFn: () => apiGet<{ ready: boolean }>('/api/studio/generate'),
    staleTime: 60000,
  });
  const balance = useQuery({
    queryKey: ['credits'],
    queryFn: () =>
      apiGet<{ balance: number; hasPaidOrder: boolean }>('/api/credits'),
    enabled: Boolean(owner),
  });
  const history = useQuery({
    queryKey: ['text-video-history', owner],
    queryFn: () => apiGet<Task[]>('/api/studio/tasks'),
    enabled: Boolean(owner),
  });
  const task = useQuery({
    queryKey: ['text-video-task', owner, taskId],
    queryFn: () =>
      apiGet<Task>(`/api/studio/task?id=${encodeURIComponent(taskId!)}`),
    enabled: Boolean(owner && taskId),
    refetchInterval: (query) =>
      query.state.data &&
      ['success', 'failed'].includes(query.state.data.status)
        ? false
        : 5000,
    retry: 2,
  });
  const running = Boolean(
    taskId && (!task.data || !['success', 'failed'].includes(task.data.status))
  );
  const locked = checking || running || validating;
  useEffect(() => {
    if (!task.data || !['success', 'failed'].includes(task.data.status)) return;
    queryClient.invalidateQueries({ queryKey: ['credits'] });
    queryClient.invalidateQueries({ queryKey: ['text-video-history', owner] });
    if (task.data.status === 'failed' && failedShown.current !== task.data.id) {
      failedShown.current = task.data.id;
      toast.error(task.data.error || copy.failed);
    }
  }, [task.data?.status, task.data?.id]);

  const submit = useMutation({
    mutationFn: ({ id, imageUrls }: { id: string; imageUrls: string[] }) =>
      apiPost<Task>('/api/studio/generate', {
        model: imageUrls.length ? 'seedance-2-image' : 'seedance-2',
        imageUrls,
        prompt: prompt.trim(),
        ...options,
        locale,
        requestId: id,
      }),
    onSuccess: (result) => {
      setTaskId(result.id);
      queryClient.setQueryData(['text-video-task', owner, result.id], result);
      void persist({ taskId: result.id }).catch(() =>
        toast.error(copy.saveError)
      );
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
    onError: (error: Error) => {
      if (error.message === 'Insufficient credits') setPaywall(true);
      else toast.error(error.message);
    },
  });
  async function generate() {
    if (!prompt.trim() || locked || submit.isPending || generationLock.current)
      return;
    generationLock.current = true;
    setChecking(true);
    try {
      await persist();
    } catch {
      generationLock.current = false;
      setChecking(false);
      toast.error(copy.saveError);
      return;
    }
    if (!owner) {
      generationLock.current = false;
      setChecking(false);
      router.push(
        `/sign-in?callbackUrl=${encodeURIComponent(currentPathWithQuery('/create'))}`
      );
      return;
    }
    setChecking(true);
    try {
      // Recover the accepted request before checking its reduced balance.
      if (requestId) {
        const recovered = await apiGet<{ task: Task | null }>(
          `/api/studio/generate?requestId=${requestId}`
        );
        if (recovered.task) {
          setTaskId(recovered.task.id);
          queryClient.setQueryData(
            ['text-video-task', owner, recovered.task.id],
            recovered.task
          );
          return;
        }
      }
      const ready = await readiness.refetch();
      if (!ready.data?.ready || ready.isError)
        throw new Error(copy.unavailable);
      const credits = await balance.refetch();
      if (credits.isError || !credits.data)
        throw credits.error || new Error(copy.unavailable);
      if (!credits.data.hasPaidOrder || credits.data.balance < cost) {
        setPaywall(true);
        return;
      }
      if (frames[1] && !frames[0]) throw new Error(copy.missingFirst);
      const nextFrames: [FrameAsset | null, FrameAsset | null] = [...frames];
      const pending = nextFrames
        .map((frame, index) => ({ frame, index }))
        .filter((item) => item.frame?.file && !item.frame.url);
      if (pending.length) {
        const uploaded = await apiUploadImages<{ urls: string[] }>(
          pending.map((item) => item.frame!.file!)
        );
        if (
          uploaded.urls.length !== pending.length ||
          uploaded.urls.some((url) => !url.startsWith('https://'))
        )
          throw new Error(copy.unavailable);
        pending.forEach((item, i) => {
          nextFrames[item.index] = { ...item.frame, url: uploaded.urls[i] };
        });
        setFrames(nextFrames);
      }
      const imageUrls = nextFrames
        .filter((f): f is FrameAsset => Boolean(f))
        .map((f) => f.url!);
      const id = requestId || crypto.randomUUID();
      setRequestId(id);
      await persist({ requestId: id, frames: nextFrames });
      await submit.mutateAsync({ id, imageUrls }).catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.unavailable);
    } finally {
      generationLock.current = false;
      setChecking(false);
    }
  }

  async function chooseFrame(file: File | undefined, index: number) {
    if (!file || locked || requestId) return;
    setValidating(true);
    try {
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      )
        throw new Error(copy.invalidFrame);
      const image = await createImageBitmap(file);
      const valid =
        image.width >= 300 &&
        image.height >= 300 &&
        image.width <= 6000 &&
        image.height <= 6000 &&
        image.width / image.height >= 0.4 &&
        image.width / image.height <= 2.5;
      image.close();
      if (!valid) throw new Error(copy.invalidFrame);
      setFrames((current) => {
        const next: typeof current = [...current];
        next[index] = { file };
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.invalidFrame);
    } finally {
      setValidating(false);
    }
  }
  return (
    <div
      className="neon-border border-primary/20 bg-muted/40 grid gap-3 rounded-3xl border p-3 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)]"
      data-testid="text-video-generator"
      id="generator"
    >
      <section
        className="bg-card flex flex-col gap-5 rounded-2xl p-5 lg:p-6"
        aria-label={copy.title}
      >
        <div>
          <h2 className="text-xl font-semibold">{copy.title}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{copy.intro}</p>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((index) => (
              <FrameUpload
                key={index}
                asset={frames[index]}
                title={index === 0 ? copy.firstFrame : copy.lastFrame}
                upload={copy.uploadFrame}
                remove={copy.removeFrame}
                disabled={
                  !restored ||
                  locked ||
                  submit.isPending ||
                  Boolean(requestId) ||
                  (index === 1 && !frames[0])
                }
                onChoose={(file) => chooseFrame(file, index)}
                onRemove={() =>
                  setFrames((current) =>
                    index === 0 ? [null, null] : [current[0], null]
                  )
                }
                index={index}
              />
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">{copy.frameHint}</p>
        </div>
        <div>
          <label htmlFor="seedance-prompt" className="text-sm font-medium">
            {copy.prompt}
          </label>
          <Textarea
            id="seedance-prompt"
            data-testid="text-video-prompt"
            className="bg-background mt-2 min-h-44 resize-y p-3"
            placeholder={copy.placeholder}
            maxLength={2000}
            value={prompt}
            disabled={locked || submit.isPending || Boolean(requestId)}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <p className="text-muted-foreground mt-1 text-right text-xs">
            {prompt.length}/2000
          </p>
        </div>
        {[
          {
            label: copy.duration,
            key: 'duration' as const,
            values: VIDEO_DURATIONS,
          },
          { label: copy.size, key: 'aspect' as const, values: STUDIO_ASPECTS },
          {
            label: copy.quality,
            key: 'resolution' as const,
            values: VIDEO_RESOLUTIONS,
          },
        ].map((group) => (
          <fieldset key={group.key}>
            <legend className="mb-2 text-sm font-medium">{group.label}</legend>
            <div className="flex gap-2">
              {group.values.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={options[group.key] === value}
                  disabled={locked || submit.isPending || Boolean(requestId)}
                  data-testid={`text-${group.key}-${value}`}
                  onClick={() =>
                    setOptions((current) => ({
                      ...current,
                      [group.key]: value,
                    }))
                  }
                  className={`flex-1 rounded-xl border px-2 py-3 text-sm transition-colors ${options[group.key] === value ? 'border-primary bg-primary/15 text-primary' : 'border-border hover:border-primary/50'} disabled:opacity-50`}
                >
                  {value}
                  {group.key === 'duration' ? 's' : ''}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <p className="text-muted-foreground text-xs">{copy.audio}</p>
        <p className="text-muted-foreground text-xs">{copy.restore}</p>
        <div className="mt-auto space-y-3">
          <p className="text-sm font-medium" data-testid="text-video-price">
            {copy.price(price)}
          </p>
          <p className="text-muted-foreground text-xs">{copy.refund}</p>
          <Button
            data-testid="text-video-generate"
            className="h-12 w-full rounded-xl text-base font-semibold"
            disabled={
              !restored ||
              !prompt.trim() ||
              locked ||
              submit.isPending ||
              Boolean(taskId)
            }
            onClick={generate}
          >
            {locked || submit.isPending ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <Sparkles className="size-5" />
            )}
            {locked || submit.isPending
              ? copy.working
              : submit.isError
                ? copy.retry
                : copy.generate}
          </Button>
          {!locked && (requestId || taskId) && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setTaskId(undefined);
                setRequestId(undefined);
                submit.reset();
                void persist({ requestId: undefined, taskId: undefined }).catch(
                  () => toast.error(copy.saveError)
                );
              }}
            >
              {copy.newVideo}
            </Button>
          )}
        </div>
      </section>
      <section
        className="bg-card flex min-w-0 flex-col gap-4 rounded-2xl p-5 lg:p-6"
        aria-label={copy.result}
      >
        <h2 className="text-lg font-semibold">{copy.result}</h2>
        <div className="bg-background/70 flex min-h-[420px] flex-1 items-center justify-center overflow-hidden rounded-xl lg:min-h-[560px]">
          {task.data?.status === 'success' && task.data.url ? (
            <video
              data-testid="text-video-result"
              src={task.data.url}
              controls
              playsInline
              className="max-h-[650px] w-full object-contain"
            />
          ) : (
            <div className="text-muted-foreground max-w-sm space-y-3 p-6 text-center">
              {locked ? (
                <LoaderCircle className="text-primary mx-auto size-9 animate-spin" />
              ) : (
                <Film className="text-primary mx-auto size-9" />
              )}
              <p>
                {task.data?.status === 'failed'
                  ? task.data.error || copy.failed
                  : locked
                    ? copy.working
                    : copy.empty}
              </p>
              {task.isError && (
                <Button variant="outline" onClick={() => task.refetch()}>
                  {copy.retry}
                </Button>
              )}
            </div>
          )}
        </div>
        {task.data?.status === 'success' && task.data.url && (
          <a
            className="eg-pill-primary w-fit"
            href={`/api/studio/download?id=${encodeURIComponent(task.data.id)}`}
          >
            {copy.download}
          </a>
        )}
        {(history.data?.filter((item) =>
          ['seedance-2', 'seedance-2-image'].includes(item.model)
        ).length || 0) > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">{copy.history}</h3>
            <div className="flex flex-wrap gap-2">
              {history.data
                ?.filter((item) =>
                  ['seedance-2', 'seedance-2-image'].includes(item.model)
                )
                .slice(0, 6)
                .map((item) => (
                  <button
                    type="button"
                    disabled={locked || submit.isPending}
                    key={item.id}
                    onClick={() => {
                      setTaskId(item.id);
                      setRequestId(undefined);
                    }}
                    className="border-border max-w-44 truncate rounded-lg border px-3 py-2 text-xs"
                  >
                    {item.prompt}
                  </button>
                ))}
            </div>
          </div>
        )}
      </section>
      <Dialog open={paywall} onOpenChange={setPaywall}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-5 sm:max-w-6xl">
          <Pricing
            variant="dialog"
            singleVideo={product}
            balanceCredits={balance.data?.balance || 0}
            beforeCheckout={async () => {
              const ready = await readiness.refetch();
              if (!ready.data?.ready || ready.isError)
                throw new Error(copy.unavailable);
              await persist();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FrameUpload({
  asset,
  title,
  upload,
  remove,
  disabled,
  onChoose,
  onRemove,
  index,
}: {
  asset: FrameAsset | null;
  title: string;
  upload: string;
  remove: string;
  disabled: boolean;
  onChoose: (file: File | undefined) => void;
  onRemove: () => void;
  index: number;
}) {
  const [preview, setPreview] = useState<string>();
  useEffect(() => {
    if (asset?.file) {
      const url = URL.createObjectURL(asset.file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(asset?.url);
  }, [asset]);
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="border-border bg-background relative aspect-[4/3] overflow-hidden rounded-xl border border-dashed">
        <label
          className={`flex size-full flex-col items-center justify-center gap-2 p-3 text-center text-xs ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-primary/5 cursor-pointer'}`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            data-testid={`text-frame-${index}`}
            disabled={disabled}
            aria-label={title}
            onChange={(event) => {
              onChoose(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          {preview ? (
            <img
              src={preview}
              alt={title}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <>
              <ImagePlus className="text-primary size-6" />
              <span>{upload}</span>
            </>
          )}
        </label>
        {asset && (
          <button
            type="button"
            disabled={disabled}
            aria-label={remove}
            className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-black/70 text-white disabled:opacity-50"
            onClick={onRemove}
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}
