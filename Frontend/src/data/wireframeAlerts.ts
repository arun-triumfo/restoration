/** Seed data matching the SOW wireframe Automation & Alerts module */

export type AlertIncident = {
  id: string
  domain: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO'
  icon: string
  title: string
  detail: string
  timestamp: string
  ruleId: string
  actionLabel: string
  actionPath?: string
  resolved?: boolean
}

export type AutomationRule = {
  id: string
  name: string
  domain: string
  severity: string
  trigger: string
  condition: string
  action: string
  active: boolean
  lastFired: string
  executionCount: number
  nextCheck: string
  schedule: string
}

export const SEED_ALERTS: AlertIncident[] = [
  {
    id: 'ALT-001',
    domain: 'Operational — Stock Threshold',
    severity: 'CRITICAL',
    icon: '🚨',
    title: 'Low Stock Alert — SKU-HER-9X12-01 at USA 3PL Edison NJ',
    detail:
      'Heritage Kashan 9x12 ft stock dropped to 8 days supply (12 rolls remaining). Daily velocity: 1.8 pcs/day. Threshold: < 15 days supply. Immediate 40ft ocean container replenishment required.',
    timestamp: 'Today at 09:15 AM',
    ruleId: 'rule-01',
    actionLabel: '📦 Initiate Replenishment PO',
    actionPath: '/purchase-orders',
  },
  {
    id: 'ALT-002',
    domain: 'Operational — Order Aging SLA',
    severity: 'HIGH',
    icon: '⏱️',
    title: 'Unfulfilled Order SLA Breached — ORD-AMZ-99214 Pending > 24 Hours',
    detail:
      "Customer order ORD-AMZ-99214 (Amazon US) ingested 26.4 hours ago. Inventory locked but packing scan not completed at Bhadohi packing deck. Operational SLA threshold: 24 hours.",
    timestamp: 'Today at 08:30 AM',
    ruleId: 'rule-02',
    actionLabel: '🔍 Inspect in Order Queue',
    actionPath: '/orders',
  },
  {
    id: 'ALT-003',
    domain: 'Logistics — Courier Audit Variance',
    severity: 'HIGH',
    icon: '🚚',
    title: 'FedEx AWB #7894-3321-992 — Volumetric Weight Discrepancy (₹2,096 Overcharge)',
    detail:
      'Invoiced volumetric weight 19.5 kg vs calibrated Mettler digital scale weight 14.5 kg. Variance: +5.0 kg (+$25.70 USD / ₹2,096). Automated Clause 6.2 dispute manifest drafted.',
    timestamp: 'Today at 07:45 AM',
    ruleId: 'rule-03',
    actionLabel: '📑 Review & File Dispute',
    actionPath: '/courier-audit',
  },
  {
    id: 'ALT-004',
    domain: 'Financial — FEMA Realization',
    severity: 'HIGH',
    icon: '🏦',
    title: 'FEMA 210-Day Realization Sentinel — SB-6789124 ($4,250 USD, 28 Days Left)',
    detail:
      "Export Shipping Bill SB-6789124 (Invoice EXP-INV-2026-121) unrealized after 182 days. Compulsory RBI FEMA export realization deadline (210 days) expiring soon. e-BRC risk logged.",
    timestamp: 'Yesterday at 04:20 PM',
    ruleId: 'rule-04',
    actionLabel: '🏦 Send SWIFT Wire Tracer',
    actionPath: '/receivables',
  },
  {
    id: 'ALT-005',
    domain: 'Logistics — Delivery Exception',
    severity: 'MEDIUM',
    icon: '📦',
    title: 'FedEx Delivery Exception — AWB #8812-4412-990 (Customer Address Incomplete)',
    detail:
      "Delivery attempt failed in Edison NJ: 'Apartment/Suite number missing'. Buyer notified via automated SMS. Awaiting updated shipping address.",
    timestamp: 'Yesterday at 02:15 PM',
    ruleId: 'rule-05',
    actionLabel: '📍 Update Delivery Address',
    actionPath: '/shipping',
  },
  {
    id: 'ALT-006',
    domain: 'Financial — Returns & RMA',
    severity: 'INFO',
    icon: '🔄',
    title: 'Customer Return Received — RMA-2026-041 (Graded Resalable)',
    detail:
      'Customer return roll received at Edison 3PL. QC physical inspection completed: minor polywrap tear repaired, carpet pristine. Restocked to USA Available inventory.',
    timestamp: '2 days ago',
    ruleId: 'rule-06',
    actionLabel: '🔍 View RMA Ledger',
    actionPath: '/returns',
  },
]

