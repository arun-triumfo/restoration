import { httpJson } from '../http.js'
import { mapOrder, matchCatalogSku } from '../orderMap.js'

function api(fields, path) {
  return httpJson(`https://openapi.etsy.com/v3${path}`, {
    headers: {
      'x-api-key': fields.apiKey,
      Authorization: `Bearer ${fields.accessToken}`,
    },
  })
}

export async function test(fields) {
  const shop = await api(fields, `/application/shops/${encodeURIComponent(fields.shopId)}`)
  const name = shop?.shop_name || fields.shopId
  return { ok: true, message: `Etsy live: ${name}` }
}

export async function sync(fields, { tenantId, catalog = [] }) {
  const data = await api(
    fields,
    `/application/shops/${encodeURIComponent(fields.shopId)}/receipts?limit=50`,
  )
  const imported = []
  for (const r of data?.results || []) {
    const txn = r.transactions?.[0] || {}
    const sku = txn.sku || ''
    const hit = matchCatalogSku(sku, catalog)
    imported.push(
      mapOrder({
        orderId: `ETY-${r.receipt_id}`,
        channel: 'Etsy',
        buyerName: r.name || r.buyer_email || 'Etsy Customer',
        sku: hit?.sku || sku || 'UNMAPPED',
        title: txn.title || hit?.title,
        imageUrl: hit?.imageUrl,
        qty: txn.quantity || 1,
        total: (Number(r.grandtotal?.amount) || 0) / (r.grandtotal?.divisor || 100),
        extra: {
          tenantId,
          currency: r.grandtotal?.currency_code || 'USD',
          marketplaceId: String(r.receipt_id),
          source: 'etsy_live',
          orderDate: r.created_timestamp
            ? new Date(r.created_timestamp * 1000).toISOString().slice(0, 10)
            : undefined,
        },
      }),
    )
  }
  return { imported, message: `Etsy live: ${imported.length} receipts pulled` }
}
