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
    role: 'Super Admin / Management',
    emoji: '👔',
    plain: 'Full ERP + SaaS admin. Demo user: Ctas Admin.',
    sees: ['All menus', 'Tenants', 'Users', 'Billing', 'Integrations'],
    does: ['Full CRUD everywhere', 'Create tenants', 'Change user roles', 'Sandbox marketplace sync'],
    menus: [
      { label: 'Dashboard', path: '/' },
      { label: 'Users', path: '/users' },
      { label: 'Tenants', path: '/tenants' },
      { label: 'Billing', path: '/billing' },
    ],
    status: 'live',
  },
  {
    id: 'sales',
    role: 'Sales / Marketplace',
    emoji: '🛒',
    plain: 'Orders & buyers. Demo: Priya Mehta (sales@rugos.in).',
    sees: ['Orders', 'Buyers', 'Returns', 'Alerts'],
    does: ['Add / Edit / Delete Orders, Buyers, Returns'],
    menus: [
      { label: 'Orders', path: '/orders' },
      { label: 'Buyers', path: '/buyers' },
      { label: 'Returns', path: '/returns' },
    ],
    status: 'live',
  },
  {
    id: 'india_wh',
    role: 'India Warehouse / Mill',
    emoji: '🏭',
    plain: 'Mill + pack + export. Demo: Vikram Singh (vikram@rugos.in).',
    sees: ['Inventory', 'MTO', 'POs', 'Packing', 'Shipping', 'Export Docs'],
    does: ['CRUD on mill masters', 'Pack scan', 'Buy sandbox label'],
    menus: [
      { label: 'Inventory', path: '/inventory' },
      { label: 'Packing', path: '/packing' },
      { label: 'Shipping', path: '/shipping' },
      { label: 'MTO', path: '/mto' },
    ],
    status: 'live',
  },
  {
    id: 'usa_wh',
    role: 'USA 3PL Warehouse',
    emoji: '📦',
    plain: 'Receive + pick/pack US. Demo: John Gallagher.',
    sees: ['Inventory', 'Orders', 'Transfers', 'Warehouses', 'Packing', 'Shipping'],
    does: ['CRUD Orders/Inventory/Transfers', 'Pack + label'],
    menus: [
      { label: 'Orders', path: '/orders' },
      { label: 'Packing', path: '/packing' },
      { label: 'Warehouses', path: '/warehouses' },
    ],
    status: 'live',
  },
  {
    id: 'logistics',
    role: 'Logistics / Courier',
    emoji: '🚚',
    plain: 'Freight + AWB. Demo: Deepak Sharma.',
    sees: ['Shipping Desk', 'Carriers', 'Courier Audit', 'Loading Plans'],
    does: ['CRUD Carriers/Audit/Loading', 'Sandbox Rate→Label→Track'],
    menus: [
      { label: 'Shipping', path: '/shipping' },
      { label: 'Carriers', path: '/carriers' },
      { label: 'Courier Audit', path: '/courier-audit' },
    ],
    status: 'live',
  },
  {
    id: 'finance',
    role: 'Finance / Accounts',
    emoji: '🏦',
    plain: 'Money in/out. Demo: Sunita Agarwal (finance@rugos.in).',
    sees: ['Receivables', 'Profitability', 'Reports', 'Currencies'],
    does: ['Add / Edit / Delete finance records'],
    menus: [
      { label: 'Receivables', path: '/receivables' },
      { label: 'Profitability', path: '/profitability' },
      { label: 'Currencies', path: '/currencies' },
    ],
    status: 'live',
  },
  {
    id: 'scm',
    role: 'Planning / SCM',
    emoji: '📈',
    plain: 'Forecast + buy. Demo: Amit Planner (scm@rugos.in).',
    sees: ['Forecast', 'Buy Sheet', 'Inventory', 'POs', 'Raw Materials'],
    does: ['CRUD Inventory/POs/Raw', 'Buy Sheet → Draft PO'],
    menus: [
      { label: 'Buy Sheet', path: '/buy-sheet' },
      { label: 'Inventory', path: '/inventory' },
      { label: 'Purchase Orders', path: '/purchase-orders' },
    ],
    status: 'live',
  },
  {
    id: 'auditor',
    role: 'Auditor',
    emoji: '🔎',
    plain: 'Read-only compliance. Demo: Neha Auditor.',
    sees: ['Logs', 'Reports', 'Receivables', 'Profitability', 'Courier Audit'],
    does: ['View only — no Add/Edit/Delete'],
    menus: [
      { label: 'System Logs', path: '/system-logs' },
      { label: 'Reports', path: '/reports' },
    ],
    status: 'live',
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

/**
 * Remaining work waits on Restoration company credentials / decisions.
 * Sandbox flows already work without these keys.
 */
export type OwnerRequirement = {
  title: string
  whyLeft: string
  area: string
  provide: string[]
  readyNow: string
}

/** Alias kept for older imports */
export type ClientRequirement = OwnerRequirement

export const OWNER_REQUIRED: OwnerRequirement[] = [
  {
    title: 'Payment gateway (Stripe or Razorpay)',
    whyLeft: 'Waiting on Restoration billing account keys to turn on live checkout.',
    area: 'Billing',
    provide: [
      'Stripe Secret + Publishable keys OR Razorpay Key ID + Secret',
      'Webhook signing secret',
      'Preferred currency (USD / INR) and plan prices',
    ],
    readyNow: 'Plan switch UI and suspend lock already work in demo mode.',
  },
  {
    title: 'Amazon Selling Partner API (SP-API)',
    whyLeft: 'Waiting on Restoration Amazon seller / SP-API app credentials for live orders.',
    area: 'Marketplace',
    provide: [
      'LWA App ID + App Secret',
      'Refresh token / seller account access',
      'Marketplace IDs (e.g. ATVPDKIKX0DER)',
      'AWS IAM role ARN if required by the SP-API app',
    ],
    readyNow: 'Sandbox Connect / Sync Now already imports sample Amazon-style orders.',
  },
  {
    title: 'Shopify Admin API',
    whyLeft: 'Waiting on Restoration Shopify store domain and Admin API token.',
    area: 'Marketplace',
    provide: [
      'Shopify store domain (xxx.myshopify.com)',
      'Admin API access token (or OAuth app ID / secret)',
      'Which locations map to USA warehouse / FBA',
    ],
    readyNow: 'Sandbox sync already creates Shopify-style orders in the pipeline.',
  },
  {
    title: 'Etsy / Walmart / other channels (optional)',
    whyLeft: 'Optional — only if Restoration wants those channels live.',
    area: 'Marketplace',
    provide: ['API keys / OAuth apps per channel', 'SKU mapping rules'],
    readyNow: 'Etsy sandbox connector stub follows the same pattern as Shopify.',
  },
  {
    title: 'FedEx / DHL (live courier)',
    whyLeft: 'Waiting on Restoration carrier account credentials for real AWBs.',
    area: 'Shipping',
    provide: [
      'FedEx account + API key / secret (or DHL Express credentials)',
      'Meter number / account ZIP',
      'Optional: cloud storage bucket for production label files',
    ],
    readyNow: 'Sandbox Rate → Label → Track works today with printable local labels.',
  },
  {
    title: 'Production URLs & backup owner',
    whyLeft: 'Waiting on final Restoration go-live URLs and who owns Atlas restore drills.',
    area: 'Ops',
    provide: [
      'Final frontend URL (Render / custom domain)',
      'Final backend URL',
      'Ops contact for JWT secret rotation',
      'Confirm one Atlas backup restore drill',
    ],
    readyNow: 'Security hardening and ops runbook are already in place.',
  },
]

export const CLIENT_REQUIRED = OWNER_REQUIRED

export const PLANNED: PlannedItem[] = OWNER_REQUIRED.map((c) => ({
  title: c.title,
  plain: c.whyLeft,
  why: c.readyNow,
  area: c.area,
}))

/** End-to-end test steps for Restoration owners */
export const FULL_TEST_FLOW: {
  id: string
  title: string
  minutes: number
  loginAs: string
  steps: { do: string; expect: string; link?: string }[]
}[] = [
  {
    id: 'flow-login-roles',
    title: '1 · Login + role lock',
    minutes: 5,
    loginAs: 'admin@ctasinfo.com then finance@rugos.in',
    steps: [
      { do: 'Open /login — click Super Admin chip — Sign in', expect: 'My day home + full sidebar', link: '/login' },
      { do: 'Sign out → login as Finance', expect: 'No Packing / Tenants / Shipping Desk in sidebar', link: '/login' },
      { do: 'Try URL /packing while Finance', expect: 'Redirect home — deep-link blocked', link: '/packing' },
    ],
  },
  {
    id: 'flow-saas',
    title: '2 · Multi-tenant SaaS',
    minutes: 8,
    loginAs: 'admin@ctasinfo.com',
    steps: [
      { do: 'Open Tenants — list shows Restoration + Demo B', expect: '2 tenants visible', link: '/tenants' },
      { do: 'Create a test tenant (name + admin email + temp password)', expect: 'Green success with temp password shown', link: '/tenants' },
      { do: 'Open Billing — switch Starter → Growth → Enterprise', expect: 'Modules chips update', link: '/billing' },
      {
        do: 'Logout → login admin@demo-b.rugos.test',
        expect: 'Header = Demo Rugs Co; Inventory only TENANT-B-ONLY',
        link: '/login',
      },
    ],
  },
  {
    id: 'flow-marketplace',
    title: '3 · Marketplace sandbox sync',
    minutes: 5,
    loginAs: 'admin@ctasinfo.com',
    steps: [
      { do: 'Integrations → Shopify Connect (any test key) → Test → Sync now', expect: 'Imported 2 sample orders', link: '/integrations' },
      { do: 'Open Orders — find SHO-… rows', expect: 'Channel Shopify / source shopify_sync', link: '/orders' },
      { do: 'Optional: Amazon Sync now', expect: 'AMZ-… orders appear', link: '/integrations' },
    ],
  },
  {
    id: 'flow-warehouse',
    title: '4 · Pack → Ship (ops floor)',
    minutes: 10,
    loginAs: 'vikram@rugos.in (or admin)',
    steps: [
      { do: 'Packing Station — pick queue order — scan WRONG sku', expect: 'Mismatch error (blocked)', link: '/packing' },
      { do: 'Scan correct SKU — Snap photo (optional) — Confirm packed', expect: 'Status Packed', link: '/packing' },
      { do: 'Shipping Desk — Get rates — select service — Buy label & print', expect: 'AWB + label tab opens', link: '/shipping' },
      { do: 'Paste AWB → Track', expect: 'In Transit + event timeline', link: '/shipping' },
    ],
  },
  {
    id: 'flow-planning',
    title: '5 · Buy sheet → Draft PO',
    minutes: 4,
    loginAs: 'scm@rugos.in or admin',
    steps: [
      { do: 'Buy Sheet → Add 2–3 SKUs → set qty → Create draft PO', expect: 'PO-BUY-… Draft created', link: '/buy-sheet' },
      { do: 'Open Purchase Orders', expect: 'New Draft PO visible', link: '/purchase-orders' },
    ],
  },
  {
    id: 'flow-rbac-users',
    title: '6 · Users & RBAC live edit',
    minutes: 3,
    loginAs: 'admin@ctasinfo.com',
    steps: [
      { do: 'Users — change a demo user role → Save', expect: 'Success toast; change persists after refresh', link: '/users' },
      { do: 'That user re-login', expect: 'Sidebar matches new role', link: '/login' },
    ],
  },
]

/** Department UAT scripts (P5) — short role walks */
export const UAT_CHECKLISTS: {
  role: string
  email: string
  steps: string[]
}[] = [
  {
    role: 'India Warehouse',
    email: 'vikram@rugos.in',
    steps: [
      'Login → My day cards load',
      'Packing Station → wrong SKU blocked → correct SKU → Packed',
      'Shipping Desk → rates → buy label → print',
      'Sidebar: no Finance / Tenants',
    ],
  },
  {
    role: 'Finance',
    email: 'finance@rugos.in',
    steps: [
      'Login → Receivables / Profitability open',
      'Packing Station hidden',
      'Cannot open /tenants',
    ],
  },
  {
    role: 'Super Admin',
    email: 'admin@ctasinfo.com',
    steps: [
      'Tenants + Billing + Integrations + Buy Sheet + Users all work',
      'Full test flow §1–6 on this page',
    ],
  },
  {
    role: 'Tenant B isolation',
    email: 'admin@demo-b.rugos.test',
    steps: [
      'Header shows Demo Rugs Co',
      'Only Tenant B SKU (TENANT-B-ONLY)',
      'No Restoration orders',
    ],
  },
]

/** What is already available in sandbox for Restoration */
export const SHIPPED = [
  {
    phase: 'P0',
    title: 'Foundation',
    items: [
      'Tenant model + default Restoration/Odette company',
      'tenantId on all resources + backfill',
      'API scoped by logged-in company',
    ],
  },
  {
    phase: 'P1',
    title: 'Login + RBAC',
    items: [
      'JWT login / me / logout · bcrypt passwords',
      '8 department roles + sidebar & API 403 lock',
      'Login page · demo chips · Header user + logout',
      'Department My-day home',
      'Users & RBAC page saves role to Mongo (`/users`)',
    ],
  },
  {
    phase: 'P2',
    title: 'Multi-company SaaS',
    items: [
      'Company isolation smoke + Tenant B demo user',
      'Platform Tenants create + admin temp password',
      'Billing plans + suspend → API 402',
      'Plan-based menu feature gates (Starter hides Integrations/Forecast)',
      'Header company name + plan',
    ],
  },
  {
    phase: 'P3',
    title: 'Marketplace (sandbox)',
    items: [
      'Encrypted credentials per company',
      'Integrations hub: Connect / Test / Sync / Disconnect',
      'Shopify + Amazon + Etsy sandbox → Orders',
    ],
  },
  {
    phase: 'P4',
    title: 'Warehouse ops',
    items: [
      'Shipping Desk: FedEx/DHL sandbox rate / label / track',
      'Labels on disk `/uploads/labels` (prod S3 = Restoration bucket)',
      'Packing Station: scan + photo + role lock',
      'Buy Sheet → Draft PO API',
    ],
  },
  {
    phase: 'P5',
    title: 'Hardening',
    items: [
      'Helmet + rate limits + CORS_ORIGINS',
      'Ops runbook (JWT rotate, Atlas restore steps)',
      'This Workflow page: logins, what is left, review walkthrough',
    ],
  },
]

/** Demo logins — shared password for all seeded users */
export const DEMO_PASSWORD = 'RugOS@2026'

export const DEMO_LOGINS = [
  { email: 'admin@ctasinfo.com', name: 'Ctas Admin', role: 'Super Admin', roleCode: 'super_admin' },
  { email: 'vikram@rugos.in', name: 'Vikram Singh', role: 'India Warehouse', roleCode: 'india_wh' },
  { email: 'j.gallagher@3pl-edison.com', name: 'John Gallagher', role: 'USA 3PL', roleCode: 'usa_wh' },
  { email: 'deepak.logistics@rugos.in', name: 'Deepak Sharma', role: 'Logistics', roleCode: 'logistics' },
  { email: 'finance@rugos.in', name: 'Sunita Agarwal', role: 'Finance', roleCode: 'finance' },
  { email: 'sales@rugos.in', name: 'Priya Mehta', role: 'Sales', roleCode: 'sales' },
  { email: 'scm@rugos.in', name: 'Amit Planner', role: 'SCM / Planning', roleCode: 'scm' },
  { email: 'auditor@rugos.in', name: 'Neha Auditor', role: 'Auditor (read-only)', roleCode: 'auditor' },
  {
    email: 'admin@demo-b.rugos.test',
    name: 'Tenant B Admin',
    role: 'Super Admin (Tenant B)',
    roleCode: 'super_admin',
  },
]

/**
 * One demo user per department for Restoration review:
 * menus visible, CRUD allowed, and blocked areas.
 * Shared password: DEMO_PASSWORD.
 */
export type DeptUserGuide = {
  department: string
  roleCode: string
  name: string
  email: string
  password: string
  seesMenus: string[]
  canCrud: { resource: string; path: string; actions: string }[]
  specialActions: string[]
  cannot: string[]
  reviewTip: string
}

export const DEPARTMENT_USERS: DeptUserGuide[] = [
  {
    department: 'Super Admin / Management',
    roleCode: 'super_admin',
    name: 'Ctas Admin',
    email: 'admin@ctasinfo.com',
    password: DEMO_PASSWORD,
    seesMenus: ['All menus (Dashboard, Workflow, Tenants, Users, Billing, Integrations, …)'],
    canCrud: [
      { resource: 'SKUs / Inventory', path: '/inventory', actions: 'Add · Edit · Delete' },
      { resource: 'Orders', path: '/orders', actions: 'Add · Edit · Delete' },
      { resource: 'Buyers, POs, MTO, Transfers, …', path: '/buyers', actions: 'Full CRUD on all masters' },
      { resource: 'Users & roles', path: '/users', actions: 'Change roleCode (save to Mongo)' },
      { resource: 'Tenants', path: '/tenants', actions: 'Create company + admin temp password' },
    ],
    specialActions: [
      'Billing plan switch / suspend',
      'Integrations Connect → Sync now',
      'Shipping Desk buy label',
      'Packing Station confirm',
      'Buy Sheet → Draft PO',
    ],
    cannot: ['Nothing blocked inside own tenant (except other tenants’ private data)'],
    reviewTip: 'Primary Restoration demo login — walk the full test flow (sections 1–6).',
  },
  {
    department: 'India Warehouse / Mill',
    roleCode: 'india_wh',
    name: 'Vikram Singh',
    email: 'vikram@rugos.in',
    password: DEMO_PASSWORD,
    seesMenus: [
      'My day home',
      'Inventory',
      'MTO',
      'Purchase Orders',
      'Stock Transfers',
      'Looms',
      'Shipping Desk',
      'Packing Station',
      'Loading Plans',
      'Export Docs',
      'Raw Materials',
      'Stock History',
      'Alerts',
    ],
    canCrud: [
      { resource: 'SKUs', path: '/inventory', actions: 'Add · Edit · Delete' },
      { resource: 'MTO jobs', path: '/mto', actions: 'Add · Edit · Delete' },
      { resource: 'Purchase Orders', path: '/purchase-orders', actions: 'Add · Edit · Delete' },
      { resource: 'Stock Transfers', path: '/stock-transfers', actions: 'Add · Edit · Delete' },
      { resource: 'Looms / Loading / Export / Raw', path: '/looms', actions: 'Add · Edit · Delete' },
    ],
    specialActions: [
      'Packing: scan SKU + photo → Packed',
      'Shipping Desk: Rate → Buy label → Track',
    ],
    cannot: [
      'Finance menus (Receivables, Profitability)',
      'Tenants / Users admin',
      'Sales Buyers-only screens if not in menu',
    ],
    reviewTip: 'Sign in → Packing: wrong SKU must fail → correct SKU packs → Shipping: buy label.',
  },
  {
    department: 'USA 3PL Warehouse',
    roleCode: 'usa_wh',
    name: 'John Gallagher',
    email: 'j.gallagher@3pl-edison.com',
    password: DEMO_PASSWORD,
    seesMenus: [
      'Inventory',
      'Orders',
      'Stock Transfers',
      'Warehouses',
      'Returns',
      'Packing',
      'Shipping',
      'Stock History',
      'Alerts',
    ],
    canCrud: [
      { resource: 'SKUs', path: '/inventory', actions: 'Add · Edit · Delete' },
      { resource: 'Orders', path: '/orders', actions: 'Add · Edit · Delete' },
      { resource: 'Transfers / Warehouses / Returns', path: '/warehouses', actions: 'Add · Edit · Delete' },
    ],
    specialActions: ['Receive transfers', 'Pack marketplace orders', 'Buy shipping label'],
    cannot: ['India mill cost / Finance / Tenants / Users'],
    reviewTip: 'Edit an Order status → Packing confirm → label for US ZIP.',
  },
  {
    department: 'Logistics / Export',
    roleCode: 'logistics',
    name: 'Deepak Sharma',
    email: 'deepak.logistics@rugos.in',
    password: DEMO_PASSWORD,
    seesMenus: [
      'Shipping Desk',
      'Packing',
      'Loading Plans',
      'Carriers',
      'Courier Audit',
      'Stock Transfers',
      'Export Docs',
      'Alerts',
    ],
    canCrud: [
      { resource: 'Carriers', path: '/carriers', actions: 'Add · Edit · Delete' },
      { resource: 'Loading Plans', path: '/loading-plans', actions: 'Add · Edit · Delete' },
      { resource: 'Courier Audit', path: '/courier-audit', actions: 'Add · Edit · Delete' },
      { resource: 'Export Docs / Transfers', path: '/export-docs', actions: 'Add · Edit · Delete' },
    ],
    specialActions: ['Sandbox FedEx/DHL Rate → Label → Track'],
    cannot: ['Inventory master delete? (no Inventory menu)', 'Finance / Users / Tenants'],
    reviewTip: 'Add a Carrier row → Shipping Desk buy label → Courier Audit edit invoice.',
  },
  {
    department: 'Finance / Accounts',
    roleCode: 'finance',
    name: 'Sunita Agarwal',
    email: 'finance@rugos.in',
    password: DEMO_PASSWORD,
    seesMenus: [
      'Receivables',
      'Profitability',
      'Reports',
      'Currencies',
      'Courier Audit',
      'Returns',
      'Alerts',
      'Billing',
    ],
    canCrud: [
      { resource: 'Receivables', path: '/receivables', actions: 'Add · Edit · Delete' },
      { resource: 'Profitability (monthly)', path: '/profitability', actions: 'Add · Edit · Delete' },
      { resource: 'Reports (yearly)', path: '/reports', actions: 'Add · Edit · Delete' },
      { resource: 'Currencies', path: '/currencies', actions: 'Add · Edit · Delete' },
      { resource: 'Returns / Courier Audit', path: '/returns', actions: 'Add · Edit · Delete' },
    ],
    specialActions: ['View Billing plan (Super Admin switches plan)'],
    cannot: ['Packing Station', 'Tenants', 'Users', 'Inventory CRUD (no menu)'],
    reviewTip: 'Add a receivable → Edit → Delete. Opening /packing should redirect home.',
  },
  {
    department: 'Sales / Marketplace',
    roleCode: 'sales',
    name: 'Priya Mehta',
    email: 'sales@rugos.in',
    password: DEMO_PASSWORD,
    seesMenus: ['Orders', 'Buyers', 'Returns', 'Alerts', 'Billing'],
    canCrud: [
      { resource: 'Orders', path: '/orders', actions: 'Add · Edit · Delete' },
      { resource: 'Buyers', path: '/buyers', actions: 'Add · Edit · Delete' },
      { resource: 'Returns', path: '/returns', actions: 'Add · Edit · Delete' },
      { resource: 'Alerts', path: '/alerts', actions: 'View / wireframe + API read-write alerts' },
    ],
    specialActions: ['Create marketplace-style order manually for demo'],
    cannot: ['Shipping Desk', 'Packing', 'Finance reports', 'Tenants'],
    reviewTip: 'Orders → Add → Edit status → Delete a test row. Repeat for Buyers.',
  },
  {
    department: 'Planning / SCM',
    roleCode: 'scm',
    name: 'Amit Planner',
    email: 'scm@rugos.in',
    password: DEMO_PASSWORD,
    seesMenus: [
      'Demand Forecast',
      'Buy Sheet → PO',
      'Alerts',
      'Warehouse Analytics',
      'Inventory',
      'Purchase Orders',
      'Raw Materials',
      'Billing',
    ],
    canCrud: [
      { resource: 'SKUs', path: '/inventory', actions: 'Add · Edit · Delete' },
      { resource: 'Purchase Orders', path: '/purchase-orders', actions: 'Add · Edit · Delete' },
      { resource: 'Raw Materials', path: '/raw-materials', actions: 'Add · Edit · Delete' },
    ],
    specialActions: ['Buy Sheet → Create Draft PO (multi-line)'],
    cannot: ['Packing / Shipping ops floor', 'Tenants / Users'],
    reviewTip: 'Buy Sheet: add 2 SKUs → create Draft PO → open Purchase Orders → Edit the PO.',
  },
  {
    department: 'Statutory Auditor',
    roleCode: 'auditor',
    name: 'Neha Auditor',
    email: 'auditor@rugos.in',
    password: DEMO_PASSWORD,
    seesMenus: [
      'System Logs',
      'Reports',
      'Courier Audit',
      'Receivables',
      'Profitability',
      'Billing (view)',
    ],
    canCrud: [
      {
        resource: 'All allowed screens',
        path: '/receivables',
        actions: 'READ ONLY — Add/Edit/Delete buttons hidden; API write returns 403',
      },
    ],
    specialActions: ['Review audit trail / reports for compliance'],
    cannot: ['Any create / update / delete', 'Packing', 'Users', 'Tenants'],
    reviewTip: 'Open Receivables — View only. Add / Edit / Delete controls should be hidden.',
  },
  {
    department: 'Tenant B (isolation demo)',
    roleCode: 'super_admin',
    name: 'Tenant B Admin',
    email: 'admin@demo-b.rugos.test',
    password: DEMO_PASSWORD,
    seesMenus: ['Full Super Admin menus — but only Tenant B data'],
    canCrud: [
      {
        resource: 'Inventory',
        path: '/inventory',
        actions: 'CRUD only on Tenant B rows (e.g. TENANT-B-ONLY)',
      },
    ],
    specialActions: ['Prove SaaS isolation vs Restoration tenant'],
    cannot: ['See Restoration Rugs catalog / orders'],
    reviewTip: 'Compare inventory with admin@ctasinfo.com — catalogs must differ (tenant isolation).',
  },
]

/* ============================================================================
   DEVELOPMENT ROADMAP — build order for SaaS + role lock + live APIs
   Use this as the build checklist. Do phases in order (P0 → P5).
   ============================================================================ */

export type TaskSide = 'backend' | 'frontend' | 'both' | 'ops'

export type DevTask = {
  id: string
  title: string
  side: TaskSide
  done?: boolean
}

export type DevEpic = {
  id: string
  title: string
  plain: string
  outcome: string
  dependsOn: string[]
  estimateDays: number
  menusTouched: string[]
  acceptance: string[]
  tasks: DevTask[]
}

export type DevPhase = {
  id: string
  phase: number
  code: string
  title: string
  plain: string
  whyOrder: string
  epics: DevEpic[]
}

export const DEV_ROADMAP: DevPhase[] = [
  {
    id: 'p0',
    phase: 0,
    code: 'P0',
    title: 'Foundation lock',
    plain: 'Freeze what already works, then add auth on top — without breaking menus.',
    whyOrder: 'Login/tenant code must sit under every API. Build this before marketplace sync.',
    epics: [
      {
        id: 'p0-audit',
        title: 'Baseline audit of live wireframe ↔ API',
        plain: 'List which screens already hit Mongo vs seed-only UI.',
        outcome: 'A written matrix: menu → API resource → status.',
        dependsOn: [],
        estimateDays: 2,
        menusTouched: ['/workflow', 'All menus'],
        acceptance: [
          'Every sidebar path marked live / partial / planned',
          'Backend RESOURCES list matches frontend keys',
          'Known gaps logged (e.g. packing photo upload)',
        ],
        tasks: [
          { id: 'p0-a1', title: 'Export menu × API matrix into docs or Workflow page', side: 'both', done: true },
          { id: 'p0-a2', title: 'Smoke-test CRUD on skus, orders, alerts, automations', side: 'both', done: true },
          { id: 'p0-a3', title: 'Document env vars (MONGODB_URI, VITE_API_URL, Render)', side: 'ops', done: true },
        ],
      },
      {
        id: 'p0-tenant-model',
        title: 'Tenant (company) data model',
        plain: 'Every business record belongs to one companyId / tenantId.',
        outcome: 'Mongo collections can filter by tenant; seed has at least 1 demo tenant.',
        dependsOn: ['p0-audit'],
        estimateDays: 3,
        menusTouched: ['/company'],
        acceptance: [
          'tenants collection with name, slug, plan, status',
          'All resource documents accept tenantId',
          'Generic resource routes can scope by tenantId',
        ],
        tasks: [
          { id: 'p0-t1', title: 'Add Tenant model + seed Restoration/Odette demo tenant', side: 'backend', done: true },
          { id: 'p0-t2', title: 'Add tenantId to createResourceModel / sanitize payload', side: 'backend', done: true },
          { id: 'p0-t3', title: 'Backfill existing Atlas docs with default tenantId', side: 'ops', done: true },
        ],
      },
    ],
  },
  {
    id: 'p1',
    phase: 1,
    code: 'P1',
    title: 'Login + Users + Role lock',
    plain: 'People sign in. Each role only sees allowed menus and can only call allowed APIs.',
    whyOrder: 'Without this, SaaS and live APIs are unsafe (anyone can hit everything).',
    epics: [
      {
        id: 'p1-auth',
        title: 'Authentication (login / logout / session)',
        plain: 'Email + password (or magic link later). JWT or httpOnly cookie session.',
        outcome: 'Unauthenticated users cannot open ERP routes or call /api/*.',
        dependsOn: ['p0-tenant-model'],
        estimateDays: 5,
        menusTouched: ['/users', 'new /login'],
        acceptance: [
          'POST /api/auth/login returns token + user + role + tenant',
          'Frontend stores session and redirects guests to /login',
          'Logout clears session; refresh keeps user logged in',
        ],
        tasks: [
          { id: 'p1-a1', title: 'Backend: users password hash (bcrypt), JWT sign/verify middleware', side: 'backend', done: true },
          { id: 'p1-a2', title: 'Routes: /auth/login, /auth/me, /auth/logout', side: 'backend', done: true },
          { id: 'p1-a3', title: 'Frontend Login page + AuthContext wrapping App', side: 'frontend', done: true },
          { id: 'p1-a4', title: 'api/client.ts attaches Authorization header', side: 'frontend', done: true },
          { id: 'p1-a5', title: 'Protect React routes; wireframe host only after auth', side: 'frontend', done: true },
        ],
      },
      {
        id: 'p1-rbac',
        title: 'Role lock (RBAC enforced)',
        plain: 'Users & RBAC matrix becomes real — sidebar + API both respect permissions.',
        outcome: 'India WH cannot open Finance; Finance cannot delete warehouse masters.',
        dependsOn: ['p1-auth'],
        estimateDays: 5,
        menusTouched: ['/users', 'Sidebar'],
        acceptance: [
          'Roles: Super Admin, India WH, USA WH, Logistics, Finance, Sales, Auditor, SCM',
          'Permission map: role → menu paths + actions (read/write/delete)',
          'API returns 403 when role lacks permission',
          'Sidebar hides unauthorized menus',
        ],
        tasks: [
          { id: 'p1-r1', title: 'Define ROLE_PERMISSIONS constant (path + action)', side: 'both', done: true },
          { id: 'p1-r2', title: 'Backend requirePermission(resource, action) middleware', side: 'backend', done: true },
          { id: 'p1-r3', title: 'Frontend filter NAV_SECTIONS by user.permissions', side: 'frontend', done: true },
          { id: 'p1-r4', title: 'Users & RBAC page edits save to Mongo and apply live', side: 'both', done: true },
          { id: 'p1-r5', title: 'Seed demo users per department (password documented)', side: 'ops', done: true },
        ],
      },
      {
        id: 'p1-dept-home',
        title: 'Department home screens',
        plain: 'After login, each role lands on a simple “My day” page — not full ERP dump.',
        outcome: 'Layman opens app and knows what to do in 10 seconds.',
        dependsOn: ['p1-rbac'],
        estimateDays: 4,
        menusTouched: ['/', '/workflow'],
        acceptance: [
          'Role-specific home: 3–5 cards + today’s tasks + link to menus',
          'Super Admin still sees full Dashboard',
          'Mobile-friendly layout',
        ],
        tasks: [
          { id: 'p1-d1', title: 'Home router: role → DepartmentHome component', side: 'frontend', done: true },
          { id: 'p1-d2', title: 'Cards pull real counts (orders pending, alerts, POs)', side: 'frontend', done: true },
          { id: 'p1-d3', title: 'Deep-link buttons into existing wireframe menus', side: 'frontend', done: true },
        ],
      },
    ],
  },
  {
    id: 'p2',
    phase: 2,
    code: 'P2',
    title: 'Multi-tenant SaaS core',
    plain: 'Many Restoration-style companies on one app. Data never leaks across tenants.',
    whyOrder: 'Needed before selling RugOS; must exist before billing.',
    epics: [
      {
        id: 'p2-isolation',
        title: 'Tenant isolation on every query',
        plain: 'All list/create/update/delete auto-filter by req.user.tenantId.',
        outcome: 'Tenant A never sees Tenant B skus/orders even if they guess IDs.',
        dependsOn: ['p1-auth', 'p0-tenant-model'],
        estimateDays: 4,
        menusTouched: ['All API resources'],
        acceptance: [
          'resourceController always scopes by tenantId',
          'Cross-tenant ID access returns 404/403',
          'Integration tests with 2 tenants',
        ],
        tasks: [
          { id: 'p2-i1', title: 'Inject tenantId in resourceController list/create', side: 'backend', done: true },
          { id: 'p2-i2', title: 'Indexes: { tenantId: 1, sku: 1 } etc.', side: 'backend', done: true },
          { id: 'p2-i3', title: 'Smoke script: two tenants, assert isolation', side: 'ops', done: true },
        ],
      },
      {
        id: 'p2-onboarding',
        title: 'Tenant onboarding & company switcher',
        plain: 'Create a new company; invite first admin; optional brand name/logo.',
        outcome: 'Ops can spin up a new SaaS company in minutes.',
        dependsOn: ['p2-isolation'],
        estimateDays: 5,
        menusTouched: ['/company', '/tenants'],
        acceptance: [
          'Super-platform admin can create tenants',
          'New tenant gets empty masters + sample optional seed',
          'Company page edits only own tenant profile',
        ],
        tasks: [
          { id: 'p2-o1', title: 'POST /api/tenants + invite admin email flow (or temp password)', side: 'backend', done: true },
          { id: 'p2-o2', title: 'Platform Tenants admin UI (internal)', side: 'frontend', done: true },
          { id: 'p2-o3', title: 'Header shows company name; no cross-tenant switch for normal users', side: 'frontend', done: true },
        ],
      },
      {
        id: 'p2-billing',
        title: 'Billing & subscriptions',
        plain: 'Plans (Starter / Growth / Enterprise), seats, module flags, Stripe (or Razorpay).',
        outcome: 'Tenant unpaid → read-only or locked; paid → full modules.',
        dependsOn: ['p2-onboarding'],
        estimateDays: 6,
        menusTouched: ['/billing', '/settings'],
        acceptance: [
          'Plan stored on tenant; module entitlements (forecast, export, etc.)',
          'Checkout + webhook updates subscription status',
          'UI shows plan / renew date; middleware blocks if suspended',
        ],
        tasks: [
          { id: 'p2-b1', title: 'Tenant.plan, seats, modules[], billingStatus fields', side: 'backend', done: true },
          { id: 'p2-b2', title: 'Stripe/Razorpay checkout + webhook endpoint', side: 'backend' },
          { id: 'p2-b3', title: 'Billing settings page for tenant admin', side: 'frontend', done: true },
          { id: 'p2-b4', title: 'Feature gate: hide menus not in plan', side: 'frontend', done: true },
        ],
      },
    ],
  },
  {
    id: 'p3',
    phase: 3,
    code: 'P3',
    title: 'Live marketplace APIs',
    plain: 'Orders and stock sync from Amazon / Shopify / Etsy without CSV.',
    whyOrder: 'Needs tenant + auth so credentials stay per company and private.',
    epics: [
      {
        id: 'p3-connectors',
        title: 'Connector framework',
        plain: 'Store API keys per tenant; worker pulls/pushes; failed jobs retry.',
        outcome: 'Integrations page shows real connection status per channel.',
        dependsOn: ['p2-isolation', 'p1-rbac'],
        estimateDays: 5,
        menusTouched: ['/integrations', '/failed-jobs'],
        acceptance: [
          'Encrypted secrets store (not plain .env for company keys)',
          'Worker heartbeat + last sync time in DB',
          'Failed job retry from UI works',
        ],
        tasks: [
          { id: 'p3-c1', title: 'integration_credentials collection (tenant-scoped, encrypted)', side: 'backend', done: true },
          { id: 'p3-c2', title: 'Job runner (cron or queue) with idempotent keys', side: 'backend', done: true },
          { id: 'p3-c3', title: 'Integrations UI: connect / disconnect / test', side: 'frontend', done: true },
        ],
      },
      {
        id: 'p3-shopify',
        title: 'Shopify order + inventory sync',
        plain: 'Pull new orders into Orders; push USA available qty to Shopify.',
        outcome: 'Demo store shows RugOS stock within minutes of change.',
        dependsOn: ['p3-connectors'],
        estimateDays: 5,
        menusTouched: ['/orders', '/inventory', '/integrations'],
        acceptance: [
          'Webhook or poll creates Order rows with channel=Shopify',
          'Stock push for mapped SKUs',
          'Mapping exceptions list when SKU not found',
        ],
        tasks: [
          { id: 'p3-s1', title: 'Shopify OAuth / Admin API (needs Restoration store keys)', side: 'backend' },
          { id: 'p3-s2', title: 'Order ingest → normalize to AppState/API order shape', side: 'backend', done: true },
          { id: 'p3-s3', title: 'Inventory push job + UI mapping table (needs Restoration keys)', side: 'both' },
        ],
      },
      {
        id: 'p3-amazon',
        title: 'Amazon SP-API orders (phase-1 read)',
        plain: 'Import Amazon orders; later: inventory feed.',
        outcome: 'Amazon orders appear in Order Pipeline with marketplace IDs.',
        dependsOn: ['p3-connectors'],
        estimateDays: 7,
        menusTouched: ['/orders', '/integrations'],
        acceptance: [
          'SP-API credentials per tenant',
          'Order import job documented',
          'Manual “Sync now” button',
        ],
        tasks: [
          { id: 'p3-am1', title: 'SP-API auth + orders list (needs Restoration Amazon keys)', side: 'backend' },
          { id: 'p3-am2', title: 'Normalize Amazon order → RugOS order', side: 'backend', done: true },
          { id: 'p3-am3', title: 'UI status + last error on Integrations', side: 'frontend', done: true },
        ],
      },
    ],
  },
  {
    id: 'p4',
    phase: 4,
    code: 'P4',
    title: 'Live courier + warehouse ops',
    plain: 'Real labels, tracking, packing proof — ops on the warehouse floor.',
    whyOrder: 'After orders flow in automatically, shipping must leave the planner stage.',
    epics: [
      {
        id: 'p4-courier',
        title: 'FedEx / DHL rate + label + track',
        plain: 'From Shipping screen: get rates, buy label, poll tracking.',
        outcome: 'AWB number and label PDF stored on shipment; status updates.',
        dependsOn: ['p1-auth', 'p2-isolation'],
        estimateDays: 7,
        menusTouched: ['/shipping', '/carriers', '/courier-audit'],
        acceptance: [
          'Create shipment API returns tracking number + label URL',
          'Tracking events append to shipment timeline',
          'Courier Audit can compare billed vs booked weight when invoice CSV imported',
        ],
        tasks: [
          { id: 'p4-c1', title: 'Carrier adapter interface (FedEx first)', side: 'backend', done: true },
          { id: 'p4-c2', title: 'Ship / label / track endpoints tenant-scoped', side: 'backend', done: true },
          { id: 'p4-c3', title: 'Shipping UI: Rate → Buy label → Print', side: 'frontend', done: true },
          { id: 'p4-c4', title: 'Store labels locally (/uploads); S3 when Restoration provides bucket', side: 'ops', done: true },
        ],
      },
      {
        id: 'p4-packing',
        title: 'Barcode + photo packing',
        plain: 'Packer scans SKU/order; snaps photo; status → Packed.',
        outcome: 'Fewer wrong rugs shipped; disputes have photo proof.',
        dependsOn: ['p1-rbac'],
        estimateDays: 5,
        menusTouched: ['/packing', '/orders'],
        acceptance: [
          'Mobile-friendly packing screen',
          'Photo upload tied to order/pack line',
          'Scan mismatch blocks confirm',
        ],
        tasks: [
          { id: 'p4-p1', title: 'Packing station page (camera + scan input)', side: 'frontend', done: true },
          { id: 'p4-p2', title: 'Upload API + storage; link to order', side: 'backend', done: true },
          { id: 'p4-p3', title: 'India WH / USA WH role-only access', side: 'both', done: true },
        ],
      },
      {
        id: 'p4-forecast-po',
        title: 'Buy sheet → draft PO',
        plain: 'Demand Forecast “Build buy sheet” creates real purchase_orders rows.',
        outcome: 'Planner closes the loop without retyping SKUs.',
        dependsOn: ['p1-auth'],
        estimateDays: 3,
        menusTouched: ['/buy-sheet', '/purchase-orders', '/forecast'],
        acceptance: [
          'Selected SKUs create one PO with lines',
          'PO visible in Purchase Orders with status Draft',
          'Audit log entry created',
        ],
        tasks: [
          { id: 'p4-f1', title: 'API: POST /purchase_orders/from-buy-sheet', side: 'backend', done: true },
          { id: 'p4-f2', title: 'Wire raOpenBuySheetModal confirm → API', side: 'frontend', done: true },
        ],
      },
    ],
  },
  {
    id: 'p5',
    phase: 5,
    code: 'P5',
    title: 'Hardening & go-live',
    plain: 'Security, backups, monitoring, UAT — then production tenants.',
    whyOrder: 'Last mile after features work in staging.',
    epics: [
      {
        id: 'p5-secure',
        title: 'Security & compliance checklist',
        plain: 'Rate limits, HTTPS only, secrets rotation, audit logs retained.',
        outcome: 'Pass basic pen-test / Restoration security questionnaire.',
        dependsOn: ['p2-billing', 'p3-connectors'],
        estimateDays: 4,
        menusTouched: ['/system-logs'],
        acceptance: [
          'Rate limit auth + public webhooks',
          'No secrets in frontend bundle',
          'Audit trail for login, permission change, money actions',
        ],
        tasks: [
          { id: 'p5-s1', title: 'Helmet, rate-limit, CORS lock to FE domains', side: 'backend', done: true },
          { id: 'p5-s2', title: 'Rotate JWT secret; document ops runbook', side: 'ops', done: true },
          { id: 'p5-s3', title: 'Backup + restore drill for Atlas', side: 'ops' },
        ],
      },
      {
        id: 'p5-uat',
        title: 'Department UAT scripts',
        plain: 'Each department walks their Workflow journey with real logins.',
        outcome: 'Signed-off checklist per role before first paying tenant.',
        dependsOn: ['p1-dept-home', 'p4-courier'],
        estimateDays: 3,
        menusTouched: ['/workflow'],
        acceptance: [
          'UAT script per department linked from Workflow page',
          'Bugs triaged P0/P1/P2',
          'Production cutover plan written',
        ],
        tasks: [
          { id: 'p5-u1', title: 'Write UAT checklists into Workflow → Build roadmap', side: 'frontend', done: true },
          { id: 'p5-u2', title: 'Run UAT with India WH + Finance demo users', side: 'ops' },
          { id: 'p5-u3', title: 'Production Render/Atlas env + first tenant onboard', side: 'ops' },
        ],
      },
    ],
  },
]

export function roadmapTotals() {
  const epics = DEV_ROADMAP.flatMap((p) => p.epics)
  const tasks = epics.flatMap((e) => e.tasks)
  const days = epics.reduce((s, e) => s + e.estimateDays, 0)
  const shipped = tasks.filter((t) => t.done).length
  return { phases: DEV_ROADMAP.length, epics: epics.length, tasks: tasks.length, days, shipped }
}

/** Task ids already marked done in DEV_ROADMAP (seed browser checklist) */
export function shippedTaskIds(): string[] {
  return DEV_ROADMAP.flatMap((p) => p.epics.flatMap((e) => e.tasks.filter((t) => t.done).map((t) => t.id)))
}

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
