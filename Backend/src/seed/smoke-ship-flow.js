import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { getResourceModel } from '../models/createResourceModel.js'
import {
  applyDispatchIndiaToCustomer,
  applyIndiaCustomerShipPrep,
  applySendCourierLabelToUs,
} from '../services/orderFulfillment.js'
import { buyPlatformOutboundLabel } from '../services/platformLabels.js'
import { resolveShipmentParties } from '../services/shippingAssign.js'

dotenv.config()

async function main() {
  await connectDB(process.env.MONGODB_URI)
  const Order = getResourceModel('orders', 'orderId', true)
  const a = await Order.findOne({ orderId: 'ORD-DEMO-A-US' }).lean()
  const b = await Order.findOne({ orderId: 'ORD-DEMO-B-INDIA' }).lean()
  console.log('A', a?.status, a?.fulfillmentScenario)
  console.log('B', b?.status, b?.fulfillmentScenario)

  console.log('B prep without weight →', applyIndiaCustomerShipPrep(b || {}, {}).error)
  const prep = applyIndiaCustomerShipPrep(b || { fulfillmentScenario: 'INDIA_SHIP' }, {
    weightKg: 4.5,
    lengthCm: 120,
    widthCm: 15,
    heightCm: 15,
  })
  console.log('B prep →', prep.patch?.status, prep.patch?.dimWeightKg, prep.patch?.queueOwner)

  const parties = resolveShipmentParties({
    ...(b || {}),
    fulfillmentScenario: 'INDIA_SHIP',
    queueOwner: 'india_wh',
  })
  console.log('B parties leg →', parties.leg, parties.legLabel)

  const fakeLabel = {
    awb: 'AMZ-TEST-1',
    labelPdfUrl: '/uploads/labels/AMZ-TEST-1.html',
    source: 'Amazon Buy Shipping',
    platform: 'amazon',
    mode: 'sandbox',
    amount: 7.25,
    carrier: 'Amazon Buy Shipping',
    status: 'Label Created',
    trackingUrl: 'https://track.example/AMZ-TEST-1',
  }
  const send = applySendCourierLabelToUs(
    { ...(a || {}), fulfillmentScenario: 'US_STOCK' },
    fakeLabel,
  )
  console.log('A label→US →', send.patch?.queueOwner, send.patch?.labelSentToUs)

  const live = await buyPlatformOutboundLabel(
    { orderId: 'ORD-SMOKE', channel: 'Amazon US', sku: 'X', qty: 1, buyerName: 'Test', shippingAddress: '1 Main St, NY 10001' },
    'default',
  )
  console.log('platform label →', live.platform, live.awb, live.labelPdfUrl)

  const disp = applyDispatchIndiaToCustomer(
    {
      fulfillmentScenario: 'INDIA_SHIP',
      awb: 'ARX-1',
      labelGenerated: true,
      shipWeightKg: 4.5,
    },
    { weightKg: 4.8, lengthCm: 120, widthCm: 15, heightCm: 15, photoUrl: '/x.jpg' },
  )
  console.log('B dispatch →', disp.patch?.status, disp.patch?.dispatchedDirectToCustomer)

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
