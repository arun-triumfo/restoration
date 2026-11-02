/**
 * Proper mill / MTO flow (Option B):
 * Order (MAKE) → auto MTO job + loom → stages Queued → Weaving → QC → Ready
 * → then Orders "Mark ready" → ship
 */
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { SCENARIO } from './orderFulfillment.js'

export const MTO_STAGES = ['Queued', 'Weaving', 'QC', 'Ready']

const STAGE_META = {
  Queued: {
    status: 'In Process',
    stageLabel: 'Queued / Loom',
    loomStatus: 'Assigned — waiting warp',
  },
  Weaving: {
    status: 'In Process',
    stageLabel: 'Weaving on loom',
    loomStatus: 'In Active Weaving',
  },
  QC: {
    status: 'In Process',
    stageLabel: 'QC / Wash / Finish',
    loomStatus: 'Job off loom — QC',
  },
  Ready: {
    status: 'Ready',
    stageLabel: 'Ready at India WH',
    loomStatus: 'Idle / Available',
  },
}

function Mto() {
  return getResourceModel('mto', 'id', true)
}
function Loom() {
  return getResourceModel('looms', 'loomId', true)
}
function Sku() {
  return getResourceModel('skus', 'sku', true)
}
function Orders() {
  return getResourceModel('orders', 'orderId', true)
}

function tenantFilter(tid) {
  const t = tid || DEFAULT_TENANT_ID
  if (t === DEFAULT_TENANT_ID) {
    return { $or: [{ tenantId: t }, { tenantId: { $exists: false } }, { tenantId: null }] }
  }
  return { tenantId: t }
}

export function nextStage(current) {
  const raw = String(current || 'Queued')
  const key = MTO_STAGES.find((s) => raw === s || raw.toLowerCase().includes(s.toLowerCase())) || 'Queued'
  const idx = MTO_STAGES.indexOf(key)
  if (idx < 0 || idx >= MTO_STAGES.length - 1) return null
  return MTO_STAGES[idx + 1]
}

export function normalizeStage(stageOrLabel) {
  const raw = String(stageOrLabel || 'Queued')
  return MTO_STAGES.find((s) => raw === s || raw.toLowerCase().includes(s.toLowerCase())) || 'Queued'
}

async function pickIdleLoom(tenantId) {
  const filter = {
    $and: [
      tenantFilter(tenantId),
      {
        $or: [
          { activeJobId: null },
          { activeJobId: { $exists: false } },
          { activeJobId: '' },
          { status: /idle|available/i },
        ],
      },
    ],
  }
  let loom = await Loom().findOne(filter).sort({ loomId: 1 }).lean()
  if (!loom) {
    loom = await Loom().findOne(tenantFilter(tenantId)).sort({ loomId: 1 }).lean()
  }
  return loom
}

/**
 * Ensure MTO job (+ loom) exists for a MAKE / In Process order.
 */
export async function ensureMtoJobForOrder(order, tenantId = DEFAULT_TENANT_ID) {
  if (!order?.orderId) return null
  const isMake =
    order.fulfillmentScenario === SCENARIO.MAKE ||
    order.status === 'In Process' ||
    order.mtoNeeded
  if (!isMake) return null

  const tid = tenantId || order.tenantId || DEFAULT_TENANT_ID
  const mtoId = `MTO-${order.orderId}`
  const existing = await Mto().findOne({ id: mtoId }).lean()
  if (existing) return existing

  let title = order.sku
  try {
    const skuDoc = await Sku()
      .findOne({ $and: [tenantFilter(tid), { sku: String(order.sku || '') }] })
      .lean()
    if (skuDoc?.title) title = skuDoc.title
  } catch {
    /* ignore */
  }

  const loom = await pickIdleLoom(tid)
  const meta = STAGE_META.Queued
  const job = {
    id: mtoId,
    orderId: order.orderId,
    sku: order.sku,
    title,
    stage: meta.stageLabel,
    stageKey: 'Queued',
    status: meta.status,
    qty: Math.max(1, Number(order.qty) || 1),
    pendingQty: Math.max(1, Number(order.qty) || 1),
    expectedReadyDate: order.expectedWarehouseDeliveryDate || null,
    loomId: loom?.loomId || null,
    tenantId: tid,
    history: [
      {
        time: new Date().toISOString(),
        action: 'MTO opened',
        detail: `Auto-created for ${order.orderId}. Loom: ${loom?.loomId || 'unassigned'}. Advance stages until Ready, then Mark ready on Orders.`,
      },
    ],
  }

  await Mto().findOneAndUpdate({ id: mtoId }, { $set: job }, { upsert: true })

  if (loom?.loomId) {
    await Loom().findOneAndUpdate(
      { loomId: loom.loomId },
      {
        $set: {
          activeJobId: mtoId,
          orderId: order.orderId,
          sku: order.sku,
          status: meta.loomStatus,
          tenantId: tid,
        },
      },
    )
  }

  await Orders().findOneAndUpdate(
    { orderId: order.orderId },
    {
      $set: {
        mtoJobId: mtoId,
        mtoStage: 'Queued',
        mtoStatus: 'In Process',
      },
    },
  )

  return job
}

