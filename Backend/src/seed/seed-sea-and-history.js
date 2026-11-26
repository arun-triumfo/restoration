/**
 * Demo sea FCL transfer + export doc + stock history (client handoff example).
 * Safe to re-run. Does not delete existing unrelated transfers.
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
  const ExportDoc = getResourceModel('export_docs', 'invoiceNo', true)
  const Sku = getResourceModel('skus', 'sku', true)

  // Ensure demo SKUs have India stock for dispatch tests
  for (const [sku, qty] of [
    ['SKU-DEMO-INDIA-STOCK', 50],
    ['SKU-DEMO-US-STOCK', 20],
  ]) {
    const doc = await Sku.findOne({ sku }).lean()
    if (!doc) continue
    const stock = {
      indiaAvailable: Number(doc.stock?.indiaAvailable ?? doc.indiaAvailable ?? qty),
      indiaPacked: Number(doc.stock?.indiaPacked || 0),
      inTransit: Number(doc.stock?.inTransit || 0),
      usaAvailable: Number(doc.stock?.usaAvailable ?? doc.usaAvailable ?? 0),
      usaReserved: Number(doc.stock?.usaReserved || 0),
      fba: Number(doc.stock?.fba || 0),
    }
    if (stock.indiaAvailable < 10) stock.indiaAvailable = qty
    await Sku.findOneAndUpdate(
      { sku },
      { $set: { stock, indiaAvailable: stock.indiaAvailable, usaAvailable: stock.usaAvailable } },
    )
  }

  const clientExample = {
    shipmentId: 'SEA-IND-US-101',
    exportShipmentId: 'EXP-USA-2026-0101',
    status: 'On water',
    originWh: 'India WH (Bhadohi)',
    destWh: 'US WH (Edison NJ 3PL)',
    shippingMode: 'SEA_FCL_40',
    transitMode: 'Sea · 40-ft FCL',
    carrier: 'Maersk',
    forwarder: 'Demo Forwarder LLC',
    bookingNumber: 'BKG-44021',
    blNumber: 'ABC12345',
    containerNo: 'TLLU1234567',
    sealNumber: 'S98765',
    pol: 'Nhava Sheva',
    pod: 'Newark NJ',
    vesselVoyage: 'MAERSK ESSEX / 026E',
    incoterm: 'FOB Nhava Sheva',
    etd: '2026-11-01',
    eta: '2026-12-05',
    skuSummary: '200 rugs · 80 rolls · SEA_FCL_40 demo',
    indiaShippingBill: 'SB-2026-77881',
    usIsfStatus: 'Filed — broker confirmed',
    customsBroker: 'US Broker Co',
    importerOfRecord: 'Restoration Rugs USA',
    items: [
      {
        sku: 'SKU-DEMO-INDIA-STOCK',
        title: 'Demo India stock rug',
        qty: 200,
        unitValueUsd: 180,
        receivedQty: 200,
        damagedQty: 0,
        missingQty: 0,
      },
    ],
    packages: [
      { packageId: 'ROLL-001', lengthCm: 320, widthCm: 40, heightCm: 40, grossKg: 28, cbm: 0.51 },
    ],
    containers: [
      { containerId: 'TLLU1234567', isoType: '40HC', seal: 'S98765' },
    ],
    documentChecklist: [
      { category: 'Commercial', state: 'Uploaded' },
      { category: 'Origin India', state: 'Uploaded' },
      { category: 'Loading & ocean', state: 'Uploaded' },
      { category: 'US import', state: 'Missing' },
      { category: 'Destination & warehouse', state: 'Missing' },
      { category: 'Finance & claims', state: 'Missing' },
    ],
    expenses: [
      {
        id: 'exp-ocean-1',
        chargeType: 'Ocean freight',
        amount: 4200,
        currency: 'USD',
        estimatedOrActual: 'estimated',
        vendor: 'Maersk',
        allocationMethod: 'by quantity',
      },
      {
        id: 'exp-cha-1',
        chargeType: 'Origin CHA',
        amount: 350,
        currency: 'USD',
        estimatedOrActual: 'actual',
        vendor: 'India CHA',
        allocationMethod: 'by quantity',
      },
    ],
    timeline: [
      {
        id: 'ev-1',
        at: '2026-10-20T08:00:00.000Z',
        status: 'Draft',
        by: 'seed',
        note: 'Client example SEA-IND-US-101 created',
      },
      {
        id: 'ev-2',
        at: '2026-10-28T12:00:00.000Z',
        status: 'Packed',
        by: 'seed',
        note: '80 rolls stuffed',
      },
      {
        id: 'ev-3',
        at: '2026-11-01T06:00:00.000Z',
        status: 'On water',
        by: 'seed',
        note: 'Vessel departed POL',
      },
    ],
    receipt: { receivedGood: 0, damaged: 0, missing: 0 },
    dispatchedPosted: false,
    receivedPosted: false,
    reconciliationStatus: 'In transit',
    tenantId: DEFAULT_TENANT_ID,
  }

  await Transfer.findOneAndUpdate(
    { shipmentId: clientExample.shipmentId },
    { $set: clientExample },
    { upsert: true },
  )
  console.log('Upserted', clientExample.shipmentId, clientExample.exportShipmentId)

  const others = [
    {
      shipmentId: 'SEA-IND-US-001',
      exportShipmentId: 'EXP-USA-2026-0001',
      status: 'On water',
      originWh: 'India WH (Bhadohi)',
      destWh: 'US WH (Edison NJ)',
      shippingMode: 'SEA_LCL',
      transitMode: 'Sea · LCL (container optional)',
      carrier: 'Maersk',
      containerNo: 'MSKU7823419',
      blNumber: 'HBL-9001',
      etd: '2026-11-01',
      eta: '2026-12-05',
      skuSummary: '12 rugs · mixed Heritage',
      items: [
        { sku: 'SKU-DEMO-INDIA-STOCK', title: 'Demo', qty: 12, unitValueUsd: 200, receivedQty: 12 },
      ],
      timeline: [
        {
          id: 'ev-a',
          at: '2026-11-01T00:00:00.000Z',
          status: 'On water',
          by: 'seed',
          note: 'LCL demo',
        },
      ],
      dispatchedPosted: false,
      receivedPosted: false,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      shipmentId: 'AIR-IND-US-002',
      exportShipmentId: 'EXP-USA-2026-0002',
      status: 'Departed',
      originWh: 'India WH (Delhi ICD)',
      destWh: 'US WH (Edison NJ)',
      shippingMode: 'AIR',
      transitMode: 'Air freight',
      carrier: 'Emirates Cargo',
      containerNo: 'AWB-176-99887766',
      blNumber: '176-99887766',
      etd: '2026-11-14',
      eta: '2026-11-16',
      skuSummary: '3 urgent MTO rugs',
      items: [
        { sku: 'SKU-DEMO-INDIA-STOCK', title: 'Demo', qty: 3, unitValueUsd: 400, receivedQty: 3 },
      ],
      timeline: [],
      dispatchedPosted: false,
      receivedPosted: false,
      tenantId: DEFAULT_TENANT_ID,
    },
  ]

  for (const t of others) {
    await Transfer.findOneAndUpdate({ shipmentId: t.shipmentId }, { $set: t }, { upsert: true })
    console.log('Upserted', t.shipmentId)
  }

  await Loading.findOneAndUpdate(
    { planId: 'LP-SEA-101' },
    {
      $set: {
        planId: 'LP-SEA-101',
        carrier: 'Maersk',
        mode: 'Sea',
        awb: 'ABC12345',
        originWh: 'India WH (Bhadohi)',
        vehicleContainer: 'TLLU1234567 · 40HC',
        exportShipmentId: 'EXP-USA-2026-0101',
        stockTransferId: 'SEA-IND-US-101',
        tenantId: DEFAULT_TENANT_ID,
      },
    },
    { upsert: true },
  )

  await ExportDoc.findOneAndUpdate(
    { invoiceNo: 'CI-EXP-0101' },
    {
      $set: {
        invoiceNo: 'CI-EXP-0101',
        exportShipmentId: 'EXP-USA-2026-0101',
        stockTransferId: 'SEA-IND-US-101',
        date: '2026-10-28',
        consignee: 'Restoration Rugs USA',
        destination: 'Edison NJ',
        shipmentType: '40-ft FCL',
        incoterms: 'FOB',
        hsn: '5701.10',
        customsStatus: 'Export cleared',
        docStatus: 'In progress',
        loadingPlanId: 'LP-SEA-101',
        orderId: '',
        blNumber: 'ABC12345',
        containerNo: 'TLLU1234567',
        pol: 'Nhava Sheva',
        pod: 'Newark NJ',
        vesselVoyage: 'MAERSK ESSEX / 026E',
        indiaShippingBill: 'SB-2026-77881',
        usIsfStatus: 'Filed — broker confirmed',
        importerOfRecord: 'Restoration Rugs USA',
        lineItems: [
          {
            sku: 'SKU-DEMO-INDIA-STOCK',
            title: 'Demo India stock rug',
            qty: 200,
            unitValueUsd: 180,
            hsn: '5701.10',
          },
        ],
        documentChecklist: [
          { category: 'Proforma / Commercial invoice', state: 'Uploaded' },
          { category: 'Packing list', state: 'Uploaded' },
          { category: 'India shipping bill / LEO', state: 'Uploaded' },
          { category: 'BL / AWB', state: 'Uploaded' },
          { category: 'ISF / US entry', state: 'Pending' },
        ],
        documents: [
          {
            id: 'doc-seed-ci',
            type: 'Commercial invoice',
            refNo: 'CI-EXP-0101',
            issueDate: '2026-10-28',
            status: 'Verified',
            fileName: '',
            fileUrl: '',
            version: 1,
            versions: [],
            uploadedBy: 'seed',
            uploadedAt: '2026-10-28T10:00:00.000Z',
          },
        ],
        timeline: [
          {
            id: 'ev-seed-1',
            at: '2026-10-28T10:00:00.000Z',
            by: 'seed',
            note: 'Export file seeded for EXP-USA-2026-0101',
          },
        ],
        tenantId: DEFAULT_TENANT_ID,
      },
    },
    { upsert: true },
  )
  console.log('Export doc CI-EXP-0101 linked to EXP-USA-2026-0101')

  const Returns = getResourceModel('returns', 'returnId', true)
  const Audit = getResourceModel('courier_audit', 'invoiceNo', true)
  const Monthly = getResourceModel('monthly_financials', 'period', true)

  await Returns.findOneAndUpdate(
    { returnId: 'RMA-DEMO-1001' },
    {
      $set: {
        returnId: 'RMA-DEMO-1001',
        caseType: 'Return',
        rmaNo: 'RMA-DEMO-1001',
        orderId: 'ORD-DEMO-A-US',
        channel: 'Shopify',
        sku: 'SKU-DEMO-US-STOCK',
        qty: 1,
        customer: 'Demo Customer',
        reason: 'Size preference',
        status: 'Pending Inspection',
        queueOwner: 'india_wh',
        refundUSD: 320,
        owner: 'India WH',
        linkedShipmentId: 'EXP-USA-2026-0101',
        tenantId: DEFAULT_TENANT_ID,
        history: [
          {
            action: 'Return opened',
            detail: 'Demo return for finance / returns depth',
            at: '2026-11-20T09:00:00.000Z',
          },
        ],
      },
    },
    { upsert: true },
  )

  await Audit.findOneAndUpdate(
    { invoiceNo: 'CA-DEMO-5501' },
    {
      $set: {
        invoiceNo: 'CA-DEMO-5501',
        carrier: 'FedEx',
        billDate: '2026-11-15',
        awb: '794612345678',
        orderRef: 'ORD-DEMO-A-US',
        expectedUSD: 48,
        billedUSD: 72,
        differenceUSD: 24,
        billedWeightKg: 12,
        actualWeightKg: 9.5,
        auditStatus: 'Needs Review',
        status: 'Needs Review',
        overbilled: true,
        logisticsError: true,
        flagReason: 'Weight mismatch billed 12 vs recorded 9.5; Amount mismatch billed $72 vs expected $48',
        netCostUSD: 72,
        creditUSD: 0,
        tenantId: DEFAULT_TENANT_ID,
        timeline: [
          {
            id: 'ev-ca-1',
            at: '2026-11-15T12:00:00.000Z',
            by: 'seed',
            note: 'Demo overbill line for Courier Audit',
          },
        ],
      },
    },
    { upsert: true },
  )

  const period = '2026-11'
  await Monthly.findOneAndUpdate(
    { period, tenantId: DEFAULT_TENANT_ID },
    {
      $set: {
        period,
        periodShort: period,
        quarter: 'Q4',
        orderInflowsUSD: 12500,
        exportInflowsUSD: 36000,
        shippingOutflowsUSD: 2100,
        returnsCostUSD: 320,
        returnsRefundUSD: 320,
        returnsPnLUSD: -320,
        courierCreditsUSD: 0,
        commissionsUSD: 900,
        estimatedMarginUSD: 45180,
        tenantId: DEFAULT_TENANT_ID,
        updatedFrom: 'seed',
      },
    },
    { upsert: true },
  )
  console.log('Seeded RMA-DEMO-1001, CA-DEMO-5501, monthly', period)

  const history = [
    {
      recordKey: 'hist-demo-in-1',
      timestamp: '2026-11-10T08:00:00.000Z',
      sku: 'SKU-DEMO-INDIA-STOCK',
      type: 'IN',
      qty: 5,
      source: 'Opening',
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
      ref: 'Loaded to container (demo note)',
      tenantId: DEFAULT_TENANT_ID,
    },
  ]
  for (const h of history) {
    await History.findOneAndUpdate({ recordKey: h.recordKey }, { $set: h }, { upsert: true })
  }

  console.log('Done. Open /stock-transfers → SEA-IND-US-101')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
