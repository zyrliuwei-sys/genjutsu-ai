// Copy only publicly exposed reference assets, unchanged; no AI generation.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const assets = [
  { id: 'crowd', path: 'genjutus-fixes/hero/itemv' },
  { id: 'dream', path: 'reality-manipulation/features/feature-2-2' },
  { id: 'motion', path: 'reality-manipulation/features/feature-1-3' },
  { id: 'launch', path: 'reality-manipulation/launch-video' },
  { id: 'feature-1-2', path: 'reality-manipulation/features/feature-1-2' },
  { id: 'feature-1-1', path: 'reality-manipulation/features/feature-1-1' },
  { id: 'feature-2-1', path: 'reality-manipulation/features/feature-2-1' },
  { id: 'feature-2-3', path: 'reality-manipulation/features/feature-2-3' },
  { id: 'feature-3-1', path: 'reality-manipulation/features/feature-3-1' },
  { id: 'feature-3-2', path: 'reality-manipulation/features/feature-3-2' },
];
const directory = resolve('public/videos/higgsfield-reference');
await mkdir(directory, { recursive: true });

async function download(url, filename, expectedType) {
  try {
    const existing = await readFile(resolve(directory, filename));
    return {
      bytes: existing.byteLength,
      sha256: createHash('sha256').update(existing).digest('hex'),
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${filename}: HTTP ${response.status}`);
  if (!response.headers.get('content-type')?.startsWith(expectedType)) {
    throw new Error(`${filename}: unexpected content type`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 50 * 1024 * 1024)
    throw new Error(`${filename}: exceeds 50MB`);
  await writeFile(resolve(directory, filename), bytes, { flag: 'wx' });
  return {
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

const manifest = [];
for (const asset of assets) {
  const videoUrl = `https://static.higgsfield.ai/${asset.path}.mp4`;
  const posterUrl = `https://static.higgsfield.ai/${asset.path}-poster.webp`;
  const video = await download(videoUrl, `${asset.id}.mp4`, 'video/');
  await download(posterUrl, `${asset.id}.webp`, 'image/');
  const probe = JSON.parse(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'format=duration:stream=width,height',
        '-of',
        'json',
        resolve(directory, `${asset.id}.mp4`),
      ],
      { encoding: 'utf8' }
    )
  );
  const record = {
    id: asset.id,
    videoUrl,
    posterUrl,
    ...video,
    duration: Number(probe.format.duration),
    ...probe.streams[0],
  };
  manifest.push(record);
  console.log(JSON.stringify(record));
}
await writeFile(
  resolve(directory, 'sources.json'),
  JSON.stringify(
    {
      sourcePage: 'https://higgsfield.ai/genjutsu',
      importedAt: new Date().toISOString(),
      note: 'Third-party reference videos. Public availability is not a reuse license. Confirm permission before commercial publication. Original files and markings are preserved.',
      assets: manifest,
    },
    null,
    2
  ),
  { flag: 'w' }
);
