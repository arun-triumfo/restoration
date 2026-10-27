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
    title: 'Login as India WH',
    plain: 'india@restoration.com / RugOS@2026 — Orders open pehle.',
    detail:
      'Search ORD-DEMO for seeded client tests. A=US stock, B=India ship, C=Make, D=Offline+Finance.',
    menuPath: '/orders',
    menuLabel: 'Orders',
    department: 'India Warehouse Manager',
    status: 'live',
  },
  {
    id: 'j2',
    step: 2,
    title: 'A · US available',
    plain: 'ORD-DEMO-A-US → Zap barcode → order US bucket mein.',
    detail:
      'Inventory SKU-DEMO-US-STOCK has usaAvailable. After barcode, logout → usa@restoration.com → Packing → customer dispatch.',
    menuPath: '/orders',
    menuLabel: 'Orders → Packing (US login)',
    department: 'India then US WH',
    status: 'live',
  },
  {
    id: 'j3',
    step: 3,
    title: 'B · US empty, India has stock',
    plain: 'ORD-DEMO-B-INDIA → Truck = Ship India→US → In Transit.',
    detail:
      'Then usa@restoration.com → Receive (package icon) → Packing → customer. Or Stock Transfers + Shipping Desk.',
    menuPath: '/orders',
    menuLabel: 'Orders → Shipping',
    department: 'India then US WH',
    status: 'live',
  },
  {
    id: 'j4',
    step: 4,
    title: 'C · No stock anywhere (make)',
    plain: 'ORD-DEMO-C-MAKE = In Process + ETA → Package = Production Complete.',
    detail: 'Then Truck ship India→US same as B. Optional: open MTO Jobs / Buy Sheet for mill work.',
    menuPath: '/mto',
    menuLabel: 'Orders → MTO',
    department: 'India Warehouse Manager',
    status: 'live',
  },
  {
    id: 'j5',
    step: 5,
    title: 'D · Offline + Finance tag',
    plain: 'ORD-DEMO-D-OFFLINE shows Finance badge — India→US same as B.',
    detail: 'finance@restoration.com → Orders (Finance badge) → Profitability / Courier Audit / Export Docs.',
    menuPath: '/profitability',
    menuLabel: 'Orders → Finance',
    department: 'India + Finance',
    status: 'live',
  },
  {
    id: 'j6',
    step: 6,
    title: 'Returns (US login)',
    plain: 'Customer return → Returns menu under US Warehouse Manager.',
    detail: 'usa@restoration.com → Returns → add RMA → grade / restock.',
    menuPath: '/returns',
    menuLabel: 'Returns',
    department: 'US Warehouse Manager',
    status: 'live',
  },
  {
    id: 'j7',
    step: 7,
    title: 'Masters & integrations (optional)',
    plain: 'Company, Users, Warehouses, Integrations — sidebar bottom.',
    detail: 'Super Admin only for keys. Daily ops never start from Masters.',
    menuPath: '/integrations',
    menuLabel: 'Masters → Integrations',
    department: 'Super Admin',
    status: 'live',
  },
]

