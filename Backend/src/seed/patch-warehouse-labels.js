import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { getResourceModel } from '../models/createResourceModel.js'

dotenv.config()

async function main() {
  await connectDB(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rugos_erp')
  const Order = getResourceModel('orders', 'orderId', true)
  const rows = await Order.find({
    fulfillmentWh: /Mill|3PL|Edison|Jaipur|Production/i,
  }).lean()

  let n = 0
  for (const o of rows) {
    const wh = String(o.fulfillmentWh || '')
    const us = /USA|US|3PL|Edison/i.test(wh)
    const make = /Production|Make/i.test(wh)
    await Order.updateOne(
      { orderId: o.orderId },
      {
        $set: {
          fulfillmentWh: us ? 'US Warehouse' : 'India Warehouse',
          stockAt: make ? 'Not in stock' : us ? 'US Warehouse' : 'India Warehouse',
        },
      },
    )
    n += 1
  }
  console.log(`Patched ${n} orders`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
