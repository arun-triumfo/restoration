/**
 * Role codes used in JWT + users.roleCode
 * Restoration client SOP: only 4 roles.
 * Legacy codes (scm/sales/logistics/auditor) normalize into these four.
 */
export const ROLES = {
  super_admin: {
    label: 'Super Admin',
    menus: ['*'],
    resources: ['*'],
    actions: ['read', 'write'],
  },
  india_wh: {
    label: 'India Warehouse Manager',
    menus: [
      '/',
      '/workflow',
      '/orders',
      '/buyers',
      '/inventory',
      '/forecast',
      '/buy-sheet',
      '/mto',
      '/purchase-orders',
      '/stock-transfers',
      '/looms',
      '/shipping',
      '/packing',
      '/loading-plans',
      '/export-docs',
      '/raw-materials',
      '/stock-history',
      '/warehouse-analytics',
      '/alerts',
      '/billing',
    ],
    resources: [
      'orders',
      'buyers',
      'skus',
      'mto',
      'purchase_orders',
      'replenishment',
      'looms',
      'loading_plans',
      'export_docs',
      'shipments',
      'raw_materials',
      'sku_history',
      'alerts',
      'warehouses',
      'automations',
    ],
    actions: ['read', 'write'],
  },
  usa_wh: {
    label: 'US Warehouse Manager',
    menus: [
      '/',
      '/workflow',
      '/inventory',
      '/orders',
      '/stock-transfers',
      '/warehouses',
      '/returns',
      '/stock-history',
      '/packing',
      '/shipping',
      '/alerts',
      '/billing',
    ],
    resources: [
      'skus',
      'orders',
      'replenishment',
      'warehouses',
      'returns',
      'sku_history',
      'alerts',
      'shipments',
    ],
    actions: ['read', 'write'],
  },
  finance: {
    label: 'Finance Manager',
    menus: [
      '/',
      '/workflow',
      '/orders',
      '/receivables',
      '/profitability',
      '/reports',
      '/currencies',
      '/courier-audit',
      '/export-docs',
      '/returns',
      '/alerts',
      '/billing',
    ],
    resources: [
      'receivables',
      'monthly_financials',
      'yearly_financials',
      'currencies',
      'courier_audit',
      'export_docs',
      'returns',
      'alerts',
      'orders',
    ],
    actions: ['read', 'write'],
  },
}

/** Legacy → canonical (for existing JWT / DB rows) */
const LEGACY_ROLE_MAP = {
  scm: 'india_wh',
  sales: 'india_wh',
  logistics: 'india_wh',
  auditor: 'finance',
}

export function normalizeRoleCode(roleOrCode) {
  const raw = String(roleOrCode || '')
    .trim()
    .toLowerCase()
  if (ROLES[raw]) return raw
  if (LEGACY_ROLE_MAP[raw]) return LEGACY_ROLE_MAP[raw]
  if (raw.includes('super') || raw.includes('admin') || raw.includes('management')) {
    return 'super_admin'
  }
  if (raw.includes('finance') || raw.includes('account') || raw.includes('audit')) {
    return 'finance'
  }
  if (raw.includes('usa') || raw.includes('us ') || raw.includes('3pl') || raw.includes('edison')) {
    return 'usa_wh'
  }
  if (
    raw.includes('india') ||
    raw.includes('logistic') ||
    raw.includes('sales') ||
    raw.includes('market') ||
    raw.includes('scm') ||
    raw.includes('plan') ||
    raw.includes('export')
  ) {
    return 'india_wh'
  }
  return 'india_wh'
}

export function roleCanAccessMenu(roleCode, path) {
  const code = normalizeRoleCode(roleCode)
  const role = ROLES[code]
  if (!role) return false
  if (role.menus.includes('*')) return true
  if (path === '/workflow') return true
  return role.menus.includes(path)
}

export function roleCanAccessResource(roleCode, resource, action = 'read') {
  const code = normalizeRoleCode(roleCode)
  const role = ROLES[code]
  if (!role) return false
  if (action === 'write' && !role.actions.includes('write')) return false
  if (role.resources.includes('*')) return true
  return role.resources.includes(resource)
}

/** Map frontend path → primary API resource (for coarse checks) */
export const PATH_RESOURCE = {
  '/inventory': 'skus',
  '/orders': 'orders',
  '/warehouses': 'warehouses',
  '/mto': 'mto',
  '/purchase-orders': 'purchase_orders',
  '/stock-transfers': 'replenishment',
  '/courier-audit': 'courier_audit',
  '/receivables': 'receivables',
  '/returns': 'returns',
  '/loading-plans': 'loading_plans',
  '/export-docs': 'export_docs',
  '/shipping': 'shipments',
  '/raw-materials': 'raw_materials',
  '/alerts': 'alerts',
  '/forecast': 'automations',
  '/integrations': 'integration_workers',
  '/failed-jobs': 'failed_jobs',
  '/stock-history': 'sku_history',
  '/system-logs': 'system_logs',
  '/users': 'users',
  '/company': 'companies',
  '/buyers': 'buyers',
  '/looms': 'looms',
  '/carriers': 'carriers',
  '/currencies': 'currencies',
  '/profitability': 'monthly_financials',
  '/reports': 'yearly_financials',
  '/settings': 'roles',
}
