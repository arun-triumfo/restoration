/**
 * Rebuild MTO jobs + loom links from real MTO-related orders only.
 * Fixes empty /mto page after accidental wipe.
 */
import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

dotenv.config()

const TID = DEFAULT_TENANT_ID

async function main() {
  await connectDB(process.env.MONGODB_URI)
  const Order = getResourceModel('orders', 'orderId', true)
  const Mto = getResourceModel('mto', 'id', true)
  const Sku = getResourceModel('skus', 'sku', true)
  const Loom = getResourceModel('looms', 'loomId', true)

  const orders = await Order.find({
    $or: [
      { fulfillmentScenario: 'MAKE' },
      { status: 'In Process' },
      { orderId: /MTO/i },
      { mtoNeeded: true },
    ],
  }).lean()

  // Wipe and rebuild only order-linked jobs (safe — no orphan dummy)
  await Mto.deleteMany({})
  console.log('Cleared MTO collection, rebuilding from', orders.length, 'orders')

  const skus = await Sku.find({
    sku: { $in: orders.map((o) => o.sku).filter(Boolean) },
  }).lean()
  const skuMap = Object.fromEntries(skus.map((s) => [s.sku, s]))

  for (const o of orders) {
    const made =
      String(o.status) !== 'In Process' && String(o.fulfillmentScenario) === 'INDIA_SHIP'
    const mtoId = `MTO-${o.orderId}`
    await Mto.create({
      id: mtoId,
      orderId: o.orderId,
      sku: o.sku,
      title: skuMap[o.sku]?.title || o.sku,
      stage: made ? 'Ready at India WH' : 'Queued / Loom',
      status: made ? 'Ready' : 'In Process',
      qty: Number(o.qty) || 1,
      pendingQty: made ? 0 : Number(o.qty) || 1,
      expectedReadyDate: o.expectedWarehouseDeliveryDate || null,
      tenantId: o.tenantId || TID,
    })
    console.log(mtoId, '←', o.orderId, made ? 'Ready' : 'In Process')
  }

  const jobs = await Mto.find({}).sort({ orderId: 1 }).lean()
  const looms = await Loom.find({}).sort({ loomId: 1 }).lean()
  await Loom.updateMany({}, { $set: { activeJobId: null, orderId: null, status: 'Idle / Available' } })

  let linked = 0
  for (let i = 0; i < jobs.length && i < looms.length; i++) {
    if (String(jobs[i].status) === 'Ready') continue
    const loom = looms[linked]
    if (!loom) break
    await Loom.findOneAndUpdate(
      { loomId: loom.loomId },
      {
        $set: {
          activeJobId: jobs[i].id,
          orderId: jobs[i].orderId,
          sku: jobs[i].sku,
          status: 'In Active Weaving',
          tenantId: TID,
        },
      },
    )
    console.log(loom.loomId, '←', jobs[i].id)
    linked += 1
  }

  console.log(`\nMTO jobs now: ${jobs.length} · Looms weaving: ${linked}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
