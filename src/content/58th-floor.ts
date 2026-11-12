/** English-only landing page. Context comes from our existing 58th Floor guide. */
export const floorMeta = {
  title: '58th Floor AI Video Generator: Two Photos, One Studio Duet',
  description:
    'Make a 58th Floor AI video with two photos. Choose a teal-studio duet, assign each performer, and generate a 10-second vertical video with the reference motion.',
};

export const floorSteps = [
  {
    title: 'Choose the performance',
    body: 'Play both reference takes before picking one. The mic handoff moves from the opening pair into a close-up and a wider view; the wide studio duet starts with both performers in view. Both templates are 10 seconds long and prepared in 9:16. The preview is the exact motion reference for your edit.',
  },
  {
    title: 'Give each role a photo',
    body: 'Upload one clear portrait for the opening-left performer and another for the opening-right performer. Use a single visible face in each image, with even lighting and no hand covering it. The roles refer to the first shot of the selected take; switching templates can change which outfit is on each side. Check the preview again before generating.',
  },
  {
    title: 'Generate, review and download',
    body: 'Sign in and choose a credit pack if you need one, then submit your duet. The generator uses both portraits and the selected reference clip. When the video is ready, watch the full result before downloading: check both faces, the handoff, the hands and the hanging microphone, including the cuts between shots.',
  },
];

export const floorChecks = [
  {
    title: 'Two portraits, two distinct roles',
    body: 'A group selfie leaves the identity assignment unclear. Use separate photos and give the clearer portrait to the performer whose close-up matters most to you. The generator follows the opening-left and opening-right roles through the clip; a later camera cut should not be interpreted as a new person.',
  },
  {
    title: 'Keep the microphone and both people',
    body: 'The prepared takes use a fixed 9:16 format for Shorts, Reels and TikTok. Both performers, the suspended microphone and the full-body movement are framed within the reference. Preview the whole sequence before choosing it: a close-up emphasizes one role, while the wider shot gives the interaction room to read.',
  },
  {
    title: 'Listen as well as look',
    body: 'Sound retention depends on the configured editing provider. The reference recording may contain explicit lyrics, and keeping its audio is not a guarantee of exact lip-sync. Listen to the downloaded file and use audio you can publish. Identify the clip as an AI remake when sharing it.',
  },
];

export const floorFaq = [
  {
    q: 'What is the 58th Floor AI trend?',
    a: 'It is a photo-based remake of the teal-studio performance associated with Anderson .Paak and Cordae’s “58th Floor” COLORS session. Two performers share a hanging microphone and trade the performance between them. The song title refers to the track, not a skyscraper scene. This editor is independent of COLORS and the artists.',
  },
  {
    q: 'How do I make my own 58th Floor video here?',
    a: 'Choose one of the two reference takes, upload a separate portrait for each performer, and generate from the studio on this page. Photo 1 goes to the opening-left performer and photo 2 to the opening-right performer. The editor submits both photos with the selected clip; you can review and download the result in the same panel.',
  },
  {
    q: 'Can I use just one photo?',
    a: 'These duet templates require two photo uploads so each role has an explicit identity. You can choose the same portrait for both slots if you want a double of yourself. Use photos of yourself or people who agreed to appear in the edit, and keep one visible face per upload.',
  },
  {
    q: 'How long is the video, and which format should I use?',
    a: 'Both prepared templates are 10-second, 9:16 reference clips at 720 × 1280. They are shortened takes, not the full 15- or 30-second examples linked from the source. The duet studio keeps the selected take’s vertical framing and duration; it does not offer a widescreen or extended version.',
  },
  {
    q: 'Is 58th Floor AI free to generate?',
    a: 'Watching the reference previews is free. A personalized generation uses paid credits from a one-time pack, with the price shown before payment. Uploading two portraits does not create a free personalized preview; the reference videos show the scene you will use.',
  },
  {
    q: 'Will the faces and lip movements match perfectly?',
    a: 'No perfect likeness or lip-sync is guaranteed. The edit is guided by both photos and the reference performance, but faces, hands and identity can change across movement or cuts. Check the complete export rather than only its first frame. Clear, unobstructed portraits make the intended identities easier to communicate.',
  },
];
