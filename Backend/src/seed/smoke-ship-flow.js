import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { applyBarcodeAndSendToUs, applyShipIndiaToUs } from '../services/orderFulfillment.js'

dotenv.config()

async function main() {
  await connectDB(process.env.MONGODB_URI)
  const Order = getResourceModel('orders', 'orderId', true)
  const a = await Order.findOne({ orderId: 'ORD-DEMO-A-US' }).lean()
  const b = await Order.findOne({ orderId: 'ORD-DEMO-B-INDIA' }).lean()
  console.log('A', a?.status, a?.fulfillmentScenario)
  console.log('B', b?.status, b?.fulfillmentScenario)
  console.log('ship without weight →', applyShipIndiaToUs(b, {}).error)
  const ok = applyShipIndiaToUs(b, { weightKg: 4.5, photoUrl: '/uploads/shipping-photos/test.jpg' })
  console.log('ship with weight →', ok.patch?.status, ok.patch?.shipWeightKg)
  console.log('barcode A →', applyBarcodeAndSendToUs(a).patch?.queueOwner)
  const pending = await Order.countDocuments({
    status: { $in: ['Pending Allocation', 'In Process'] },
  })
  console.log('pending/in-process count', pending)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
