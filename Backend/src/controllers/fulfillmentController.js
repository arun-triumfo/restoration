import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import {
  applyDispatchIndiaToCustomer,
  applyIndiaCustomerShipPrep,
  applyProductionComplete,
  applySendCourierLabelToUs,
  applyUsReceive,
  reRouteOrder,
  SCENARIO,
} from '../services/orderFulfillment.js'
import { buyPlatformOutboundLabel } from '../services/platformLabels.js'
import { notifyChannelTracking as notifyTracking } from '../services/shippingAssign.js'

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function Orders() {
  return getResourceModel('orders', 'orderId', true)
}

function CourierAudit() {
  return getResourceModel('courier_audit', 'invoiceNo', true)
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

async function savePhoto(photoDataUrl, orderId, folder = 'shipping-photos') {
  if (!photoDataUrl || !String(photoDataUrl).startsWith('data:image')) return null
  const fs = await import('fs')
  const path = await import('path')
  const { fileURLToPath } = await import('url')
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const dir = path.resolve(__dirname, `../../uploads/${folder}`)
  fs.mkdirSync(dir, { recursive: true })
  const match = String(photoDataUrl).match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
  if (!match) return null
  const ext = match[1].includes('png') ? 'png' : 'jpg'
  const fileName = `ship-${orderId}-${Date.now()}.${ext}`
  fs.writeFileSync(path.join(dir, fileName), Buffer.from(match[2], 'base64'))
  return `/uploads/${folder}/${fileName}`
}

/** POST /api/orders/actions/re-route */
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

/**
 * Scenario A — POST /api/orders/actions/send-courier-label-to-us
 * Also mounted as generate-barcode for compatibility.
 */
export async function sendCourierLabelToUs(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'india_wh'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Only India Warehouse Manager can send courier labels to US',
      })
    }
    const orderId = String(req.body?.orderId || '').trim()
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' })

    const order = await loadOrder(orderId, tid)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    let working = order
    if (!working.fulfillmentScenario) {
      const routed = await reRouteOrder(working, tid)
      working = { ...working, ...routed }
      await patchOrder(orderId, tid, routed)
    }

    if (working.fulfillmentScenario !== SCENARIO.US_STOCK) {
      return res.status(409).json({
        success: false,
        message: `This order is ${working.fulfillmentScenario || 'not US stock'}. Use Ship to customer (India) instead.`,
        scenario: working.fulfillmentScenario,
      })
    }

    const label = await buyPlatformOutboundLabel(working, tid)
    const result = applySendCourierLabelToUs(working, label)
    if (result.error) return res.status(409).json({ success: false, message: result.error })

    const notify = await notifyTracking(
      working,
      { awb: label.awb, trackingUrl: label.trackingUrl },
      tid,
    )
    result.patch.trackingNotified = Boolean(notify?.ok)
    result.patch.trackingNotifyChannel = notify?.channel || null
    result.patch.trackingNotifyStatus = notify?.status || null
    result.patch.trackingNotifyDetail = notify?.message || null

    const data = await patchOrder(orderId, tid, result.patch)
    res.json({
      success: true,
      data,
      label: {
        awb: label.awb,
        source: label.source,
        platform: label.platform,
        labelPdfUrl: label.labelPdfUrl,
        amount: label.amount,
        mode: label.mode,
      },
      channelNotify: notify,
      message: `Courier label (${label.source}) created. PDF sent to US Warehouse. Tracking ${label.awb}.`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** @deprecated name — same as sendCourierLabelToUs */
export const generateBarcode = sendCourierLabelToUs

/**
 * Scenario B prep — POST /api/orders/actions/ship-india-to-customer
 * (also ship-india-to-us for compatibility)
 */
export async function shipIndiaToCustomer(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'india_wh'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Only India Warehouse Manager can prepare India → customer ship',
      })
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
        message: 'US already has stock — use Send courier label to US instead',
      })
    }

    const photoUrl = await savePhoto(req.body?.photoDataUrl, orderId)

    const result = applyIndiaCustomerShipPrep(order, {
      weightKg: req.body?.weightKg,
      lengthCm: req.body?.lengthCm,
      widthCm: req.body?.widthCm,
      heightCm: req.body?.heightCm,
      dimWeightKg: req.body?.dimWeightKg,
      photoUrl,
    })
    if (result.error) return res.status(409).json({ success: false, message: result.error })

    const data = await patchOrder(orderId, tid, result.patch)
    res.json({
      success: true,
      data,
      message:
        'Weight saved. Next: Shipping Desk — live courier rate by weight → buy label → pack → Dispatch to customer.',
      nextStep: 'shipping_label',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const shipIndiaToUs = shipIndiaToCustomer

/** Scenario B dispatch — POST /api/orders/actions/dispatch-india-to-customer */
export async function dispatchIndiaToCustomer(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'india_wh'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Only India Warehouse Manager can dispatch to customer',
      })
    }
    const orderId = String(req.body?.orderId || '').trim()
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' })

    const order = await loadOrder(orderId, tid)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    const photoUrl = await savePhoto(req.body?.photoDataUrl, orderId, 'dispatch-photos')

    const result = applyDispatchIndiaToCustomer(order, {
      weightKg: req.body?.weightKg,
      shipPrice: req.body?.shipPrice,
      lengthCm: req.body?.lengthCm,
      widthCm: req.body?.widthCm,
      heightCm: req.body?.heightCm,
      dimWeightKg: req.body?.dimWeightKg,
      photoUrl,
    })
    if (result.error) return res.status(409).json({ success: false, message: result.error })

    const data = await patchOrder(orderId, tid, result.patch)

    // Seed a courier audit row for Accounts / shipping audit
    if (result.auditHint) {
      try {
        const invoiceNo = `AUD-${orderId}-${Date.now().toString(36).toUpperCase()}`
        await CourierAudit().create({
          invoiceNo,
          carrier: result.auditHint.carrier || order.courier || 'Courier',
          billDate: new Date().toISOString().slice(0, 10),
          awb: result.auditHint.awb || order.awb,
          orderRef: orderId,
          sku: order.sku,
          actualWeightKg: result.auditHint.actualWeightKg,
          dimWeightKg: result.auditHint.dimWeightKg,
          billedAmount: result.auditHint.billedAmount,
          agreedAmount: result.auditHint.billedAmount,
          photoUrl: result.auditHint.photoUrl,
          status: 'Pending Audit',
          tenantId: tid,
          source: 'india_direct_dispatch',
        })
      } catch {
        /* non-fatal */
      }
    }

    res.json({
      success: true,
      data,
      message: 'Dispatched direct to customer. History + courier audit row saved. Track from India WH.',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/orders/actions/us-receive */
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
    if (result.error) return res.status(409).json({ success: false, message: result.error })
    const data = await patchOrder(orderId, tid, result.patch)
    res.json({ success: true, data, message: 'Received into US bucket — ready to pack' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/orders/actions/production-complete */
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
    res.json({
      success: true,
      data,
      message: 'Marked ready — continue Scenario B: label → pack → dispatch to customer',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