export const SEED_RULES: AutomationRule[] = [
  {
    id: 'rule-01',
    name: 'Low Stock Safety Replenishment Sentinel',
    domain: 'Operational Alerts',
    severity: 'CRITICAL',
    trigger:
      'When any SKU Free Stock at USA 3PL Edison NJ falls below 15 days supply (< 18 units)',
    condition: 'Free Stock < 18 units (Days Supply < 15d)',
    action: 'Auto-generate Draft Ocean Replenishment PO & send SMTP email alert to SCM Lead',
    active: true,
    lastFired: 'Today at 09:15 AM',
    executionCount: 16,
    nextCheck: 'In 3 mins',
    schedule: '*/5 * * * *',
  },
  {
    id: 'rule-02',
    name: 'Unfulfilled Order Aging (> 24 Hours) Intercept',
    domain: 'Operational Alerts',
    severity: 'HIGH',
    trigger:
      "When any marketplace order remains in 'Allocated' status without packing scan for > 24 continuous hours",
    condition: "Order Status = 'Allocated' & Age > 24h",
    action: 'Escalate to Warehouse QC Lead & re-route to high-priority packing station deck',
    active: true,
    lastFired: 'Today at 08:30 AM',
    executionCount: 28,
    nextCheck: 'In 8 mins',
    schedule: '*/15 * * * *',
  },
  {
    id: 'rule-03',
    name: 'Carrier Volumetric Weight Discrepancy Auto-Dispute',
    domain: 'Logistics & Courier',
    severity: 'HIGH',
    trigger:
      'When FedEx / DHL billed volumetric weight exceeds Mettler calibrated scale weight by > 1.5 Kg',
    condition: 'Billed Weight > Scale Weight + 1.5 Kg',
    action: 'Hold courier invoice payout, auto-generate Clause 6.2 Dispute Letter PDF & attach scale photo',
    active: true,
    lastFired: 'Today at 07:45 AM',
    executionCount: 22,
    nextCheck: 'On New Invoice',
    schedule: 'On Event (Invoice Sync)',
  },
  {
    id: 'rule-04',
    name: 'FEMA 210-Day e-BRC Realization Deadline Sentinel',
    domain: 'Financial & Export',
    severity: 'HIGH',
    trigger:
      'When export invoice remains unrealized in DGFT EDPMS portal after 150 days from Shipping Bill date',
    condition: "Invoice Age > 150 days & Status = 'Unrealized'",
    action: 'Dispatch SWIFT wire tracer to foreign buyer bank & notify AD Bank (HDFC Bhadohi)',
    active: true,
    lastFired: 'Yesterday at 04:20 PM',
    executionCount: 7,
    nextCheck: 'Daily 09:00 AM',
    schedule: '0 9 * * *',
  },
  {
    id: 'rule-05',
    name: 'Courier In-Transit SLA Delay Alert',
    domain: 'Logistics & Courier',
    severity: 'MEDIUM',
    trigger:
      'When FedEx Home Delivery tracking shows no checkpoint movement for > 48 hours in transit',
    condition: 'In-Transit Inactivity > 48h',
    action: 'Create courier trace ticket with FedEx carrier rep & notify recipient customer via SMS',
    active: true,
    lastFired: 'Yesterday at 02:15 PM',
    executionCount: 11,
    nextCheck: 'Every 4 Hours',
    schedule: '0 */4 * * *',
  },
  {
    id: 'rule-06',
    name: 'Customer Return RMA Receipt & Restock Trigger',
    domain: 'Financial & Export',
    severity: 'INFO',
    trigger: 'When warehouse operator completes physical barcode scan on returned polywrap rug parcel',
    condition: "RMA Scan Completed & Grade = 'Resalable'",
    action: 'Instantly unlock USA 3PL Available stock & credit customer marketplace order ledger',
    active: true,
    lastFired: '2 days ago',
    executionCount: 19,
    nextCheck: 'On RMA Scan',
    schedule: 'On Event (Barcode Scan)',
  },
  {
    id: 'rule-07',
    name: 'Overdue B2B Wholesale Receivables (> 30 Days) Notice',
    domain: 'Financial & Export',
    severity: 'MEDIUM',
    trigger: 'When trade buyer invoice payment is past due date by > 30 calendar days',
    condition: "Invoice Status = 'Unpaid' & Overdue Days > 30",
    action: 'Send automated statement of account PDF to buyer accounts department & place credit hold',
    active: true,
    lastFired: '3 days ago',
    executionCount: 8,
    nextCheck: 'Daily 10:00 AM',
    schedule: '0 10 * * *',
  },
  {
    id: 'rule-08',
    name: 'Dynamic Net Profit Recalculation Engine',
    domain: 'Recalculation & Sync',
    severity: 'INFO',
    trigger:
      'When actual courier audited billings or customs duties replace estimated freight/tax figures',
    condition: "Courier Audit Status = 'Audited' OR CSB-V Duty Finalized",
    action: 'Recalculate order true gross margin & realized net profit across Module 7 financial ledgers',
    active: true,
    lastFired: 'Today at 06:00 AM',
    executionCount: 142,
    nextCheck: 'Hourly',
    schedule: '0 * * * *',
  },
  {
    id: 'rule-09',
    name: 'Nightly Multi-Warehouse Concurrency Ledger Reconciler',
    domain: 'Recalculation & Sync',
    severity: 'INFO',
    trigger:
      'Scheduled daily midnight batch reconciliation between Bhadohi Mill, Ocean Transit, and Edison 3PL',
    condition: 'Cron 00:00 UTC Trigger',
    action: 'Reconcile hard inventory reservations vs marketplace stock allocations & log audit diff',
    active: true,
    lastFired: 'Today at 00:00 UTC',
    executionCount: 84,
    nextCheck: 'Tonight 00:00 UTC',
    schedule: '0 0 * * *',
  },
]

