import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { getResourceModel } from '../models/createResourceModel.js'

dotenv.config()

async function main() {
  await connectDB(process.env.MONGODB_URI)
  const Mto = getResourceModel('mto', 'id', true)
  const Order = getResourceModel('orders', 'orderId', true)
  const mtos = await Mto.find({}).select('id orderId status stage').lean()
  const makes = await Order.find({
    $or: [
      { fulfillmentScenario: 'MAKE' },
      { status: 'In Process' },
      { orderId: /MTO/ },
    ],
  })
    .select('orderId status fulfillmentScenario')
    .lean()
  console.log('MTO jobs', mtos.length)
  console.log(mtos.map((m) => `${m.id}|${m.orderId}|${m.status}|${m.stage}`).join('\n'))
  console.log('MTO-ish orders', makes.length)
  console.log(makes.map((o) => `${o.orderId}|${o.status}|${o.fulfillmentScenario}`).join('\n'))
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
