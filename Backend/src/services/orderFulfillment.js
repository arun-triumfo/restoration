/**
 * Restoration fulfillment routing (client SOP):
 * 1) Every new order lands in India WH queue
 * 2) Check US stock → A: barcode then US bucket | B1: India ship to US | B2: In Process / make
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
      fulfillmentWh: 'USA 3PL — Edison NJ',
      stockAllocation: 'US Available — barcode pending (India)',
      routingNote: `US stock ${usa} ≥ qty ${qty}. India manager generates barcode, then order moves to US bucket.`,
    }
  }

  if (india >= qty) {
    return {
      ...base,
      fulfillmentScenario: SCENARIO.INDIA_SHIP,
      status: 'Pending Allocation',
      fulfillmentWh: 'India Mill — Jaipur',
      stockAllocation: 'India Available — ship to US',
      routingNote: `US short (${usa}). India stock ${india} ≥ qty ${qty}. India ships to US (photo, barcode, weight / Aramex).`,
    }
  }

  const eta =
    order.expectedWarehouseDeliveryDate ||
    new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return {
    ...base,
    fulfillmentScenario: SCENARIO.MAKE,
    status: 'In Process',
    fulfillmentWh: 'India Mill — Production',
    stockAllocation: 'Make / MTO',
    mtoNeeded: true,
    expectedWarehouseDeliveryDate: eta,
    routingNote: `No US (${usa}) or India (${india}) stock for qty ${qty}. Marked In Process with ETA ${eta}.`,
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
    stockAllocation: decision.stockAllocation,
    fulfillmentScenario: decision.fulfillmentScenario,
    queueOwner: 'india_wh',
    barcodeGenerated: Boolean(order.barcodeGenerated) && decision.fulfillmentScenario === SCENARIO.US_STOCK
      ? order.barcodeGenerated
      : false,
    mtoNeeded: decision.mtoNeeded,
    expectedWarehouseDeliveryDate: decision.expectedWarehouseDeliveryDate,
    financeTagged: decision.financeTagged || Boolean(order.financeTagged),
    history: pushHistory(order, 'Stock re-check', decision.routingNote),
  }
}

/**
 * India manager: generate barcode and send US_STOCK orders to US bucket.
 */
export function applyBarcodeAndSendToUs(order) {
  if (order.fulfillmentScenario !== SCENARIO.US_STOCK && order.queueOwner === 'usa_wh') {
    return { error: 'Order is already in the US warehouse bucket' }
  }
  if (order.fulfillmentScenario && order.fulfillmentScenario !== SCENARIO.US_STOCK) {
    return {
      error: `Barcode→US handoff only for US stock scenario (this order is ${order.fulfillmentScenario})`,
    }
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
      queueOwner: 'usa_wh',
      status: 'Pending Allocation',
      fulfillmentWh: 'USA 3PL — Edison NJ',
      stockAllocation: 'Locked — US bucket',
      history: pushHistory(
        order,
        'Barcode → US bucket',
        `India generated barcode ${barcode}. Order added to US Warehouse Manager queue for pack & dispatch.`,
      ),
    },
  }
}

/** India: start / confirm ship India → US (B1) */
export function applyShipIndiaToUs(order) {
  if (order.fulfillmentScenario === SCENARIO.MAKE && order.status === 'In Process') {
    return { error: 'Order still In Process — wait for manufacturing / ETA before shipping to US' }
  }
  return {
    patch: {
      queueOwner: 'india_wh',
      status: 'In Transit',
      fulfillmentWh: 'India → USA transfer',
      stockAllocation: 'In transit to US',
      fulfillmentScenario: order.fulfillmentScenario || SCENARIO.INDIA_SHIP,
      barcodeGenerated: true,
      barcode:
        order.barcode ||
        `BC-${String(order.sku || 'SKU').replace(/\s+/g, '').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      history: pushHistory(
        order,
        'India → US shipment',
        'Pre-dispatch: photo / barcode / weight logged. Shipment dispatched to US warehouse (Aramex).',
      ),
    },
  }
}

/** When India→US arrives, move to US bucket for customer fulfillment */
export function applyUsReceive(order) {
  return {
    patch: {
      queueOwner: 'usa_wh',
      status: 'Pending Allocation',
      fulfillmentWh: 'USA 3PL — Edison NJ',
      stockAllocation: 'Received — ready to pack',
      history: pushHistory(order, 'US received', 'Transfer received at US warehouse. Ready to pack & dispatch to customer.'),
    },
  }
}

/** Manufacturing complete (B2) → treat like India ship */
export function applyProductionComplete(order) {
  const etaDone = new Date().toISOString().slice(0, 10)
  return {
    patch: {
      status: 'Pending Allocation',
      fulfillmentScenario: SCENARIO.INDIA_SHIP,
      mtoNeeded: false,
      stockAllocation: 'Produced — ship to US',
      fulfillmentWh: 'India Mill — Jaipur',
      queueOwner: 'india_wh',
      expectedWarehouseDeliveryDate: order.expectedWarehouseDeliveryDate || etaDone,
      history: pushHistory(
        order,
        'Production complete',
        'Manufacturing done. Barcode / QC next, then dispatch India → US.',
      ),
    },
  }
}
