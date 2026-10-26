/**
 * Role codes used in JWT + users.roleCode
 * menus: '*' = all paths; else list of allowed React paths
 * resources: '*' = all API resources; else list of allowed resource keys
 * actions: read | write (write includes create/update/delete)
 */
export const ROLES = {
  super_admin: {
    label: 'Super Admin',
    menus: ['*'],
    resources: ['*'],
    actions: ['read', 'write'],
  },
  scm: {
    label: 'Planning / SCM',
    menus: [
      '/',
      '/workflow',
      '/forecast',
      '/buy-sheet',
      '/alerts',
      '/warehouse-analytics',
      '/inventory',
      '/purchase-orders',
      '/raw-materials',
      '/billing',
    ],
    resources: [
      'skus',
      'alerts',
      'automations',
      'warehouses',
      'purchase_orders',
      'raw_materials',
      'sku_history',
    ],
    actions: ['read', 'write'],
  },
  sales: {
    label: 'Sales / Marketplace',
    menus: ['/', '/workflow', '/orders', '/buyers', '/returns', '/alerts', '/billing'],
    resources: ['orders', 'buyers', 'returns', 'alerts', 'skus'],
    actions: ['read', 'write'],
  },
  india_wh: {
    label: 'India Warehouse',
    menus: [
      '/',
      '/workflow',
      '/inventory',
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
      '/alerts',
      '/billing',
    ],
    resources: [
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
    ],
    actions: ['read', 'write'],
  },
  usa_wh: {
    label: 'USA 3PL Warehouse',
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
  logistics: {
    label: 'Logistics',
    menus: [
      '/',
      '/workflow',
      '/shipping',
      '/packing',
      '/loading-plans',
      '/carriers',
      '/courier-audit',
      '/stock-transfers',
      '/export-docs',
      '/alerts',
      '/billing',
    ],
    resources: [
      'shipments',
      'loading_plans',
      'carriers',
      'courier_audit',
      'replenishment',
      'export_docs',
      'alerts',
    ],
    actions: ['read', 'write'],
  },
  finance: {
    label: 'Finance',
    menus: [
      '/',
      '/workflow',
      '/receivables',
      '/profitability',
      '/reports',
      '/currencies',
      '/courier-audit',
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
      'returns',
      'alerts',
      'orders',
    ],
    actions: ['read', 'write'],
  },
  auditor: {
    label: 'Auditor',
    menus: [
      '/',
      '/workflow',
      '/system-logs',
      '/reports',
      '/courier-audit',
      '/receivables',
      '/profitability',
      '/billing',
    ],
    resources: [
      'system_logs',
      'monthly_financials',
      'yearly_financials',
      'courier_audit',
      'receivables',
      'orders',
      'skus',
    ],
    actions: ['read'],
  },
}

export function normalizeRoleCode(roleOrCode) {
  const raw = String(roleOrCode || '')
    .trim()
    .toLowerCase()
  if (ROLES[raw]) return raw
  if (raw.includes('super') || raw.includes('admin') || raw.includes('management')) {
    return 'super_admin'
  }
  if (raw.includes('india')) return 'india_wh'
  if (raw.includes('usa') || raw.includes('3pl')) return 'usa_wh'
  if (raw.includes('logistic') || raw.includes('export lead')) return 'logistics'
  if (raw.includes('finance') || raw.includes('account')) return 'finance'
  if (raw.includes('sales') || raw.includes('market')) return 'sales'
  if (raw.includes('audit')) return 'auditor'
  if (raw.includes('scm') || raw.includes('plan')) return 'scm'
  return 'auditor'
}

export function roleCanAccessMenu(roleCode, path) {
  const role = ROLES[roleCode]
  if (!role) return false
  if (role.menus.includes('*')) return true
  if (path === '/workflow') return true
  return role.menus.includes(path)
}

export function roleCanAccessResource(roleCode, resource, action = 'read') {
  const role = ROLES[roleCode]
  if (!role) return false
  if (!role.actions.includes(action) && action === 'write') return false
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
