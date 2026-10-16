const API_BASE = '/api'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
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
  health: () => request<{ success: boolean; resources: number }>('/health'),

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
