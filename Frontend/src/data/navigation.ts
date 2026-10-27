import type { NavSection } from '../types'

/** Sidebar order matches System Workflow (menuPlaybook.ts) step by step. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'START HERE',
    items: [
      { label: 'System Workflow', path: '/workflow', icon: 'GitBranch' },
      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
    ],
  },
  {
    title: '1 · SET UP THE COMPANY',
    items: [
      { label: 'Company', path: '/company', icon: 'Building2' },
      { label: 'Users & RBAC', path: '/users', icon: 'Users' },
      { label: 'Warehouses', path: '/warehouses', icon: 'Warehouse' },
      { label: 'Buyers', path: '/buyers', icon: 'Briefcase' },
      { label: 'Looms', path: '/looms', icon: 'Hammer' },
      { label: 'Carriers', path: '/carriers', icon: 'Ship' },
      { label: 'Currencies', path: '/currencies', icon: 'Coins' },
      { label: 'Integrations', path: '/integrations', icon: 'Zap' },
    ],
  },
  {
    title: '2 · SELL',
    items: [{ label: 'Orders', path: '/orders', icon: 'ShoppingBag' }],
  },
  {
    title: '3 · STOCK',
    items: [
      { label: 'Inventory', path: '/inventory', icon: 'Package' },
      { label: 'Raw Materials', path: '/raw-materials', icon: 'Layers' },
      { label: 'Stock History', path: '/stock-history', icon: 'Clock' },
      { label: 'Warehouse Analytics', path: '/warehouse-analytics', icon: 'BarChart3' },
    ],
  },
  {
    title: '4 · MAKE OR BUY',
    items: [
      { label: 'Demand Forecast', path: '/forecast', icon: 'TrendingUp' },
      { label: 'Buy Sheet → PO', path: '/buy-sheet', icon: 'FileText' },
      { label: 'Purchase Orders', path: '/purchase-orders', icon: 'FileText' },
      { label: 'MTO Jobs', path: '/mto', icon: 'Factory' },
    ],
  },
  {
    title: '5 · MOVE & SHIP',
    items: [
      { label: 'Stock Transfers', path: '/stock-transfers', icon: 'ArrowLeftRight' },
      { label: 'Packing Station', path: '/packing', icon: 'Package' },
      { label: 'Loading Plans', path: '/loading-plans', icon: 'Container' },
      { label: 'Shipping Desk', path: '/shipping', icon: 'Truck' },
      { label: 'Export Docs', path: '/export-docs', icon: 'FileCheck' },
    ],
  },
  {
    title: '6 · AFTER THE SALE',
    items: [
      { label: 'Returns & Claims', path: '/returns', icon: 'RotateCcw' },
      { label: 'Courier Audit', path: '/courier-audit', icon: 'ShieldCheck' },
      { label: 'Receivables', path: '/receivables', icon: 'CreditCard' },
      { label: 'Profitability', path: '/profitability', icon: 'DollarSign' },
      { label: 'Reports', path: '/reports', icon: 'PieChart' },
    ],
  },
  {
    title: '7 · WATCH THE SYSTEM',
    items: [
      { label: 'Automation & Alerts', path: '/alerts', icon: 'Bell' },
      { label: 'Failed Jobs', path: '/failed-jobs', icon: 'AlertTriangle' },
      { label: 'System Logs', path: '/system-logs', icon: 'Terminal' },
      { label: 'System Config', path: '/settings', icon: 'Settings' },
    ],
  },
  {
    title: '8 · SAAS ADMIN',
    items: [
      { label: 'Billing', path: '/billing', icon: 'CreditCard' },
      { label: 'Tenants', path: '/tenants', icon: 'Building2' },
    ],
  },
]
