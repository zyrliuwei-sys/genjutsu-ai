import { envConfigs } from '@/config';
import { GUIDES } from '@/lib/guides';
import { m } from '@/paraglide/messages.js';

type Entry = { path: string; title: string; description: string };

const PAGES: Entry[] = [
  {
    path: '',
    title: 'Genjutsu AI',
    description:
      'Put yourself into any viral video from one photo: pick an effect or upload a clip',
  },
  {
    path: '/create',
    title: 'Create',
    description:
      'Character swap studio: put yourself into an effect clip or your own video from one photo',
  },
  {
    path: '/pricing',
    title: 'Pricing',
    description: 'One-time video packs from $9.90 with no automatic renewal',
  },
];

const EFFECTS: Entry[] = [
  {
    path: '/crazy-frog-ai',
    title: 'Crazy Frog AI',
    description: 'Become the rider in the Crazy Frog chase from one photo',
  },
  {
    path: '/ozil-ai',
    title: 'Ozil AI',
    description: 'Become the player in the Ozil chip-goal trend from one photo',
  },
  {
    path: '/flying-car-ai',
    title: 'Flying Car AI',
    description: 'Put your own car into the ramp-and-flip stunt from one photo',
  },
  {
    path: '/bulin-47-ai',
    title: 'Bulin 47 AI',
    description:
      'Take the rapper’s place in the Bulin 47 street freestyle from one photo',
  },
];

const RESOURCES: Entry[] = [
  {
    path: '/genjutsu-free',
    title: 'Is Genjutsu AI free?',
    description: 'What is free, pack prices and the cost per video',
  },
  {
    path: '/genjutsu-video-ai',
    title: 'Genjutsu Video AI',
    description: 'Use cases for shorts, ads and B-roll, and the effect library',
  },
  {
    path: '/higgsfield-genjutsu-alternative',
    title: 'Higgsfield Genjutsu alternative',
    description:
      'How this independent site differs from Higgsfield Genjutsu, and which fits your clip',
  },
  {
    path: '/ai-genjutsu-generator',
    title: 'Genjutsu AI Generator',
    description:
      'Seedance text-to-video options and how they differ from swaps',
  },
];

const LEGAL: Entry[] = [
  {
    path: '/privacy-policy',
    title: 'Privacy Policy',
    description: 'Privacy information',
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service',
    description: 'Terms of use',
  },
  {
    path: '/aup',
    title: 'Acceptable Use Policy',
    description: 'What you may upload and post',
  },
];

/** llms.txt body; `full` appends the About section (llms-full.txt). */
export function buildLlmsTxt({ full = false } = {}) {
  const { app_url, app_name } = envConfigs;
  const list = (entries: Entry[]) =>
    entries.map((p) => `- [${p.title}](${app_url}${p.path}): ${p.description}`);
  const guides: Entry[] = GUIDES.map((g) => ({
    path: g.href,
    title: g.meta.h1,
    description: g.meta.description,
  }));

  const lines = [
    `# ${app_name}`,
    '',
    `> ${m['common.metadata.description']({}, { locale: 'en' })}`,
    '',
    `${app_name} is an independent tool and is not affiliated with Higgsfield.`,
    '',
    '## Pages',
    '',
    ...list(PAGES),
    '',
    '## Trend effects',
    '',
    ...list(EFFECTS),
    '',
    '## Guides',
    '',
    ...list(guides),
    '',
    '## Resources',
    '',
    ...list(RESOURCES),
    '',
    '## Legal',
    '',
    ...list(LEGAL),
  ];
  if (full) {
    lines.push(
      '',
      '## About',
      '',
      m['landing.about.p1']({}, { locale: 'en' }),
      '',
      m['landing.about.p3']({}, { locale: 'en' })
    );
  }
  lines.push('');
  return lines.join('\n');
}
