/**
 * Restoration fulfillment (client SOP):
 * Every new order → India WH queue.
 * A) US stock → India buys platform courier label → PDF to US → US packs & sends
 * B) India stock → India buys courier label → pack → dispatch direct to US customer
 * C) No stock → In Process → Mark ready → same as B
 * D) Returns → India WH bucket + platform return labels
 */
import { getResourceModel } from '../models/createResourceModel.js'

export const SCENARIO = {
  US_STOCK: 'US_STOCK',
  INDIA_SHIP: 'INDIA_SHIP',
  MAKE: 'MAKE',
}

const OFFLINE_CHANNEL_RE =
  /offline|direct|third[\s-]?party|manual|b2b offline|india offline/i

function stockNums(sku) {
  const nested = sku?.stock || {}
  return {
    usa: Number(nested.usaAvailable ?? sku?.usaAvailable ?? 0) || 0,
    india: Number(nested.indiaAvailable ?? sku?.indiaAvailable ?? 0) || 0,
  }
}

export function isOfflineChannel(channel) {
  return OFFLINE_CHANNEL_RE.test(String(channel || ''))
}

export function pushHistory(order, action, detail) {
  const history = Array.isArray(order.history) ? [...order.history] : []
  history.unshift({
    time: new Date().toISOString(),
    action,
    detail,
  })
  return history.slice(0, 40)
}

/**
 * Decide scenario from SKU stock vs order qty. Does not mutate DB.
 */
export function decideFulfillment(order, sku) {
  const qty = Math.max(1, Number(order.qty) || 1)
  const { usa, india } = stockNums(sku)
  const offline = isOfflineChannel(order.channel) || Boolean(order.financeTagged)

  const base = {
    queueOwner: 'india_wh',
    barcodeGenerated: false,
    financeTagged: offline,
    mtoNeeded: false,
    expectedWarehouseDeliveryDate: order.expectedWarehouseDeliveryDate || null,
  }

  if (usa >= qty) {
    return {
      ...base,
      fulfillmentScenario: SCENARIO.US_STOCK,
      status: 'Pending Allocation',
      fulfillmentWh: 'US Warehouse',
      stockAt: 'US Warehouse',
      stockAllocation: 'US stock available — send courier label to US',
      routingNote: `US Warehouse has ${usa} (≥ qty ${qty}). Next: India generates platform courier label (Amazon/Shopify/etc.) and sends PDF to US Warehouse.`,
    }
  }

  if (india >= qty) {
    return {
      ...base,
      fulfillmentScenario: SCENARIO.INDIA_SHIP,
      status: 'Pending Allocation',
      fulfillmentWh: 'India Warehouse',
      stockAt: 'India Warehouse',
      stockAllocation: 'India stock — ship direct to customer',
      routingNote: `US Warehouse short (${usa}). India Warehouse has ${india} (≥ qty ${qty}). Next: buy courier label → pack → dispatch direct to US customer (not via US Warehouse).`,
    }
  }

  const eta =
    order.expectedWarehouseDeliveryDate ||
    new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return {
    ...base,
    fulfillmentScenario: SCENARIO.MAKE,
    status: 'In Process',
    fulfillmentWh: 'India Warehouse',
    stockAt: 'Not in stock',
    stockAllocation: 'No stock — make / weave',
    mtoNeeded: true,
    expectedWarehouseDeliveryDate: eta,
    routingNote: `No stock in US (${usa}) or India (${india}) for qty ${qty}. In Process until ready. ETA ${eta}. Then same as India direct-to-customer.`,
  }
}

export async function lookupSku(skuCode, tenantId) {
  if (!skuCode) return null
  const Sku = getResourceModel('skus', 'sku', true)
  const key = String(skuCode).trim()
  const filter = tenantId
    ? {
        sku: key,
        $or: [{ tenantId }, { tenantId: { $exists: false } }, { tenantId: null }],
      }
    : { sku: key }
  return Sku.findOne(filter).lean()
}

