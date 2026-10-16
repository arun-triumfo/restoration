import type { ActivityLog, AlertItem } from '../types'

export const ACTIVITY_LOGS: ActivityLog[] = [
  { id: 'LOG-88421', module: 'Inventory', action: 'Low stock threshold breached for SKU-RUG-DHU-0507-BLU', timestamp: '2026-10-14 09:42:11', status: 'warning' },
  { id: 'LOG-88420', module: 'Orders', action: 'Order ORD-AMZ-99214 packed & handed to FedEx', timestamp: '2026-10-14 09:18:04', status: 'success' },
  { id: 'LOG-88419', module: 'Shipping', action: 'AWB 7894-3321-992 generated for Dallas delivery', timestamp: '2026-10-14 08:55:32', status: 'info' },
  { id: 'LOG-88418', module: 'Finance', action: 'FIRA remittance USD 28,500 realized (EBRC pending)', timestamp: '2026-10-14 08:12:47', status: 'success' },
  { id: 'LOG-88417', module: 'Warehouse', action: 'GRN received — 12 units SKU-RUG-HT-0810-IVR at Edison NJ', timestamp: '2026-10-14 07:40:19', status: 'success' },
  { id: 'LOG-88416', module: 'Courier Audit', action: 'Weight variance +$18.50 flagged on AWB 7894-3321-901', timestamp: '2026-10-13 22:15:08', status: 'danger' },
  { id: 'LOG-88415', module: 'MTO', action: 'Loom #4 started production for ORD-AMZ-99288', timestamp: '2026-10-13 18:02:55', status: 'info' },
  { id: 'LOG-88414', module: 'Integrations', action: 'Amazon SP-API sync completed — 46 orders ingested', timestamp: '2026-10-13 16:30:00', status: 'success' },
]

export const ALERTS: AlertItem[] = [
  {
    id: 'a1',
    severity: 'critical',
    title: 'Low Stock: Sleeping Panda 5x7',
    detail: 'SKU-RUG-DHU-0507-BLU below 15-day cover at Edison NJ 3PL. Replenishment PO recommended.',
    module: 'Inventory',
  },
  {
    id: 'a2',
    severity: 'warning',
    title: 'Courier Invoice Variance',
    detail: 'FedEx billed 19.5 kg vs system 14.5 kg on AWB 7894-3321-901 (+$18.50).',
    module: 'Courier Audit',
  },
  {
    id: 'a3',
    severity: 'warning',
    title: '3 Orders Pending Allocation',
    detail: 'ORD-WAY-55102, ORD-SHP-22018, ORD-SHP-22044 awaiting warehouse assignment.',
    module: 'Orders',
  },
  {
    id: 'a4',
    severity: 'info',
    title: 'EBRC Realization Due',
    detail: 'Export invoice EXP-INV-2026-089 realization window closes in 6 days.',
    module: 'Finance',
  },
  {
    id: 'a5',
    severity: 'critical',
    title: 'MTO Lead Time Risk',
    detail: 'ORD-AMZ-99288 on Loom #4 — ETA 2026-09-28 may miss Amazon promise date.',
    module: 'MTO',
  },
  {
    id: 'a6',
    severity: 'info',
    title: 'Ocean Container ETA Update',
    detail: 'Container MSCU-882910 docked ETA Edison NJ revised to +2 days.',
    module: 'Shipping',
  },
]

export const REVENUE_CHART = [
  { month: 'Apr', dtc: 42000, marketplace: 68000, b2b: 31000 },
  { month: 'May', dtc: 48000, marketplace: 72000, b2b: 28000 },
  { month: 'Jun', dtc: 51000, marketplace: 79000, b2b: 45000 },
  { month: 'Jul', dtc: 56000, marketplace: 84000, b2b: 38000 },
  { month: 'Aug', dtc: 62000, marketplace: 91000, b2b: 52000 },
  { month: 'Sep', dtc: 71000, marketplace: 98000, b2b: 61000 },
]

export const HUB_STOCK = [
  { hub: 'India WH', stock: 520, fill: '#6366f1' },
  { hub: 'In-Transit', stock: 262, fill: '#06b6d4' },
  { hub: 'USA 3PL', stock: 381, fill: '#10b981' },
  { hub: 'FBA', stock: 218, fill: '#a855f7' },
]
