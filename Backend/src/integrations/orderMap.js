import { decideFulfillment } from '../services/orderFulfillment.js'

export function mapOrder({ orderId, channel, buyerName, sku, qty, total, imageUrl, title, extra = {} }) {
  const draft = {
    orderId,
    channel,
    buyerName: buyerName || 'Customer',
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

  // Sync path: decide from catalog sku row if provided in extra.skuDoc
  const decision = decideFulfillment(draft, extra.skuDoc || null)
  return {
    ...draft,
    status: decision.status,
    fulfillmentWh: decision.fulfillmentWh,
    stockAllocation: decision.stockAllocation,
    fulfillmentScenario: decision.fulfillmentScenario,
    queueOwner: decision.queueOwner,
    barcodeGenerated: false,
    mtoNeeded: decision.mtoNeeded,
    expectedWarehouseDeliveryDate: decision.expectedWarehouseDeliveryDate,
    financeTagged: decision.financeTagged,
    history: [
      {
        time: new Date().toISOString(),
        action: 'Channel sync → India WH',
        detail: decision.routingNote,
      },
    ],
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
