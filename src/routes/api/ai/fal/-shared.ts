import { AIMediaType, FalProvider } from '@/core/ai';
import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import { hasPermission } from '@/modules/rbac/service';

// Fal models this app is allowed to call. Anything else is rejected so the
// endpoint can't be used as an open proxy to the whole fal catalog.
export const FAL_MODELS: Record<
  string,
  { mediaType: AIMediaType; requires: string[] }
> = {
  // Text-to-image
  'openai/gpt-image-2': {
    mediaType: AIMediaType.IMAGE,
    requires: ['prompt'],
  },
  // Image edit / multi-reference compose (up to 16 image_urls)
  'openai/gpt-image-2/edit': {
    mediaType: AIMediaType.IMAGE,
    requires: ['prompt', 'image_urls'],
  },
  // Motion transfer: animate the character in image_url with video_url's motion
  'fal-ai/bytedance/dreamactor/v2': {
    mediaType: AIMediaType.VIDEO,
    requires: ['image_url', 'video_url'],
  },
};

// Per-model passthrough fields accepted from the client.
export const FAL_INPUT_FIELDS = [
  'image_urls',
  'image_url',
  'video_url',
  'mask_url',
  'image_size',
  'quality',
  'background',
  'num_images',
  'output_format',
  'trim_first_second',
];

// Admin-only until per-generation credit pricing is decided.
export async function requireAdmin(request: Request) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  const isAdmin = await hasPermission(session.user.id, 'admin.*');
  if (!isAdmin) return { ok: false as const, error: 'Forbidden' };
  return { ok: true as const, user: session.user };
}

export async function getFalProvider() {
  const configs = await getAllConfigs();
  if (!configs.fal_api_key) throw new Error('Fal API key is not configured');
  return new FalProvider({ apiKey: configs.fal_api_key });
}
