import type { StudioOptions } from '@/config/studio-models';

export type FrameAsset = { file?: File; url?: string };
export type TextVideoDraft = {
  owner?: string;
  prompt: string;
  options: StudioOptions;
  requestId?: string;
  taskId?: string;
  frames: [FrameAsset | null, FrameAsset | null];
  savedAt: number;
};
let queue: Promise<unknown> = Promise.resolve();
async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, key: string) => IDBRequest<T>
): Promise<T> {
  let key = sessionStorage.getItem('seedance-frame-draft-tab');
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem('seedance-frame-draft-tab', key);
  }
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('seedance-frame-drafts', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('drafts');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Draft storage blocked'));
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('drafts', mode);
      const req = operation(tx.objectStore('drafts'), key!);
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function loadTextVideoDraft(owner?: string) {
  await queue.catch(() => undefined);
  const draft = await transact<TextVideoDraft | undefined>('readonly', (s, k) =>
    s.get(k)
  );
  if (!draft) return;
  if (
    Date.now() - draft.savedAt > 86400000 ||
    (draft.owner && draft.owner !== owner)
  ) {
    await transact('readwrite', (s, k) => s.delete(k));
    return;
  }
  return draft;
}
export function saveTextVideoDraft(draft: TextVideoDraft) {
  const result = queue
    .catch(() => undefined)
    .then(() =>
      transact('readwrite', (s, k) => {
        const cursor = s.openCursor();
        cursor.onsuccess = () => {
          const row = cursor.result;
          if (!row) return;
          if (Date.now() - row.value.savedAt > 86400000) row.delete();
          row.continue();
        };
        return s.put(draft, k);
      })
    );
  queue = result;
  return result;
}
