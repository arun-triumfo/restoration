export type DevStatus = 'live' | 'partial' | 'planned'

export type WorkflowStep = {
  id: string
  step: number
  title: string
  plain: string
  detail: string
  menuPath: string
  menuLabel: string
  department: string
  status: DevStatus
}

export type DepartmentGuide = {
  id: string
  role: string
  emoji: string
  plain: string
  sees: string[]
  does: string[]
  menus: { label: string; path: string }[]
  status: DevStatus
  planned?: string[]
}

export type MenuGuide = {
  section: string
  items: {
    label: string
    path: string
    plain: string
    status: DevStatus
    note?: string
  }[]
}

export type PlannedItem = {
  title: string
  plain: string
  why: string
  area: string
}

export const JOURNEY_STEPS: WorkflowStep[] = [
  {
    id: 'j1',
    step: 1,
    title: 'Customer places an order',
    plain: 'Someone buys a rug on Amazon, website, or wholesale.',
    detail:
      'Orders from Amazon, Etsy, Shopify, Walmart and B2B buyers land in one Order Pipeline so the team does not hunt in five portals.',
    menuPath: '/orders',
    menuLabel: 'Orders',
    department: 'Sales / Ops',
    status: 'live',
  },
  {
    id: 'j2',
    step: 2,
    title: 'System checks stock',
    plain: 'Does USA warehouse have the rug ready? Or must India make it?',
    detail:
      'Inventory shows free stock across India mill, ocean transit, Edison 3PL and Amazon FBA. If stock is low, alerts fire.',
    menuPath: '/inventory',
    menuLabel: 'Inventory',
    department: 'Warehouse',
    status: 'live',
  },
  {
    id: 'j3',
    step: 3,
    title: 'Make or buy if needed',
    plain: 'If not in stock, raise a purchase order or start loom (MTO) work.',
    detail:
      'Purchase Orders and MTO Jobs track weaving, packing QC and ready-to-ship status at Bhadohi.',
    menuPath: '/purchase-orders',
    menuLabel: 'Purchase Orders / MTO',
    department: 'Production',
    status: 'live',
  },
  {
    id: 'j4',
    step: 4,
    title: 'Move stock between hubs',
    plain: 'India packs containers; USA receives and puts rugs on shelf.',
    detail:
      'Stock Transfers track ocean/air moves, cartons, freight cost and receive confirmation at destination.',
    menuPath: '/stock-transfers',
    menuLabel: 'Stock Transfers',
    department: 'Logistics',
    status: 'live',
  },
  {
    id: 'j5',
    step: 5,
    title: 'Ship to the customer',
    plain: 'Create loading plan, AWB / label, and hand to courier.',
    detail:
      'Shipping & Loading Plans cover staging, FedEx/DHL style dispatch and tracking states.',
    menuPath: '/shipping',
    menuLabel: 'Shipping & Dispatch',
    department: 'Logistics',
    status: 'live',
  },
  {
    id: 'j6',
    step: 6,
    title: 'Export paperwork (India → USA)',
    plain: 'Commercial invoice, packing list, shipping bill for customs.',
    detail:
      'Export Docs suite holds the statutory pack needed for DGFT / ICEGATE style flows.',
    menuPath: '/export-docs',
    menuLabel: 'Export Docs',
    department: 'Export / Finance',
    status: 'live',
  },
  {
    id: 'j7',
    step: 7,
    title: 'Get paid & stay compliant',
    plain: 'Track buyer payments and FEMA / e-BRC realization deadlines.',
    detail:
      'Receivables ageing and FEMA sentinels warn before the 210-day export realization clock runs out.',
    menuPath: '/receivables',
    menuLabel: 'Receivables',
    department: 'Finance',
    status: 'live',
  },
  {
    id: 'j8',
    step: 8,
    title: 'Know true profit',
    plain: 'After courier bills and duties, see what each order really earned.',
    detail:
      'Profitability replaces estimates with audited freight and shows margin by SKU, channel and order.',
    menuPath: '/profitability',
    menuLabel: 'Profitability',
    department: 'Finance / Management',
    status: 'live',
  },
  {
    id: 'j9',
    step: 9,
    title: 'Plan the next buy',
    plain: 'Which rugs are running out? What should we buy or stop buying?',
    detail:
      'Demand Forecast workbench uses moving averages, safety stock and reorder points — no black-box AI.',
    menuPath: '/forecast',
    menuLabel: 'Demand Forecast',
    department: 'Planning / SCM',
    status: 'live',
  },
  {
    id: 'j10',
    step: 10,
    title: 'Alerts keep everyone honest',
    plain: 'Low stock, late orders, courier overcharge, unpaid exports — auto pings.',
    detail:
      'Automation & Alerts engine has rules for stock, SLA, courier variance and FEMA — plus notification channels.',
    menuPath: '/alerts',
    menuLabel: 'Automation & Alerts',
    department: 'All',
    status: 'live',
  },
]

