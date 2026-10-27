import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PHOTOS_DIR = path.resolve(__dirname, '../../uploads/packing')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function Orders() {
  return getResourceModel('orders', 'orderId', true)
}

function Packing() {
  return getResourceModel('packing_events', 'id', true)
}

const WH_ROLES = new Set(['super_admin', 'india_wh', 'usa_wh'])

export function requireWarehouseRole(req, res, next) {
  if (!WH_ROLES.has(req.user?.roleCode)) {
    return res.status(403).json({
      success: false,
      message: 'Packing station is limited to India / US warehouse roles',
    })
  }
  return next()
}

export async function confirmPack(req, res) {
  try {
    const tid = tenantIdOf(req)
    const orderId = String(req.body?.orderId || '').trim()
    const scannedSku = String(req.body?.scannedSku || '').trim()
    const photoDataUrl = req.body?.photoDataUrl

    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' })
    if (!scannedSku) return res.status(400).json({ success: false, message: 'scannedSku required' })

    const order = await Orders().findOne({ orderId, tenantId: tid }).lean()
    if (!order) return res.status(404).json({ success: false, message: 'Order not found for tenant' })

    const expected = String(order.sku || order.SKU || '').trim()
    if (expected && expected.toLowerCase() !== scannedSku.toLowerCase()) {
      return res.status(409).json({
        success: false,
        message: `Scan mismatch: expected SKU ${expected}, got ${scannedSku}`,
        expectedSku: expected,
        scannedSku,
      })
    }

    let photoUrl = null
    if (photoDataUrl && String(photoDataUrl).startsWith('data:image')) {
      ensureDir(PHOTOS_DIR)
      const match = String(photoDataUrl).match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
      if (match) {
        const ext = match[1].includes('png') ? 'png' : 'jpg'
        const fileName = `${orderId}-${Date.now()}.${ext}`
        fs.writeFileSync(path.join(PHOTOS_DIR, fileName), Buffer.from(match[2], 'base64'))
        photoUrl = `/uploads/packing/${fileName}`
      }
    }

    const eventId = `pack-${orderId}-${Date.now()}`
    const event = {
      id: eventId,
      orderId,
      scannedSku,
      expectedSku: expected || scannedSku,
      photoUrl,
      packedBy: req.user?.email,
      packedAt: new Date().toISOString(),
      tenantId: tid,
      status: 'Packed',
    }
    await Packing().create(event)

    const role = req.user?.roleCode
    const nextStatus =
      role === 'usa_wh' || order.queueOwner === 'usa_wh' ? 'Packed & Handover' : 'Packed & Handover'
    const updated = await Orders()
      .findOneAndUpdate(
        { orderId, tenantId: tid },
        {
          $set: {
            status: nextStatus,
            packingPhotoUrl: photoUrl,
            packedAt: event.packedAt,
            packedBy: event.packedBy,
            packingScanSku: scannedSku,
            stockAllocation: 'Packed',
          },
        },
        { new: true },
      )
      .lean()

    res.json({
      success: true,
      event,
      order: updated,
      message: photoUrl ? 'Packed with photo proof' : 'Packed (no photo)',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function listPackingQueue(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    const filter = {
      tenantId: tid,
      status: { $regex: /pending|allocat|pick|open|ready/i },
    }
    // US manager packs customer orders in their bucket; India packs India→US / mill
    if (role === 'usa_wh') {
      filter.queueOwner = 'usa_wh'
    } else if (role === 'india_wh') {
      filter.$or = [{ queueOwner: 'india_wh' }, { queueOwner: { $exists: false } }]
    }
    const data = await Orders().find(filter).sort({ updatedAt: -1 }).limit(40).lean()
    res.json({ success: true, count: data.length, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
