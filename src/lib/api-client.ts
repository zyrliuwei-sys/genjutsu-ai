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

/** Same-origin public practice files. Components still use the shared client. */
export async function apiPublicFile(path: string, name: string, type: string) {
  if (
    !['/videos/genjutsu-samples/', '/videos/genjutsu-practice/'].some(
      (prefix) => path.startsWith(prefix)
    ) ||
    path.includes('..')
  )
    throw new Error('Invalid practice media path');
  const response = await fetch(path);
  if (!response.ok) throw new Error('Practice media could not be loaded');
  return new File([await response.blob()], name, { type });
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
