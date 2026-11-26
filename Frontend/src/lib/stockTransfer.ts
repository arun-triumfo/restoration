/** Shared types / helpers for Stock Transfers (India → US sea/air). Additive — old rows still work. */

export const SHIPPING_MODES = [
  { value: 'SEA_LCL', label: 'Sea · LCL (container optional)' },
  { value: 'SEA_FCL_20', label: 'Sea · 20-ft FCL' },
  { value: 'SEA_FCL_40', label: 'Sea · 40-ft FCL' },
  { value: 'AIR', label: 'Air freight' },
  { value: 'OTHER', label: 'Other' },
] as const

export type ShippingMode = (typeof SHIPPING_MODES)[number]['value']

/** Client status trail — keep older free-text statuses readable too */
export const TRANSFER_STATUSES = [
  'Draft',
  'Reserved',
  'Packed',
  'Dispatched India',
  'Origin clearance',
  'Loaded / CFS accepted',
  'On water',
  'In flight',
  'Arrived USA',
  'Customs released',
  'Terminal/CFS released',
  'Delivery in progress',
  'Delivered',
  'Partially received',
  'Fully received',
  'Reconciled',
  'Closed',
] as const

export const DOC_CATEGORIES = [
  'Commercial',
  'Origin India',
  'Loading & ocean',
  'US import',
  'Destination & warehouse',
  'Finance & claims',
] as const

export type TransferItem = {
  sku: string
  title?: string
  qty: number
  unitValueUsd?: number
  hsn?: string
  barcode?: string
  dispatchedQty?: number
  receivedQty?: number
  damagedQty?: number
  missingQty?: number
}

export type TransferPackage = {
  packageId: string
  barcode?: string
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  grossKg?: number
  netKg?: number
  cbm?: number
  skuList?: string
  photoUrl?: string
}

export type TransferContainer = {
  containerId: string
  isoType?: string
  seal?: string
  vgm?: string
  stuffingDate?: string
}

export type TransferDocument = {
  id: string
  category: string
  name: string
  referenceNumber?: string
  issueDate?: string
  reviewState?: string
  notes?: string
  fileName?: string
}

export type TransferExpense = {
  id: string
  vendor?: string
  chargeType: string
  amount: number
  currency: string
  estimatedOrActual?: 'estimated' | 'actual'
  invoiceNo?: string
  allocationMethod?: string
}

export type TransferTimelineEvent = {
  id: string
  at: string
  status: string
  by?: string
  note?: string
}

export function nextExportShipmentId(year = new Date().getFullYear()) {
  const seq = Date.now().toString().slice(-4)
  return `EXP-USA-${year}-${seq}`
}

export function modeLabel(raw: unknown) {
  const v = String(raw || '')
  const hit = SHIPPING_MODES.find((m) => m.value === v)
  if (hit) return hit.label
  if (/sea/i.test(v) && /lcl/i.test(v)) return 'Sea · LCL'
  if (/sea/i.test(v) && /20/i.test(v)) return 'Sea · 20-ft FCL'
  if (/sea/i.test(v) && /40/i.test(v)) return 'Sea · 40-ft FCL'
  if (/air/i.test(v)) return 'Air freight'
  return v || '—'
}

export function normalizeMode(raw: unknown): ShippingMode {
  const v = String(raw || '').toUpperCase()
  if (SHIPPING_MODES.some((m) => m.value === v)) return v as ShippingMode
  if (v === 'SEA' || v.includes('SEA')) {
    if (v.includes('LCL')) return 'SEA_LCL'
    if (v.includes('20')) return 'SEA_FCL_20'
    if (v.includes('40')) return 'SEA_FCL_40'
    return 'SEA_LCL'
  }
  if (v.includes('AIR')) return 'AIR'
  return 'OTHER'
}

export function emptyTransferDraft() {
  const id = `SEA-IND-US-${Date.now().toString(36).slice(-5).toUpperCase()}`
  return {
    shipmentId: id,
    exportShipmentId: nextExportShipmentId(),
    status: 'Draft',
    originWh: 'India WH (Bhadohi)',
    destWh: 'US WH (Edison NJ)',
    transitMode: 'SEA_FCL_40' as ShippingMode,
    shippingMode: 'SEA_FCL_40' as ShippingMode,
    carrier: '',
    containerNo: '',
    etd: '',
    eta: '',
    skuSummary: '',
    blNumber: '',
    bookingNumber: '',
    vesselVoyage: '',
    pol: '',
    pod: '',
    incoterm: 'FOB',
    forwarder: '',
    indiaShippingBill: '',
    usIsfStatus: 'Not filed',
    customsBroker: '',
    items: [] as TransferItem[],
    packages: [] as TransferPackage[],
    containers: [] as TransferContainer[],
    documents: [] as TransferDocument[],
    expenses: [] as TransferExpense[],
    timeline: [
      {
        id: `ev-${Date.now()}`,
        at: new Date().toISOString(),
        status: 'Draft',
        by: 'system',
        note: 'Transfer created',
      },
    ] as TransferTimelineEvent[],
    receipt: {
      receivedGood: 0,
      damaged: 0,
      missing: 0,
      receivedAt: '',
      receiver: '',
      notes: '',
    },
    dispatchedPosted: false,
    receivedPosted: false,
    documentChecklist: DOC_CATEGORIES.map((c) => ({
      category: c,
      state: 'Missing',
    })),
  }
}