/** Enrich a create payload before insert */
export async function routeNewOrderPayload(payload, tenantId) {
  const sku = await lookupSku(payload.sku, tenantId)
  const decision = decideFulfillment(payload, sku)
  const history = pushHistory(
    { history: payload.history },
    'Routed to India WH',
    decision.routingNote,
  )
  return {
    ...payload,
    status: decision.status,
    fulfillmentWh: decision.fulfillmentWh,
    stockAt: decision.stockAt,
    stockAllocation: decision.stockAllocation,
    fulfillmentScenario: decision.fulfillmentScenario,
    queueOwner: decision.queueOwner,
    barcodeGenerated: false,
    mtoNeeded: decision.mtoNeeded,
    expectedWarehouseDeliveryDate: decision.expectedWarehouseDeliveryDate,
    financeTagged: decision.financeTagged,
    history,
  }
}

/** Re-run routing for existing order (Bulk Allocate / re-check stock) */
export async function reRouteOrder(order, tenantId) {
  const sku = await lookupSku(order.sku, tenantId)
  const decision = decideFulfillment(order, sku)
  return {
    status: decision.status,
    fulfillmentWh: decision.fulfillmentWh,
    stockAt: decision.stockAt,
    stockAllocation: decision.stockAllocation,
    fulfillmentScenario: decision.fulfillmentScenario,
    queueOwner: 'india_wh',
    barcodeGenerated:
      Boolean(order.barcodeGenerated) && decision.fulfillmentScenario === SCENARIO.US_STOCK
        ? order.barcodeGenerated
        : false,
    labelSentToUs: decision.fulfillmentScenario === SCENARIO.US_STOCK ? order.labelSentToUs : false,
    mtoNeeded: decision.mtoNeeded,
    expectedWarehouseDeliveryDate: decision.expectedWarehouseDeliveryDate,
    financeTagged: decision.financeTagged || Boolean(order.financeTagged),
    history: pushHistory(order, 'Stock re-check', decision.routingNote),
  }
}

/**
 * Scenario A: India buys platform courier label and sends PDF to US Warehouse.
 * @param {object} order
 * @param {object} label — from buyPlatformOutboundLabel
 */
export function applySendCourierLabelToUs(order, label) {
  if (order.fulfillmentScenario !== SCENARIO.US_STOCK && order.queueOwner === 'usa_wh') {
    return { error: 'Order is already in the US warehouse bucket' }
  }
  if (order.fulfillmentScenario && order.fulfillmentScenario !== SCENARIO.US_STOCK) {
    return {
      error: `Send courier label to US only for US stock scenario (this order is ${order.fulfillmentScenario})`,
    }
  }
  if (!label?.awb || !label?.labelPdfUrl) {
    return { error: 'Platform courier label (AWB + PDF) is required before sending to US' }
  }

  const barcode =
    order.barcode ||
    `BC-${String(order.sku || 'SKU').replace(/\s+/g, '').toUpperCase()}-${String(order.orderId || '')
      .slice(-6)
      .toUpperCase()}`

  return {
    patch: {
      barcode,
      barcodeGenerated: true,
      labelSentToUs: true,
      labelGenerated: true,
      labelPdfUrl: label.labelPdfUrl,
      platformLabelSource: label.source,
      platformLabelChannel: label.platform,
      awb: label.awb,
      courier: label.carrier || label.source,
      trackingStatus: label.status || 'Label Created',
      trackingUrl: label.trackingUrl || null,
      shippingCostAct: label.amount,
      shipPrice: label.amount,
      lastLabelLeg: 'PLATFORM_TO_CUSTOMER_VIA_US',
      queueOwner: 'usa_wh',
      status: 'Ready to Pack',
      fulfillmentWh: 'US Warehouse',
      stockAt: 'US Warehouse',
      stockAllocation: 'Label ready — US print label, pack & dispatch to customer',
      history: pushHistory(
        order,
        'Courier label → US Warehouse',
        `${label.source} label ${label.awb} generated (${label.mode}). PDF with US Warehouse. Removed from India queue. US: print label → pack → dispatch to customer.`,
      ),
    },
  }
}