export const DEPARTMENTS: DepartmentGuide[] = [
  {
    id: 'mgmt',
    role: 'Management / Owner',
    emoji: '👔',
    plain: 'Sees the whole business health in one glance — sales, stock, profit, risks.',
    sees: ['Dashboard KPIs', 'Profitability', 'Demand Forecast', 'Reports', 'Alerts'],
    does: [
      'Review daily command center',
      'Approve big replenishment buys',
      'Watch FEMA / cash risk',
    ],
    menus: [
      { label: 'Dashboard', path: '/' },
      { label: 'Profitability', path: '/profitability' },
      { label: 'Demand Forecast', path: '/forecast' },
      { label: 'Reports', path: '/reports' },
    ],
    status: 'partial',
    planned: [
      'Role-based dashboard (only owner KPIs)',
      'Multi-company / multi-brand SaaS switcher',
    ],
  },
  {
    id: 'sales',
    role: 'Sales / Marketplace',
    emoji: '🛒',
    plain: 'Owns customer orders from every channel until they are allocated.',
    sees: ['Orders', 'Buyers (B2B)', 'Returns'],
    does: [
      'Create / import orders',
      'Resolve mapping exceptions',
      'Handle return / RMA conversations',
    ],
    menus: [
      { label: 'Orders', path: '/orders' },
      { label: 'Buyers', path: '/buyers' },
      { label: 'Returns & Claims', path: '/returns' },
    ],
    status: 'partial',
    planned: [
      'Live Amazon / Shopify / Etsy API sync (today: UI + seed / API CRUD)',
      'Buy-box & listing health widgets',
    ],
  },
  {
    id: 'india_wh',
    role: 'India Warehouse / Mill',
    emoji: '🏭',
    plain: 'Weaves, packs, and ships rugs from Bhadohi toward USA.',
    sees: ['Inventory (India)', 'MTO Jobs', 'Purchase Orders', 'Loading Plans', 'Export Docs'],
    does: [
      'Assign looms / track MTO stages',
      'Pack with barcode + photos',
      'Create loading plans & export docs',
    ],
    menus: [
      { label: 'Inventory', path: '/inventory' },
      { label: 'MTO Jobs', path: '/mto' },
      { label: 'Purchase Orders', path: '/purchase-orders' },
      { label: 'Looms', path: '/looms' },
      { label: 'Shipping', path: '/shipping' },
      { label: 'Export Docs', path: '/export-docs' },
    ],
    status: 'partial',
    planned: [
      'Barcode scanner hardware flow',
      'Photo proof-of-packing upload to S3',
      'India-only screen (hide USA finance)',
    ],
  },
  {
    id: 'usa_wh',
    role: 'USA 3PL Warehouse',
    emoji: '📦',
    plain: 'Receives containers, shelves stock, picks & packs for US customers.',
    sees: ['Inventory (USA)', 'Stock Transfers (receive)', 'Orders to pick', 'Returns inbound'],
    does: [
      'Confirm container GRN / receive transfer',
      'Allocate & pack marketplace orders',
      'Grade returned rugs',
    ],
    menus: [
      { label: 'Inventory', path: '/inventory' },
      { label: 'Stock Transfers', path: '/stock-transfers' },
      { label: 'Orders', path: '/orders' },
      { label: 'Warehouses', path: '/warehouses' },
      { label: 'Returns', path: '/returns' },
    ],
    status: 'partial',
    planned: [
      'USA-only role login (hide India mill cost)',
      'Dock scan receive app',
    ],
  },
  {
    id: 'logistics',
    role: 'Logistics / Courier',
    emoji: '🚚',
    plain: 'Books freight, tracks AWBs, fights wrong courier invoices.',
    sees: ['Shipping', 'Carriers', 'Courier Audit', 'Stock Transfers'],
    does: [
      'Create AWB / labels',
      'Audit volumetric vs scale weight',
      'File disputes & credit notes',
    ],
    menus: [
      { label: 'Shipping & Dispatch', path: '/shipping' },
      { label: 'Carriers', path: '/carriers' },
      { label: 'Courier Audit', path: '/courier-audit' },
    ],
    status: 'partial',
    planned: [
      'Live FedEx / DHL API rate + label',
      'Auto dispute PDF email to carrier',
    ],
  },
  {
    id: 'finance',
    role: 'Finance / Accounts',
    emoji: '🏦',
    plain: 'Tracks money in, money out, true margin, and export bank compliance.',
    sees: ['Receivables', 'Profitability', 'Reports', 'Currencies', 'Courier Audit payables'],
    does: [
      'Chase unpaid B2B invoices',
      'Post e-BRC / FIRA',
      'Recalculate true landed profit',
    ],
    menus: [
      { label: 'Receivables', path: '/receivables' },
      { label: 'Profitability', path: '/profitability' },
      { label: 'Reports', path: '/reports' },
      { label: 'Currencies', path: '/currencies' },
    ],
    status: 'partial',
    planned: [
      'Bank statement import',
      'GST / tax export packs',
      'Finance-only RBAC lock',
    ],
  },
  {
    id: 'scm',
    role: 'Planning / SCM',
    emoji: '📈',
    plain: 'Decides what to weave next and what not to overbuy.',
    sees: ['Demand Forecast', 'Alerts', 'Warehouse Analytics', 'Raw Materials'],
    does: [
      'Build buy sheet from forecast',
      'Expedite critical SKUs',
      'Watch idle capital / dead stock',
    ],
    menus: [
      { label: 'Demand Forecast', path: '/forecast' },
      { label: 'Automation & Alerts', path: '/alerts' },
      { label: 'Warehouse Analytics', path: '/warehouse-analytics' },
    ],
    status: 'live',
    planned: ['One-click draft PO from buy sheet into Mongo'],
  },
  {
    id: 'admin',
    role: 'System Admin',
    emoji: '🛡️',
    plain: 'Sets up company, users, roles, and watches integrations / logs.',
    sees: ['Users & RBAC', 'Company', 'Integrations', 'Failed Jobs', 'System Logs', 'Config'],
    does: [
      'Create users & permissions',
      'Retry failed sync jobs',
      'Maintain masters (looms, carriers, FX)',
    ],
    menus: [
      { label: 'Users & RBAC', path: '/users' },
      { label: 'Company', path: '/company' },
      { label: 'Integrations', path: '/integrations' },
      { label: 'System Logs', path: '/system-logs' },
    ],
    status: 'partial',
    planned: [
      'Real login + JWT / SSO',
      'Tenant (SaaS) isolation per client company',
      'Permission enforced on every API call',
    ],
  },
]

