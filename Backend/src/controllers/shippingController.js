import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getCarrier } from '../carriers/sandboxFedEx.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { loadLive } from '../integrations/creds.js'
import { channelFromCarrier, liveCourierAdapter } from '../integrations/index.js'
import { getResourceModel } from '../models/createResourceModel.js'
import {
  assignTrackingToOrder,
  buildOrderShippingContext,
  enrichLabelHtml,
  loadOrderForShipping,
  notifyChannelTracking,
} from '../services/shippingAssign.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LABELS_DIR = path.resolve(__dirname, '../../uploads/labels')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function Shipments() {
  return getResourceModel('shipments', 'awb', true)
}

function Logs() {
  return getResourceModel('system_logs', 'id', true)
}

async function resolveCarrier(tenantId, code) {
  const channel = channelFromCarrier(code)
  if (channel) {
    const live = await loadLive(tenantId, channel)
    if (live) {
      const adapter = liveCourierAdapter(channel, live.fields)
      if (adapter) return { carrier: adapter, mode: 'live' }
    }
  }
  return { carrier: getCarrier(code), mode: 'sandbox' }
}

async function audit(req, action, detail) {
  try {
    await Logs().create({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      detail,
      user: req.user?.email,
      tenantId: tenantIdOf(req),
      at: new Date().toISOString(),
    })
  } catch {
    /* non-fatal */
  }
}

