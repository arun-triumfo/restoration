export type Theme = 'light' | 'dark'

export type ModalType = 'create' | 'export' | 'import' | 'delete' | null

export interface StockLevels {
  indiaAvailable: number
  indiaPacked: number
  inTransit: number
  usaAvailable: number
  usaReserved: number
  fba: number
}

export interface Sku {
  id: string
  sku: string
  odetteSku: string
  title: string
  collection: string
  material: string
  construction: string
  size: string
  weightKg: number
  sellingPriceUSD: number
  mfgCostUSD: number
  stock: StockLevels
  barcode: string
  imageUrl: string
  tags: string[]
}

export type OrderStatus =
  | 'Pending Allocation'
  | 'Packed & Handover'
  | 'In Transit'
  | 'Delivered'
  | 'To Make (MTO)'
  | 'Customs Cleared'

export interface Order {
  id: string
  orderId: string
  channel: string
  marketplaceOrderId: string
  orderDate: string
  buyerName: string
  shippingAddress: string
  sku: string
  title: string
  qty: number
  totalOrderUSD: number
  status: OrderStatus
  fulfillmentWh: string
  fulfillmentRegion: 'USA' | 'India'
  stockLocked: boolean
}

export interface ActivityLog {
  id: string
  module: string
  action: string
  timestamp: string
  status: 'success' | 'warning' | 'info' | 'danger'
}

export interface AlertItem {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  module: string
}

export interface NavItem {
  label: string
  path: string
  icon: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}
