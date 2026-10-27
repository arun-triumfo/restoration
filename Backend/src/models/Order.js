import mongoose from 'mongoose'

const historySchema = new mongoose.Schema(
  {
    time: String,
    action: String,
    detail: String,
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, trim: true },
    channel: String,
    channelIcon: String,
    marketplaceOrderId: String,
    orderDate: String,
    buyerName: String,
    buyerEmail: String,
    buyerPhone: String,
    shippingAddress: String,
    billingAddress: String,
    sku: { type: String, required: true },
    qty: { type: Number, default: 1 },
    unitPriceUSD: Number,
    subtotalUSD: Number,
    shippingChargedUSD: Number,
    taxUSD: Number,
    totalOrderUSD: Number,
    status: String,
    fulfillmentWh: String,
    stockAllocation: String,
    allocationTimestamp: String,
    /** US_STOCK | INDIA_SHIP | MAKE */
    fulfillmentScenario: String,
    /** india_wh | usa_wh — who owns the live queue */
    queueOwner: { type: String, default: 'india_wh' },
    barcode: String,
    barcodeGenerated: { type: Boolean, default: false },
    expectedWarehouseDeliveryDate: String,
    /** Offline / direct / third-party → Finance P&L */
    financeTagged: { type: Boolean, default: false },
    courier: String,
    awb: String,
    labelGenerated: { type: Boolean, default: false },
    trackingStatus: String,
    shippingCostEst: Number,
    shippingCostAct: Number,
    exportInvoice: String,
    mtoNeeded: { type: Boolean, default: false },
    mappingException: { type: Boolean, default: false },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true },
)

orderSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.__v
    return ret
  },
})

export const Order = mongoose.model('Order', orderSchema)
