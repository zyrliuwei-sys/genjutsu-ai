export const KATANA_PATH = '/higgsfield-katana';

export const katanaMeta = {
  title: 'Higgsfield Katana: Workflow, Examples & Costs',
  description:
    'Learn what Higgsfield Katana does, watch official examples, and understand Claude setup and credits. Try a separate short character edit in your browser.',
  checked: '2026-11-14',
};

export const katanaSources = {
  overview: 'https://higgsfield.ai/blog/higgsfield-katana',
  help: 'https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-use-katana',
  connect:
    'https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-connect-higgsfield-to-ai-agent',
  credits:
    'https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp',
  demo: 'https://higgsfield.ai/mcp/katana',
  library: 'https://higgsfield.ai/katana',
};

// Public official demonstrations, kept on the original host and credited in-page.
// They are editorial examples, never generation inputs or claimed local results.
export const katanaExamples = [
  {
    title: 'A live-action aura edit',
    video:
      'https://static.higgsfield.ai/landing/gpt-skills/katana/20261016/test_v2.mp4',
    poster:
      'https://static.higgsfield.ai/landing/gpt-skills/katana/20261016/test_v2-poster.webp',
    duration: '12.4 seconds',
    source: katanaSources.demo,
    note: 'Watch how framing, movement and graphic accents work together. When you choose a reference, judge the whole sequence as well as the face in one frame.',
  },
  {
    title: 'An anime-style aura preview',
    video:
      'https://static.higgsfield.ai/katana-hero-optimized-2026-10-09/anime-aura-mini.mp4',
    poster:
      'https://static.higgsfield.ai/katana-hero-optimized-2026-10-09/anime-aura-thumbnail.webp',
    duration: '8 seconds',
    source: katanaSources.library,
    note: 'Use this preview to think about the finish you want. Check linework, character consistency and transitions across the cut; a still thumbnail cannot show those details.',
  },
] as const;

export const katanaSteps = [
  {
    title: 'Connect the official service',
    body: 'With a paid Higgsfield account, open Claude’s Settings → Connectors. Add Higgsfield using https://mcp.higgsfield.ai/mcp and sign in. An API key is not required.',
    source: katanaSources.connect,
  },
  {
    title: 'Choose the edit and the assets',
    body: 'Choose a Katana preset or your reference edit, then supply up to five images. Use the Higgsfield upload window in the chat so the files reach the service.',
    source: katanaSources.help,
  },
  {
    title: 'Say what stays and what changes',
    body: 'Start the request with /katana. Identify the subject to replace and the parts of the reference to retain. The brief examples below are starting points you can adapt.',
    source: katanaSources.demo,
  },
  {
    title: 'Review the quote, then the edit',
    body: 'Check the credit quote before confirming. After delivery, review the full sequence and describe any corrections in the same chat. New generations can add to the cost.',
    source: katanaSources.overview,
  },
];

export const katanaBriefs = [
  {
    title: 'A character-led edit',
    text: '/katana Use my uploaded character reference for the lead. Keep the opening beat and the final close-up from the reference edit. Preserve the jacket color. Show me the credit estimate before generating.',
  },
  {
    title: 'A product reveal',
    text: '/katana Rebuild the reference around my product images. Start with the silhouette, reveal the front label, then finish on the pack. Keep the packaging proportions and label legible. Quote the generation cost first.',
  },
  {
    title: 'A fashion sequence',
    text: '/katana Use these outfit photos throughout the reference sequence. Keep the fabric color and sleeve length consistent. Include a full-body view before the detail shot. Estimate the credits before starting.',
  },
];

export const katanaFaq = [
  {
    q: 'What is Higgsfield Katana?',
    a: 'Katana is Higgsfield’s reference-edit workflow in Claude. A video or preset supplies the edit structure; images supply the new subjects. Higgsfield runs the generations through its connector.',
    source: katanaSources.overview,
  },
  {
    q: 'Is Katana a sword or samurai video effect?',
    a: 'Here, Katana is the name of a video-editing workflow. Its official examples cover aura edits and stylized sequences; the name does not restrict the output to swords or samurai scenes.',
    source: katanaSources.demo,
  },
  {
    q: 'Is Higgsfield Katana free or unlimited?',
    a: 'A paid Higgsfield plan is required. Generations through MCP spend credits even when a plan includes unlimited access on the Higgsfield website. Check the quote for your particular edit.',
    source: katanaSources.credits,
  },
  {
    q: 'Can I use Katana in ChatGPT?',
    a: 'The Katana-specific help page documents Claude. Higgsfield also has connections for other assistants, but that alone does not establish identical Katana features in every client. Check the current Katana entry point.',
    source: katanaSources.help,
  },
  {
    q: 'How long can a Katana video be?',
    a: 'Check the selected workflow’s current limits. The official 3–30 second requirement describes videos submitted as community presets; it should not be treated as a universal output-length guarantee.',
    source: katanaSources.help,
  },
  {
    q: 'Is the generator on this page official Katana?',
    a: 'No. This site is an independent service. The generator below the guide edits a short reference clip with a character photo. It does not connect to your Higgsfield account or reproduce the full Katana editing workflow.',
  },
  {
    q: 'What can I generate on this page?',
    a: 'Choose a built-in scene or upload a 3–10 second clip, add a clear character photo, and create a paid character edit. Longer uploads are trimmed. The displayed price, saved draft and result download belong to this site’s existing editor.',
  },
];
