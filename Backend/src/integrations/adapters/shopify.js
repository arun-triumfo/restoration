import { httpJson } from '../http.js'
import { mapOrder, matchCatalogSku } from '../orderMap.js'

function shopHost(domain) {
  let s = String(domain || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  if (!s) throw new Error('Shop domain required (xxx.myshopify.com)')
  if (!s.includes('.')) s = `${s}.myshopify.com`
  return s
}

function api(fields, path, query = '') {
  const host = shopHost(fields.shopDomain)
  const version = fields.apiVersion || '2024-10'
  const url = `https://${host}/admin/api/${version}${path}${query}`
  return httpJson(url, {
    headers: {
      'X-Shopify-Access-Token': fields.accessToken,
      'Content-Type': 'application/json',
    },
  })
}

export async function test(fields) {
  const shop = await api(fields, '/shop.json')
  const name = shop?.shop?.name || shopHost(fields.shopDomain)
  return { ok: true, message: `Shopify live: ${name}` }
}

export async function sync(fields, { tenantId, catalog = [] }) {
  const data = await api(fields, '/orders.json', '?status=any&limit=50')
  const imported = []
  for (const o of data?.orders || []) {
    const line = o.line_items?.[0] || {}
    const skuCode = line.sku || ''
    const hit = matchCatalogSku(skuCode, catalog)
    const row = mapOrder({
      orderId: `SHP-${o.id}`,
      channel: 'Shopify',
      buyerName: [o.customer?.first_name, o.customer?.last_name].filter(Boolean).join(' ') || o.email,
      sku: hit?.sku || skuCode || 'UNMAPPED',
      title: line.title || hit?.title,
      imageUrl: hit?.imageUrl || line.image || undefined,
      qty: line.quantity || 1,
      total: o.total_price,
      extra: {
        tenantId,
        currency: o.currency,
        marketplaceId: String(o.id),
        source: 'shopify_live',
        orderDate: (o.created_at || '').slice(0, 10),
      },
    })
    imported.push(row)
  }
  return { imported, message: `Shopify live: ${imported.length} orders pulled` }
}
