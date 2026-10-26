/** Mirror Backend plans — hide menus not entitled by tenant plan */

export const PATH_MODULE: Record<string, string> = {
  '/': 'core',
  '/workflow': 'core',
  '/inventory': 'inventory',
  '/warehouses': 'inventory',
  '/warehouse-analytics': 'inventory',
  '/stock-history': 'inventory',
  '/raw-materials': 'inventory',
  '/looms': 'inventory',
  '/orders': 'orders',
  '/mto': 'orders',
  '/purchase-orders': 'orders',
  '/buy-sheet': 'forecast',
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
}

export function planAllowsPath(
  modules: string[] | undefined,
  plan: string | undefined,
  path: string,
): boolean {
  const mod = PATH_MODULE[path]
  if (!mod) return true
  const list =
    modules?.length
      ? modules
      : plan === 'starter'
        ? ['core', 'inventory', 'orders', 'shipping']
        : plan === 'growth'
          ? ['core', 'inventory', 'orders', 'shipping', 'forecast', 'export', 'integrations']
          : ['*']
  if (list.includes('*')) return true
  return list.includes(mod)
}