export const MENU_GUIDE: MenuGuide[] = [
  {
    section: 'Overview',
    items: [
      {
        label: 'Dashboard',
        path: '/',
        plain: 'Big picture: sales, stock, profit, and today’s fires.',
        status: 'live',
      },
      {
        label: 'Demand Forecast',
        path: '/forecast',
        plain: 'Which rugs to buy, wait, or stop buying — with formulas you can check.',
        status: 'live',
      },
      {
        label: 'Automation & Alerts',
        path: '/alerts',
        plain: 'Rules that watch stock, late orders, courier bills, and FEMA deadlines.',
        status: 'live',
      },
      {
        label: 'Integrations',
        path: '/integrations',
        plain: 'Background workers that sync marketplaces and queues.',
        status: 'partial',
        note: 'UI + worker status live; real channel APIs still planned.',
      },
      {
        label: 'Failed Jobs',
        path: '/failed-jobs',
        plain: 'Sync errors waiting for retry (dead-letter queue).',
        status: 'partial',
      },
      {
        label: 'System Workflow',
        path: '/workflow',
        plain: 'This page — explains the whole system in simple language.',
        status: 'live',
      },
    ],
  },
  {
    section: 'Inventory & Warehouses',
    items: [
      {
        label: 'Inventory',
        path: '/inventory',
        plain: 'Every rug SKU and how many pieces sit in each warehouse.',
        status: 'live',
      },
      {
        label: 'Warehouses',
        path: '/warehouses',
        plain: 'List of facilities (India mill, USA 3PL, FBA, etc.).',
        status: 'live',
      },
      {
        label: 'Warehouse Analytics',
        path: '/warehouse-analytics',
        plain: 'How fast stock moves inside one building.',
        status: 'live',
      },
      {
        label: 'Stock History',
        path: '/stock-history',
        plain: 'Diary of every stock in / out movement.',
        status: 'live',
      },
      {
        label: 'Raw Materials',
        path: '/raw-materials',
        plain: 'Wool, dyes, and loom inputs (shown with loom master today).',
        status: 'partial',
      },
    ],
  },
  {
    section: 'Orders & Fulfillment',
    items: [
      {
        label: 'Orders',
        path: '/orders',
        plain: 'All marketplace & B2B orders in one pipeline.',
        status: 'live',
      },
      {
        label: 'MTO Jobs',
        path: '/mto',
        plain: 'Made-to-order weaving board (to make → ready to pack).',
        status: 'live',
      },
      {
        label: 'Purchase Orders',
        path: '/purchase-orders',
        plain: 'Buy / replenish from mill or vendor.',
        status: 'live',
      },
      {
        label: 'Stock Transfers',
        path: '/stock-transfers',
        plain: 'Move rugs India ↔ ocean ↔ USA with status tracking.',
        status: 'live',
      },
    ],
  },
  {
    section: 'Shipping & Export',
    items: [
      {
        label: 'Shipping & Dispatch',
        path: '/shipping',
        plain: 'Loading plans, staging, courier handoff.',
        status: 'live',
      },
      {
        label: 'Loading Plans',
        path: '/loading-plans',
        plain: 'Same shipping workbench focused on containers.',
        status: 'live',
      },
      {
        label: 'Export Docs',
        path: '/export-docs',
        plain: 'Commercial invoice, packing list, shipping bill pack.',
        status: 'live',
      },
    ],
  },
  {
    section: 'Finance & Audit',
    items: [
      {
        label: 'Returns & Claims',
        path: '/returns',
        plain: 'Customer returns, grading, refunds, carrier claims.',
        status: 'live',
      },
      {
        label: 'Courier Audit',
        path: '/courier-audit',
        plain: 'Catch courier weight / rate overcharges.',
        status: 'live',
      },
      {
        label: 'Receivables',
        path: '/receivables',
        plain: 'Who owes us money; export realization clock.',
        status: 'live',
      },
      {
        label: 'Profitability',
        path: '/profitability',
        plain: 'True cost waterfall after real freight & fees.',
        status: 'live',
      },
      {
        label: 'Reports',
        path: '/reports',
        plain: 'Sales, ageing, inventory valuation style reports.',
        status: 'live',
      },
    ],
  },
  {
    section: 'Administration',
    items: [
      {
        label: 'Company',
        path: '/company',
        plain: 'Legal name, GST, IEC, bank, signatories.',
        status: 'live',
      },
      {
        label: 'Users & RBAC',
        path: '/users',
        plain: 'People and which screens they may open.',
        status: 'partial',
        note: 'Matrix UI live; real login lock still planned.',
      },
      {
        label: 'Buyers / Looms / Carriers / Currencies',
        path: '/buyers',
        plain: 'Master data the rest of the system uses.',
        status: 'live',
      },
      {
        label: 'System Logs',
        path: '/system-logs',
        plain: 'Who did what — audit trail.',
        status: 'live',
      },
      {
        label: 'System Config',
        path: '/settings',
        plain: 'SOW / configuration explorer.',
        status: 'partial',
      },
    ],
  },
]

