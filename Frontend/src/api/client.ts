/**
 * Resolve API base URL:
 * 1) VITE_API_URL (build-time)
 * 2) Production hosts → Render backend
 * 3) Local Vite → /api (proxied to localhost:5000)
 */
function resolveApiBase(): string {
  const fromEnv = String(import.meta.env.VITE_API_URL || '')
    .trim()
    .replace(/\/$/, '')
  if (fromEnv) return fromEnv

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return 'https://restoration-b.onrender.com/api'
    }
  }

  return '/api'
}

const API_BASE = resolveApiBase()

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = resolveApiBase()
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(body.message || `Request failed (${res.status})`, res.status)
  }
  return body as T
}

export type ResourceRow = Record<string, unknown> & { _id?: string }

interface ListResponse {
  success: boolean
  resource: string
  count: number
  data: ResourceRow[]
}

interface ItemResponse {
  success: boolean
  data: ResourceRow
}

/** Strip Mongo / mongoose internals before create/update */
export function sanitizePayload(payload: ResourceRow): ResourceRow {
  const clean: ResourceRow = { ...payload }
  delete clean._id
  delete clean.__v
  delete clean.createdAt
  delete clean.updatedAt
  return clean
}

export const api = {
  get base() {
    return resolveApiBase()
  },

  health: () =>
    request<{ success: boolean; resources: number; database?: string }>('/health'),

  list: (resource: string, search = '') => {
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    return request<ListResponse>(`/${resource}${q}`)
  },

  get: (resource: string, id: string) =>
    request<ItemResponse>(`/${resource}/${encodeURIComponent(id)}`),

  create: (resource: string, payload: ResourceRow) =>
    request<ItemResponse>(`/${resource}`, {
      method: 'POST',
      body: JSON.stringify(sanitizePayload(payload)),
    }),

  update: (resource: string, id: string, payload: ResourceRow) =>
    request<ItemResponse>(`/${resource}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizePayload(payload)),
    }),

  remove: (resource: string, id: string) =>
    request<{ success: boolean; message: string }>(
      `/${resource}/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),
}