export function sevColor(severity: string) {
  if (severity === 'CRITICAL') return '#ef4444'
  if (severity === 'HIGH') return '#f59e0b'
  if (severity === 'INFO') return '#10b981'
  return '#06b6d4'
}

export function mapApiAlert(row: Record<string, unknown>): AlertIncident {
  return {
    id: String(row.id || row._id || ''),
    domain: String(row.domain || 'Operational'),
    severity: (String(row.severity || 'MEDIUM').toUpperCase() as AlertIncident['severity']) || 'MEDIUM',
    icon: String(row.icon || '📋'),
    title: String(row.title || 'Alert'),
    detail: String(row.detail || ''),
    timestamp: String(row.timestamp || row.createdAt || 'Just now'),
    ruleId: String(row.ruleId || ''),
    actionLabel: String(row.actionLabel || 'Open'),
    actionPath: typeof row.actionPath === 'string' ? row.actionPath : undefined,
    resolved: Boolean(row.resolved),
  }
}

export function mapApiRule(row: Record<string, unknown>): AutomationRule {
  return {
    id: String(row.id || row._id || ''),
    name: String(row.name || 'Automation Rule'),
    domain: String(row.domain || 'General'),
    severity: String(row.severity || 'INFO'),
    trigger: String(row.trigger || ''),
    condition: String(row.condition || row.trigger || '—'),
    action: String(row.action || '—'),
    active: row.active !== false && row.enabled !== false,
    lastFired: String(row.lastFired || 'Never'),
    executionCount: Number(row.executionCount || 0),
    nextCheck: String(row.nextCheck || ''),
    schedule: String(row.schedule || 'Event-driven'),
  }
}
