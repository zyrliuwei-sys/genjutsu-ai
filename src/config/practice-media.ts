/** Third-party and user-provided practice inputs, not a claimed Kling editing result.
 * Sources and preparation: docs/practice-media-sources.md.
 * Each set has its own five-second source and a distinct character photo.
 * Motion guidance never overrides the user's background choice. */
export const PRACTICE_SAMPLES = [
  {
    id: 'dance',
    video: '/videos/genjutsu-practice/dance-user-v5-5s.mp4',
    image: '/videos/genjutsu-practice/character-dance-standing-v19.jpg',
    poster: '/videos/genjutsu-practice/dance-user-v5-poster.jpg',
    duration: 5,
    width: 720,
    height: 1280,
    aspect: '9:16',
    direction:
      'Recast the solo dancer using the supplied character photo. Preserve the source choreography, floor-supported rotations, hand contacts, body trajectory and full-body vertical framing. Retain the flowing black-and-gold dress, circular skirt motion and existing golden particles, with coherent face and anatomy. When keeping the background, retain the industrial indoor studio, ceiling lights and reflective floor. Do not add dancers, cuts or new effects, or replace the dance with a portrait animation.',
  },
  {
    id: 'action',
    video: '/videos/genjutsu-practice/action-dojo-v8-5s.mp4',
    image: '/videos/genjutsu-practice/character-action-casual-v9.jpg',
    poster: '/videos/genjutsu-practice/action-dojo-v8-poster.jpg',
    duration: 5,
    width: 1280,
    height: 720,
    aspect: '16:9',
    direction:
      'Recast only the white-gi/red-belt fighter as the supplied photo character, matching that photo’s identity and outfit; keep the brown-clad opponent unchanged. Preserve punches, blocks, kicks, footwork, contacts, occlusions and camera motion. Maintain coherent anatomy, fabric motion and lighting. When keeping the background, retain the wooden dojo, windows, lanterns and mats. Do not swap both people or invent choreography, weapons, effects or cuts.',
  },
  {
    id: 'parkour',
    video: '/videos/genjutsu-practice/parkour-rooftop-v11-5s.mp4',
    image: '/videos/genjutsu-practice/character-parkour-street-v13.jpg',
    poster: '/videos/genjutsu-practice/parkour-rooftop-v11-poster.jpg',
    duration: 5,
    width: 1280,
    height: 720,
    aspect: '16:9',
    direction:
      'Recast the red-shirt/black-beanie rooftop performer using the character photo. Preserve the original running, jumps over furniture, foot placements, landings, body trajectory and following camera. Keep facial identity consistent with the photo and match daylight, clothing motion and contact shadows. When keeping the background, retain the urban rooftops, skyline, sofa, mattress and chairs. Do not invent extra jumps, flips, people, effects or cuts.',
  },
  {
    id: 'walk',
    video: '/videos/genjutsu-practice/walk-crowd-v12-5s.mp4',
    image: '/videos/genjutsu-practice/character-crowd-shirt-tie-v14.jpg',
    poster: '/videos/genjutsu-practice/walk-crowd-v12-poster.jpg',
    duration: 5,
    width: 1280,
    height: 720,
    aspect: '16:9',
    direction:
      'Recast only the central female lead using the character photo; keep surrounding dancers unchanged. Maintain consistent lead identity across existing shots. Preserve group choreography, spacing, body contacts, occlusions, stairs, camera motion and original edit rhythm. Match photoreal anatomy and lighting. When keeping the background, retain the original architecture and existing fire. Do not add people, new fire, injuries, effects or camera cuts.',
  },
] as const;
