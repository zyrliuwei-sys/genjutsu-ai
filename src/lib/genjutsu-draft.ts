import { v4 as uuidv4 } from 'uuid';

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

function draftKey() {
  let key = sessionStorage.getItem('genjutsu-draft-tab');
  if (!key) {
    // uuid falls back to getRandomValues where crypto.randomUUID is missing.
    key = uuidv4();
    sessionStorage.setItem('genjutsu-draft-tab', key);
  }
  return key;
}

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('genjutsu-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Draft storage is blocked'));
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
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadGenjutsuDraft(owner?: string) {
  await queue.catch(() => undefined);
  const draft = await transact<GenjutsuDraft | undefined>('readonly', (s, k) =>
    s.get(k)
  );
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

// Some Chromium builds (mostly Android, files picked through a content://
// provider or cloud gallery) refuse to store a picker File, failing the whole
// transaction with "DataError: Failed to write blobs (InvalidBlob)", although
// the bytes still read fine. Retry with in-memory copies, cached so autosaves
// don't reread the file, and keep copying for the rest of the page's life.
const memoryCopies = new WeakMap<File, File>();
let copyBlobs = false;

async function memoryCopy(file: File) {
  let copy = memoryCopies.get(file);
  if (!copy) {
    const bytes = await (file.arrayBuffer
      ? file.arrayBuffer()
      : new Response(file).arrayBuffer());
    copy = new File([bytes], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
    memoryCopies.set(file, copy);
  }
  return copy;
}

async function withMemoryCopies(draft: GenjutsuDraft): Promise<GenjutsuDraft> {
  const copyAsset = async (asset?: DraftAsset) =>
    asset?.file ? { ...asset, file: await memoryCopy(asset.file) } : asset;
  return {
    ...draft,
    lead: await copyAsset(draft.lead),
    partner: await copyAsset(draft.partner),
    referenceVideo: await copyAsset(draft.referenceVideo),
    ownVideo: await copyAsset(draft.ownVideo),
  };
}

function writeDraft(draft: GenjutsuDraft) {
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
  if (copyBlobs) return writeDraft(await withMemoryCopies(draft));
  try {
    return await writeDraft(draft);
  } catch (error) {
    const hasFiles = [
      draft.lead,
      draft.partner,
      draft.referenceVideo,
      draft.ownVideo,
    ].some((asset) => asset?.file);
    if (!hasFiles) throw error;
    copyBlobs = true;
    // A failure here (e.g. NotReadableError) replaces the original error, so
    // the funnel shows whether the file itself had become unreadable.
    return writeDraft(await withMemoryCopies(draft));
  }
}

export function saveGenjutsuDraft(draft: GenjutsuDraft) {
  // Serial writes prevent an older autosave overwriting the explicit pre-redirect save.
  const result = queue.catch(() => undefined).then(() => storeDraft(draft));
  queue = result;
  return result;
}

export function clearGenjutsuDraft() {
  const result = queue
    .catch(() => undefined)
    .then(() => transact('readwrite', (s, k) => s.delete(k)));
  queue = result;
  return result;
}
