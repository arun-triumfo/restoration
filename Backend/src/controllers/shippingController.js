import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getCarrier } from '../carriers/sandboxFedEx.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

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
    const carrier = getCarrier(req.body?.carrier || 'FEDEX')
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
      mode: 'sandbox',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function buyLabel(req, res) {
  try {
    const tid = tenantIdOf(req)
    const carrier = getCarrier(req.body?.carrier || 'FEDEX')
    const label = await carrier.buyLabel({
      service: req.body?.service || 'FEDEX_GROUND',
      weightKg: Number(req.body?.weightKg) || 5,
      fromZip: req.body?.fromZip || '221001',
      toZip: req.body?.toZip || '08817',
      orderId: req.body?.orderId,
      reference: req.body?.reference,
    })

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
      orderId: req.body?.orderId || null,
      fromZip: req.body?.fromZip || '221001',
      toZip: req.body?.toZip || '08817',
      weightKg: Number(req.body?.weightKg) || 5,
      trackingUrl: label.trackingUrl,
      labelUrl,
      labelMime: label.labelMime,
      events: label.events,
      tenantId: tid,
    }

    await Shipments().findOneAndUpdate({ awb: label.awb, tenantId: tid }, { $set: doc }, { upsert: true })
    await audit(req, 'SHIP_LABEL_BUY', `${label.carrier} ${label.awb}`)

    res.status(201).json({
      success: true,
      shipment: doc,
      message: 'Sandbox label created. Open labelUrl to print.',
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
    const carrierCode = existing?.carrier || req.query.carrier || 'FEDEX'
    const carrier = getCarrier(carrierCode)
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

    res.json({ success: true, shipment: updated, mode: 'sandbox' })
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
