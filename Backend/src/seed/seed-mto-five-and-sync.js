/**
 * 1) Create 5 new MTO orders (US=0, India=0 → In Process)
 * 2) Rebuild MTO jobs ONLY for real MAKE / In Process orders
 * 3) Sync Looms: clear dummy job refs; link only to those real MTO jobs
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

const NEW_SKUS = [
  {
    sku: 'SKU-MTO-06',
    title: 'MTO — Custom Gabbeh (8x10)',
    size: '8x10',
    material: 'Wool',
    construction: 'Handwoven Gabbeh',
    sellingPriceUSD: 1680,
    imageUrl:
      'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-MTO-07',
    title: 'MTO — Custom Moroccan Trellis (6x9)',
    size: '6x9',
    material: 'Wool',
    construction: 'Hand-Knotted',
    sellingPriceUSD: 1120,
    imageUrl:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-MTO-08',
    title: 'MTO — Custom Indigo Dhurrie (5x8)',
    size: '5x8',
    material: 'Cotton',
    construction: 'Flatweave Dhurrie',
    sellingPriceUSD: 540,
    imageUrl:
      'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-MTO-09',
    title: 'MTO — Custom Silk Medallion (9x12)',
    size: '9x12',
    material: 'Silk / Wool',
    construction: 'Hand-Knotted',
    sellingPriceUSD: 3200,
    imageUrl:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=320&q=70',
  },
  {
    sku: 'SKU-MTO-10',
    title: 'MTO — Custom Natural Hemp (7x10)',
    size: '7x10',
    material: 'Hemp',
    construction: 'Handwoven',
    sellingPriceUSD: 890,
    imageUrl:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=320&q=70',
  },
]

const BUYERS = [
  ['Nora Patel', '400 Boylston St, Boston, MA 02116, USA'],
  ['Chris Delgado', '88 Vine St, Seattle, WA 98121, USA'],
  ['Elena Rossi', '1200 Vine St, Los Angeles, CA 90028, USA'],
  ['Sam Okonkwo', '50 Peachtree Center, Atlanta, GA 30303, USA'],
  ['Julia Berg', '210 W 57th St, New York, NY 10019, USA'],
]

const CHANNELS = ['Amazon US', 'Shopify DTC', 'Wayfair US', 'Etsy Direct', 'Walmart US']

async function main() {
  await connectDB(process.env.MONGODB_URI)
  const Sku = getResourceModel('skus', 'sku', true)
  const Order = getResourceModel('orders', 'orderId', true)
  const Mto = getResourceModel('mto', 'id', true)
  const Loom = getResourceModel('looms', 'loomId', true)

  // --- 1) Upsert zero-stock SKUs + 5 new orders ---
  for (const row of NEW_SKUS) {
    await Sku.findOneAndUpdate(
      { sku: row.sku, tenantId: TID },
      {
        $set: {
          ...row,
          tenantId: TID,
          collection: 'MTO UAT',
          indiaAvailable: 0,
          usaAvailable: 0,
          stock: {
            indiaAvailable: 0,
            indiaPacked: 0,
            inTransit: 0,
            usaAvailable: 0,
            usaReserved: 0,
            fba: 0,
          },
        },
      },
      { upsert: true },
    )
  }

  const createdIds = []
  for (let i = 0; i < 5; i++) {
    const skuRow = NEW_SKUS[i]
    const orderId = `ORD-MTO-NEW-${String(i + 1).padStart(2, '0')}`
    const [buyerName, shippingAddress] = BUYERS[i]
    const base = {
      orderId,
      channel: CHANNELS[i],
      marketplaceOrderId: `MTO-NEW-${i + 1}`,
      orderDate: today,
      buyerName,
      shippingAddress,
      sku: skuRow.sku,
      qty: 1,
      unitPriceUSD: skuRow.sellingPriceUSD,
      totalOrderUSD: skuRow.sellingPriceUSD,
      tenantId: TID,
    }
    const decision = decideFulfillment(base, {
      ...skuRow,
      stock: { indiaAvailable: 0, usaAvailable: 0 },
    })
    const history = pushHistory(
      { history: [] },
      'Routed to India WH',
      decision.routingNote || 'No stock — MTO In Process',
    )
    await Order.findOneAndUpdate(
      { orderId },
      {
        $set: {
          ...base,
          status: 'In Process',
          fulfillmentScenario: 'MAKE',
          fulfillmentWh: decision.fulfillmentWh,
          stockAt: 'Not in stock',
          stockAllocation: decision.stockAllocation,
          queueOwner: 'india_wh',
          mtoNeeded: true,
          barcodeGenerated: false,
          labelSentToUs: false,
          labelGenerated: false,
          expectedWarehouseDeliveryDate: decision.expectedWarehouseDeliveryDate || eta,
          financeTagged: false,
          history,
        },
        $unset: {
          awb: '',
          courier: '',
          labelPdfUrl: '',
          trackingStatus: '',
          packedAt: '',
          dispatchedAt: '',
        },
      },
      { upsert: true },
    )
    createdIds.push(orderId)
    console.log(orderId, '→ MAKE In Process |', skuRow.sku, '| India 0 / US 0')
  }

  // --- 2) Rebuild MTO jobs from real MAKE / In Process orders only ---
  const liveMtoOrders = await Order.find({
    $and: [
      {
        $or: [{ tenantId: TID }, { tenantId: { $exists: false } }, { tenantId: null }],
      },
      {
        $or: [
          { fulfillmentScenario: 'MAKE' },
          { status: 'In Process' },
          { mtoNeeded: true, status: { $ne: 'Delivered' } },
        ],
      },
    ],
  }).lean()

  // Only keep jobs that are still manufacturing (In Process / MAKE)
  const manufacturing = liveMtoOrders.filter(
    (o) =>
      String(o.status) === 'In Process' ||
      (String(o.fulfillmentScenario) === 'MAKE' && String(o.status) !== 'Delivered'),
  )

  const keepOrderIds = new Set(manufacturing.map((o) => String(o.orderId)))
  const delMto = await Mto.deleteMany({
    $or: [
      { orderId: { $nin: [...keepOrderIds] } },
      { orderId: { $exists: false } },
      { orderId: null },
      { orderId: '' },
    ],
  })
  console.log('MTO deleted (no matching live MAKE order):', delMto.deletedCount)

  const skuByCode = Object.fromEntries(
    (await Sku.find({ sku: { $in: manufacturing.map((o) => o.sku) } }).lean()).map((s) => [
      s.sku,
      s,
    ]),
  )

  for (const o of manufacturing) {
    const mtoId = `MTO-${o.orderId}`
    const title = skuByCode[o.sku]?.title || o.sku
    await Mto.findOneAndUpdate(
      { id: mtoId },
      {
        $set: {
          id: mtoId,
          orderId: o.orderId,
          sku: o.sku,
          title,
          stage: 'Queued / Loom',
          qty: Number(o.qty) || 1,
          pendingQty: Number(o.qty) || 1,
          expectedReadyDate: o.expectedWarehouseDeliveryDate || eta,
          tenantId: TID,
          status: 'In Process',
        },
      },
      { upsert: true },
    )
  }
  console.log('MTO jobs synced for live orders:', manufacturing.length)

  // --- 3) Sync looms to real MTO jobs only (clear dummy activeJobId) ---
  const mtoJobs = await Mto.find({
    $or: [{ tenantId: TID }, { tenantId: { $exists: false } }, { tenantId: null }],
  })
    .sort({ orderId: 1 })
    .lean()

  const looms = await Loom.find({
    $or: [{ tenantId: TID }, { tenantId: { $exists: false } }, { tenantId: null }],
  })
    .sort({ loomId: 1 })
    .lean()

  // Clear all dummy / stale job links first
  await Loom.updateMany(
    {},
    {
      $set: {
        activeJobId: null,
        orderId: null,
        status: 'Idle / Available',
      },
    },
  )

  let linked = 0
  for (let i = 0; i < mtoJobs.length && i < looms.length; i++) {
    const job = mtoJobs[i]
    const loom = looms[i]
    await Loom.findOneAndUpdate(
      { loomId: loom.loomId },
      {
        $set: {
          activeJobId: job.id,
          orderId: job.orderId,
          sku: job.sku,
          status: 'In Active Weaving',
          tenantId: TID,
        },
      },
    )
    linked += 1
    console.log(loom.loomId, '←', job.id, '(', job.orderId, ')')
  }

  // Extra looms stay Idle with no fake job
  console.log(
    `\nDone: ${createdIds.length} new MTO orders:`,
    createdIds.join(', '),
  )
  console.log(`MTO jobs (order-linked only): ${mtoJobs.length}`)
  console.log(`Looms linked to real MTO: ${linked} · remaining Idle`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
