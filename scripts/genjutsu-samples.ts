/** Bounded, resumable creative tests. Reads the saved backend key only. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { normalizeEvolinkBaseUrl } from '../src/core/ai/evolink';
import { loadEnvFiles } from '../src/lib/env';

const standardCases = [
  {
    id: 'rain-reality',
    prompt:
      'Photoreal cinematic reality-transformation demonstration, one continuous full-body shot. An adult street dancer in a plain charcoal jacket performs a slow controlled arm wave and takes one step forward. The ordinary rooftop behind the dancer transforms seamlessly into a rain-soaked Tokyo street at night, puddles reflect red and cyan practical lights, volumetric drizzle, physically believable shadows. Keep one recognizable face, two arms, two legs and stable clothing throughout. Smooth restrained camera push-in, natural motion, clean silhouettes, realistic skin, premium music-video cinematography. No text, logos, cuts or watermark.',
  },
  {
    id: 'dream-reality',
    prompt:
      'Photoreal surreal cinematic reality-transformation demonstration in a single continuous shot. An adult woman in a simple cream coat walks slowly across a rooftop, then the surroundings dissolve smoothly into a dreamlike island above soft pastel clouds with enormous sculptural flowers and distant floating lanterns. Her face and outfit remain the same, walking movement is fluid and anatomically correct, the camera follows at a steady waist-height three-quarter angle. Realistic skin, detailed fabric, soft moonlit highlights, believable depth and grounded feet. Elegant restrained fantasy, not a cartoon. No text, logos, cuts or watermark.',
  },
  {
    id: 'clone-reality',
    prompt:
      'Photoreal cinematic reality-manipulation demonstration. An adult performer wearing a black tailored coat stands still at the center of a spacious concrete plaza at blue hour, framed head to toe. Four identical copies of that performer gradually appear in evenly spaced rows behind the central character, then the background copies perform the same simple synchronized arm raise while the central character remains still. Stable identical facial appearance and wardrobe, believable physical scale, separate non-overlapping bodies, exactly two arms and two legs per person. Slow smooth camera push-in, subtle wind in coat fabric, dramatic but natural practical lighting, clear silhouettes and crisp detailed faces. One continuous shot, no text, logos or watermark.',
  },
] as const;

const heroMode = process.argv.includes('--hero');
const cases = heroMode
  ? [
      {
        id: 'crowd-hero',
        prompt:
          'Wide landscape photoreal cinematic music-video shot, a single continuous five-second take. An adult woman with straight platinum-blonde hair and bangs, wearing a charcoal business suit, white shirt and dark tie, stands upright and absolutely still at the exact center, looking calmly toward the camera. Surround her with a dense crowd of roughly sixty adult office workers in dark charcoal suits, white shirts and gray ties, arranged in seven tightly packed staggered rows filling the full width from foreground to background. Many of the surrounding workers resemble one another, giving an uncanny clone-army impression. All surrounding workers perform a synchronized slow bowed-head movement with their shoulders and torsos swaying slightly from side to side, while the central woman remains motionless and visibly independent. Modern pale-concrete office building and large recessed dark glass entrance in the background. Symmetrical frontal composition, elevated camera looking slightly down, natural overcast daylight, cool restrained gray color grading, realistic faces and cloth, believable anatomy and stable crowd spacing. The camera holds steady with a very subtle slow push-in. No magical light, no disappearance, no scene transition, no cuts, no text, no graphics, no logos, no watermark. Keep the central woman visible and distinct throughout.',
      },
    ]
  : standardCases;

type RecordFile = {
  id: string;
  taskId?: string;
  status?: string;
  prompt: string;
  reservedCredits?: number;
  resultUrl?: string;
  error?: string;
};

async function main() {
  loadEnvFiles();
  const { getAllConfigs } = await import('../src/modules/config/service');
  const configs = await getAllConfigs();
  if (!configs.evolink_api_key)
    throw new Error('Saved EvoLink key cannot be read');
  const base = normalizeEvolinkBaseUrl(configs.evolink_base_url);
  // Never forward the backend credential to an unexpected configured host.
  if (new URL(base).origin !== 'https://api.evolink.ai') {
    throw new Error('Sample runner requires the official EvoLink API host');
  }
  const request = async (path: string, body?: unknown) => {
    const response = await fetch(`${base}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${configs.evolink_api_key}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data?.error?.message || `HTTP ${response.status}`);
    return data;
  };
  const directory = resolve('public/videos/genjutsu-samples');
  await mkdir(directory, { recursive: true });
  const records: RecordFile[] = [];
  for (const sample of cases) {
    const checkpoint = resolve(directory, `${sample.id}.json`);
    let record: RecordFile;
    try {
      record = JSON.parse(await readFile(checkpoint, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      record = { ...sample };
    }
    if (!record.taskId) {
      const data = await request('/v1/videos/generations', {
        model: 'grok-imagine-video-1.0-t2v',
        prompt: sample.prompt,
        duration: 5,
        quality: heroMode ? '720p' : '480p',
        aspect_ratio: heroMode ? '16:9' : '9:16',
      });
      if (!data.id)
        throw new Error('Provider returned no task ID; do not retry blindly');
      record.taskId = data.id;
      record.status = data.status;
      record.reservedCredits = data.usage?.credits_reserved;
      await writeFile(checkpoint, JSON.stringify(record, null, 2));
    }
    records.push(record);
    console.log(
      JSON.stringify({
        sample: record.id,
        taskId: record.taskId,
        status: record.status,
        reservedCredits: record.reservedCredits,
      })
    );
  }
  const deadline = Date.now() + 20 * 60 * 1000;
  while (
    records.some((r) => r.status !== 'completed' && r.status !== 'failed')
  ) {
    if (Date.now() > deadline)
      throw new Error(
        'Polling timed out; rerun to resume without creating new tasks'
      );
    for (const record of records) {
      if (record.status === 'completed' || record.status === 'failed') continue;
      const data = await request(
        `/v1/tasks/${encodeURIComponent(record.taskId!)}`
      );
      record.status = data.status;
      record.error = data.error?.message;
      console.log(
        JSON.stringify({
          sample: record.id,
          status: record.status,
          progress: data.progress,
          error: record.error,
        })
      );
      if (data.status === 'completed') {
        const url = data.results?.[0];
        if (typeof url !== 'string' || !url.startsWith('https://'))
          throw new Error('Missing HTTPS result');
        const response = await fetch(url, {
          signal: AbortSignal.timeout(60000),
        });
        if (!response.ok)
          throw new Error(`Result download failed: ${response.status}`);
        await writeFile(
          resolve(directory, `${record.id}.mp4`),
          new Uint8Array(await response.arrayBuffer())
        );
        record.resultUrl = url;
      }
      await writeFile(
        resolve(directory, `${record.id}.json`),
        JSON.stringify(record, null, 2)
      );
    }
    if (
      records.some((r) => r.status !== 'completed' && r.status !== 'failed')
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
  if (records.some((r) => r.status === 'failed')) process.exitCode = 1;
  console.log('Finished sample batch. No website references were changed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
