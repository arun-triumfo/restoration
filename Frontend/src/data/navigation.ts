import type { NavSection } from '../types'

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
      { label: 'Demand Forecast', path: '/forecast', icon: 'TrendingUp' },
      { label: 'Automation & Alerts', path: '/alerts', icon: 'Bell' },
      { label: 'Integrations', path: '/integrations', icon: 'Zap' },
      { label: 'Failed Jobs', path: '/failed-jobs', icon: 'AlertTriangle' },
    ],
  },
  {
    title: 'INVENTORY & WAREHOUSES',
    items: [
      { label: 'Inventory', path: '/inventory', icon: 'Package' },
      { label: 'Warehouses', path: '/warehouses', icon: 'Warehouse' },
      { label: 'Warehouse Analytics', path: '/warehouse-analytics', icon: 'BarChart3' },
      { label: 'Stock History', path: '/stock-history', icon: 'Clock' },
      { label: 'Raw Materials', path: '/raw-materials', icon: 'Layers' },
    ],
  },
  {
    title: 'ORDERS & FULFILLMENT',
    items: [
      { label: 'Orders', path: '/orders', icon: 'ShoppingBag' },
      { label: 'MTO Jobs', path: '/mto', icon: 'Factory' },
      { label: 'Purchase Orders', path: '/purchase-orders', icon: 'FileText' },
      { label: 'Stock Transfers', path: '/stock-transfers', icon: 'ArrowLeftRight' },
    ],
  },
  {
    title: 'SHIPPING & EXPORT',
    items: [
      { label: 'Shipping & Dispatch', path: '/shipping', icon: 'Truck' },
      { label: 'Loading Plans', path: '/loading-plans', icon: 'Container' },
      { label: 'Export Docs', path: '/export-docs', icon: 'FileCheck' },
    ],
  },
  {
    title: 'FINANCE & AUDIT',
    items: [
      { label: 'Returns & Claims', path: '/returns', icon: 'RotateCcw' },
      { label: 'Courier Audit', path: '/courier-audit', icon: 'ShieldCheck' },
      { label: 'Receivables', path: '/receivables', icon: 'CreditCard' },
      { label: 'Profitability', path: '/profitability', icon: 'DollarSign' },
      { label: 'Reports', path: '/reports', icon: 'PieChart' },
    ],
  },
  {
    title: 'ADMINISTRATION & MASTERS',
    items: [
      { label: 'Company', path: '/company', icon: 'Building2' },
      { label: 'Users & RBAC', path: '/users', icon: 'Users' },
      { label: 'Buyers', path: '/buyers', icon: 'Briefcase' },
      { label: 'Looms', path: '/looms', icon: 'Hammer' },
      { label: 'Carriers', path: '/carriers', icon: 'Ship' },
      { label: 'Currencies', path: '/currencies', icon: 'Coins' },
      { label: 'System Logs', path: '/system-logs', icon: 'Terminal' },
      { label: 'System Config', path: '/settings', icon: 'Settings' },
    ],
  },
]
