import { v4 as uuidv4 } from 'uuid';

import {
  readSessionValue,
  removeSessionValue,
  writeSessionValue,
} from './browser-session';
import {
  mediaFileBytes,
  restoreMediaFile,
  type StoredMediaFile,
} from './media-file';

/** Tab-scoped binary drafts survive auth/checkout navigation without uploading
 * private media before consent. Never persist temporary blob: preview URLs. */
export type DraftAsset = {
  kind: 'image' | 'video';
  file?: File;
  sourceDuration?: number;
  trimStart?: number;
  url?: string;
  width?: number;
  height?: number;
  duration?: number;
  videoReceipt?: { payload: string; signature: string };
  /** Identifies a built-in effect, so its uploaded copy can survive a reload. */
  sourceUrl?: string;
};
export type GenjutsuDraft = {
  owner?: string;
  selectedId: string;
  aspect: string;
  durationTier?: 5 | 10;
  referenceClosed?: boolean;
  referenceSource?: 'effect' | 'upload';
  lead?: DraftAsset;
  /** Second person's photo on two-photo themes (the AI kissing page). */
  partner?: DraftAsset;
  referenceVideo?: DraftAsset;
  /** Last uploaded own video, kept selectable after switching effects. */
  ownVideo?: DraftAsset;
  savedAt: number;
};
const TTL = 24 * 60 * 60 * 1000;
let queue: Promise<unknown> = Promise.resolve();
let currentDraft: GenjutsuDraft | undefined;
const FALLBACK_KEY = 'genjutsu-draft-remote';
type StoredAsset = Omit<DraftAsset, 'file'> & {
  file?: File;
  data?: StoredMediaFile;
};
type StoredDraft = Omit<
  GenjutsuDraft,
  'lead' | 'partner' | 'referenceVideo' | 'ownVideo'
> & {
  lead?: StoredAsset;
  partner?: StoredAsset;
  referenceVideo?: StoredAsset;
  ownVideo?: StoredAsset;
};

function draftKey() {
  let key = readSessionValue('genjutsu-draft-tab');
  if (!key) {
    // uuid falls back to getRandomValues where crypto.randomUUID is missing.
    key = uuidv4();
  }
  if (!writeSessionValue('genjutsu-draft-tab', key))
    throw new Error('This browser cannot retain media across checkout');
  return key;
}

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('genjutsu-drafts', 1);
    let stopped = false;
    const timeout = setTimeout(() => {
      stopped = true;
      reject(new Error('Draft storage timed out'));
    }, 3000);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => {
      clearTimeout(timeout);
      if (stopped) {
        request.result.close();
        return;
      }
      resolve(request.result);
    };
    request.onerror = () => {
      clearTimeout(timeout);
      reject(request.error);
    };
    request.onblocked = () => {
      clearTimeout(timeout);
      stopped = true;
      reject(new Error('Draft storage is blocked'));
    };
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, key: string) => IDBRequest<T>
): Promise<T> {
  const key = draftKey();
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('drafts', mode);
      const request = operation(tx.objectStore('drafts'), key);
      const timeout = setTimeout(() => tx.abort(), 8000);
      tx.oncomplete = () => {
        clearTimeout(timeout);
        resolve(request.result);
      };
      tx.onerror = () => {
        clearTimeout(timeout);
        reject(tx.error ?? request.error);
      };
      tx.onabort = () => {
        clearTimeout(timeout);
        reject(tx.error ?? new Error('Draft save interrupted'));
      };
    });
  } finally {
    db.close();
  }
}

export async function loadGenjutsuDraft(owner?: string) {
  await queue.catch(() => undefined);
  let stored: StoredDraft | undefined;
  try {
    stored = await transact<StoredDraft | undefined>('readonly', (s, k) =>
      s.get(k)
    );
  } catch {
    // URL-only drafts also work when IndexedDB is unavailable/private.
  }
  let fallback: GenjutsuDraft | undefined;
  try {
    fallback =
      JSON.parse(readSessionValue(FALLBACK_KEY) || 'null') ?? undefined;
  } catch {
    /* Ignore an incomplete old draft. */
  }
  const latest = [stored, fallback, currentDraft]
    .filter((d): d is StoredDraft => Boolean(d))
    .sort((a, b) => b.savedAt - a.savedAt)[0];
  const restore = (asset?: StoredAsset): DraftAsset | undefined => {
    if (!asset) return;
    const { data, ...rest } = asset;
    return { ...rest, file: data ? restoreMediaFile(data) : rest.file };
  };
  const draft = latest && {
    ...latest,
    lead: restore(latest.lead),
    partner: restore(latest.partner),
    referenceVideo: restore(latest.referenceVideo),
    ownVideo: restore(latest.ownVideo),
  };
  if (!draft) return;
  if (
    Date.now() - draft.savedAt > TTL ||
    (draft.owner && draft.owner !== owner)
  ) {
    await clearGenjutsuDraft();
    return;
  }
  return draft;
}

function writeDraft(draft: StoredDraft) {
  return transact('readwrite', (s, k) => {
    // Prune expired drafts from closed tabs too; don't retain private blobs
    // indefinitely merely because their originating tab no longer exists.
    const cursor = s.openCursor();
    cursor.onsuccess = () => {
      const row = cursor.result;
      if (!row) return;
      if (Date.now() - row.value.savedAt > TTL) row.delete();
      row.continue();
    };
    return s.put(draft, k);
  });
}

async function storeDraft(draft: GenjutsuDraft) {
  currentDraft = draft;
  const store = async (
    asset?: DraftAsset
  ): Promise<StoredAsset | undefined> => {
    if (!asset) return;
    const { file, ...rest } = asset;
    return {
      ...rest,
      data:
        file && (!asset.url || asset.kind === 'video')
          ? await mediaFileBytes(file)
          : undefined,
    };
  };
  const remote = (asset?: DraftAsset) => {
    if (!asset?.url || asset.url.startsWith('blob:')) return;
    const { file: _file, ...rest } = asset;
    return rest;
  };
  const remoteDraft: GenjutsuDraft = {
    ...draft,
    lead: remote(draft.lead),
    partner: remote(draft.partner),
    referenceVideo: remote(draft.referenceVideo),
    ownVideo: remote(draft.ownVideo),
  };
  // Never claim a recoverable checkout if either person's photo was lost.
  const remotelyRecoverable = Boolean(
    remoteDraft.lead &&
    remoteDraft.referenceVideo &&
    (!draft.partner || remoteDraft.partner)
  );
  const fallbackSaved =
    remotelyRecoverable &&
    writeSessionValue(FALLBACK_KEY, JSON.stringify(remoteDraft));
  if (!remotelyRecoverable) removeSessionValue(FALLBACK_KEY);
  try {
    return await writeDraft({
      ...draft,
      lead: await store(draft.lead),
      partner: await store(draft.partner),
      referenceVideo: await store(draft.referenceVideo),
      ownVideo: await store(draft.ownVideo),
    });
  } catch (error) {
    if (!fallbackSaved) throw error;
  }
}

export function saveGenjutsuDraft(draft: GenjutsuDraft) {
  // Serial writes prevent an older autosave overwriting the explicit pre-redirect save.
  const result = queue.catch(() => undefined).then(() => storeDraft(draft));
  queue = result;
  return result;
}

export function clearGenjutsuDraft() {
  currentDraft = undefined;
  removeSessionValue(FALLBACK_KEY);
  const result = queue
    .catch(() => undefined)
    .then(() => transact('readwrite', (s, k) => s.delete(k)));
  queue = result;
  return result;
}