export const PLANNED: PlannedItem[] = [
  {
    title: 'Real login & role lock',
    plain: 'Each person signs in and only sees their department menus.',
    why: 'Required before going live with many staff users.',
    area: 'SaaS / Security',
  },
  {
    title: 'Multi-tenant SaaS',
    plain: 'One product, many client companies — each company’s data stays private.',
    why: 'So RugOS can be sold as software-as-a-service.',
    area: 'SaaS',
  },
  {
    title: 'Live marketplace sync',
    plain: 'Amazon / Shopify / Etsy orders and stock push automatically.',
    why: 'Removes manual CSV imports every day.',
    area: 'Integrations',
  },
  {
    title: 'Live courier APIs',
    plain: 'Create FedEx/DHL labels and pull tracking from the carrier.',
    why: 'Shipping screen becomes operational, not only a planner.',
    area: 'Logistics',
  },
  {
    title: 'Barcode + photo packing app',
    plain: 'Warehouse phone/scanner confirms every pack with a photo.',
    why: 'Cuts packing mistakes and dispute losses.',
    area: 'Warehouse',
  },
  {
    title: 'Buy sheet → auto draft PO',
    plain: 'From Demand Forecast, one click creates a purchase order in the database.',
    why: 'Closes the loop from plan to procurement.',
    area: 'Planning',
  },
  {
    title: 'Department home screens',
    plain: 'India WH, USA WH, Finance each get a simple “my day” page.',
    why: 'Layman users should not need the full ERP menu.',
    area: 'UX / Roles',
  },
  {
    title: 'Billing & subscriptions',
    plain: 'Charge client companies monthly for SaaS seats/modules.',
    why: 'Needed to run RugOS as a commercial product.',
    area: 'SaaS',
  },
]

export const STATUS_META: Record<
  DevStatus,
  { label: string; short: string; className: string }
> = {
  live: {
    label: 'Built — you can open & click',
    short: 'Built',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  partial: {
    label: 'UI ready — deeper automation still coming',
    short: 'Partial',
    className: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  },
  planned: {
    label: 'To be developed',
    short: 'Planned',
    className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25',
  },
}
