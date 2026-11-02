/**
 * Reset In-Process MAKE orders to mill start (Queued) + ensure MTO jobs + looms.
 * Ready/shipped MTO orders left alone.
 */
import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { ensureMtoJobForOrder } from '../services/mtoMill.js'

dotenv.config()

const TID = DEFAULT_TENANT_ID

async function main() {
  await connectDB(process.env.MONGODB_URI)
  const Order = getResourceModel('orders', 'orderId', true)
  const Mto = getResourceModel('mto', 'id', true)
  const Loom = getResourceModel('looms', 'loomId', true)

  const making = await Order.find({
    $or: [{ status: 'In Process' }, { fulfillmentScenario: 'MAKE', status: 'In Process' }],
  }).lean()

  console.log('In Process MAKE orders:', making.length)

  await Loom.updateMany({}, { $set: { activeJobId: null, orderId: null, status: 'Idle / Available' } })

  for (const o of making) {
    await Order.findOneAndUpdate(
      { orderId: o.orderId },
      {
        $set: {
          status: 'In Process',
          fulfillmentScenario: 'MAKE',
          mtoNeeded: true,
          queueOwner: 'india_wh',
          stockAt: 'Not in stock',
          stockAllocation: 'No stock — make / weave (MTO Jobs)',
          mtoStage: 'Queued',
          mtoStatus: 'In Process',
        },
      },
    )
    // Reset job to Queued if exists, else ensure creates
    await Mto.deleteMany({ orderId: o.orderId })
    const job = await ensureMtoJobForOrder(
      { ...o, status: 'In Process', fulfillmentScenario: 'MAKE', mtoNeeded: true },
      o.tenantId || TID,
    )
    console.log(o.orderId, '→ Queued', job?.id, 'loom', job?.loomId)
  }

  const readyish = await Order.find({
    orderId: /MTO/,
    status: { $ne: 'In Process' },
  })
    .select('orderId status fulfillmentScenario')
    .lean()
  console.log('\nAlready past mill (not reset):')
  for (const o of readyish) console.log(o.orderId, o.status, o.fulfillmentScenario)

  const count = await Mto.countDocuments({})
  console.log('\nMTO jobs total:', count)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
