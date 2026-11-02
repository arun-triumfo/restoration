/**
 * Add MTO (Make-to-Order) test orders:
 * US stock = 0 AND India stock = 0 → Scenario C (In Process).
 */
import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { decideFulfillment, pushHistory } from '../services/orderFulfillment.js'

dotenv.config()

const TID = DEFAULT_TENANT_ID
const today = new Date().toISOString().slice(0, 10)
const eta = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const MTO_SKUS = [
  {
    sku: 'SKU-MTO-01',
    title: 'MTO test — Hand-Knotted Persian (8x10)',
    size: '8x10',
    material: 'Wool / Silk',
    construction: 'Hand-Knotted',
    sellingPriceUSD: 1890,
    stock: { indiaAvailable: 0, indiaPacked: 0, inTransit: 0, usaAvailable: 0, usaReserved: 0, fba: 0 },
    imageUrl:
      'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-MTO-02',
    title: 'MTO test — Custom Oushak (9x12)',
    size: '9x12',
    material: 'Wool',
    construction: 'Handwoven Oushak',
    sellingPriceUSD: 2200,
    stock: { indiaAvailable: 0, indiaPacked: 0, inTransit: 0, usaAvailable: 0, usaReserved: 0, fba: 0 },
    imageUrl:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-MTO-03',
    title: 'MTO test — Custom Jute Border (6x9)',
    size: '6x9',
    material: 'Jute',
    construction: 'Braided + Border',
    sellingPriceUSD: 680,
    stock: { indiaAvailable: 0, indiaPacked: 0, inTransit: 0, usaAvailable: 0, usaReserved: 0, fba: 0 },
    imageUrl:
      'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-MTO-04',
    title: 'MTO test — Custom Tufted Abstract (5x7)',
    size: '5x7',
    material: 'Wool blend',
    construction: 'Hand-Tufted',
    sellingPriceUSD: 950,
    stock: { indiaAvailable: 0, indiaPacked: 0, inTransit: 0, usaAvailable: 0, usaReserved: 0, fba: 0 },
    imageUrl:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-MTO-05',
    title: 'MTO test — Custom Silk Runner (2.5x10)',
    size: '2.5x10',
    material: 'Silk',
    construction: 'Hand-Knotted Runner',
    sellingPriceUSD: 1450,
    stock: { indiaAvailable: 0, indiaPacked: 0, inTransit: 0, usaAvailable: 0, usaReserved: 0, fba: 0 },
    imageUrl:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=320&q=70',
  },
]

const CHANNELS = [
  'Amazon US',
  'Shopify DTC',
  'Walmart US',
  'Etsy Direct',
  'Wayfair US',
  'B2B Wholesale',
  'Amazon US',
  'Shopify DTC',
]

const BUYERS = [
  ['Maya Thompson', '88 King St, Charleston, SC 29401, USA'],
  ['Ethan Brooks', '1200 Lake Shore Dr, Chicago, IL 60611, USA'],
  ['Zoe Martinez', '45 Pearl St, Boulder, CO 80302, USA'],
  ['Henry Walsh', '900 Broadway, Nashville, TN 37203, USA'],
  ['Isla Nguyen', '2100 Pacific Ave, San Francisco, CA 94115, USA'],
  ['Jack Rivera', '15 Congress St, Portland, ME 04101, USA'],
  ['Aria Kapoor', '700 Brazos St, Austin, TX 78701, USA'],
  ['Leo Anders', '330 E Pine St, Seattle, WA 98122, USA'],
]

async function main() {
  await connectDB(process.env.MONGODB_URI)
  const Sku = getResourceModel('skus', 'sku', true)
  const Order = getResourceModel('orders', 'orderId', true)
  const Mto = getResourceModel('mto', 'id', true)

  // Keep demo no-stock SKU at zero too
  await Sku.findOneAndUpdate(
    { sku: 'SKU-DEMO-NO-STOCK' },
    {
      $set: {
        'stock.indiaAvailable': 0,
        'stock.usaAvailable': 0,
        indiaAvailable: 0,
        usaAvailable: 0,
        tenantId: TID,
      },
    },
    { upsert: false },
  )

  for (const row of MTO_SKUS) {
    await Sku.findOneAndUpdate(
      { sku: row.sku, tenantId: TID },
      {
        $set: {
          ...row,
          tenantId: TID,
          collection: 'MTO UAT',
          indiaAvailable: 0,
          usaAvailable: 0,
        },
      },
      { upsert: true },
    )
    console.log('SKU', row.sku, '→ India 0 / US 0')
  }

  let created = 0
  for (let i = 0; i < 8; i++) {
    const skuRow = MTO_SKUS[i % MTO_SKUS.length]
    const orderId = `ORD-MTO-TEST-${String(i + 1).padStart(2, '0')}`
    const [buyerName, shippingAddress] = BUYERS[i]
    const channel = CHANNELS[i]
    const qty = 1
    const totalOrderUSD = skuRow.sellingPriceUSD * qty

    const base = {
      orderId,
      channel,
      marketplaceOrderId: `MTO-TEST-${i + 1}`,
      orderDate: today,
      buyerName,
      shippingAddress,
      sku: skuRow.sku,
      qty,
      unitPriceUSD: skuRow.sellingPriceUSD,
      totalOrderUSD,
      tenantId: TID,
    }

    const decision = decideFulfillment(base, skuRow)
    if (decision.fulfillmentScenario !== 'MAKE') {
      console.warn('WARN', orderId, 'expected MAKE got', decision.fulfillmentScenario)
    }

    const history = pushHistory(
      { history: [] },
      'Routed to India WH',
      decision.routingNote || 'No stock US/India — MTO / In Process',
    )

    await Order.findOneAndUpdate(
      { orderId },
      {
        $set: {
          ...base,
          status: decision.status,
          fulfillmentWh: decision.fulfillmentWh,
          stockAt: decision.stockAt,
          stockAllocation: decision.stockAllocation,
          fulfillmentScenario: decision.fulfillmentScenario,
          queueOwner: 'india_wh',
          barcodeGenerated: false,
          labelSentToUs: false,
          labelGenerated: false,
          awb: null,
          courier: null,
          mtoNeeded: true,
          expectedWarehouseDeliveryDate: decision.expectedWarehouseDeliveryDate || eta,
          financeTagged: decision.financeTagged,
          history,
        },
        $unset: {
          trackingStatus: '',
          trackingUrl: '',
          packedAt: '',
          dispatchedAt: '',
          labelPdfUrl: '',
        },
      },
      { upsert: true },
    )

    const mtoId = `MTO-${orderId}`
    await Mto.findOneAndUpdate(
      { id: mtoId },
      {
        $set: {
          id: mtoId,
          orderId,
          sku: skuRow.sku,
          title: skuRow.title,
          stage: 'Queued / Loom',
          qty,
          pendingQty: qty,
          expectedReadyDate: decision.expectedWarehouseDeliveryDate || eta,
          tenantId: TID,
          status: 'In Process',
        },
      },
      { upsert: true },
    )

    created += 1
    console.log(
      orderId,
      '→',
      decision.fulfillmentScenario,
      decision.status,
      '| ETA',
      decision.expectedWarehouseDeliveryDate || eta,
      '|',
      skuRow.sku,
    )
  }

  console.log(`\nDone: ${created} MTO orders (US=0, India=0, In Process). Refresh Orders / MTO Jobs.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
