/** Tab-scoped binary drafts survive auth/checkout navigation without uploading
 * private media before consent. Never persist temporary blob: preview URLs. */
export type DraftAsset = {
  kind: 'image' | 'video';
  file?: File;
  url?: string;
  width?: number;
  height?: number;
  duration?: number;
  videoReceipt?: { payload: string; signature: string };
};
export type GenjutsuDraft = {
  owner?: string;
  selectedId: string;
  sampleId?: string;
  aspect: string;
  durationTier?: number;
  backgroundMode?: 'keep' | 'change';
  backgroundDescription?: string;
  lead?: DraftAsset;
  referenceVideo?: DraftAsset;
  savedAt: number;
  comparison?: { taskId: string; source: DraftAsset };
};
const TTL = 24 * 60 * 60 * 1000;
let queue: Promise<unknown> = Promise.resolve();

function draftKey() {
  let key = sessionStorage.getItem('genjutsu-draft-tab');
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem('genjutsu-draft-tab', key);
  }
  return key;
}

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('genjutsu-drafts', 1);
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      reject(new Error('Draft storage timed out'));
    }, 5000);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => {
      clearTimeout(timer);
      if (expired) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => {
      clearTimeout(timer);
      reject(request.error);
    };
    request.onblocked = () => {
      clearTimeout(timer);
      expired = true;
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
      const timer = setTimeout(() => {
        reject(new Error('Draft save timed out'));
        try {
          tx.abort();
        } catch {
          /* Already settled. */
        }
      }, 5000);
      tx.oncomplete = () => {
        clearTimeout(timer);
        resolve(request.result);
      };
      tx.onerror = () => {
        clearTimeout(timer);
        reject(tx.error);
      };
      tx.onabort = () => {
        clearTimeout(timer);
        reject(tx.error);
      };
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

export function saveGenjutsuDraft(draft: GenjutsuDraft) {
  // Serial writes prevent an older autosave overwriting the explicit pre-redirect save.
  const result = queue
    .catch(() => undefined)
    .then(() =>
      transact('readwrite', (s, k) => {
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
      })
    );
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
