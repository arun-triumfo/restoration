/** Mirror of Backend role menus — Restoration client: 4 roles only */

import { planAllowsPath } from './plans'

export type RoleCode = 'super_admin' | 'india_wh' | 'usa_wh' | 'finance'

const LEGACY: Record<string, RoleCode> = {
  scm: 'india_wh',
  sales: 'india_wh',
  logistics: 'india_wh',
  auditor: 'finance',
}

export function normalizeRoleCode(roleOrCode: string | undefined): RoleCode {
  const raw = String(roleOrCode || '')
    .trim()
    .toLowerCase()
  if (raw === 'super_admin' || raw === 'india_wh' || raw === 'usa_wh' || raw === 'finance') {
    return raw
  }
  if (LEGACY[raw]) return LEGACY[raw]
  if (raw.includes('super') || raw.includes('admin')) return 'super_admin'
  if (raw.includes('finance') || raw.includes('audit') || raw.includes('account')) return 'finance'
  if (raw.includes('usa') || raw.includes('3pl') || raw.includes('edison')) return 'usa_wh'
  return 'india_wh'
}

export const ROLE_MENUS: Record<RoleCode, string[] | ['*']> = {
  super_admin: ['*'],
  india_wh: [
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
    '/returns',
    '/courier-audit',
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
  finance: [
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
}

export function canAccessPath(
  roleCode: string | undefined,
  path: string,
  tenant?: { modules?: string[]; plan?: string },
): boolean {
  if (!roleCode) return false
  const code = normalizeRoleCode(roleCode)
  const menus = ROLE_MENUS[code]
  if (!menus) return path === '/workflow' || path === '/login'
  const roleOk =
    (menus as string[]).includes('*') || path === '/workflow' || (menus as string[]).includes(path)
  if (!roleOk) return false
  if (path === '/workflow' || path === '/billing' || path === '/login') return true
  return planAllowsPath(tenant?.modules, tenant?.plan, path)
}

/** All Restoration demo logins use @restoration.com */
export const DEMO_ACCOUNTS = [
  { email: 'admin@restoration.com', role: 'Super Admin', roleCode: 'super_admin' as RoleCode },
  {
    email: 'india@restoration.com',
    role: 'India Warehouse Manager',
    roleCode: 'india_wh' as RoleCode,
  },
  { email: 'usa@restoration.com', role: 'US Warehouse Manager', roleCode: 'usa_wh' as RoleCode },
  { email: 'finance@restoration.com', role: 'Finance Manager', roleCode: 'finance' as RoleCode },
]

export const DEMO_PASSWORD = 'RugOS@2026'
