import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { envConfigs } from '@/config';
import { GENJUTSU_MAX_SECONDS } from '@/config/genjutsu';
import { getStorage } from '@/modules/storage/service';
import { md5 } from '@/lib/hash';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';
import { mp4Duration } from '@/lib/video-duration';
import { signVideoReceipt } from '@/lib/video-receipt.server';

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_VIDEO_BYTES + 2 * 1024 * 1024;
const INLINE_MAX_BYTES =
  (Number(envConfigs.inline_image_max_kb) || 10240) * 1024;

const extFromMime = (mimeType: string) => {
  const map: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
  };
  return map[mimeType] || '';
};

function hasVideoSignature(bytes: Uint8Array, mimeType: string): boolean {
  // MP4, MOV and M4V are ISO base media files with an `ftyp` box at offset 4.
  return (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  );
}

async function readLimitedFormData(request: Request): Promise<FormData | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: BlobPart[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(Uint8Array.from(value));
  }

  const contentType = request.headers.get('content-type');
  if (!contentType?.startsWith('multipart/form-data;')) return null;
  return new Response(new Blob(chunks), {
    headers: { 'content-type': contentType },
  }).formData();
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'upload-video',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const formData = await readLimitedFormData(request);
    if (!formData) return respErr('Upload too large or invalid form data');
    const files = formData.getAll('files');
    if (files.length !== 1 || !(files[0] instanceof File)) {
      return respErr('Upload exactly one video at a time');
    }

    const file = files[0];
    const ext = extFromMime(file.type);
    if (!ext || file.size > MAX_VIDEO_BYTES) {
      return respErr('Unsupported video or video too large');
    }

    const body = new Uint8Array(await file.arrayBuffer());
    if (!hasVideoSignature(body, file.type)) {
      return respErr('Invalid video file');
    }
    const duration = mp4Duration(body);
    if (duration < 3 || duration > GENJUTSU_MAX_SECONDS + 0.05)
      return respErr('Reference video must be 3–10 seconds long');

    const objectKey = `${md5(body)}.${ext}`;
    const storage = await getStorage();

    if (!storage) {
      if (body.length > INLINE_MAX_BYTES) {
        return respErr(
          'Video uploads require configured public storage. Configure R2 in Admin Settings before uploading reference videos.'
        );
      }
      const dir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, objectKey), body);
      return respData({
        urls: [`/uploads/${objectKey}`],
        results: [
          {
            url: `/uploads/${objectKey}`,
            key: `uploads/${objectKey}`,
            filename: file.name,
            deduped: false,
          },
        ],
      });
    }

    const exists = await storage.exists({ key: objectKey });
    if (exists) {
      const publicUrl = storage.getPublicUrl({ key: objectKey });
      if (publicUrl) {
        return respData({
          urls: [publicUrl],
          duration,
          videoReceipt: await signVideoReceipt(
            publicUrl,
            duration,
            session.user.id
          ),
          results: [
            {
              url: publicUrl,
              key: objectKey,
              filename: file.name,
              deduped: true,
            },
          ],
        });
      }
    }

    const result = await storage.uploadFile({
      body,
      key: objectKey,
      contentType: file.type,
      disposition: 'inline',
    });
    if (!result.success || !result.url) {
      return respErr(result.error || 'Upload failed');
    }

    return respData({
      urls: [result.url],
      duration,
      videoReceipt: await signVideoReceipt(
        result.url,
        duration,
        session.user.id
      ),
      results: [
        {
          url: result.url,
          key: result.key || objectKey,
          filename: file.name,
          deduped: false,
        },
      ],
    });
  } catch (error) {
    console.error('upload video failed:', error);
    return respErr('Upload failed');
  }
}

export const Route = createFileRoute('/api/storage/upload-video')({
  server: { handlers: { POST } },
});
