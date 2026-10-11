import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const core = path.dirname(fileURLToPath(import.meta.resolve('@ffmpeg/core')));
const destination = 'public/vendor/ffmpeg';
await mkdir(destination, { recursive: true });
// Split the binary to stay below Cloudflare's 25 MiB per-static-file limit.
const wasm = await readFile(path.join(core, 'ffmpeg-core.wasm'));
const half = Math.ceil(wasm.length / 2);
await writeFile(`${destination}/core.wasm.0`, wasm.subarray(0, half));
await writeFile(`${destination}/core.wasm.1`, wasm.subarray(half));
await writeFile(
  `${destination}/ffmpeg-core.js`,
  await readFile(path.join(core, 'ffmpeg-core.js'))
);
console.log('Prepared browser-only FFmpeg core (two static WASM parts).');
