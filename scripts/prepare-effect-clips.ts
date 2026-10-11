import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile } from 'node:fs/promises';

// Derive bounded edit inputs without looping, slowing down or altering marks.
const sources = JSON.parse(
  await readFile('public/videos/higgsfield-reference/sources.json', 'utf8')
);
await mkdir('public/videos/effect-clips', { recursive: true });
for (const asset of sources.assets) {
  for (const seconds of [5, 10]) {
    const output = `public/videos/effect-clips/${asset.id}-${seconds}s.mp4`;
    try {
      await access(output);
      continue;
    } catch {
      /* First preparation. */
    }
    const result = spawnSync(
      'ffmpeg',
      [
        '-nostdin',
        '-v',
        'error',
        '-n',
        '-i',
        `public/videos/higgsfield-reference/${asset.id}.mp4`,
        '-t',
        String(seconds),
        '-vf',
        'scale=1280:720',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '21',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        output,
      ],
      { encoding: 'utf8' }
    );
    if (result.status !== 0)
      throw new Error(`Could not prepare ${asset.id}: ${result.stderr}`);
  }
}
console.log('Prepared 5s / up-to-10s reference clips; originals unchanged.');
