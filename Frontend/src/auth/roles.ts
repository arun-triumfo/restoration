/** Mirror of Backend role menus — used to filter sidebar before /me returns */

import { planAllowsPath } from './plans'

export type RoleCode =
  | 'super_admin'
  | 'scm'
  | 'sales'
  | 'india_wh'
  | 'usa_wh'
  | 'logistics'
  | 'finance'
  | 'auditor'

export const ROLE_MENUS: Record<RoleCode, string[] | ['*']> = {
  super_admin: ['*'],
  scm: [
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
  sales: ['/', '/workflow', '/orders', '/buyers', '/returns', '/alerts', '/billing'],
  india_wh: [
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
  usa_wh: [
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
  logistics: [
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
  finance: [
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
  auditor: [
    '/',
    '/workflow',
    '/system-logs',
    '/reports',
    '/courier-audit',
    '/receivables',
    '/profitability',
    '/billing',
  ],
}

export function canAccessPath(
  roleCode: string | undefined,
  path: string,
  tenant?: { modules?: string[]; plan?: string },
): boolean {
  if (!roleCode) return false
  const menus = ROLE_MENUS[roleCode as RoleCode]
  if (!menus) return path === '/workflow' || path === '/login'
  const roleOk =
    (menus as string[]).includes('*') || path === '/workflow' || (menus as string[]).includes(path)
  if (!roleOk) return false
  // Plan entitlements (P2) — always allow login/workflow/billing
  if (path === '/workflow' || path === '/billing' || path === '/login') return true
  return planAllowsPath(tenant?.modules, tenant?.plan, path)
}

export const DEMO_ACCOUNTS = [
  { email: 'admin@ctasinfo.com', role: 'Super Admin', roleCode: 'super_admin' },
  { email: 'vikram@rugos.in', role: 'India WH', roleCode: 'india_wh' },
  { email: 'j.gallagher@3pl-edison.com', role: 'USA 3PL', roleCode: 'usa_wh' },
  { email: 'deepak.logistics@rugos.in', role: 'Logistics', roleCode: 'logistics' },
  { email: 'finance@rugos.in', role: 'Finance', roleCode: 'finance' },
  { email: 'sales@rugos.in', role: 'Sales', roleCode: 'sales' },
  { email: 'scm@rugos.in', role: 'SCM', roleCode: 'scm' },
  { email: 'auditor@rugos.in', role: 'Auditor', roleCode: 'auditor' },
]

export const DEMO_PASSWORD = 'RugOS@2026'