/** @deprecated alias — barcode flow replaced by platform courier label */
export function applyBarcodeAndSendToUs(order) {
  return {
    error:
      'Use Send courier label to US (platform Amazon/Shopify label + PDF). Barcode-only handoff is retired.',
  }
}

/**
 * Scenario B/C: India records weigh / quote bill before or with courier label (still India-owned).
 * Does NOT move to US Warehouse — rugs go direct to customer.
 */
export function applyIndiaCustomerShipPrep(order, extras = {}) {
  if (order.fulfillmentScenario === SCENARIO.MAKE && order.status === 'In Process') {
    return { error: 'Order still In Process — Mark ready after manufacturing before shipping to customer' }
  }
  if (order.fulfillmentScenario === SCENARIO.US_STOCK) {
    return { error: 'US already has stock — use Send courier label to US instead' }
  }
  const weightKg = Number(extras.weightKg)
  if (!weightKg || weightKg <= 0) {
    return { error: 'Package weight (kg) is required before India → customer ship' }
  }

  const lengthCm = extras.lengthCm != null ? Number(extras.lengthCm) : null
  const widthCm = extras.widthCm != null ? Number(extras.widthCm) : null
  const heightCm = extras.heightCm != null ? Number(extras.heightCm) : null
  let dimWeightKg = extras.dimWeightKg != null ? Number(extras.dimWeightKg) : null
  if (
    dimWeightKg == null &&
    lengthCm > 0 &&
    widthCm > 0 &&
    heightCm > 0
  ) {
    // Soft metric dim factor commonly used for audit (cm³ / 5000)
    dimWeightKg = Math.round(((lengthCm * widthCm * heightCm) / 5000) * 100) / 100
  }

  return {
    patch: {
      queueOwner: 'india_wh',
      status: 'Ready to Label',
      fulfillmentWh: 'India Warehouse',
      stockAt: 'India Warehouse',
      stockAllocation: 'India → customer: weight saved — get live courier rate & buy label next',
      fulfillmentScenario: order.fulfillmentScenario || SCENARIO.INDIA_SHIP,
      shipWeightKg: weightKg,
      shipPhotoUrl: extras.photoUrl || order.shipPhotoUrl || null,
      shipLengthCm: lengthCm,
      shipWidthCm: widthCm,
      shipHeightCm: heightCm,
      dimWeightKg: dimWeightKg,
      shipProductSku: extras.productSku || order.sku || null,
      shipProductTitle: extras.productTitle || null,
      shipProductCondition: extras.productCondition || null,
      shipProductNotes: extras.productNotes || null,
      history: pushHistory(
        order,
        'India → customer prep',
        `Weight ${weightKg} kg saved${dimWeightKg != null ? ` · dim wt ${dimWeightKg} kg` : ''}.${extras.photoUrl ? ' Photo saved.' : ''}${extras.productTitle ? ` · Product: ${extras.productTitle}` : ''}. Next: Shipping Desk — live courier rate by weight → buy label → pack → dispatch.`,
      ),
    },
  }
}

/** Keep old name as alias for API compatibility */
export function applyShipIndiaToUs(order, extras = {}) {
  return applyIndiaCustomerShipPrep(order, extras)
}

/**
 * After pack: India dispatches direct to customer with dimensional weight + audit photos.
 */
