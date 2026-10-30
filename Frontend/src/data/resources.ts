export type FieldType = 'text' | 'number' | 'textarea' | 'select'

export interface ColumnDef {
  key: string
  label: string
  /** Show in table */
  table?: boolean
  /** Editable in create/edit form */
  form?: boolean
  type?: FieldType
  options?: string[]
  /** Nested path e.g. stock.indiaAvailable — display only */
  format?: 'currency' | 'badge' | 'bool' | 'image'
  /** For image columns: resolve the URL when the row has none */
  image?: {
    /** Look up another resource, e.g. order.sku → skus.imageUrl */
    from?: { resource: string; localKey: string; foreignKey: string; field: string }
    fallback?: (row: Record<string, unknown>) => string
  }
}

const RUG_PLACEHOLDER =
  'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=160&q=70'

const WAREHOUSE_PHOTOS = {
  origin: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=320&q=70',
  threePl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=320&q=70',
  fba: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=320&q=70',
  icd: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=320&q=70',
  port: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=320&q=70',
}

export function warehousePhoto(row: Record<string, unknown>): string {
  const t = `${row.type ?? ''} ${row.name ?? ''} ${row.city ?? ''}`.toLowerCase()
  if (/fba|amazon/.test(t)) return WAREHOUSE_PHOTOS.fba
  if (/origin|factory|manufactur/.test(t)) return WAREHOUSE_PHOTOS.origin
  if (/\bicd\b|container depot|air freight/.test(t)) return WAREHOUSE_PHOTOS.icd
  if (/\bport\b|europe|bonded|hamburg/.test(t)) return WAREHOUSE_PHOTOS.port
  return WAREHOUSE_PHOTOS.threePl
}

export interface ResourceMeta {
  key: string
  idField: string
  label: string
  title: string
  subtitle: string
  path: string
  columns: ColumnDef[]
}

const col = (
  key: string,
  label: string,
  opts: Partial<ColumnDef> = {},
): ColumnDef => ({
  key,
  label,
  table: true,
  form: true,
  type: 'text',
  ...opts,
})

