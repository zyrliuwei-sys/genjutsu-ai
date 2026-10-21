/**
 * Backdrops offered by the Hotel Lobby generator (client-safe).
 *
 * Only the scene image changes per backdrop; the reference performance
 * (motion + audio) is the same for every scene.
 */

export const DUET_SCENES = {
  'orange-studio': {
    background:
      'The orange background is very important: use a bold, saturated, seamless burnt-orange studio background, clean and uniform, with no patterns, props, or visible room details. Use soft even studio lighting.',
  },
  'hotel-lobby': {
    background:
      'Set them in an elegant hotel lobby: polished marble floor, a crystal chandelier overhead, warm golden ambient light, the background softly out of focus and with no other people.',
  },
  'night-street': {
    background:
      'Set them on a city street at night: graffiti walls, warm streetlights and a few blurred city lights, the background softly out of focus and with no other people.',
  },
  'neon-studio': {
    background:
      'Set them in a recording studio lit by pink and blue neon strips with acoustic panels on the walls, the background softly out of focus and with no other people.',
  },
} as const;

export type DuetScene = keyof typeof DUET_SCENES;

export const DEFAULT_DUET_SCENE: DuetScene = 'orange-studio';

export function isDuetScene(value: unknown): value is DuetScene {
  return typeof value === 'string' && value in DUET_SCENES;
}
