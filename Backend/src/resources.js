/**
 * Resource registry for RugOS ERP (MongoDB database: rugos_erp only).
 * idField = unique business key used in URLs and upserts.
 */
export const RESOURCES = {
  skus: { idField: 'sku', label: 'SKUs' },
  orders: { idField: 'orderId', label: 'Orders' },
  warehouses: { idField: 'id', label: 'Warehouses' },
  mto: { idField: 'id', label: 'MTO Jobs' },
  purchase_orders: { idField: 'poNumber', label: 'Purchase Orders' },
  replenishment: { idField: 'shipmentId', label: 'Stock Transfers' },
  courier_audit: { idField: 'invoiceNo', label: 'Courier Audit' },
  receivables: { idField: 'invoiceNo', label: 'Receivables' },
  returns: { idField: 'returnId', label: 'Returns' },
  loading_plans: { idField: 'planId', label: 'Loading Plans' },
  export_docs: { idField: 'invoiceNo', label: 'Export Docs' },
  shipments: { idField: 'awb', label: 'Shipments' },
  raw_materials: { idField: 'lotNo', label: 'Raw Materials' },
  alerts: { idField: 'id', label: 'Alerts' },
  automations: { idField: 'id', label: 'Automations' },
  integration_workers: { idField: 'id', label: 'Integrations' },
  failed_jobs: { idField: 'jobId', label: 'Failed Jobs' },
  monthly_financials: { idField: 'period', label: 'Monthly Financials' },
  yearly_financials: { idField: 'period', label: 'Yearly Financials' },
  sku_history: { idField: 'recordKey', label: 'Stock History', unique: false },
  system_logs: { idField: 'id', label: 'System Logs' },
  users: { idField: 'email', label: 'Users' },
  companies: { idField: 'id', label: 'Companies' },
  buyers: { idField: 'code', label: 'Buyers' },
  looms: { idField: 'loomId', label: 'Looms' },
  carriers: { idField: 'code', label: 'Carriers' },
  currencies: { idField: 'code', label: 'Currencies' },
  roles: { idField: 'id', label: 'Roles' },
}

export function isValidResource(name) {
  return Object.prototype.hasOwnProperty.call(RESOURCES, name)
}
