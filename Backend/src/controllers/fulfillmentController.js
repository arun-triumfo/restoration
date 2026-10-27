import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import {
  applyBarcodeAndSendToUs,
  applyProductionComplete,
  applyShipIndiaToUs,
  applyUsReceive,
  reRouteOrder,
  SCENARIO,
} from '../services/orderFulfillment.js'

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function Orders() {
  return getResourceModel('orders', 'orderId', true)
}

function tenantFilter(tid) {
  if (tid === DEFAULT_TENANT_ID) {
    return {
      $or: [{ tenantId: tid }, { tenantId: { $exists: false } }, { tenantId: null }],
    }
  }
  return { tenantId: tid }
}

async function loadOrder(orderId, tid) {
  return Orders()
    .findOne({ $and: [tenantFilter(tid), { orderId }] })
    .lean()
}

async function patchOrder(orderId, tid, patch) {
  return Orders()
    .findOneAndUpdate({ $and: [tenantFilter(tid), { orderId }] }, { $set: patch }, { new: true })
    .lean()
}

/** POST /api/orders/actions/re-route  body: { orderIds?: string[] } — India stock re-check / allocate */
export async function bulkReRoute(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'india_wh'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only India Warehouse Manager can allocate / re-route' })
    }

    const ids = Array.isArray(req.body?.orderIds) ? req.body.orderIds.map(String) : null
    const filter = {
      $and: [
        tenantFilter(tid),
        ids?.length
          ? { orderId: { $in: ids } }
          : {
              $or: [
                { queueOwner: 'india_wh' },
                { queueOwner: { $exists: false } },
                { status: /Pending Allocation|In Process/i },
              ],
            },
      ],
    }

    const orders = await Orders().find(filter).limit(80).lean()
    const updated = []
    for (const order of orders) {
      const patch = await reRouteOrder(order, tid)
      const doc = await patchOrder(order.orderId, tid, patch)
      if (doc) updated.push(doc)
    }

    res.json({
      success: true,
      count: updated.length,
      data: updated,
      message: `Re-checked stock and routed ${updated.length} order(s) to India queue scenarios`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/orders/actions/generate-barcode  body: { orderId } */
export async function generateBarcode(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'india_wh'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only India Warehouse Manager can generate barcodes' })
    }
    const orderId = String(req.body?.orderId || '').trim()
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' })

    const order = await loadOrder(orderId, tid)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    // If scenario unknown, re-route first
    let working = order
    if (!working.fulfillmentScenario) {
      const routed = await reRouteOrder(working, tid)
      working = { ...working, ...routed }
      await patchOrder(orderId, tid, routed)
    }

    if (working.fulfillmentScenario !== SCENARIO.US_STOCK) {
      return res.status(409).json({
        success: false,
        message: `This order is ${working.fulfillmentScenario || 'not US stock'}. Use Ship India→US or complete production instead.`,
        scenario: working.fulfillmentScenario,
      })
    }

    const result = applyBarcodeAndSendToUs(working)
    if (result.error) return res.status(409).json({ success: false, message: result.error })

    const data = await patchOrder(orderId, tid, result.patch)
    res.json({
      success: true,
      data,
      message: 'Barcode generated — order moved to US Warehouse Manager bucket',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/orders/actions/ship-india-to-us  body: { orderId } */
export async function shipIndiaToUs(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'india_wh'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only India Warehouse Manager can dispatch India→US' })
    }
    const orderId = String(req.body?.orderId || '').trim()
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' })

    let order = await loadOrder(orderId, tid)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    if (!order.fulfillmentScenario) {
      const routed = await reRouteOrder(order, tid)
      order = { ...order, ...routed }
      await patchOrder(orderId, tid, routed)
    }

    if (order.fulfillmentScenario === SCENARIO.US_STOCK) {
      return res.status(409).json({
        success: false,
        message: 'US already has stock — generate barcode and send to US bucket instead',
      })
    }

    const result = applyShipIndiaToUs(order)
    if (result.error) return res.status(409).json({ success: false, message: result.error })

    const data = await patchOrder(orderId, tid, result.patch)
    res.json({
      success: true,
      data,
      message: 'India→US shipment started (barcode / compliance recorded)',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/orders/actions/us-receive  body: { orderId } */
export async function usReceive(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'usa_wh'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only US Warehouse Manager can confirm receive' })
    }
    const orderId = String(req.body?.orderId || '').trim()
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' })

    const order = await loadOrder(orderId, tid)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    const result = applyUsReceive(order)
    const data = await patchOrder(orderId, tid, result.patch)
    res.json({ success: true, data, message: 'Received into US bucket — ready to pack' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/orders/actions/production-complete  body: { orderId } */
export async function productionComplete(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'india_wh'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only India Warehouse Manager can complete production' })
    }
    const orderId = String(req.body?.orderId || '').trim()
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' })

    const order = await loadOrder(orderId, tid)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    const result = applyProductionComplete(order)
    const data = await patchOrder(orderId, tid, result.patch)
    res.json({ success: true, data, message: 'Production complete — ready to ship India→US' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