export async function advanceMtoStage(mtoIdOrOrderId, tenantId = DEFAULT_TENANT_ID) {
  const tid = tenantId || DEFAULT_TENANT_ID
  const key = String(mtoIdOrOrderId || '').trim()
  let job = await Mto()
    .findOne({
      $and: [tenantFilter(tid), { $or: [{ id: key }, { id: `MTO-${key}` }, { orderId: key }] }],
    })
    .lean()

  if (!job) {
    return { error: 'MTO job not found' }
  }

  const current = normalizeStage(job.stageKey || job.stage)
  if (current === 'Ready') {
    return { error: 'Already Ready — go to Orders and click Mark ready (made)', job }
  }

  const nxt = nextStage(current)
  if (!nxt) return { error: 'No next stage', job }

  const meta = STAGE_META[nxt]
  const history = Array.isArray(job.history) ? [...job.history] : []
  history.unshift({
    time: new Date().toISOString(),
    action: `Stage → ${nxt}`,
    detail: `${current} → ${nxt}. ${
      nxt === 'Ready'
        ? 'Mill done. Next: Orders → Mark ready (made) → Prep ship.'
        : 'Continue mill stages.'
    }`,
  })

  const patch = {
    stageKey: nxt,
    stage: meta.stageLabel,
    status: meta.status,
    pendingQty: nxt === 'Ready' ? 0 : job.pendingQty,
    completedAt: nxt === 'Ready' ? new Date().toISOString() : null,
    history: history.slice(0, 40),
  }

  const updated = await Mto()
    .findOneAndUpdate({ id: job.id }, { $set: patch }, { new: true })
    .lean()

  // Loom: weaving while Queued/Weaving; free on QC/Ready
  if (job.loomId) {
    if (nxt === 'QC' || nxt === 'Ready') {
      await Loom().findOneAndUpdate(
        { loomId: job.loomId },
        { $set: { activeJobId: null, orderId: null, status: 'Idle / Available' } },
      )
    } else {
      await Loom().findOneAndUpdate(
        { loomId: job.loomId },
        {
          $set: {
            activeJobId: job.id,
            orderId: job.orderId,
            sku: job.sku,
            status: meta.loomStatus,
          },
        },
      )
    }
  }

  await Orders().findOneAndUpdate(
    { orderId: job.orderId },
    {
      $set: {
        mtoJobId: job.id,
        mtoStage: nxt,
        mtoStatus: meta.status,
        stockAllocation:
          nxt === 'Ready'
            ? 'MTO Ready at mill — click Mark ready (made) on Orders'
            : `MTO ${meta.stageLabel} — advance on MTO Jobs until Ready`,
      },
    },
  )

  return { job: updated, from: current, to: nxt }
}

export async function getMtoByOrderId(orderId, tenantId = DEFAULT_TENANT_ID) {
  if (!orderId) return null
  return Mto()
    .findOne({
      $and: [
        tenantFilter(tenantId),
        { $or: [{ orderId: String(orderId) }, { id: `MTO-${orderId}` }] },
      ],
    })
    .lean()
}

/** Mark ready on Orders only allowed when MTO stage is Ready */
export async function assertMtoReadyForMarkReady(order, tenantId) {
  const job = await getMtoByOrderId(order.orderId, tenantId)
  if (!job) {
    return {
      error:
        'No MTO job found. Open MTO Jobs — job should auto-create for make orders. Advance Queued → Weaving → QC → Ready first.',
    }
  }
  const stage = normalizeStage(job.stageKey || job.stage)
  if (stage !== 'Ready' && String(job.status) !== 'Ready') {
    return {
      error: `Mill not finished (MTO is ${job.stage || stage}). On MTO Jobs advance until Ready, then Mark ready on Orders.`,
      job,
    }
  }
  return { job }
}
