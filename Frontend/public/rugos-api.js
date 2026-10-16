/**
 * RugOS Phase-1 API client — SKUs + Orders against Node/Mongo backend.
 * Direct backend URL (CORS enabled). Override with window.RUGOS_API_BASE if needed.
 */
const ApiClient = (() => {
  const BASE = (typeof window !== 'undefined' && window.RUGOS_API_BASE) || 'http://localhost:5000/api'

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { Accept: 'application/json' },
    }
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }

    const res = await fetch(`${BASE}${path}`, opts)
    let payload = null
    try {
      payload = await res.json()
    } catch {
      payload = null
    }

    if (!res.ok) {
      const msg = payload?.message || `API ${method} ${path} failed (${res.status})`
      throw new Error(msg)
    }
    return payload
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),

    async loadSkus() {
      const res = await request('GET', '/skus')
      return res.data || []
    },
    async loadOrders() {
      const res = await request('GET', '/orders')
      return res.data || []
    },
    async createSku(data) {
      const res = await request('POST', '/skus', data)
      return res.data
    },
    async updateSku(sku, data) {
      const res = await request('PUT', `/skus/${encodeURIComponent(sku)}`, data)
      return res.data
    },
    async deleteSku(sku) {
      const res = await request('DELETE', `/skus/${encodeURIComponent(sku)}`)
      return res.data
    },
    async createOrder(data) {
      const res = await request('POST', '/orders', data)
      return res.data
    },
    async updateOrder(orderId, data) {
      const res = await request('PUT', `/orders/${encodeURIComponent(orderId)}`, data)
      return res.data
    },
    async deleteOrder(orderId) {
      const res = await request('DELETE', `/orders/${encodeURIComponent(orderId)}`)
      return res.data
    },
  }
})()

window.ApiClient = ApiClient
