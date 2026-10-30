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
      fulfillmentWh: 'US Warehouse',
      stockAt: 'US Warehouse',
      stockAllocation: 'US stock available — send barcode to US',
      routingNote: `US Warehouse has ${usa} (≥ qty ${qty}). Next: India generates barcode → order goes to US Warehouse queue.`,
    }
  }

  if (india >= qty) {
    return {
      ...base,
      fulfillmentScenario: SCENARIO.INDIA_SHIP,
      status: 'Pending Allocation',
      fulfillmentWh: 'India Warehouse',
      stockAt: 'India Warehouse',
      stockAllocation: 'India stock available — ship to US Warehouse',
      routingNote: `US Warehouse short (${usa}). India Warehouse has ${india} (≥ qty ${qty}). Next: ship India → US.`,
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
    routingNote: `No stock in US (${usa}) or India (${india}) for qty ${qty}. In Process until ready. ETA ${eta}.`,
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
      fulfillmentWh: 'US Warehouse',
      stockAt: 'US Warehouse',
      stockAllocation: 'Locked — ready to pack at US Warehouse',
      history: pushHistory(
        order,
        'Barcode → US Warehouse',
        `Barcode ${barcode} generated. Order is now in the US Warehouse queue for pack & dispatch to customer.`,
      ),
    },
  }
}

/** India: start / confirm ship India → US (B1) — requires weight + optional photo */
export function applyShipIndiaToUs(order, extras = {}) {
  if (order.fulfillmentScenario === SCENARIO.MAKE && order.status === 'In Process') {
    return { error: 'Order still In Process — wait for manufacturing / ETA before shipping to US' }
  }
  const weightKg = Number(extras.weightKg)
  if (!weightKg || weightKg <= 0) {
    return { error: 'Package weight (kg) is required before shipping India → US' }
  }
  const shipPrice = Number(extras.shipPrice)
  if (!Number.isFinite(shipPrice) || shipPrice < 0) {
    return { error: 'Courier price charged at weigh-time is required (use 0 if not billed yet)' }
  }
  const barcode =
    order.barcode ||
    `BC-${String(order.sku || 'SKU').replace(/\s+/g, '').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
  return {
    patch: {
      queueOwner: 'india_wh',
      status: 'In Transit',
      fulfillmentWh: 'In transit India → US',
      stockAt: 'In transit',
      stockAllocation: 'In transit to US Warehouse',
      fulfillmentScenario: order.fulfillmentScenario || SCENARIO.INDIA_SHIP,
      barcodeGenerated: true,
      barcode,
      shipWeightKg: weightKg,
      shipPrice,
      shippingCostAct: shipPrice,
      shipPhotoUrl: extras.photoUrl || order.shipPhotoUrl || null,
      history: pushHistory(
        order,
        'India → US shipment',
        `Shipped India Warehouse → US Warehouse. Weight ${weightKg} kg · Price charged ${shipPrice}.${extras.photoUrl ? ' Photo saved.' : ''} Next: generate courier label (tracking).`,
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

/** Manufacturing complete (B2) → treat like India ship */
export function applyProductionComplete(order) {
  const etaDone = new Date().toISOString().slice(0, 10)
  return {
    patch: {
      status: 'Pending Allocation',
      fulfillmentScenario: SCENARIO.INDIA_SHIP,
      mtoNeeded: false,
      stockAllocation: 'Ready at India Warehouse — ship to US',
      fulfillmentWh: 'India Warehouse',
      stockAt: 'India Warehouse',
      queueOwner: 'india_wh',
      expectedWarehouseDeliveryDate: order.expectedWarehouseDeliveryDate || etaDone,
      history: pushHistory(
        order,
        'Production complete',
        'Item ready at India Warehouse. Next: ship India → US Warehouse.',
      ),
    },
  }
}
