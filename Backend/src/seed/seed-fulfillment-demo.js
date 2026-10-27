/**
 * Seed pending demo orders for client UAT of Restoration fulfillment flow.
 * Safe to re-run (upserts by sku / orderId). Does not wipe other data.
 *
 * Scenarios:
 *   A  US available          → barcode → US bucket
 *   B  US empty, India yes   → India → US ship
 *   C  Both empty            → In Process + ETA (make)
 *   D  Offline / direct      → same as B + Finance tag
 */
import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { decideFulfillment, pushHistory } from '../services/orderFulfillment.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rugos_erp'
const TID = DEFAULT_TENANT_ID
const today = new Date().toISOString().slice(0, 10)

const DEMO_SKUS = [
  {
    sku: 'SKU-DEMO-US-STOCK',
    title: 'DEMO A — US stock available (8x10 Ivory)',
    collection: 'Client UAT',
    design: 'Demo US Available',
    size: '8x10',
    sellingPriceUSD: 899,
    stock: {
      indiaAvailable: 0,
      indiaPacked: 0,
      inTransit: 0,
      usaAvailable: 12,
      usaReserved: 0,
      fba: 0,
    },
    imageUrl:
      'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-DEMO-IN-STOCK',
    title: 'DEMO B — US empty, India has stock (5x7 Indigo)',
    collection: 'Client UAT',
    design: 'Demo India Available',
    size: '5x7',
    sellingPriceUSD: 549,
    stock: {
      indiaAvailable: 8,
      indiaPacked: 2,
      inTransit: 0,
      usaAvailable: 0,
      usaReserved: 0,
      fba: 0,
    },
    imageUrl:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-DEMO-NO-STOCK',
    title: 'DEMO C — No US / No India stock (make to order)',
    collection: 'Client UAT',
    design: 'Demo Make',
    size: '9x12',
    sellingPriceUSD: 1299,
    stock: {
      indiaAvailable: 0,
      indiaPacked: 0,
      inTransit: 0,
      usaAvailable: 0,
      usaReserved: 0,
      fba: 0,
    },
    imageUrl:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-DEMO-OFFLINE',
    title: 'DEMO D — Offline client (India stock, finance tag)',
    collection: 'Client UAT',
    design: 'Demo Offline',
    size: '6x9',
    sellingPriceUSD: 720,
    stock: {
      indiaAvailable: 4,
      indiaPacked: 0,
      inTransit: 0,
      usaAvailable: 0,
      usaReserved: 0,
      fba: 0,
    },
    imageUrl:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=320&q=70',
  },
]

const ORDER_SPECS = [
  {
    orderId: 'ORD-DEMO-A-US',
    channel: 'Amazon US',
    marketplaceOrderId: 'AMZ-DEMO-A-001',
    buyerName: 'Client Test — US Stock',
    shippingAddress: '1200 Demo Ave, Dallas, TX 75201, USA',
    sku: 'SKU-DEMO-US-STOCK',
    qty: 1,
    totalOrderUSD: 899,
    note: 'Scenario A: US warehouse has stock',
  },
  {
    orderId: 'ORD-DEMO-B-INDIA',
    channel: 'Shopify DTC',
    marketplaceOrderId: 'SHO-DEMO-B-001',
    buyerName: 'Client Test — India Ship',
    shippingAddress: '88 Market St, San Francisco, CA 94105, USA',
    sku: 'SKU-DEMO-IN-STOCK',
    qty: 1,
    totalOrderUSD: 549,
    note: 'Scenario B: US empty, India has stock → ship India→US',
  },
  {
    orderId: 'ORD-DEMO-C-MAKE',
    channel: 'Walmart US',
    marketplaceOrderId: 'WMT-DEMO-C-001',
    buyerName: 'Client Test — Make / In Process',
    shippingAddress: '400 Peachtree, Atlanta, GA 30308, USA',
    sku: 'SKU-DEMO-NO-STOCK',
    qty: 1,
    totalOrderUSD: 1299,
    note: 'Scenario C: No stock anywhere → In Process + ETA',
  },
  {
    orderId: 'ORD-DEMO-D-OFFLINE',
    channel: 'Direct Offline',
    marketplaceOrderId: 'OFF-DEMO-D-001',
    buyerName: 'Client Test — Offline / Finance',
    shippingAddress: 'Jaipur Showroom Pickup → US consignee later',
    sku: 'SKU-DEMO-OFFLINE',
    qty: 1,
    totalOrderUSD: 720,
    note: 'Scenario D: Offline India order → Finance tagged + India→US',
  },
]

async function main() {
  await connectDB(MONGODB_URI)
  const Sku = getResourceModel('skus', 'sku', true)
  const Order = getResourceModel('orders', 'orderId', true)

  for (const row of DEMO_SKUS) {
    await Sku.findOneAndUpdate(
      { sku: row.sku },
      {
        $set: {
          ...row,
          tenantId: TID,
          status: 'Active',
          material: 'Wool',
          construction: 'Hand-Tufted',
        },
      },
      { upsert: true, new: true },
    )
    console.log('SKU:', row.sku, '→ USA', row.stock.usaAvailable, '/ IND', row.stock.indiaAvailable)
  }

  for (const spec of ORDER_SPECS) {
    const skuDoc = DEMO_SKUS.find((s) => s.sku === spec.sku)
    const draft = {
      orderId: spec.orderId,
      channel: spec.channel,
      marketplaceOrderId: spec.marketplaceOrderId,
      orderDate: today,
      buyerName: spec.buyerName,
      shippingAddress: spec.shippingAddress,
      sku: spec.sku,
      qty: spec.qty,
      totalOrderUSD: spec.totalOrderUSD,
      tenantId: TID,
    }
    const decision = decideFulfillment(draft, skuDoc)
    const payload = {
      ...draft,
      status: decision.status,
      fulfillmentWh: decision.fulfillmentWh,
      stockAllocation: decision.stockAllocation,
      fulfillmentScenario: decision.fulfillmentScenario,
      queueOwner: decision.queueOwner,
      barcodeGenerated: false,
      barcode: null,
      mtoNeeded: decision.mtoNeeded,
      expectedWarehouseDeliveryDate: decision.expectedWarehouseDeliveryDate,
      financeTagged: decision.financeTagged,
      history: pushHistory(
        { history: [] },
        'Client UAT seed',
        `${spec.note}. ${decision.routingNote}`,
      ),
    }

    await Order.findOneAndUpdate(
      { orderId: spec.orderId },
      { $set: payload },
      { upsert: true, new: true },
    )
    console.log(
      'Order:',
      spec.orderId,
      '→',
      decision.fulfillmentScenario,
      '/',
      decision.status,
      decision.financeTagged ? '(Finance)' : '',
    )
  }

  console.log('\nDone. Login india@restoration.com → Orders → filter Pending / search ORD-DEMO')
  console.log('Password: RugOS@2026')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
