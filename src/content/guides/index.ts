import type { GuideMeta } from '@/lib/guides';

/**
 * Metadata for every guide. Each key is a slug with a matching body in
 * ./<slug>.en.mdx (English only), served at /guides/<slug>. Kept out of the
 * MDX so listing guides never bundles their text. Order = display order
 * (homepage and /guides), so put new guides first. `faq` becomes FAQPage
 * structured data: keep each answer identical to the text on the page.
 */
export const GUIDE_METAS: Record<string, GuideMeta> = {
  'apps-similar-to-genjutsu-ai': {
    title:
      'What Is Similar to Genjutsu AI? Alternatives Grouped by What They Do',
    h1: 'What Is Similar to Genjutsu AI?',
    description:
      'Tools similar to Genjutsu AI — Runway, Kling, Viggle, Luma, Pika, Higgsfield and Wan 2.2 Animate — grouped by job, plus a ten-minute test to pick one.',
    card_title: 'Tools similar to Genjutsu AI',
    published_at: '2026-10-30',
    updated_at: '2026-10-30',
    faq: [
      {
        q: 'Is there a free app similar to Genjutsu AI?',
        a: 'The open-source Wan 2.2 Animate is free to run if you have a powerful GPU. Hosted tools usually limit or watermark free use and charge for full-quality renders.',
      },
      {
        q: 'What is the difference between Viggle and Genjutsu AI?',
        a: 'Viggle moves a character image the way someone in a video moves, usually on a new background. A Genjutsu edit keeps the original video, including its background and camera, and replaces the person in it.',
      },
      {
        q: 'Can one tool do everything?',
        a: 'Not well. Character swaps, motion transfer, object swaps and restyles are different jobs, and each tool is tuned for one or two of them.',
      },
    ],
  },
  'higgsfield-genjutsu-local-rtx-5090': {
    title: 'How to Do Higgsfield Genjutsu on an RTX 5090 with Local AI',
    h1: 'How to Do Higgsfield Genjutsu Locally on an RTX 5090',
    description:
      'Rebuild the Higgsfield Genjutsu workflow on your own RTX 5090 with ComfyUI, Wan 2.2 Animate and Wan VACE: setup, character and object swaps, and limits.',
    card_title: 'Higgsfield Genjutsu on an RTX 5090',
    published_at: '2026-10-30',
    updated_at: '2026-10-30',
    faq: [
      {
        q: 'Can I run Higgsfield Genjutsu itself locally?',
        a: "No. Higgsfield's models are closed and run only on Higgsfield's servers. Locally you rebuild the same workflow with open models such as Wan 2.2 Animate and Wan VACE.",
      },
      {
        q: 'Is 32 GB of VRAM enough?',
        a: 'Yes for 14B video models in fp8 at around 720p. Full bf16 weights or 1080p long clips need offloading and get much slower.',
      },
      {
        q: 'Do I need Linux?',
        a: 'No. ComfyUI runs on Windows with a CUDA 12.8+ PyTorch build; Linux is only slightly faster and makes some speed-up libraries easier to install.',
      },
    ],
  },
  'genjutsu-trend-ideas': {
    title: 'Genjutsu Trend Ideas: 12 Viral Video Ideas for TikTok and Reels',
    h1: 'Genjutsu Trend Ideas That Actually Get Shared',
    description:
      '12 Genjutsu trend ideas for friends, couples, families and creators, plus the three-part formula behind viral swap videos and how to post them.',
    card_title: 'Genjutsu trend ideas',
    published_at: '2026-10-26',
    updated_at: '2026-10-26',
    faq: [
      {
        q: 'What makes a Genjutsu trend video work?',
        a: 'A scene with a hook, a person your audience knows, and a caption that sets up the twist before the reveal. If one of the three is missing, the clip usually reads as a cool AI effect and gets scrolled past.',
      },
      {
        q: 'How do I make a Genjutsu trend post perform?',
        a: 'Start on the most dramatic frame, post vertical 9:16, keep it under 10 seconds so it loops, label it as AI where the platform asks you to, and only swap people who said yes.',
      },
    ],
  },
  'what-is-genjutsu-ai': {
    title: 'What Is Genjutsu AI? The Viral Video Trend Explained (2026)',
    h1: 'What Is Genjutsu AI?',
    description:
      'Genjutsu AI keeps a video’s motion and camera while replacing the person, outfit or world in it. Where the name comes from, how it differs from face swaps, and its limits.',
    card_title: 'What is Genjutsu AI?',
    published_at: '2026-10-26',
    updated_at: '2026-10-26',
    faq: [
      {
        q: 'What does Genjutsu mean in AI video?',
        a: '"Genjutsu AI" is a style of AI video editing where you keep the movement, camera and timing of an existing clip, and change what is in it: the person, their outfit, an object or the whole world around them. The name comes from genjutsu, the illusion technique in Naruto: the scene looks real, but it is not what was actually filmed.',
      },
      {
        q: 'What is the difference between Genjutsu and a face swap?',
        a: 'A face swap changes a face, text-to-video invents a scene, and a Genjutsu edit recasts a real performance.',
      },
      {
        q: "What can't Genjutsu AI do yet?",
        a: 'Fast spins and turns away from the camera are where the face is most likely to drift. Hands and small objects can change shape between frames. Crowded shots work best when one person is clearly the main subject. Hard cuts are harder to keep consistent than one continuous shot. It keeps what the original clip does; it will not add a new action that was never filmed.',
      },
    ],
  },
  'how-to-use-genjutsu-ai': {
    title:
      'How to Use Genjutsu AI: Put Yourself in a Viral Video (Step by Step)',
    h1: 'How to Use Genjutsu AI, Step by Step',
    description:
      'How to make a Genjutsu AI video that actually looks like you: which scene to start with, how to pick your clip and photo, and what to check before you post.',
    card_title: 'How to use Genjutsu AI',
    published_at: '2026-10-26',
    updated_at: '2026-10-26',
    faq: [
      {
        q: 'Can I use it on my phone?',
        a: 'Yes. It runs in the browser on phones and computers; there is nothing to install.',
      },
      {
        q: 'Can I make several versions with the same photo?',
        a: 'Yes. Each version is a separate render, so you can try the same photo in different scenes, or a different photo in the same scene, and keep the one you like best.',
      },
      {
        q: 'Can I change 16:9 to 9:16 after rendering?',
        a: 'No. The format is set before you generate, so pick the platform you are posting to first; a different format means a new render.',
      },
    ],
  },
  'genjutsu-ai-prompts': {
    title: 'Genjutsu AI Prompts: A Universal Template + 12 Copy-Paste Examples',
    h1: 'Genjutsu AI Prompts That Keep the Motion and Change the Person',
    description:
      'A universal Genjutsu prompt template plus 12 real examples for character, outfit, vehicle and world swaps — and why most Genjutsu prompts fail.',
    card_title: 'Genjutsu AI prompts',
    published_at: '2026-10-26',
    updated_at: '2026-10-26',
    faq: [
      {
        q: 'What is the universal Genjutsu prompt?',
        a: 'A good Genjutsu prompt does two things in this order — it names the one thing to replace, then lists everything that must stay exactly as filmed: "Replace only [the subject] with the [person / vehicle] from the image. Keep [the motion], [the other people or objects], [the location and lighting], the camera movement and every cut exactly as in the reference video. Do not add [people, text, logos or new actions]."',
      },
      {
        q: 'Why do Genjutsu prompts fail?',
        a: 'Most failed Genjutsu videos come from prompts that only describe the new character and forget to protect the motion, the camera and the background.',
      },
    ],
  },
};
