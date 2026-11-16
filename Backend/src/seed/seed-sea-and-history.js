/**
 * Demo sea transfer + stock history rows for client review.
 */
import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rugos_erp'

async function main() {
  await connectDB(MONGODB_URI)
  const Transfer = getResourceModel('replenishment', 'shipmentId', true)
  const History = getResourceModel('sku_history', 'recordKey', true)
  const Loading = getResourceModel('loading_plans', 'planId', true)

  const transfers = [
    {
      shipmentId: 'SEA-IND-US-001',
      status: 'On water',
      originWh: 'India WH (Bhadohi)',
      destWh: 'US WH (Edison NJ)',
      transitMode: 'Sea',
      carrier: 'Maersk',
      containerNo: 'MSKU7823419',
      etd: '2026-11-01',
      eta: '2026-12-05',
      skuSummary: '12 rugs · mixed Heritage',
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      shipmentId: 'AIR-IND-US-002',
      status: 'Departed',
      originWh: 'India WH (Delhi ICD)',
      destWh: 'US WH (Edison NJ)',
      transitMode: 'Air',
      carrier: 'Emirates Cargo',
      containerNo: 'AWB-176-99887766',
      etd: '2026-11-14',
      eta: '2026-11-16',
      skuSummary: '3 urgent MTO rugs',
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      shipmentId: 'SEA-IND-US-000',
      status: 'Received in US WH',
      originWh: 'India WH (Bhadohi)',
      destWh: 'US WH (Edison NJ)',
      transitMode: 'Sea',
      carrier: 'CMA CGM',
      containerNo: 'CMAU5511223',
      etd: '2026-09-10',
      eta: '2026-10-20',
      skuSummary: 'Completed demo trail',
      tenantId: DEFAULT_TENANT_ID,
    },
  ]

  for (const t of transfers) {
    await Transfer.findOneAndUpdate({ shipmentId: t.shipmentId }, { $set: t }, { upsert: true })
    console.log('Transfer upserted', t.shipmentId, t.status)
  }

  await Loading.findOneAndUpdate(
    { planId: 'LP-SEA-001' },
    {
      $set: {
        planId: 'LP-SEA-001',
        carrier: 'Maersk',
        mode: 'Sea',
        awb: 'MSKU7823419',
        originWh: 'India WH (Bhadohi)',
        vehicleContainer: 'MSKU7823419 · 40HC',
        tenantId: DEFAULT_TENANT_ID,
      },
    },
    { upsert: true },
  )
  console.log('Loading plan LP-SEA-001 upserted')

  const history = [
    {
      recordKey: 'hist-demo-in-1',
      timestamp: '2026-11-10T08:00:00.000Z',
      sku: 'SKU-DEMO-INDIA-STOCK',
      type: 'IN',
      qty: 5,
      source: 'Mill / GRN (legacy)',
      dest: 'India WH',
      user: 'india@restoration.com',
      ref: 'Opening stock demo',
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      recordKey: 'hist-demo-move-1',
      timestamp: '2026-11-12T10:30:00.000Z',
      sku: 'SKU-DEMO-INDIA-STOCK',
      type: 'MOVE',
      qty: 2,
      source: 'India WH',
      dest: 'Sea SEA-IND-US-001',
      user: 'india@restoration.com',
      ref: 'Loaded to container MSKU7823419',
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      recordKey: 'hist-demo-out-1',
      timestamp: '2026-11-13T14:00:00.000Z',
      sku: 'SKU-DEMO-US-STOCK',
      type: 'OUT',
      qty: 1,
      source: 'US WH',
      dest: 'Customer order',
      user: 'usa@restoration.com',
      ref: 'Packed ORD-DEMO-A-US',
      tenantId: DEFAULT_TENANT_ID,
    },
  ]

  for (const h of history) {
    await History.findOneAndUpdate({ recordKey: h.recordKey }, { $set: h }, { upsert: true })
    console.log('History upserted', h.recordKey)
  }

  console.log('Done. Open Stock Transfers + Stock History.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
