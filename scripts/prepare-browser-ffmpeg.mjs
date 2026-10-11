import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const core = path.dirname(fileURLToPath(import.meta.resolve('@ffmpeg/core')));
const destination = 'public/vendor/ffmpeg';
await mkdir(destination, { recursive: true });
// Split the binary to stay below Cloudflare's 25 MiB per-static-file limit.
const wasm = await readFile(path.join(core, 'ffmpeg-core.wasm'));
const half = Math.ceil(wasm.length / 2);
await writeFile(`${destination}/core.wasm.0`, wasm.subarray(0, half));
await writeFile(`${destination}/core.wasm.1`, wasm.subarray(half));
// Explicit gzip payload: Workers does not automatically compress unknown
// extensions such as .wasm.0. This cuts the cold download from 32MB to 10MB.
await writeFile(`${destination}/core-0.12.10.wasm.gz`, gzipSync(wasm));
await writeFile(
  `${destination}/ffmpeg-core.js`,
  await readFile(path.join(core, 'ffmpeg-core.js'))
);
console.log('Prepared browser-only FFmpeg core (two static WASM parts).');