export async function quoteRates(req, res) {
  try {
    const { carrier, mode } = await resolveCarrier(tenantIdOf(req), req.body?.carrier || 'SHIPROCKET')
    const rates = await carrier.getRates({
      weightKg: Number(req.body?.weightKg) || 5,
      fromZip: req.body?.fromZip || '221001',
      toZip: req.body?.toZip || '08817',
      service: req.body?.service,
    })
    res.json({
      success: true,
      carrier: carrier.code,
      carrierLabel: carrier.label,
      rates,
      mode,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** GET /api/shipping/order-context/:orderId — auto-fill Shipping Desk from order */
export async function orderShippingContext(req, res) {
  try {
    const tid = tenantIdOf(req)
    const orderId = String(req.params.orderId || '').trim()
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' })
    const order = await loadOrderForShipping(orderId, tid)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    res.json({ success: true, data: buildOrderShippingContext(order) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function buyLabel(req, res) {
  try {
    const tid = tenantIdOf(req)
    const orderId = req.body?.orderId ? String(req.body.orderId).trim() : ''
    let order = null
    let parties = null
    let fromZip = req.body?.fromZip || '221001'
    let toZip = req.body?.toZip || '08817'
    let carrierCode = req.body?.carrier || 'SHIPROCKET'
    let weightKg = Number(req.body?.weightKg) || 5

    if (orderId) {
      order = await loadOrderForShipping(orderId, tid)
      if (!order) return res.status(404).json({ success: false, message: `Order ${orderId} not found` })
      const ctx = buildOrderShippingContext(order)
      parties = ctx.parties
      fromZip = req.body?.fromZip || ctx.fromZip
      toZip = req.body?.toZip || ctx.toZip
      if (!req.body?.carrier) carrierCode = ctx.suggestedCarrier
      weightKg = Number(req.body?.weightKg) || ctx.weightKg
    }

    const { carrier, mode } = await resolveCarrier(tid, carrierCode)
    const label = await carrier.buyLabel({
      service: req.body?.service || 'FEDEX_GROUND',
      weightKg,
      fromZip,
      toZip,
      orderId: orderId || undefined,
      reference: orderId || req.body?.reference,
      shipFrom: parties?.from,
      shipTo: parties?.to,
      buyerName: order?.buyerName,
      sku: order?.sku,
    })

    if (order && parties) {
      label.labelHtml = enrichLabelHtml(label.labelHtml, {
        order,
        parties,
        shipment: label,
      })
    }

    ensureDir(LABELS_DIR)
    const fileName = `${label.awb}.html`
    const filePath = path.join(LABELS_DIR, fileName)
    fs.writeFileSync(filePath, label.labelHtml, 'utf8')
    const labelUrl = `/uploads/labels/${fileName}`

    const doc = {
      awb: label.awb,
      carrier: label.carrier,
      service: label.service,
      serviceName: label.serviceName,
      status: label.status,
      amount: label.amount,
      currency: label.currency,
      etaDays: label.etaDays,
      orderId: orderId || null,
      fromZip,
      toZip,
      weightKg,
      trackingUrl: label.trackingUrl,
      labelUrl,
      labelMime: label.labelMime,
      events: label.events,
      shipFromName: parties?.from?.name || null,
      shipToName: parties?.to?.name || null,
      leg: parties?.leg || null,
      legLabel: parties?.legLabel || null,
      tenantId: tid,
    }

    await Shipments().findOneAndUpdate({ awb: label.awb, tenantId: tid }, { $set: doc }, { upsert: true })

    let notify = null
    let orderPatch = null
    if (order && parties) {
      notify = await notifyChannelTracking(order, { ...label, trackingUrl: label.trackingUrl }, tid)
      orderPatch = await assignTrackingToOrder(order, { ...label, trackingUrl: label.trackingUrl, amount: label.amount }, {
        leg: parties.leg,
        notify,
      })
    }

    await audit(
      req,
      'SHIP_LABEL_BUY',
      `${label.carrier} ${label.awb}${orderId ? ` order=${orderId}` : ''} leg=${parties?.leg || 'manual'}`,
    )

    res.status(201).json({
      success: true,
      shipment: { ...doc, mode },
      mode,
      order: orderPatch
        ? { orderId, awb: orderPatch.awb, trackingStatus: orderPatch.trackingStatus, ...orderPatch }
        : null,
      channelNotify: notify,
      parties,
      message: orderId
        ? `Label ${label.awb} created. Tracking assigned to ${orderId}. ${notify?.message || ''}`.trim()
        : mode === 'live'
          ? 'Live label created. Open print link.'
          : 'Sandbox label created. Open print link.',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function trackShipment(req, res) {
  try {
    const tid = tenantIdOf(req)
    const awb = String(req.params.awb || req.body?.awb || '').trim()
    if (!awb) return res.status(400).json({ success: false, message: 'awb required' })

    const existing = await Shipments().findOne({ awb, tenantId: tid }).lean()
    const carrierCode = existing?.carrier || req.query.carrier || req.body?.carrier || 'SHIPROCKET'
    const { carrier, mode } = await resolveCarrier(tid, carrierCode)
    const tracked = await carrier.track(awb)

    const events = existing?.events?.length
      ? [...existing.events, ...tracked.events.filter((e) => !existing.events.some((x) => x.code === e.code))]
      : tracked.events

    const updated = await Shipments()
      .findOneAndUpdate(
        { awb, tenantId: tid },
        {
          $set: {
            awb,
            carrier: tracked.carrier,
            status: tracked.status,
            trackingUrl: tracked.trackingUrl,
            events,
            tenantId: tid,
            lastTrackedAt: new Date().toISOString(),
          },
        },
        { upsert: true, new: true },
      )
      .lean()

    // Keep order tracking status in sync when shipment belongs to an order
    if (updated?.orderId) {
      const Order = getResourceModel('orders', 'orderId', true)
      await Order.findOneAndUpdate(
        { orderId: updated.orderId },
        { $set: { trackingStatus: tracked.status, trackingUrl: tracked.trackingUrl } },
      )
    }

    res.json({ success: true, shipment: updated, mode })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function listShipments(req, res) {
  try {
    const tid = tenantIdOf(req)
    const data = await Shipments().find({ tenantId: tid }).sort({ updatedAt: -1 }).limit(50).lean()
    res.json({ success: true, count: data.length, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
