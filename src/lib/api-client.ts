// Typed client for the app's REST endpoints (src/routes/api/**).
// Unwraps the resp.ts envelope: { code: 0 | -1, message, data? }.

import { stabilizeMediaFile } from './media-file';

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: unknown,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface PageResult<T> {
  items: T[];
  total: number;
}

export interface PageParams {
  page: number;
  pageSize: number;
  search?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormData =
    typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body && !isFormData
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });
  const json = await res
    .json()
    .catch(() => ({ code: -1, message: res.statusText || 'Request failed' }));
  if (!res.ok || json.code !== 0) {
    throw new ApiError(
      json.code ?? -1,
      json.message || 'Request failed',
      json.data,
      res.status
    );
  }
  // respOk() omits data entirely — callers expecting void get undefined.
  return json.data as T;
}

export const apiGet = <T>(url: string, init?: RequestInit) =>
  request<T>(url, init);

/** Same-origin public media, with cancellation for a changed template. */
export async function apiGetMedia(url: string, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(15000);
  const res = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok || !res.headers.get('content-type')?.includes('video/'))
    throw new ApiError(-1, 'Could not load the selected reference video');
  // The timeout covers the response body too, not just its headers.
  return await res.blob();
}

/** Validate the response before creating a browser download (never save JSON errors). */
/** Validates, then hands the file to the browser's download manager. */
export async function apiDownload(url: string) {
  await request(`${url}${url.includes('?') ? '&' : '?'}check=1`);
  const link = document.createElement('a');
  link.href = url;
  link.download = '';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export const apiPost = <T = void>(url: string, body?: unknown) =>
  request<T>(url, {
    method: 'POST',
    body: body == null ? undefined : JSON.stringify(body),
  });

export const apiPut = <T = void>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = <T = void>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T = void>(url: string) =>
  request<T>(url, { method: 'DELETE' });

export async function apiUpload<T>(url: string, file: File, field = 'files') {
  return uploadFiles<T>(url, [file], field);
}

export async function apiUploadImages<T>(files: File[]) {
  return uploadFiles<T>('/api/storage/upload-image', files);
}

export class MediaUploadError extends Error {
  constructor(
    public endpoint: string,
    public attempts: number,
    public cause: unknown
  ) {
    super(cause instanceof Error ? cause.message : 'Upload failed');
    this.name = 'MediaUploadError';
  }
}

async function uploadFiles<T>(
  url: string,
  files: File[],
  field = 'files'
): Promise<T> {
  // A fresh body per attempt; a picker/file-system handle must never be reused
  // after checkout, a navigation, or a failed request body read.
  const stable = await Promise.all(files.map(stabilizeMediaFile));
  for (let attempt = 1; ; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const body = new FormData();
      stable.forEach((file) => body.append(field, file));
      return await request<T>(url, {
        method: 'POST',
        body,
        signal: controller.signal,
      });
    } catch (error) {
      const transient =
        error instanceof ApiError
          ? error.status === 429 ||
            (error.status ?? 0) >= 500 ||
            /^(Upload failed|Failed to fetch|Network error)/i.test(
              error.message
            )
          : error instanceof TypeError ||
            (error instanceof Error &&
              /AbortError|TimeoutError|NetworkError/.test(error.name));
      if (!transient || attempt >= 3)
        throw new MediaUploadError(url, attempt, error);
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
  }
}

// Query-string builder for paginated list endpoints.
export function pageQuery(base: string, p: PageParams) {
  const params = new URLSearchParams({
    page: String(p.page),
    pageSize: String(p.pageSize),
  });
  if (p.search) params.set('search', p.search);
  return `${base}?${params}`;
}
