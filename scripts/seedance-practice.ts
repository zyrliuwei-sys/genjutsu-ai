/** One authorized four-clip batch. No automatic paid retries or app-provider changes.
 * Usage: pnpm exec tsx scripts/seedance-practice.ts [--reference-style] [--submit | --poll]
 * Checkpoints/masters stay outside public; interrupted submits never retry blindly. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { loadEnvFiles } from '../src/lib/env';

const referenceStyle = process.argv.includes('--reference-style');
const directory = referenceStyle
  ? '/tmp/genjutsu-seedance-practice-v3'
  : '/tmp/genjutsu-seedance-practice-v2';
const model = 'doubao-seedance-1.0-pro-fast';
const common =
  'One continuous five-second cinematic shot, premium photoreal sci-fi music-video aesthetic, realistic skin and clothing, coherent anatomy and grounded feet. Exactly one adult performer, clearly visible head to toe throughout, unobscured face, no masks. Clear readable movement suitable for character replacement. No cuts, extra limbs, text, readable lettering, logos or watermark.';
const originalScenes = [
  {
    id: 'dance',
    prompt: `${common} An adult male dancer in a matte black technical streetwear outfit performs a smooth popping arm wave followed by two rhythmic side steps on a glossy circular rooftop stage. Blue-white holographic rings hover behind him, distant futuristic skyscrapers, cyan and violet neon rim lighting, cinematic haze and reflections. Performer occupies two thirds of the frame height. Camera holds a stable frontal three-quarter wide full-body view. Dynamic confident dancing, sharp silhouette, not a robot.`,
  },
  {
    id: 'action',
    prompt: `${common} Wide establishing shot of an adult male martial artist in a dark flowing modern kung fu outfit on a monumental stone platform high above a sea of clouds. He performs a controlled block, a clean turning kick, then settles into a balanced fighting stance. Spectacular floating mountains and an enormous pale moon, subtle gold energy trails behind the arms without hiding the body, teal and warm gold cinematic lighting. Entire body occupies roughly half the frame height with plenty of surrounding landscape. Steady distant wide camera, no opponents, no weapons, no flying or flips.`,
  },
  {
    id: 'parkour',
    prompt: `${common} An adult female parkour runner in a silver-gray technical jacket and black trousers runs left to right across a futuristic rooftop walkway, cleanly vaults one low illuminated barrier, lands and continues running. Luxurious layered cyberpunk skyline with cyan light rails, distant magenta atmospheric lights, wet metal reflections, vivid cinematic dusk. Smooth side-tracking wide camera, performer occupies two thirds of frame height, face visible in three-quarter profile, limbs separate and unobstructed. Only one modest vault, realistic physics, no somersaults, no floating.`,
  },
  {
    id: 'walk',
    prompt: `${common} An adult female fashion lead with short dark hair wearing an elegant black coat and reflective silver boots walks confidently toward the camera along a spectacular futuristic commercial shopping boulevard at night. Luxurious illuminated glass storefronts, giant abstract holographic advertising shapes without letters, red and cyan neon light, rain-slick pavement reflections and violet atmospheric haze. Empty foreground, no umbrella, no crowd. Slow backward camera tracking maintains a full-body frontal view with her occupying two thirds of the frame height, face clearly visible, naturally paced footsteps, premium sci-fi fashion campaign.`,
  },
] as const;
// Style study only: no Higgsfield assets, prompts, specific characters or shots reused.
const film =
  'Original live-action cinematic music-video shot, not animation, illustration, videogame or glossy CGI. Realistic adult human with natural skin, detailed practical wardrobe, restrained film grain, anamorphic lens, physically believable shadows and movement. Exactly one clearly identifiable foreground performer, full body and feet visible throughout, face unobscured. One continuous five-second take, no edits. Surreal production design inside a believable real location. No neon sci-fi skyline, glowing energy rings, giant moon, HUD, text, brands or watermark.';
const referenceScenes = [
  {
    id: 'dance',
    prompt: `${film} An adult male street dancer in a long burgundy coat, charcoal trousers and black sneakers performs a controlled arm wave and two confident sideways dance steps in a spacious rain-darkened concrete courtyard. A sculptural canopy of twenty open matte-black umbrellas floats motionless two meters above and behind him, never obscuring his body. Moody overcast daylight, subtle red practical lighting from distant windows, wet ground reflections, elegant strange atmosphere, premium fashion music video. Frontal three-quarter wide camera with a slow restrained push-in; performer occupies two thirds of the frame height. The dancer moves naturally while the suspended umbrellas remain still.`,
  },
  {
    id: 'action',
    prompt: `${film} Distant wide shot of an adult male martial artist in a dark olive textured jacket and wide black training trousers on the worn stone floor of a monumental historical courtyard. Tall carved stone arches and weathered bronze doors, warm late-afternoon light cutting through dusty air. Behind him, several large fragments of broken pale stone hang suspended in mid-air like a frozen explosion, never overlapping the performer. He makes one clear block, turns into one balanced high kick, then lands in a low fighting stance. Realistic action-film choreography, no opponent, weapons or energy trails. Stable wide camera; his entire body occupies half the image height with substantial environment visible.`,
  },
  {
    id: 'parkour',
    prompt: `${film} An adult female runner in a pale gray windbreaker and black cargo trousers sprints left to right along a broad worn-concrete elevated walkway through an empty brutalist city, vaults one low solid concrete barrier, lands and continues running. Massive rectangular architectural frames behind her repeat into the distance at subtly impossible angles, evoking a dreamlike folded city while the walkway and performer remain physically grounded. Overcast silver daylight, realistic concrete textures, muted steel-blue palette, a few sheets of paper suspended in the distant air. Smooth wide lateral tracking camera, clearly visible profile and complete limbs, performer takes two thirds of frame height. No flips, falls or glowing surfaces.`,
  },
  {
    id: 'walk',
    prompt: `${film} An adult female fashion lead with a sleek dark bob, dark tailored trousers, black boots and a long ivory trench coat walks confidently toward the camera through an upscale commercial shopping street at blue hour. Real glass storefronts and stone facades, warm amber window light, soft rain reflections and restrained red signs without letters. Farther behind her, red autumn leaves and several spilled white paper sheets hang absolutely motionless in mid-air: time is frozen around her while she alone walks naturally. No other nearby people. Frontal full-body backward tracking shot, lead occupies two thirds of image height, expensive understated fashion-film composition, realistic soft lighting, clear face, no umbrellas or futuristic holograms.`,
  },
] as const;
export const scenes = referenceStyle ? referenceScenes : originalScenes;
type Checkpoint = {
  id: string;
  prompt: string;
  model: string;
  attemptedAt?: string;
  taskId?: string;
  status?: string;
  reservedCredits?: number;
  billedCredits?: number;
  downloaded?: boolean;
};

async function main() {
  loadEnvFiles();
  const { getAllConfigs } = await import('../src/modules/config/service');
  const configs = await getAllConfigs();
  const key = configs.evolink_api_key;
  if (!key || key.startsWith('••'))
    throw new Error(
      'No readable saved EvoLink API key; no generation submitted.'
    );
  console.log(
    JSON.stringify({
      keyAvailable: true,
      model,
      quality: '720p',
      duration: 5,
      clips: 4,
      estimatedUsd: 0.28,
    })
  );
  if (!process.argv.includes('--submit') && !process.argv.includes('--poll'))
    return;
  await mkdir(directory, { recursive: true });
  const request = async (path: string, body?: unknown) => {
    const response = await fetch(`https://api.evolink.ai${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new Error(
        `EvoLink HTTP ${response.status}; stop without resubmitting.`
      );
    return response.json();
  };
  for (const scene of scenes) {
    const file = resolve(directory, `${scene.id}.json`);
    let record: Checkpoint;
    try {
      record = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      record = { ...scene, model };
    }
    if (process.argv.includes('--submit') && !record.taskId) {
      if (record.attemptedAt)
        throw new Error(
          `${scene.id}: submission outcome uncertain; reconcile in dashboard before any retry.`
        );
      record.attemptedAt = new Date().toISOString();
      await writeFile(file, JSON.stringify(record, null, 2), { mode: 0o600 });
      const data = await request('/v1/videos/generations', {
        model,
        prompt: scene.prompt,
        duration: 5,
        quality: '720p',
        aspect_ratio: '16:9',
      });
      if (typeof data.id !== 'string')
        throw new Error('No task ID: reconcile before retry.');
      record.taskId = data.id;
      record.status = data.status;
      record.reservedCredits = data.usage?.credits_reserved;
      await writeFile(file, JSON.stringify(record, null, 2), { mode: 0o600 });
    }
    if (
      process.argv.includes('--poll') &&
      record.taskId &&
      !record.downloaded
    ) {
      const data = await request(
        `/v1/tasks/${encodeURIComponent(record.taskId)}`
      );
      record.status = data.status;
      record.billedCredits =
        data.usage?.credits_billed ?? data.usage?.credits_used;
      if (data.status === 'completed') {
        const url = data.results?.[0];
        if (typeof url !== 'string' || new URL(url).protocol !== 'https:')
          throw new Error('Missing HTTPS video result.');
        const response = await fetch(url, {
          signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) throw new Error(`Download HTTP ${response.status}`);
        await writeFile(
          resolve(directory, `${scene.id}-master.mp4`),
          new Uint8Array(await response.arrayBuffer())
        );
        record.downloaded = true;
      }
      await writeFile(file, JSON.stringify(record, null, 2), { mode: 0o600 });
    }
    console.log(
      JSON.stringify({
        id: scene.id,
        taskId: record.taskId,
        status: record.status,
        reservedCredits: record.reservedCredits,
        billedCredits: record.billedCredits,
        downloaded: record.downloaded,
      })
    );
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
