/**
 * Reset ALL orders to Pending for client step-by-step testing.
 * Re-runs India-first stock routing. Clears AWB / barcode handoff so flow can be re-tested.
 */
import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { decideFulfillment, lookupSku, pushHistory } from '../services/orderFulfillment.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rugos_erp'

async function main() {
  await connectDB(MONGODB_URI)
  const Order = getResourceModel('orders', 'orderId', true)
  const orders = await Order.find({}).lean()
  let n = 0

  for (const order of orders) {
    const sku = await lookupSku(order.sku, order.tenantId || DEFAULT_TENANT_ID)
    const decision = decideFulfillment(
      {
        ...order,
        barcodeGenerated: false,
        awb: null,
        expectedWarehouseDeliveryDate: null,
      },
      sku,
    )
    const history = pushHistory(
      { history: [] },
      'Reset for client test',
      `All orders set to pending. ${decision.routingNote}`,
    )
    await Order.updateOne(
      { orderId: order.orderId },
      {
        $set: {
          status: decision.status,
          fulfillmentWh: decision.fulfillmentWh,
          stockAt: decision.stockAt,
          stockAllocation: decision.stockAllocation,
          fulfillmentScenario: decision.fulfillmentScenario,
          queueOwner: 'india_wh',
          barcodeGenerated: false,
          barcode: null,
          awb: null,
          courier: null,
          labelGenerated: false,
          trackingStatus: null,
          trackingUrl: null,
          trackingNotified: false,
          trackingNotifyStatus: null,
          trackingNotifyDetail: null,
          trackingNotifyChannel: null,
          lastLabelLeg: null,
          shipPhotoUrl: null,
          shipWeightKg: null,
          mtoNeeded: decision.mtoNeeded,
          expectedWarehouseDeliveryDate: decision.expectedWarehouseDeliveryDate,
          financeTagged: decision.financeTagged || Boolean(order.financeTagged),
          history,
        },
      },
    )
    n += 1
    console.log(order.orderId, '→', decision.fulfillmentScenario, decision.status)
  }

  console.log(`\nReset ${n} orders to pending / India queue for testing`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
