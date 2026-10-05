/**
 * Evolink provider (async video tasks).
 * @docs https://evolink.ai/docs/en/api-manual/video-series/seedance2.0/seedance-2.0-text-to-video
 *
 * POST /v1/videos/generations → { id, status }
 * GET  /v1/tasks/{id}         → { status, progress, results: [url], error }
 * Result URLs expire after 24 hours.
 */

export const EVOLINK_API_BASE = 'https://api.evolink.ai';

export type EvolinkTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type EvolinkTask = {
  id: string;
  status: EvolinkTaskStatus;
  progress: number;
  url: string | null;
  error: string | null;
};

/**
 * The marketing site (evolink.ai) is not the API host — map it, and an empty
 * value, to api.evolink.ai so a common admin typo still works.
 */
export function normalizeEvolinkBaseUrl(value?: string) {
  const trimmed = (value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return EVOLINK_API_BASE;
  try {
    const host = new URL(trimmed).hostname;
    if (host === 'evolink.ai' || host === 'www.evolink.ai') {
      return EVOLINK_API_BASE;
    }
  } catch {
    return EVOLINK_API_BASE;
  }
  return trimmed;
}

export class EvolinkProvider {
  readonly name = 'evolink';
  private apiKey: string;
  private baseUrl: string;

  constructor(configs: { apiKey: string; baseUrl?: string }) {
    this.apiKey = configs.apiKey;
    this.baseUrl = normalizeEvolinkBaseUrl(configs.baseUrl);
  }

  private async request(path: string, init?: RequestInit) {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    const data: any = await resp.json().catch(() => null);
    if (!resp.ok || !data) {
      throw new Error(
        data?.error?.message || `Evolink request failed (${resp.status})`
      );
    }
    return data;
  }

  /** Submit a video generation; returns the Evolink task id. */
  async createVideo(body: Record<string, unknown>): Promise<string> {
    const data = await this.request('/v1/videos/generations', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!data.id) throw new Error('Evolink returned no task id');
    return data.id as string;
  }

  async getTask(id: string): Promise<EvolinkTask> {
    const data = await this.request(`/v1/tasks/${encodeURIComponent(id)}`);
    return {
      id: data.id,
      status: data.status,
      progress: Number(data.progress) || 0,
      url: Array.isArray(data.results) ? (data.results[0] ?? null) : null,
      error: data.error?.message ?? null,
    };
  }
}
