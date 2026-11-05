/** SaaS plans → price, seats, module entitlements */

export const PLANS = {
  starter: {
    label: 'Starter',
    description: 'For single-warehouse teams starting marketplace operations.',
    seats: 5,
    monthlyPrice: 9999,
    yearlyPrice: 99990,
    currency: 'INR',
    popular: false,
    active: true,
    modules: ['core', 'inventory', 'orders', 'shipping'],
    features: [
      'Orders & SKU mapping',
      'Inventory (India + USA views)',
      'Pick, pack & shipping labels',
      '1 marketplace connector (demo)',
      'Email support',
      'Up to 5 users',
    ],
  },
  growth: {
    label: 'Growth',
    description: 'For India↔USA replenishment and multi-channel selling.',
    seats: 15,
    monthlyPrice: 24999,
    yearlyPrice: 249990,
    currency: 'INR',
    popular: true,
    active: true,
    modules: ['core', 'inventory', 'orders', 'shipping', 'forecast', 'export', 'integrations'],
    features: [
      'Everything in Starter',
      'Replenishment & USA receipts',
      'True cost & profitability',
      'Courier invoice audit',
      'Amazon + Etsy + Walmart (demo)',
      'Up to 15 users',
      'Priority support',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    description: 'For multi-entity export/import operators with advanced controls.',
    seats: 50,
    monthlyPrice: 49999,
    yearlyPrice: 499990,
    currency: 'INR',
    popular: false,
    active: true,
    modules: ['*'],
    features: [
      'Everything in Growth',
      'EBRC / BRC / FIRA workflows',
      'Advanced roles & audit',
      'Custom integrations roadmap',
      'Dedicated success manager',
      'Unlimited users',
      'SLA-backed support',
    ],
  },
}

/** Map menu path → required module key */
export const PATH_MODULE = {
  '/': 'core',
  '/dashboard': 'core',
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
  '/saas': 'core',
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

export function planPublicList() {
  return Object.entries(PLANS)
    .filter(([, p]) => p.active !== false)
    .map(([id, p]) => ({
      id,
      name: p.label,
      description: p.description || '',
      monthlyPrice: p.monthlyPrice,
      yearlyPrice: p.yearlyPrice,
      currency: p.currency || 'INR',
      popular: Boolean(p.popular),
      active: true,
      features: p.features || [],
      seats: p.seats,
      modules: p.modules,
    }))
}

export function addBillingPeriod(fromDate, cycle) {
  const d = new Date(fromDate || Date.now())
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}
