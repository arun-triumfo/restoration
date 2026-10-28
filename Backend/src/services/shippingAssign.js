/**
 * Order-driven courier label parties + AWB assign + channel tracking notify.
 * Warehouses: only India Warehouse + US Warehouse.
 */
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { loadLive } from '../integrations/creds.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { pushHistory } from './orderFulfillment.js'

const INDIA_WH = {
  name: 'India Warehouse',
  zip: '221001',
  address: 'India Warehouse, Bhadohi / Mirzapur region, India',
  phone: '+91-0000000000',
}

const US_WH = {
  name: 'US Warehouse',
  zip: '08817',
  address: 'US Warehouse, Edison, NJ 08817, USA',
  phone: '+1-000-000-0000',
}

function Orders() {
  return getResourceModel('orders', 'orderId', true)
}

export function extractZip(address) {
  const s = String(address || '')
  const us = s.match(/\b(\d{5})(?:-\d{4})?\b/)
  if (us) return us[1]
  const inPin = s.match(/\b(\d{6})\b/)
  if (inPin) return inPin[1]
  return null
}

function channelKey(channel) {
  const c = String(channel || '').toLowerCase()
  if (c.includes('shopify')) return 'shopify'
  if (c.includes('amazon')) return 'amazon'
  if (c.includes('etsy')) return 'etsy'
  if (c.includes('walmart')) return 'walmart'
  return 'manual'
}

/**
 * Decide ship-from / ship-to from order state.
 * - US bucket / US_STOCK after barcode → US Warehouse → Customer
 * - India ship / make ready → India Warehouse → US Warehouse
 */
export function resolveShipmentParties(order) {
  const sc = String(order.fulfillmentScenario || '')
  const st = String(order.status || '')
  const q = String(order.queueOwner || 'india_wh')
  const buyer = String(order.buyerName || 'Customer')
  const shipTo = String(order.shippingAddress || 'Address on file')
  const customerZip = extractZip(shipTo) || '10001'

  const toCustomer = {
    leg: 'US_TO_CUSTOMER',
    legLabel: 'US Warehouse → Customer',
    from: { ...US_WH },
    to: {
      name: buyer,
      zip: customerZip,
      address: shipTo,
      phone: String(order.buyerPhone || ''),
    },
  }

  const indiaToUs = {
    leg: 'INDIA_TO_US',
    legLabel: 'India Warehouse → US Warehouse',
    from: { ...INDIA_WH },
    to: { ...US_WH },
  }

  // Already in US queue / packed / barcode sent for US stock → customer label from US WH
  if (q === 'usa_wh' || st.includes('Packed') || (sc === 'US_STOCK' && order.barcodeGenerated)) {
    return toCustomer
  }

  // US has stock but barcode not sent yet — show customer leg preview for after barcode
  if (sc === 'US_STOCK') {
    return {
      ...toCustomer,
      note: 'After “Send barcode to US”, generate label: US Warehouse → Customer',
    }
  }

  // India stock / make → first leg is India Warehouse → US Warehouse
  if (sc === 'INDIA_SHIP' || sc === 'MAKE' || st === 'In Transit' || q === 'india_wh') {
    return indiaToUs
  }

  return toCustomer
}

export async function loadOrderForShipping(orderId, tenantId = DEFAULT_TENANT_ID) {
  if (!orderId) return null
  const tid = tenantId || DEFAULT_TENANT_ID
  const filter =
    tid === DEFAULT_TENANT_ID
      ? {
          orderId: String(orderId).trim(),
          $or: [{ tenantId: tid }, { tenantId: { $exists: false } }, { tenantId: null }],
        }
      : { orderId: String(orderId).trim(), tenantId: tid }
  return Orders().findOne(filter).lean()
}

export function buildOrderShippingContext(order) {
  const parties = resolveShipmentParties(order)
  return {
    orderId: order.orderId,
    channel: order.channel,
    sku: order.sku,
    qty: order.qty,
    buyerName: order.buyerName,
    shippingAddress: order.shippingAddress,
    status: order.status,
    fulfillmentScenario: order.fulfillmentScenario,
    queueOwner: order.queueOwner,
    existingAwb: order.awb || null,
    parties,
    fromZip: parties.from.zip,
    toZip: parties.to.zip,
    suggestedCarrier: parties.leg === 'INDIA_TO_US' ? 'ARAMEX' : 'FEDEX',
    weightKg: 5,
  }
}