export const RESOURCE_META: ResourceMeta[] = [
  {
    key: 'skus',
    idField: 'sku',
    label: 'SKUs',
    title: 'Products & Inventory',
    subtitle: 'SKU master and multi-warehouse stock',
    path: '/inventory',
    columns: [
      col('imageUrl', 'Image', {
        format: 'image',
        form: false,
        image: { fallback: () => RUG_PLACEHOLDER },
      }),
      col('sku', 'SKU'),
      col('odetteSku', 'Restoration SKU'),
      col('title', 'Title', { type: 'textarea' }),
      col('collection', 'Collection'),
      col('construction', 'Construction'),
      col('size', 'Size'),
      col('sellingPriceUSD', 'Price USD', { type: 'number', format: 'currency' }),
      col('barcode', 'Barcode', { table: false }),
      col('imageUrl', 'Image URL', { table: false }),
    ],
  },
  {
    key: 'orders',
    idField: 'orderId',
    label: 'Orders',
    title: 'Order Pipeline',
    subtitle: 'Marketplace orders and fulfillment',
    path: '/orders',
    columns: [
      col('imageUrl', 'Image', {
        format: 'image',
        form: false,
        image: {
          from: { resource: 'skus', localKey: 'sku', foreignKey: 'sku', field: 'imageUrl' },
          fallback: () => RUG_PLACEHOLDER,
        },
      }),
      col('orderId', 'Order ID'),
      col('channel', 'Channel'),
      col('buyerName', 'Buyer'),
      col('sku', 'SKU'),
      col('qty', 'Qty', { type: 'number' }),
      col('totalOrderUSD', 'Total USD', { type: 'number', format: 'currency' }),
      col('status', 'Status', { format: 'badge' }),
      col('fulfillmentWh', 'Warehouse', { table: false }),
      col('awb', 'AWB', { table: false }),
    ],
  },
  {
    key: 'warehouses',
    idField: 'id',
    label: 'Warehouses',
    title: 'Warehouses',
    subtitle: 'Global warehouse nodes and capacity',
    path: '/warehouses',
    columns: [
      col('imageUrl', 'Photo', {
        format: 'image',
        form: false,
        image: { fallback: warehousePhoto },
      }),
      col('id', 'ID'),
      col('name', 'Name'),
      col('type', 'Type'),
      col('country', 'Country'),
      col('city', 'City'),
      col('capacityCBM', 'Capacity CBM', { type: 'number' }),
      col('address', 'Address', { type: 'textarea', table: false }),
      col('imageUrl', 'Photo URL (optional)', { table: false }),
    ],
  },
  {
    key: 'sku_history',
    idField: 'recordKey',
    label: 'Stock History',
    title: 'Stock History',
    subtitle: 'Inventory movement ledger',
    path: '/stock-history',
    columns: [
      col('recordKey', 'Key', { table: false }),
      col('timestamp', 'Timestamp'),
      col('sku', 'SKU'),
      col('type', 'Type', { format: 'badge' }),
      col('qty', 'Qty', { type: 'number' }),
      col('source', 'Source'),
      col('dest', 'Dest'),
      col('user', 'User'),
      col('ref', 'Ref'),
    ],
  },
  {
    key: 'purchase_orders',
    idField: 'poNumber',
    label: 'Purchase Orders',
    title: 'Purchase Orders',
    subtitle: 'Vendor POs and inbound planning',
    path: '/purchase-orders',
    columns: [
      col('poNumber', 'PO Number'),
      col('vendor', 'Vendor'),
      col('destWhName', 'Destination'),
      col('orderDate', 'Order Date'),
      col('expectedDate', 'Expected'),
      col('status', 'Status', { format: 'badge', form: false }),
      col('vendorContact', 'Vendor Contact', { table: false }),
    ],
  },
  {
    key: 'replenishment',
    idField: 'shipmentId',
    label: 'Stock Transfers',
    title: 'Stock Transfers',
    subtitle: 'Inter-warehouse replenishment',
    path: '/stock-transfers',
    columns: [
      col('shipmentId', 'Shipment ID'),
      col('status', 'Status', { format: 'badge' }),
      col('originWh', 'Origin'),
      col('destWh', 'Destination'),
      col('transitMode', 'Mode'),
      col('carrier', 'Carrier'),
    ],
  },
  {
    key: 'mto',
    idField: 'id',
    label: 'MTO Jobs',
    title: 'Make-to-Order',
    subtitle: 'Loom jobs and production stages',
    path: '/mto',
    columns: [
      col('id', 'Job ID'),
      col('orderId', 'Order'),
      col('sku', 'SKU'),
      col('title', 'Title', { type: 'textarea' }),
      col('stage', 'Stage', { format: 'badge' }),
      col('qty', 'Qty', { type: 'number' }),
      col('pendingQty', 'Pending', { type: 'number' }),
      col('expectedReadyDate', 'Ready By'),
    ],
  },
  {
    key: 'shipments',
    idField: 'awb',
    label: 'Shipments',
    title: 'Shipping & Dispatch',
    subtitle: 'AWB tracking and courier status',
    path: '/shipping',
    columns: [
      col('awb', 'AWB'),
      col('orderId', 'Order'),
      col('consignee', 'Consignee'),
      col('carrier', 'Carrier'),
      col('serviceLevel', 'Service'),
      col('status', 'Status', { format: 'badge' }),
      col('dispatchDate', 'Dispatch'),
      col('actualWeightKg', 'Weight kg', { type: 'number' }),
    ],
  },
  {
    key: 'export_docs',
    idField: 'invoiceNo',
    label: 'Export Docs',
    title: 'Export Documentation',
    subtitle: 'Commercial invoices and shipping bills',
    path: '/export-docs',
    columns: [
      col('invoiceNo', 'Invoice'),
      col('date', 'Date'),
      col('orderId', 'Order'),
      col('consignee', 'Consignee'),
      col('destination', 'Destination'),
      col('incoterms', 'Incoterms'),
      col('hsn', 'HSN'),
      col('loadingPlanId', 'Loading Plan', { table: false }),
    ],
  },
  {
    key: 'loading_plans',
    idField: 'planId',
    label: 'Loading Plans',
    title: 'Loading Plans',
    subtitle: 'Container and vehicle load plans',
    path: '/loading-plans',
    columns: [
      col('planId', 'Plan ID'),
      col('carrier', 'Carrier'),
      col('mode', 'Mode'),
      col('awb', 'AWB'),
      col('originWh', 'Origin WH'),
      col('vehicleContainer', 'Vehicle / Container'),
    ],
  },
  {
    key: 'returns',
    idField: 'returnId',
    label: 'Returns',
    title: 'Returns & Claims',
    subtitle:
      'India WH bucket — generate Amazon/Shopify return label PDF, send to customer; cost hits Accounts',
    path: '/returns',
    columns: [
      col('returnId', 'Return ID'),
      col('rmaNo', 'RMA'),
      col('orderId', 'Order'),
      col('sku', 'SKU'),
      col('customer', 'Customer'),
      col('status', 'Status'),
      col('returnAwb', 'Return AWB'),
      col('returnLabelCost', 'Label cost', { type: 'number', format: 'currency' }),
      col('profitImpactUSD', 'P&L impact', { type: 'number', format: 'currency' }),
      col('returnLabelPdfUrl', 'Label PDF', { table: false }),
      col('productDetail', 'Product', { table: false }),
      col('customerEmail', 'Email', { table: false }),
    ],
  },
  {
    key: 'courier_audit',
    idField: 'invoiceNo',
    label: 'Courier Audit',
    title: 'Courier Audit',
    subtitle: 'Dimensional weight and billing audit',
    path: '/courier-audit',
    columns: [
      col('invoiceNo', 'Invoice'),
      col('carrier', 'Carrier'),
      col('billDate', 'Bill Date'),
      col('awb', 'AWB'),
      col('orderRef', 'Order Ref'),
      col('sku', 'SKU'),
    ],
  },
  {
    key: 'receivables',
    idField: 'invoiceNo',
    label: 'Receivables',
    title: 'Receivables',
    subtitle: 'Client invoices and collections',
    path: '/receivables',
    columns: [
      col('invoiceNo', 'Invoice'),
      col('client', 'Company'),
      col('orderId', 'Order'),
      col('dueDate', 'Due'),
      col('currency', 'Currency'),
      col('amountUSD', 'Amount USD', { type: 'number', format: 'currency' }),
      col('receivedUSD', 'Received USD', { type: 'number', format: 'currency' }),
    ],
  },
  {
    key: 'monthly_financials',
    idField: 'period',
    label: 'Monthly Financials',
    title: 'Profitability (Monthly)',
    subtitle: 'Month-level P&L rollups',
    path: '/profitability',
    columns: [
      col('period', 'Period'),
      col('periodShort', 'Short'),
      col('quarter', 'Quarter'),
      col('orderInflowsUSD', 'Order Inflows', { type: 'number', format: 'currency' }),
      col('exportInflowsUSD', 'Export Inflows', { type: 'number', format: 'currency' }),
      col('shippingOutflowsUSD', 'Shipping Out', { type: 'number', format: 'currency' }),
      col('returnsCostUSD', 'Returns cost', { type: 'number', format: 'currency' }),
      col('commissionsUSD', 'Commissions', { type: 'number', format: 'currency' }),
    ],
  },
  {
    key: 'yearly_financials',
    idField: 'period',
    label: 'Yearly Financials',
    title: 'Financial Reports',
    subtitle: 'Annual finance summaries',
    path: '/reports',
    columns: [
      col('period', 'Period'),
      col('periodShort', 'Short'),
      col('orderInflowsUSD', 'Order Inflows', { type: 'number', format: 'currency' }),
      col('exportInflowsUSD', 'Export Inflows', { type: 'number', format: 'currency' }),
      col('shippingOutflowsUSD', 'Shipping Out', { type: 'number', format: 'currency' }),
      col('poPayoutsUSD', 'PO Payouts', { type: 'number', format: 'currency' }),
    ],
  },
  {
    key: 'alerts',
    idField: 'id',
    label: 'Alerts',
    title: 'Automation & Alerts',
    subtitle: 'Operational alerts and escalations',
    /** Dedicated page at /alerts — keep path off ResourcePage routing */
    path: '/alerts-data',
    columns: [
      col('id', 'ID'),
      col('domain', 'Domain'),
      col('type', 'Type'),
      col('severity', 'Severity', { format: 'badge' }),
      col('title', 'Title'),
      col('detail', 'Detail', { type: 'textarea' }),
      col('actionLabel', 'Action', { table: false }),
    ],
  },
  {
    key: 'automations',
    idField: 'id',
    label: 'Automations',
    title: 'Automation Rules',
    subtitle: 'SOW automation rules engine',
    /** Dedicated page at /alerts — keep path off ResourcePage routing */
    path: '/automations-data',
    columns: [
      col('id', 'ID'),
      col('name', 'Name'),
      col('domain', 'Domain'),
      col('severity', 'Severity', { format: 'badge' }),
      col('trigger', 'Trigger'),
      col('condition', 'Condition', { type: 'textarea' }),
      col('action', 'Action', { type: 'textarea' }),
      col('active', 'Active', { format: 'bool' }),
    ],
  },
  {
    key: 'integration_workers',
    idField: 'id',
    label: 'Integrations',
    title: 'Integrations',
    subtitle: 'Channel sync workers and health',
    path: '/integrations',
    columns: [
      col('id', 'ID'),
      col('name', 'Name'),
      col('channel', 'Channel'),
      col('status', 'Status', { format: 'badge' }),
      col('lastRun', 'Last Run'),
      col('latencyMs', 'Latency ms', { type: 'number' }),
      col('eventsToday', 'Events', { type: 'number' }),
      col('errorCount', 'Errors', { type: 'number' }),
    ],
  },
  {
    key: 'failed_jobs',
    idField: 'jobId',
    label: 'Failed Jobs',
    title: 'Failed Integration Jobs',
    subtitle: 'Retry queue for channel sync failures',
    path: '/failed-jobs',
    columns: [
      col('jobId', 'Job ID'),
      col('gateway', 'Gateway'),
      col('endpoint', 'Endpoint'),
      col('error', 'Error', { type: 'textarea' }),
      col('retryCount', 'Retries', { type: 'number' }),
      col('lastAttempt', 'Last Attempt'),
    ],
  },
  {
    key: 'raw_materials',
    idField: 'lotNo',
    label: 'Raw Materials',
    title: 'Raw Materials',
    subtitle: 'Fiber lots and allocation',
    path: '/raw-materials',
    columns: [
      col('lotNo', 'Lot No'),
      col('name', 'Name'),
      col('fiberType', 'Fiber'),
      col('stockKg', 'Stock kg', { type: 'number' }),
      col('allocatedKg', 'Allocated kg', { type: 'number' }),
      col('availableKg', 'Available kg', { type: 'number' }),
      col('warehouse', 'Warehouse'),
      col('unitCostINR', 'Cost INR', { type: 'number' }),
    ],
  },
  {
    key: 'companies',
    idField: 'id',
    label: 'Company',
    title: 'Company Profile',
    subtitle: 'Legal entity and contact masters',
    path: '/company',
    columns: [
      col('id', 'ID'),
      col('legalName', 'Legal Name'),
      col('email', 'Email'),
      col('website', 'Website'),
      col('country', 'Country'),
      col('contactPerson', 'Contact'),
      col('phone', 'Phone'),
      col('address', 'Address', { type: 'textarea' }),
    ],
  },
  {
    key: 'users',
    idField: 'email',
    label: 'Users',
    title: 'Users & RBAC',
    subtitle: 'Platform users and warehouse access',
    path: '/users',
    columns: [
      col('name', 'Name'),
      col('email', 'Email'),
      col('role', 'Role', { format: 'badge' }),
      col('status', 'Status', { format: 'badge' }),
      col('whAccess', 'WH Access'),
      col('perm', 'Permissions', { table: false }),
    ],
  },
  {
    key: 'roles',
    idField: 'id',
    label: 'Roles',
    title: 'System Config — Roles',
    subtitle: 'Permission roles and scopes',
    path: '/settings',
    columns: [
      col('id', 'ID'),
      col('code', 'Code'),
      col('name', 'Name'),
      col('desc', 'Description', { type: 'textarea' }),
      col('userCount', 'Users', { type: 'number' }),
    ],
  },
  {
    key: 'system_logs',
    idField: 'id',
    label: 'System Logs',
    title: 'System Logs',
    subtitle: 'Audit trail and security events',
    path: '/system-logs',
    columns: [
      col('id', 'ID', { table: false }),
      col('timestamp', 'Timestamp'),
      col('level', 'Level', { format: 'badge' }),
      col('module', 'Module'),
      col('actor', 'Actor'),
      col('ip', 'IP'),
      col('relativeTime', 'When'),
    ],
  },
  {
    key: 'buyers',
    idField: 'code',
    label: 'Buyers',
    title: 'B2B Buyers',
    subtitle: 'Wholesale buyer masters',
    path: '/buyers',
    columns: [
      col('code', 'Code'),
      col('name', 'Name'),
      col('tier', 'Tier', { format: 'badge' }),
      col('country', 'Country'),
      col('city', 'City'),
      col('paymentTerms', 'Terms'),
      col('creditLimitUSD', 'Credit Limit', { type: 'number', format: 'currency' }),
      col('outstandingUSD', 'Outstanding', { type: 'number', format: 'currency' }),
    ],
  },
  {
    key: 'looms',
    idField: 'loomId',
    label: 'Looms',
    title: 'Loom Masters',
    subtitle: 'Weaving capacity and craftsmen',
    path: '/looms',
    columns: [
      col('loomId', 'Loom ID'),
      col('facility', 'Facility'),
      col('village', 'Village'),
      col('loomType', 'Type'),
      col('maxWidthFt', 'Max Width ft', { type: 'number' }),
      col('masterWeaver', 'Master Weaver'),
      col('craftGrade', 'Grade'),
    ],
  },
  {
    key: 'carriers',
    idField: 'code',
    label: 'Carriers',
    title: 'Carriers',
    subtitle: 'Freight and courier partners',
    path: '/carriers',
    columns: [
      col('code', 'Code'),
      col('name', 'Name'),
      col('mode', 'Mode'),
      col('accountNo', 'Account'),
      col('preferredPort', 'Port'),
      col('avgTransitDays', 'Transit Days', { type: 'number' }),
    ],
  },
  {
    key: 'currencies',
    idField: 'code',
    label: 'Currencies',
    title: 'Currencies',
    subtitle: 'FX rates and hedging books',
    path: '/currencies',
    columns: [
      col('code', 'Code'),
      col('name', 'Name'),
      col('symbol', 'Symbol'),
      col('rbiRefRate', 'RBI Rate', { type: 'number' }),
      col('hedgedBookingRate', 'Hedged Rate', { type: 'number' }),
      col('forwardBookedUSD', 'Forward Booked', { type: 'number' }),
      col('linkedBank', 'Bank'),
    ],
  },
]

export const RESOURCE_BY_KEY = Object.fromEntries(
  RESOURCE_META.map((r) => [r.key, r]),
) as Record<string, ResourceMeta>

export const RESOURCE_BY_PATH = Object.fromEntries(
  RESOURCE_META.map((r) => [r.path, r]),
) as Record<string, ResourceMeta>

export const ALL_RESOURCE_KEYS = RESOURCE_META.map((r) => r.key)
