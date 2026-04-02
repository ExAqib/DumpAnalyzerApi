export type ApiError = {
  status: number
  message: string
  details?: unknown
}

function getBaseUrl(): string {
  // In dev we use Vite proxy, so relative paths work.
  // In prod, allow configuring a full backend URL if needed.
  return (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() ?? ''
}

export async function apiFetch<T>(
  path: string,
  opts: {
    method?: 'GET' | 'POST'
    token?: string | null
    body?: unknown
    signal?: AbortSignal
  } = {},
): Promise<T> {
  const url = getBaseUrl() ? `${getBaseUrl()}${path}` : path
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.token) headers['token'] = opts.token

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: opts.signal,
  })

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined)

  if (!res.ok) {
    const msg =
      (payload && typeof payload === 'object' && 'error' in (payload as any) && (payload as any).error) ||
      (payload && typeof payload === 'object' && 'Error' in (payload as any) && (payload as any).Error) ||
      res.statusText ||
      'Request failed'
    throw { status: res.status, message: String(msg), details: payload } satisfies ApiError
  }

  return payload as T
}

