/**
 * RugOS wireframe ApiClient — uses same auth token + API base as React app.
 */
const ApiClient = (() => {
  function resolveBase() {
    if (typeof window !== 'undefined' && window.RUGOS_API_BASE) {
      return String(window.RUGOS_API_BASE).replace(/\/$/, '')
    }
    const host = typeof window !== 'undefined' ? window.location.hostname : ''
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return 'https://restoration-b.onrender.com/api'
    }
    return '/api'
  }

  function authHeaders() {
    const headers = { Accept: 'application/json' }
    try {
      const t = localStorage.getItem('rugos-auth-token')
      if (t) headers.Authorization = `Bearer ${t}`
    } catch {
      /* ignore */
    }
    return headers
  }

  async function request(method, path, body) {
    const opts = {
      method,
      headers: authHeaders(),
    }
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }

    const res = await fetch(`${resolveBase()}${path}`, opts)
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