/** Assign AWB / tracking onto the order document */
export async function assignTrackingToOrder(order, shipment, { leg, notify }) {
  const history = pushHistory(
    order,
    'Courier label + tracking',
    `${shipment.carrier} AWB ${shipment.awb} (${leg}). ${notify?.message || ''}`.trim(),
  )
  const patch = {
    awb: shipment.awb,
    courier: shipment.carrier,
    labelGenerated: true,
    trackingStatus: shipment.status || 'Label Created',
    trackingUrl: shipment.trackingUrl || null,
    shippingCostAct: shipment.amount,
    lastLabelLeg: leg,
    trackingNotified: Boolean(notify?.ok),
    trackingNotifyChannel: notify?.channel || null,
    trackingNotifyStatus: notify?.status || null,
    trackingNotifyDetail: notify?.message || null,
    history,
  }
  if (leg === 'INDIA_TO_US' && String(order.status) !== 'In Transit') {
    patch.status = 'In Transit'
    patch.stockAt = 'In transit'
    patch.fulfillmentWh = 'In transit India → US'
    patch.stockAllocation = 'In transit to US Warehouse'
  }
  await Orders().findOneAndUpdate({ orderId: order.orderId }, { $set: patch })
  return patch
}

/**
 * Inform the sales channel that tracking exists.
 * Live marketplace push is best-effort; always logs a clear status for the UI.
 */
export async function notifyChannelTracking(order, shipment, tenantId) {
  const channel = channelKey(order.channel)
  const tid = tenantId || order.tenantId || DEFAULT_TENANT_ID
  const base = {
    channel,
    awb: shipment.awb,
    trackingUrl: shipment.trackingUrl,
    marketplaceOrderId: order.marketplaceOrderId || order.orderId,
  }

  if (channel === 'manual' || channel === 'walmart') {
    return {
      ok: true,
      channel,
      status: 'logged',
      message: `Tracking ${shipment.awb} saved. Offline/direct — inform customer manually or via email.`,
      ...base,
    }
  }

  try {
    const live = await loadLive(tid, channel === 'etsy' ? 'etsy' : channel)
    if (!live) {
      return {
        ok: true,
        channel,
        status: 'queued_no_keys',
        message: `Tracking ${shipment.awb} assigned on order. Paste ${channel} API keys on Integrations to auto-push tracking to the buyer.`,
        ...base,
      }
    }
    // Keys present: record as ready-for-push (full marketplace fulfillment APIs vary by seller account)
    return {
      ok: true,
      channel,
      status: 'ready_with_keys',
      message: `${channel} keys found. Tracking ${shipment.awb} stored — push to buyer portal on next sync / fulfillment update.`,
      ...base,
    }
  } catch (err) {
    return {
      ok: false,
      channel,
      status: 'error',
      message: err.message || 'Channel notify failed',
      ...base,
    }
  }
}

export function enrichLabelHtml(labelHtml, { order, parties, shipment }) {
  const block = `
<section style="margin:16px 0;padding:12px;border:1px solid #ccc;border-radius:8px;font-family:system-ui,sans-serif">
  <h2 style="margin:0 0 8px;font-size:16px">Ship parties</h2>
  <p style="margin:4px 0"><strong>Leg:</strong> ${parties.legLabel}</p>
  <p style="margin:4px 0"><strong>FROM (${parties.from.name}):</strong><br/>${parties.from.address}<br/>ZIP ${parties.from.zip}</p>
  <p style="margin:4px 0"><strong>TO (${parties.to.name}):</strong><br/>${parties.to.address}<br/>ZIP ${parties.to.zip}</p>
  <p style="margin:4px 0"><strong>Customer:</strong> ${order?.buyerName || parties.to.name}</p>
  <p style="margin:4px 0"><strong>Order:</strong> ${order?.orderId || '—'} · <strong>SKU:</strong> ${order?.sku || '—'} × ${order?.qty || 1}</p>
  <p style="margin:4px 0"><strong>Channel:</strong> ${order?.channel || '—'} · <strong>Tracking:</strong> ${shipment?.awb || '—'}</p>
</section>`
  if (String(labelHtml).includes('</body>')) {
    return String(labelHtml).replace('</body>', `${block}</body>`)
  }
  return `${labelHtml}\n${block}`
}