export const DEPARTMENTS: DepartmentGuide[] = [
  {
    id: 'mgmt',
    role: 'Super Admin / Management',
    emoji: '👔',
    plain: 'Full ERP + SaaS admin. Demo user: Restoration Admin.',
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
    plain: 'Orders & buyers. Demo: India Warehouse Manager (india@restoration.com).',
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
    plain: 'Mill + pack + export. Demo: India Warehouse Manager (india@restoration.com).',
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
    plain: 'Receive + pick/pack US. Demo: US Warehouse Manager.',
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
    plain: 'Money in/out. Demo: Finance Manager (finance@restoration.com).',
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
    plain: 'Forecast + buy. Demo: India Warehouse Manager (india@restoration.com).',
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
  /** What Restoration has already shared, if anything */
  received?: string
  priority?: boolean
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
    readyNow:
      'Admin pastes Key ID + Secret on Integrations → Razorpay (Live). Test pings Razorpay; Pay on Billing opens checkout. Webhook URL is /api/webhooks/razorpay.',
    received:
      'Razorpay dashboard login shared. Next: generate Key ID + Key Secret from that dashboard and paste them on Integrations.',
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
    readyNow:
      'Admin pastes shop domain + Admin API token on Integrations → Shopify (Live). Test pings the shop; Sync now pulls live orders with SKU images.',
    received:
      'Store website (odetterugs.com) and Shopify login shared. Next: create a custom app and paste the shpat_ token plus xxx.myshopify.com on Integrations.',
  },
  {
    title: 'Aramex / Shiprocket / ShipGlobal.in (priority couriers)',
    whyLeft:
      'Set up first, ahead of FedEx / DHL. Waiting on API-enabled user IDs for each courier account.',
    area: 'Shipping',
    priority: true,
    provide: [
      'Shiprocket: API user email + password (Settings → API → Configure)',
      'Aramex: username, password, account number, account PIN, account entity + country',
      'ShipGlobal.in: integration user ID + API key / password',
    ],
    readyNow:
      'Admin pastes courier user ID + password on Integrations (Live). Test logs into the courier. Shipping Desk then uses live rates / labels for that carrier.',
    received: 'User IDs and passwords are being shared — paste them on Integrations when ready.',
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
    readyNow:
      'Admin pastes LWA App ID, secret and refresh token on Integrations → Amazon (Live). Test exchanges the token; Sync now pulls SP-API orders.',
  },
  {
    title: 'Etsy / Walmart / other channels (optional)',
    whyLeft: 'Optional — only if Restoration wants those channels live.',
    area: 'Marketplace',
    provide: ['API keys / OAuth apps per channel', 'SKU mapping rules'],
    readyNow:
      'Admin pastes shop id + API key + OAuth token on Integrations → Etsy (Live). Test and Sync use the Etsy Open API.',
  },
  {
    title: 'FedEx / DHL (live courier)',
    whyLeft:
      'Waiting on Restoration carrier account credentials for real AWBs. Scheduled after the priority couriers above.',
    area: 'Shipping',
    provide: [
      'FedEx account + API key / secret (or DHL Express credentials)',
      'Meter number / account ZIP',
      'Optional: cloud storage bucket for production label files',
    ],
    readyNow:
      'Admin pastes FedEx / DHL API keys on Integrations (Live). Shipping Desk switches that carrier to live rates and labels automatically.',
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

/** End-to-end test steps for Restoration owners — seed ORD-DEMO-* first */
export const FULL_TEST_FLOW: {
  id: string
  title: string
  minutes: number
  loginAs: string
  steps: { do: string; expect: string; link?: string }[]
}[] = [
  {
    id: 'flow-seed-check',
    title: '0 · Find demo pending orders',
    minutes: 2,
    loginAs: 'india@restoration.com / RugOS@2026',
    steps: [
      {
        do: 'Orders → search ORD-DEMO',
        expect: 'See A-US, B-INDIA, C-MAKE, D-OFFLINE in India queue',
        link: '/orders',
      },
      {
        do: 'Inventory → search SKU-DEMO',
        expect: 'US-STOCK has USA qty; IN-STOCK India only; NO-STOCK zeros',
        link: '/inventory',
      },
    ],
  },
  {
    id: 'flow-a-us-stock',
    title: '1 · Scenario A — US available',
    minutes: 8,
    loginAs: 'india@restoration.com then usa@restoration.com',
    steps: [
      {
        do: 'Open ORD-DEMO-A-US → Eye: scenario US_STOCK',
        expect: 'Fulfillment USA · stock “US Available — barcode pending”',
        link: '/orders',
      },
      {
        do: 'Click Zap (⚡) Generate barcode → US bucket',
        expect: 'Toast success; Stock Locked; queue moves to US',
        link: '/orders',
      },
      {
        do: 'Logout → usa@restoration.com → Orders',
        expect: 'ORD-DEMO-A-US visible in US bucket only',
        link: '/orders',
      },
      {
        do: 'Packing Station → select order → scan SKU-DEMO-US-STOCK → Confirm',
        expect: 'Packed & Handover',
        link: '/packing',
      },
      {
        do: 'Optional: Shipping Desk → buy label for customer',
        expect: 'AWB created',
        link: '/shipping',
      },
    ],
  },
  {
    id: 'flow-b-india-ship',
    title: '2 · Scenario B — US empty, India available',
    minutes: 8,
    loginAs: 'india@restoration.com then usa@restoration.com',
    steps: [
      {
        do: 'ORD-DEMO-B-INDIA → Eye: scenario INDIA_SHIP',
        expect: 'India warehouse · “India Available — ship to US”',
        link: '/orders',
      },
      {
        do: 'Click Truck icon (Ship India → US)',
        expect: 'Status In Transit; barcode set',
        link: '/orders',
      },
      {
        do: 'Logout → usa@restoration.com → Orders → green Package (US receive)',
        expect: 'Back to Pending in US bucket',
        link: '/orders',
      },
      {
        do: 'Packing → scan SKU-DEMO-IN-STOCK → Confirm',
        expect: 'Packed & Handover to customer',
        link: '/packing',
      },
    ],
  },
  {
    id: 'flow-c-make',
    title: '3 · Scenario C — No stock (make)',
    minutes: 6,
    loginAs: 'india@restoration.com',
    steps: [
      {
        do: 'ORD-DEMO-C-MAKE → Eye',
        expect: 'Status In Process · scenario MAKE · ETA WH date set',
        link: '/orders',
      },
      {
        do: 'Optional: MTO Jobs → add job for this order',
        expect: 'MTO row saved',
        link: '/mto',
      },
      {
        do: 'Orders → Package icon (Production complete)',
        expect: 'Leaves In Process → ready to ship India→US',
        link: '/orders',
      },
      {
        do: 'Truck → Ship India → US → then same as Scenario B receive/pack',
        expect: 'In Transit then US bucket',
        link: '/orders',
      },
    ],
  },
  {
    id: 'flow-d-offline-finance',
    title: '4 · Scenario D — Offline + Finance',
    minutes: 5,
    loginAs: 'india@restoration.com then finance@restoration.com',
    steps: [
      {
        do: 'ORD-DEMO-D-OFFLINE → see Finance badge + INDIA_SHIP',
        expect: 'Direct Offline channel tagged for P&L',
        link: '/orders',
      },
      {
        do: 'Truck ship India→US (same as B)',
        expect: 'In Transit',
        link: '/orders',
      },
      {
        do: 'Logout → finance@restoration.com → Orders / Profitability',
        expect: 'Finance-tagged order visible; P&L menus open',
        link: '/profitability',
      },
      {
        do: 'Courier Audit → add bill with wrong weight vs recorded',
        expect: 'Status Logistics Error',
        link: '/courier-audit',
      },
    ],
  },
  {
    id: 'flow-returns',
    title: '5 · Returns (US manager)',
    minutes: 3,
    loginAs: 'usa@restoration.com',
    steps: [
      {
        do: 'Returns → Add RMA for a packed demo order',
        expect: 'Queued to US WH; status Pending Inspection',
        link: '/returns',
      },
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
    email: 'india@restoration.com',
    steps: [
      'Orders → search ORD-DEMO → see A/B/C/D',
      'A: Zap barcode → US bucket',
      'B: Truck India→US',
      'C: Production complete → then Truck',
      'D: Finance badge + Truck',
      'Sidebar: no Finance P&L / Tenants',
    ],
  },
  {
    role: 'US Warehouse',
    email: 'usa@restoration.com',
    steps: [
      'Orders → only US bucket (after India barcode / receive)',
      'Packing → scan matching SKU → Packed',
      'Returns → add RMA',
    ],
  },
  {
    role: 'Finance',
    email: 'finance@restoration.com',
    steps: [
      'Orders → ORD-DEMO-D Finance badge',
      'Courier Audit → weight mismatch → Logistics Error',
      'Profitability / Export Docs open; Packing hidden',
    ],
  },
  {
    role: 'Super Admin',
    email: 'admin@restoration.com',
    steps: [
      'Full test flow §0–5 on System Workflow',
      'Tenants + Billing + Integrations',
    ],
  },
  {
    role: 'Tenant B isolation',
    email: 'admin-b@restoration.com',
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
      'Order, inventory and warehouse photos (order image comes from its SKU automatically)',
      'Shiprocket / Aramex / ShipGlobal sandbox + encrypted credential slots',
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
  {
    email: 'admin@restoration.com',
    name: 'Restoration Admin',
    role: 'Super Admin',
    roleCode: 'super_admin',
  },
  {
    email: 'india@restoration.com',
    name: 'India Warehouse Manager',
    role: 'India Warehouse Manager',
    roleCode: 'india_wh',
  },
  {
    email: 'usa@restoration.com',
    name: 'US Warehouse Manager',
    role: 'US Warehouse Manager',
    roleCode: 'usa_wh',
  },
  {
    email: 'finance@restoration.com',
    name: 'Finance Manager',
    role: 'Finance Manager',
    roleCode: 'finance',
  },
  {
    email: 'admin-b@restoration.com',
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
    department: 'Super Admin',
    roleCode: 'super_admin',
    name: 'Restoration Admin',
    email: 'admin@restoration.com',
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
      'Order Bulk Allocate / barcode → US',
      'Shipping Desk buy label',
      'Packing Station confirm',
    ],
    cannot: ['Nothing blocked inside own tenant (except other tenants’ private data)'],
    reviewTip: 'Primary Restoration demo — India queue → US stock scenarios → Finance.',
  },
  {
    department: 'India Warehouse Manager',
    roleCode: 'india_wh',
    name: 'India Warehouse Manager',
    email: 'india@restoration.com',
    password: DEMO_PASSWORD,
    seesMenus: [
      'Orders (India queue)',
      'Buyers',
      'Inventory',
      'Forecast / Buy Sheet',
      'MTO',
      'Purchase Orders',
      'Stock Transfers',
      'Packing',
      'Shipping',
      'Export Docs',
      'Alerts',
    ],
    canCrud: [
      { resource: 'Orders', path: '/orders', actions: 'Add · Edit · Allocate · Barcode · Ship India→US' },
      { resource: 'SKUs', path: '/inventory', actions: 'Add · Edit · Delete' },
      { resource: 'MTO / PO / Transfers', path: '/mto', actions: 'Add · Edit · Delete' },
    ],
    specialActions: [
      'Bulk Allocate (stock re-check)',
      'Generate barcode → send to US bucket',
      'Ship India → US (photo / barcode / Aramex)',
      'Production Complete on In Process orders',
    ],
    cannot: ['Finance P&L / Courier Audit', 'Tenants / Users admin'],
    reviewTip: 'Orders land here first. US stock → barcode. Else India ship or In Process + ETA.',
  },
  {
    department: 'US Warehouse Manager',
    roleCode: 'usa_wh',
    name: 'US Warehouse Manager',
    email: 'usa@restoration.com',
    password: DEMO_PASSWORD,
    seesMenus: [
      'Orders (US bucket)',
      'Inventory',
      'Stock Transfers',
      'Warehouses',
      'Returns',
      'Packing',
      'Shipping',
      'Alerts',
    ],
    canCrud: [
      { resource: 'Orders (US queue)', path: '/orders', actions: 'Receive · Pack · Dispatch' },
      { resource: 'Returns', path: '/returns', actions: 'Add · Edit · Grade / restock' },
      { resource: 'Transfers / Warehouses', path: '/warehouses', actions: 'Add · Edit · Delete' },
    ],
    specialActions: ['Confirm US receive on In Transit', 'Pack & handover to customer', 'Own all returns'],
    cannot: ['India mill make / Finance books / Tenants'],
    reviewTip: 'Only sees orders after India barcode handoff or India→US receive.',
  },
  {
    department: 'Finance Manager',
    roleCode: 'finance',
    name: 'Finance Manager',
    email: 'finance@restoration.com',
    password: DEMO_PASSWORD,
    seesMenus: [
      'Orders (finance-tagged / offline)',
      'Receivables',
      'Profitability',
      'Reports',
      'Currencies',
      'Courier Audit (Logistics Errors)',
      'Export Docs',
      'Returns',
      'Alerts',
      'Billing',
    ],
    canCrud: [
      { resource: 'Receivables / Profitability', path: '/profitability', actions: 'Add · Edit · Delete' },
      { resource: 'Courier Audit', path: '/courier-audit', actions: 'Flag Logistics Errors' },
      { resource: 'Export Docs', path: '/export-docs', actions: 'Central document repository' },
    ],
    specialActions: ['Match Aramex bill vs recorded weight', 'Offline order P&L', 'Customs / shipping bills'],
    cannot: ['Packing Station', 'Tenants', 'Users'],
    reviewTip: 'Create courier audit with weight mismatch → status Logistics Error. Offline orders show Finance badge.',
  },
  {
    department: 'Tenant B (isolation demo)',
    roleCode: 'super_admin',
    name: 'Tenant B Admin',
    email: 'admin-b@restoration.com',
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
    reviewTip: 'Compare inventory with admin@restoration.com — catalogs must differ (tenant isolation).',
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
