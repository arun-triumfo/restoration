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

let authToken: string | null =
  typeof localStorage !== 'undefined' ? localStorage.getItem('rugos-auth-token') : null

export function setAuthToken(token: string | null) {
  authToken = token
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = resolveApiBase()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
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

export type TenantDto = {
  id: string
  name: string
  slug: string
  plan: string
  planLabel?: string
  seats?: number
  modules?: string[]
  billingStatus?: string
  renewsAt?: string | null
}

export type AuthUserDto = {
  email: string
  name: string
  role: string
  roleCode: string
  tenantId: string
  tenant?: TenantDto
  status?: string
  menus?: string[]
  permissions?: { resources: string[]; actions: string[] }
}

export type IntegrationConnection = {
  id: string
  channel: string
  status: string
  shopDomain?: string | null
  lastSyncAt?: string | null
  lastError?: string | null
  hasSecret?: boolean
  secretHint?: string | null
  meta?: Record<string, unknown>
}

/** Strip Mongo / mongoose internals before create/update */
export function sanitizePayload(payload: ResourceRow): ResourceRow {
  const clean: ResourceRow = { ...payload }
  delete clean._id
  delete clean.__v
  delete clean.createdAt
  delete clean.updatedAt
  delete clean.passwordHash
  return clean
}

export const api = {
  get base() {
    return resolveApiBase()
  },

  health: () =>
    request<{ success: boolean; resources: number; database?: string; auth?: string }>('/health'),

  login: (email: string, password: string) =>
    request<{ success: boolean; token: string; user: AuthUserDto }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ success: boolean; user: AuthUserDto }>('/auth/me'),

  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  platform: {
    listTenants: () =>
      request<{ success: boolean; count: number; data: TenantDto[] }>('/platform/tenants'),
    createTenant: (payload: Record<string, unknown>) =>
      request<{
        success: boolean
        tenant: TenantDto
        admin: { email: string; name: string; tempPassword: string }
        message?: string
      }>('/platform/tenants', { method: 'POST', body: JSON.stringify(payload) }),
    myTenant: () => request<{ success: boolean; tenant: TenantDto }>('/platform/tenant/me'),
    updateTenant: (tenantId: string, payload: Record<string, unknown>) =>
      request<{ success: boolean; tenant: TenantDto }>(
        `/platform/tenants/${encodeURIComponent(tenantId)}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
      ),
  },

  integrations: {
    list: () =>
      request<{ success: boolean; data: IntegrationConnection[] }>('/integrations'),
    connect: (channel: string, payload: Record<string, unknown>) =>
      request<{ success: boolean; connection: IntegrationConnection; message?: string }>(
        `/integrations/${encodeURIComponent(channel)}/connect`,
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    disconnect: (channel: string) =>
      request<{ success: boolean; message?: string }>(
        `/integrations/${encodeURIComponent(channel)}/disconnect`,
        { method: 'POST', body: '{}' },
      ),
    test: (channel: string) =>
      request<{ success: boolean; message?: string }>(
        `/integrations/${encodeURIComponent(channel)}/test`,
        { method: 'POST', body: '{}' },
      ),
    sync: (channel: string) =>
      request<{
        success: boolean
        imported?: number
        orderIds?: string[]
        message?: string
      }>(`/integrations/${encodeURIComponent(channel)}/sync`, {
        method: 'POST',
        body: '{}',
      }),
  },

  shipping: {
    list: () =>
      request<{ success: boolean; count: number; data: ResourceRow[] }>('/shipping'),
    rates: (payload: Record<string, unknown>) =>
      request<{
        success: boolean
        carrier: string
        carrierLabel: string
        rates: { service: string; name: string; days: number; amount: number; currency: string }[]
      }>('/shipping/rates', { method: 'POST', body: JSON.stringify(payload) }),
    buyLabel: (payload: Record<string, unknown>) =>
      request<{ success: boolean; shipment: ResourceRow; message?: string }>('/shipping/labels', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    track: (awb: string) =>
      request<{ success: boolean; shipment: ResourceRow }>(
        `/shipping/track/${encodeURIComponent(awb)}`,
      ),
  },

  packing: {
    queue: () =>
      request<{ success: boolean; count: number; data: ResourceRow[] }>('/packing/queue'),
    confirm: (payload: {
      orderId: string
      scannedSku: string
      photoDataUrl?: string
    }) =>
      request<{ success: boolean; message?: string; order?: ResourceRow; event?: ResourceRow }>(
        '/packing/confirm',
        { method: 'POST', body: JSON.stringify(payload) },
      ),
  },

  purchaseOrders: {
    fromBuySheet: (payload: {
      lines: { sku: string; qty: number; title?: string }[]
      vendor?: string
      notes?: string
    }) =>
      request<{ success: boolean; data: ResourceRow; message?: string }>(
        '/purchase_orders/from-buy-sheet',
        { method: 'POST', body: JSON.stringify(payload) },
      ),
  },

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
