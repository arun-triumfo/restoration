import { RESOURCES } from '../resources.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import {
  isOfflineChannel,
  pushHistory,
  routeNewOrderPayload,
} from '../services/orderFulfillment.js'

function modelFor(resource) {
  const meta = RESOURCES[resource]
  return getResourceModel(resource, meta.idField, meta.unique !== false)
}

function recordId(req) {
  return req.params.recordId ?? req.params.id
}

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

/** Scope filter: match tenant OR legacy docs without tenantId (treated as default tenant) */
function tenantFilter(req) {
  const tid = tenantIdOf(req)
  if (tid === DEFAULT_TENANT_ID) {
    return {
      $or: [{ tenantId: tid }, { tenantId: { $exists: false } }, { tenantId: null }],
    }
  }
  return { tenantId: tid }
}

function withTenant(req, payload) {
  return { ...payload, tenantId: tenantIdOf(req) }
}

export function listResource(resource) {
  return async (req, res) => {
    try {
      const { search = '' } = req.query
      const Model = modelFor(resource)
      const parts = [tenantFilter(req)]
      if (search) {
        const q = String(search).trim()
        parts.push({
          $or: [
            { [RESOURCES[resource].idField]: new RegExp(q, 'i') },
            { title: new RegExp(q, 'i') },
            { name: new RegExp(q, 'i') },
            { status: new RegExp(q, 'i') },
            { buyerName: new RegExp(q, 'i') },
            { channel: new RegExp(q, 'i') },
            { email: new RegExp(q, 'i') },
          ],
        })
      }
      const filter = parts.length === 1 ? parts[0] : { $and: parts }
      const data = await Model.find(filter).sort({ updatedAt: -1 }).lean()
      // Never leak password hashes
      const cleaned = data.map((row) => {
        const { passwordHash, ...rest } = row
        return rest
      })
      res.json({ success: true, resource, count: cleaned.length, data: cleaned })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}

export function getResource(resource) {
  return async (req, res) => {
    try {
      const idField = RESOURCES[resource].idField
      const id = recordId(req)
      if (!id) {
        return res.status(400).json({ success: false, message: 'Record id required' })
      }
      const Model = modelFor(resource)
      const data = await Model.findOne({
        $and: [tenantFilter(req), { [idField]: id }],
      }).lean()
      if (!data) return res.status(404).json({ success: false, message: 'Not found' })
      const { passwordHash, ...rest } = data
      res.json({ success: true, data: rest })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}

export function createResource(resource) {
  return async (req, res) => {
    try {
      const idField = RESOURCES[resource].idField
      const Model = modelFor(resource)
      let payload = withTenant(req, req.body || {})
      delete payload.passwordHash
      const key = payload[idField]
      if (key === undefined || key === null || key === '') {
        return res.status(400).json({ success: false, message: `${idField} is required` })
      }
      const exists = await Model.findOne({
        $and: [tenantFilter(req), { [idField]: key }],
      })
      if (exists) {
        return res.status(409).json({ success: false, message: 'Record already exists' })
      }

      // Client SOP: every order → India WH queue + US/India stock scenario
      if (resource === 'orders') {
        payload = await routeNewOrderPayload(payload, tenantIdOf(req))
      }

      // Returns: India opens → platform label → US receive. Enrich from linked order.
      if (resource === 'returns') {
        let order = null
        if (payload.orderId) {
          try {
            const Order = getResourceModel('orders', 'orderId', true)
            order = await Order.findOne({
              $and: [tenantFilter(req), { orderId: String(payload.orderId) }],
            }).lean()
          } catch {
            /* ignore */
          }
        }
        const channel = payload.channel || payload.platform || order?.channel || ''
        payload = {
          ...payload,
          queueOwner: 'india_wh',
          status: payload.status || 'Pending Inspection',
          channel,
          platform: payload.platform || channel,
          sku: payload.sku || order?.sku || null,
          qty: payload.qty || order?.qty || 1,
          customer: payload.customer || order?.buyerName || null,
          customerEmail: payload.customerEmail || order?.buyerEmail || null,
          refundUSD: payload.refundUSD ?? order?.totalOrderUSD ?? null,
          accountsTagged: true,
          history: pushHistory(
            payload,
            'Return opened',
            `Platform: ${channel || 'unknown'}. India WH generates return label via that platform, then sends to US bucket.`,
          ),
        }
      }

      // Offline / direct channel already tagged in routeNewOrderPayload; reinforce finance flag
      if (resource === 'orders' && (payload.financeTagged || isOfflineChannel(payload.channel))) {
        payload.financeTagged = true
      }

      // Finance: courier bill vs recorded weight / rate → Logistics Error
      if (resource === 'courier_audit') {
        const billed = Number(payload.billedWeightKg ?? payload.billedWeight ?? 0)
        const actual = Number(payload.actualWeightKg ?? payload.actualWeight ?? payload.recordedWeightKg ?? 0)
        const billedAmt = Number(payload.billedAmount ?? payload.amountBilled ?? 0)
        const agreed = Number(payload.agreedAmount ?? payload.amountAgreed ?? payload.expectedAmount ?? 0)
        const weightMismatch = billed > 0 && actual > 0 && Math.abs(billed - actual) > 0.15
        const priceMismatch = billedAmt > 0 && agreed > 0 && Math.abs(billedAmt - agreed) > 0.5
        if (weightMismatch || priceMismatch || payload.logisticsError) {
          payload.logisticsError = true
          payload.status = payload.status || 'Logistics Error'
          payload.flagReason =
            payload.flagReason ||
            [
              weightMismatch ? `Weight mismatch billed ${billed} vs recorded ${actual}` : null,
              priceMismatch ? `Price mismatch billed ${billedAmt} vs agreed ${agreed}` : null,
            ]
              .filter(Boolean)
              .join('; ')
        }
      }

      const created = await Model.create(payload)
      const obj = created.toObject ? created.toObject() : created
      delete obj.passwordHash
      res.status(201).json({ success: true, data: obj })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}

export function updateResource(resource) {
  return async (req, res) => {
    try {
      const idField = RESOURCES[resource].idField
      const id = recordId(req)
      if (!id) {
        return res.status(400).json({ success: false, message: 'Record id required' })
      }
      const Model = modelFor(resource)
      const body = { ...(req.body || {}) }
      delete body._id
      delete body.__v
      delete body.createdAt
      delete body.updatedAt
      delete body.passwordHash
      delete body.tenantId
      if (body[idField] !== undefined && String(body[idField]) !== String(id)) {
        delete body[idField]
      }
      const updated = await Model.findOneAndUpdate(
        { $and: [tenantFilter(req), { [idField]: id }] },
        { $set: body },
        { new: true },
      ).lean()
      if (!updated) return res.status(404).json({ success: false, message: 'Not found' })
      delete updated.passwordHash
      res.json({ success: true, data: updated })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}

export function deleteResource(resource) {
  return async (req, res) => {
    try {
      const idField = RESOURCES[resource].idField
      const id = recordId(req)
      if (!id) {
        return res.status(400).json({ success: false, message: 'Record id required' })
      }
      const Model = modelFor(resource)
      const deleted = await Model.findOneAndDelete({
        $and: [tenantFilter(req), { [idField]: id }],
      })
      if (!deleted) return res.status(404).json({ success: false, message: 'Not found' })
      res.json({ success: true, message: 'Deleted' })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}
