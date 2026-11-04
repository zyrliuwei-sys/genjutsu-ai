export class MediaFileUnavailableError extends Error {
  constructor() {
    super('This file is no longer readable. Select it again to continue.');
    this.name = 'MediaFileUnavailableError';
  }
}

export type StoredMediaFile = {
  bytes: ArrayBuffer;
  name: string;
  type: string;
  lastModified: number;
};

const contents = new WeakMap<File, Promise<StoredMediaFile>>();

/** Read picker-backed files while permission is live, before any redirect.
 * Store bytes in IndexedDB, not File/Blob handles that mobile browsers can lose. */
export function mediaFileBytes(file: File): Promise<StoredMediaFile> {
  let pending = contents.get(file);
  if (!pending) {
    pending = (async () => {
      try {
        const bytes = await (file.arrayBuffer
          ? file.arrayBuffer()
          : new Response(file).arrayBuffer());
        if (!bytes.byteLength || bytes.byteLength !== file.size)
          throw new MediaFileUnavailableError();
        return {
          bytes,
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
        };
      } catch {
        contents.delete(file);
        throw new MediaFileUnavailableError();
      }
    })();
    contents.set(file, pending);
  }
  return pending;
}

export function restoreMediaFile(data: StoredMediaFile): File {
  const file = new File([data.bytes], data.name, {
    type: data.type,
    lastModified: data.lastModified,
  });
  contents.set(file, Promise.resolve(data));
  return file;
}

export async function stabilizeMediaFile(file: File): Promise<File> {
  return restoreMediaFile(await mediaFileBytes(file));
}
