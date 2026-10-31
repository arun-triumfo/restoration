import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { getResourceModel } from '../models/createResourceModel.js'

dotenv.config()

async function main() {
  await connectDB(process.env.MONGODB_URI)
  const Order = getResourceModel('orders', 'orderId', true)
  const r = await Order.updateMany(
    {
      $or: [{ labelSentToUs: true }, { queueOwner: 'usa_wh', labelGenerated: true }],
    },
    {
      $set: {
        status: 'Ready to Pack',
        stockAllocation: 'Label ready — US print label, pack & dispatch to customer',
        queueOwner: 'usa_wh',
      },
    },
  )
  console.log('Patched:', r.modifiedCount, 'matched:', r.matchedCount)
  const sample = await Order.find({ queueOwner: 'usa_wh' })
    .select('orderId status queueOwner')
    .lean()
  for (const o of sample) console.log(o.orderId, '|', o.status)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
