/** SaaS plans → module entitlements (menu path prefixes / feature keys) */
export const PLANS = {
  starter: {
    label: 'Starter',
    seats: 5,
    modules: ['core', 'inventory', 'orders', 'shipping'],
  },
  growth: {
    label: 'Growth',
    seats: 15,
    modules: ['core', 'inventory', 'orders', 'shipping', 'forecast', 'export', 'integrations'],
  },
  enterprise: {
    label: 'Enterprise',
    seats: 50,
    modules: ['*'],
  },
}

/** Map menu path → required module key */
export const PATH_MODULE = {
  '/': 'core',
  '/workflow': 'core',
  '/inventory': 'inventory',
  '/warehouses': 'inventory',
  '/warehouse-analytics': 'inventory',
  '/stock-history': 'inventory',
  '/raw-materials': 'inventory',
  '/orders': 'orders',
  '/mto': 'orders',
  '/purchase-orders': 'orders',
  '/stock-transfers': 'orders',
  '/returns': 'orders',
  '/buyers': 'orders',
  '/shipping': 'shipping',
  '/packing': 'shipping',
  '/loading-plans': 'shipping',
  '/carriers': 'shipping',
  '/courier-audit': 'shipping',
  '/export-docs': 'export',
  '/forecast': 'forecast',
  '/buy-sheet': 'forecast',
  '/alerts': 'core',
  '/integrations': 'integrations',
  '/failed-jobs': 'integrations',
  '/receivables': 'core',
  '/profitability': 'core',
  '/reports': 'core',
  '/company': 'core',
  '/users': 'core',
  '/billing': 'core',
  '/tenants': 'core',
  '/settings': 'core',
  '/system-logs': 'core',
  '/currencies': 'core',
  '/looms': 'inventory',
}

export function planAllowsModule(planCode, moduleKey) {
  const plan = PLANS[planCode] || PLANS.starter
  if (plan.modules.includes('*')) return true
  return plan.modules.includes(moduleKey)
}

export function planAllowsPath(planCode, path) {
  const mod = PATH_MODULE[path]
  if (!mod) return true
  return planAllowsModule(planCode, mod)
}
