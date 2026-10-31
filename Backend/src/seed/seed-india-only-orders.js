/**
 * Add 10 pending orders where US warehouse stock = 0 and India has stock
 * → Scenario B (INDIA_SHIP) for India WH flow testing.
 */
import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { decideFulfillment, pushHistory } from '../services/orderFulfillment.js'

dotenv.config()

const TID = DEFAULT_TENANT_ID
const today = new Date().toISOString().slice(0, 10)

const INDIA_SKUS = [
  {
    sku: 'SKU-IND-ONLY-01',
    title: 'India-only test — Braided Jute Round (5x8)',
    size: '5x8',
    material: '100% Jute',
    construction: 'Flatweave Braided',
    sellingPriceUSD: 420,
    stock: { indiaAvailable: 40, indiaPacked: 0, inTransit: 0, usaAvailable: 0, usaReserved: 0, fba: 0 },
    imageUrl:
      'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-IND-ONLY-02',
    title: 'India-only test — Wool Kilim Runner (2.5x8)',
    size: '2.5x8',
    material: 'Wool',
    construction: 'Handwoven Kilim',
    sellingPriceUSD: 310,
    stock: { indiaAvailable: 28, indiaPacked: 0, inTransit: 0, usaAvailable: 0, usaReserved: 0, fba: 0 },
    imageUrl:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-IND-ONLY-03',
    title: 'India-only test — Block Print Cotton (6x9)',
    size: '6x9',
    material: 'Cotton',
    construction: 'Block Print Flatweave',
    sellingPriceUSD: 560,
    stock: { indiaAvailable: 22, indiaPacked: 0, inTransit: 0, usaAvailable: 0, usaReserved: 0, fba: 0 },
    imageUrl:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-IND-ONLY-04',
    title: 'India-only test — Hand-Tufted Abstract (8x10)',
    size: '8x10',
    material: 'Wool blend',
    construction: 'Hand-Tufted',
    sellingPriceUSD: 890,
    stock: { indiaAvailable: 15, indiaPacked: 0, inTransit: 0, usaAvailable: 0, usaReserved: 0, fba: 0 },
    imageUrl:
      'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-IND-ONLY-05',
    title: 'India-only test — Natural Sisal Border (9x12)',
    size: '9x12',
    material: 'Sisal',
    construction: 'Machine woven + hand finish',
    sellingPriceUSD: 740,
    stock: { indiaAvailable: 11, indiaPacked: 0, inTransit: 0, usaAvailable: 0, usaReserved: 0, fba: 0 },
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
  'Direct Offline',
  'Walmart US',
]

const BUYERS = [
  ['Priya Patel', '210 Maple Rd, Austin, TX 78701, USA'],
  ['James Carter', '44 Beacon St, Boston, MA 02108, USA'],
  ['Sofia Ramirez', '900 Ocean Ave, Miami, FL 33139, USA'],
  ['Liam Chen', '12 Pine St, Seattle, WA 98101, USA'],
  ['Emma Brooks', '330 W 42nd St, New York, NY 10036, USA'],
  ['Noah Kim', '77 Market St, Denver, CO 80202, USA'],
  ['Ava Singh', '501 N Central Ave, Phoenix, AZ 85004, USA'],
  ['Lucas Meyer', '18 Peachtree St, Atlanta, GA 30303, USA'],
  ['Offline Buyer — Gallery', 'Warehouse pickup / direct invoice'],
  ['Olivia Hart', '2500 N Milwaukee Ave, Chicago, IL 60647, USA'],
]

async function main() {
  await connectDB(process.env.MONGODB_URI)
  const Sku = getResourceModel('skus', 'sku', true)
  const Order = getResourceModel('orders', 'orderId', true)

  for (const row of INDIA_SKUS) {
    await Sku.findOneAndUpdate(
      { sku: row.sku, tenantId: TID },
      {
        $set: {
          ...row,
          tenantId: TID,
          collection: 'India WH UAT',
          // flat fields some UIs read
          indiaAvailable: row.stock.indiaAvailable,
          usaAvailable: 0,
        },
      },
      { upsert: true },
    )
    console.log('SKU', row.sku, '→ India', row.stock.indiaAvailable, '/ US 0')
  }

  // Also force demo India SKU to stay US=0
  await Sku.findOneAndUpdate(
    { sku: 'SKU-DEMO-IN-STOCK', tenantId: TID },
    {
      $set: {
        'stock.usaAvailable': 0,
        'stock.indiaAvailable': 20,
        usaAvailable: 0,
        indiaAvailable: 20,
      },
    },
  )

  let created = 0
  for (let i = 0; i < 10; i++) {
    const skuRow = INDIA_SKUS[i % INDIA_SKUS.length]
    const orderId = `ORD-INDIA-TEST-${String(i + 1).padStart(2, '0')}`
    const [buyerName, shippingAddress] = BUYERS[i]
    const channel = CHANNELS[i]
    const qty = 1
    const totalOrderUSD = skuRow.sellingPriceUSD * qty

    const base = {
      orderId,
      channel,
      marketplaceOrderId: `IND-TEST-${i + 1}`,
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
    if (decision.fulfillmentScenario !== 'INDIA_SHIP') {
      console.warn('WARN', orderId, 'expected INDIA_SHIP got', decision.fulfillmentScenario)
    }

    const history = pushHistory(
      { history: [] },
      'Routed to India WH',
      decision.routingNote || 'India stock only — direct to customer test order',
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
          labelPdfUrl: null,
          shipWeightKg: null,
          shipPrice: null,
          shipPhotoUrl: null,
          dispatchedDirectToCustomer: false,
          mtoNeeded: decision.mtoNeeded,
          financeTagged: decision.financeTagged,
          history,
        },
        $unset: {
          trackingStatus: '',
          trackingUrl: '',
          packedAt: '',
          dispatchedAt: '',
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
      '|',
      skuRow.sku,
      channel,
    )
  }

  console.log(`\nDone: ${created} India-only orders ready (US stock 0). Refresh Orders.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
