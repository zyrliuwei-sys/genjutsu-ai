// Typed client for the app's REST endpoints (src/routes/api/**).
// Unwraps the resp.ts envelope: { code: 0 | -1, message, data? }.

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: unknown
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
  if (json.code !== 0) {
    throw new ApiError(
      json.code ?? -1,
      json.message || 'Request failed',
      json.data
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
export async function apiDownload(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  const type = response.headers.get('content-type') || '';
  if (
    !response.ok ||
    (!type.startsWith('video/') && !type.startsWith('image/'))
  ) {
    const error = await response.json().catch(() => null);
    throw new ApiError(-1, error?.message || 'Download failed. Please retry.');
  }
  const blob = await response.blob();
  const filename =
    response.headers
      .get('content-disposition')
      ?.match(/filename="([^"]+)"/)?.[1] || 'genjutsu-video.mp4';
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
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
  const body = new FormData();
  body.append(field, file);
  return request<T>(url, { method: 'POST', body });
}

// Query-string builder for paginated list endpoints.
export async function apiUploadImages<T>(files: File[]) {
  const body = new FormData();
  files.forEach((file) => body.append('files', file));
  return request<T>('/api/storage/upload-image', { method: 'POST', body });
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
