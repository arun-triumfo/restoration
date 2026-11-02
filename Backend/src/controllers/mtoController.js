import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import {
  advanceMtoStage,
  ensureMtoJobForOrder,
  getMtoByOrderId,
  MTO_STAGES,
} from '../services/mtoMill.js'
import { SCENARIO } from '../services/orderFulfillment.js'

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function tenantFilter(tid) {
  if (tid === DEFAULT_TENANT_ID) {
    return {
      $or: [{ tenantId: tid }, { tenantId: { $exists: false } }, { tenantId: null }],
    }
  }
  return { tenantId: tid }
}

/** POST /api/mto/actions/advance  body: { mtoId? , orderId? } */
export async function advanceStage(req, res) {
  try {
    const role = req.user?.roleCode
    if (!['super_admin', 'india_wh'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only India WH can advance MTO stages' })
    }
    const key = String(req.body?.mtoId || req.body?.orderId || '').trim()
    if (!key) return res.status(400).json({ success: false, message: 'mtoId or orderId required' })

    const result = await advanceMtoStage(key, tenantIdOf(req))
    if (result.error) {
      return res.status(409).json({ success: false, message: result.error, data: result.job })
    }
    res.json({
      success: true,
      data: result.job,
      from: result.from,
      to: result.to,
      stages: MTO_STAGES,
      message:
        result.to === 'Ready'
          ? `MTO Ready. Go to Orders → Mark ready (made) → then Prep ship.`
          : `Stage updated: ${result.from} → ${result.to}. Keep advancing until Ready.`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/mto/actions/ensure-for-orders — backfill missing jobs for MAKE orders */
export async function ensureJobs(req, res) {
  try {
    const role = req.user?.roleCode
    if (!['super_admin', 'india_wh'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only India WH can sync MTO jobs' })
    }
    const tid = tenantIdOf(req)
    const Order = getResourceModel('orders', 'orderId', true)
    const orders = await Order.find({
      $and: [
        tenantFilter(tid),
        {
          $or: [
            { fulfillmentScenario: SCENARIO.MAKE },
            { status: 'In Process' },
            { mtoNeeded: true },
          ],
        },
      ],
    }).lean()

    const created = []
    for (const o of orders) {
      const existing = await getMtoByOrderId(o.orderId, tid)
      if (existing) continue
      const job = await ensureMtoJobForOrder(o, tid)
      if (job) created.push(job.id)
    }
    res.json({
      success: true,
      count: created.length,
      created,
      message: `Ensured MTO jobs. New: ${created.length}`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
