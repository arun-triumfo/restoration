export function mapOrder({ orderId, channel, buyerName, sku, qty, total, imageUrl, title, extra = {} }) {
  return {
    orderId,
    channel,
    buyerName: buyerName || 'Customer',
    status: 'Pending Allocation',
    sku: sku || 'UNMAPPED',
    title,
    imageUrl,
    qty: Number(qty) || 1,
    totalOrderUSD: Number(total) || 0,
    currency: extra.currency || 'USD',
    marketplaceId: extra.marketplaceId || orderId,
    source: extra.source || `${String(channel).toLowerCase()}_sync`,
    tenantId: extra.tenantId,
    orderDate: extra.orderDate || new Date().toISOString().slice(0, 10),
    mappingException: !sku || sku === 'UNMAPPED',
  }
}

export function matchCatalogSku(sku, catalog = []) {
  if (!sku) return null
  const key = String(sku).trim().toLowerCase()
  return (
    catalog.find((s) => String(s.sku || '').toLowerCase() === key) ||
    catalog.find((s) => String(s.odetteSku || '').toLowerCase() === key) ||
    catalog.find((s) => String(s.barcode || '').toLowerCase() === key) ||
    null
  )
}