export function applyDispatchIndiaToCustomer(order, extras = {}) {
  if (order.fulfillmentScenario === SCENARIO.US_STOCK) {
    return { error: 'US stock orders are dispatched by US Warehouse, not India' }
  }
  if (!order.awb && !order.labelGenerated) {
    return { error: 'Generate courier label (tracking) before dispatch to customer' }
  }
  const weightKg = Number(extras.weightKg ?? order.shipWeightKg)
  if (!weightKg || weightKg <= 0) {
    return { error: 'Actual / dimensional package weight (kg) required at dispatch for shipping audit' }
  }
  const lengthCm = extras.lengthCm != null ? Number(extras.lengthCm) : Number(order.shipLengthCm) || null
  const widthCm = extras.widthCm != null ? Number(extras.widthCm) : Number(order.shipWidthCm) || null
  const heightCm = extras.heightCm != null ? Number(extras.heightCm) : Number(order.shipHeightCm) || null
  let dimWeightKg =
    extras.dimWeightKg != null ? Number(extras.dimWeightKg) : Number(order.dimWeightKg) || null
  if (dimWeightKg == null && lengthCm > 0 && widthCm > 0 && heightCm > 0) {
    dimWeightKg = Math.round(((lengthCm * widthCm * heightCm) / 5000) * 100) / 100
  }
  const bill = Number(extras.shipPrice ?? order.shipPrice ?? order.shippingCostAct ?? 0)

  return {
    patch: {
      queueOwner: 'india_wh',
      status: 'In Transit',
      fulfillmentWh: 'Direct to customer',
      stockAt: 'In transit to customer',
      stockAllocation: 'Dispatched India → US customer (not via US Warehouse)',
      shipWeightKg: weightKg,
      dimWeightKg,
      shipLengthCm: lengthCm,
      shipWidthCm: widthCm,
      shipHeightCm: heightCm,
      shipPrice: bill,
      shippingCostAct: bill,
      shipPhotoUrl: extras.photoUrl || order.shipPhotoUrl || null,
      dispatchedAt: new Date().toISOString(),
      dispatchedDirectToCustomer: true,
      history: pushHistory(
        order,
        'Dispatched to customer',
        `India Warehouse sent rug directly to customer. AWB ${order.awb || '—'}. Weight ${weightKg} kg · dim ${dimWeightKg ?? '—'} kg · bill ${bill}.${extras.photoUrl ? ' Dispatch photo saved for audit.' : ''} Track from India WH.`,
      ),
    },
    auditHint: {
      orderId: order.orderId,
      awb: order.awb,
      carrier: order.courier,
      actualWeightKg: weightKg,
      dimWeightKg,
      billedAmount: bill,
      photoUrl: extras.photoUrl || order.shipPhotoUrl || null,
    },
  }
}

/** Legacy US receive — only if something was wrongly marked India→US transit */
export function applyUsReceive(order) {
  if (order.dispatchedDirectToCustomer) {
    return { error: 'This shipment went direct to customer — no US Warehouse receive' }
  }
  return {
    patch: {
      queueOwner: 'usa_wh',
      status: 'Pending Allocation',
      fulfillmentWh: 'US Warehouse',
      stockAt: 'US Warehouse',
      stockAllocation: 'Received at US Warehouse — ready to pack',
      history: pushHistory(
        order,
        'US received',
        'Received at US Warehouse. Ready to pack & dispatch to customer.',
      ),
    },
  }
}

/** Manufacturing complete (C) → treat like India direct ship (B) */
export function applyProductionComplete(order) {
  const etaDone = new Date().toISOString().slice(0, 10)
  return {
    patch: {
      status: 'Pending Allocation',
      fulfillmentScenario: SCENARIO.INDIA_SHIP,
      mtoNeeded: false,
      stockAllocation: 'Ready at India Warehouse — ship direct to customer',
      fulfillmentWh: 'India Warehouse',
      stockAt: 'India Warehouse',
      queueOwner: 'india_wh',
      expectedWarehouseDeliveryDate: order.expectedWarehouseDeliveryDate || etaDone,
      history: pushHistory(
        order,
        'Mark ready (made)',
        'Item ready at India Warehouse. Next: same as Scenario B — buy courier label → pack → dispatch direct to customer.',
      ),
    },
  }
}
