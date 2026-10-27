import {
  Activity,
  Bell,
  Boxes,
  DollarSign,
  Factory,
  Package,
  Percent,
  Ship,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { MetricCard } from '../components/ui/MetricCard'

type Stock = {
  indiaAvailable?: number
  indiaPacked?: number
  inTransit?: number
  usaAvailable?: number
  usaReserved?: number
  fba?: number
}

export function Dashboard() {
  const { list, loading } = useData()

  const skus = list('skus')
  const orders = list('orders')
  const alerts = list('alerts')
  const looms = list('looms')
  const logs = list('system_logs')
  const monthly = list('monthly_financials')

  const metrics = useMemo(() => {
    let stockTotal = 0
    let india = 0
    let usa = 0
    let transit = 0
    let fba = 0
    for (const sku of skus) {
      const s = (sku.stock as Stock) || {}
      india += Number(s.indiaAvailable || 0) + Number(s.indiaPacked || 0)
      usa += Number(s.usaAvailable || 0) + Number(s.usaReserved || 0)
      transit += Number(s.inTransit || 0)
      fba += Number(s.fba || 0)
    }
    stockTotal = india + usa + transit + fba

    const gmv = orders.reduce((sum, o) => sum + Number(o.totalOrderUSD || 0), 0)
    const aov = orders.length ? gmv / orders.length : 0
    const orderQty = orders.reduce((sum, o) => sum + Number(o.qty || 0), 0)

    const lastMonth = monthly[0] as Record<string, number> | undefined
    const inflows =
      Number(lastMonth?.orderInflowsUSD || 0) + Number(lastMonth?.exportInflowsUSD || 0)
    const outflows =
      Number(lastMonth?.shippingOutflowsUSD || 0) +
      Number(lastMonth?.commissionsUSD || 0) +
      Number(lastMonth?.poPayoutsUSD || 0)
    const net = inflows - outflows

    return { stockTotal, india, usa, transit, fba, gmv, aov, orderQty, net, inflows }
  }, [skus, orders, monthly])

  const revenueChart = useMemo(() => {
    return [...monthly]
      .reverse()
      .slice(-6)
      .map((row) => ({
        month: String(row.periodShort || row.period || ''),
        dtc: Number(row.orderInflowsUSD || 0),
        marketplace: 0,
        b2b: Number(row.exportInflowsUSD || 0),
      }))
  }, [monthly])

  const hubStock = [
    { hub: 'India', stock: metrics.india, fill: '#4f46e5' },
    { hub: 'Transit', stock: metrics.transit, fill: '#0891b2' },
    { hub: 'USA', stock: metrics.usa, fill: '#10b981' },
    { hub: 'FBA', stock: metrics.fba, fill: '#9333ea' },
  ]

  const activity = logs.slice(0, 8)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-2xl">
            Restoration — live dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Counts below come from Mongo (orders, SKUs, alerts, financials) — {loading ? 'syncing…' : 'live'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/workflow">
            <Button variant="secondary" size="sm">
              How to use
            </Button>
          </Link>
          <Link to="/forecast">
            <Button variant="primary" size="sm">
              <TrendingUp className="h-3.5 w-3.5" /> Demand Forecast
            </Button>
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Realized Net Profit"
          value={`${metrics.net >= 0 ? '+' : ''}$${Math.round(metrics.net).toLocaleString()} USD`}
          icon={Wallet}
          accent="#10b981"
          badge={<Badge tone="success">From monthly P&L</Badge>}
          detail="Order + export inflows minus logistics & PO payouts"
        />
        <MetricCard
          label="GMV (Open Orders)"
          value={`$${Math.round(metrics.gmv).toLocaleString()} USD`}
          icon={DollarSign}
          accent="#2563eb"
          badge={<Badge tone="primary">{orders.length} orders</Badge>}
          detail="Sum of totalOrderUSD in live order pipeline"
        />
        <MetricCard
          label="Global Physical Stock"
          value={`${metrics.stockTotal.toLocaleString()} Rugs`}
          icon={Boxes}
          accent="#0891b2"
          badge={<Badge tone="cyan">{skus.length} SKUs</Badge>}
          detail="India WH · In-Transit · USA 3PL · FBA"
        />
        <MetricCard
          label="Monthly Inflows"
          value={`$${Math.round(metrics.inflows).toLocaleString()}`}
          icon={Ship}
          accent="#9333ea"
          badge={<Badge tone="purple">Finance</Badge>}
          detail="Latest monthly_financials period"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          compact
          label="Order Volume"
          value={`${metrics.orderQty} Rugs`}
          icon={ShoppingBag}
          accent="#4f46e5"
          badge={<Badge tone="success">{orders.length} lines</Badge>}
        />
        <MetricCard
          compact
          label="Average Order Value"
          value={`$${metrics.aov.toFixed(2)} USD`}
          icon={TrendingUp}
          accent="#0ea5e9"
          detail="Computed from live orders"
        />
        <MetricCard
          compact
          label="Active Looms"
          value={`${looms.length} Loom Stations`}
          icon={Factory}
          accent="#f59e0b"
          badge={<Badge tone="warning">Masters</Badge>}
        />
        <MetricCard
          compact
          label="Open Alerts"
          value={`${alerts.length} Triggers`}
          icon={Percent}
          accent="#059669"
          detail="Loaded from alerts collection"
        />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-950/40 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-red-700 dark:text-red-300">
              {alerts.length} Operational Triggers Require Executive Attention
            </h2>
            <p className="mt-0.5 text-xs text-red-600/90 dark:text-red-300/80">
              {alerts[0] ? String(alerts[0].title) : 'No open alerts'}
              {alerts[1] ? ` · ${String(alerts[1].title)}` : ''}
            </p>
          </div>
        </div>
        <Link to="/alerts">
          <Button variant="primary" size="sm">
            <Bell className="h-3.5 w-3.5" /> Open Alerts ({alerts.length})
          </Button>
        </Link>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                Multi-Channel Revenue & Margin Radar
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Derived from monthly_financials collection
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="gDtc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-main)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="dtc"
                  stackId="1"
                  stroke="#6366f1"
                  fill="url(#gDtc)"
                  name="Order inflows"
                />
                <Area type="monotone" dataKey="b2b" stackId="1" stroke="#a855f7" fill="#a855f733" name="Export inflows" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                Global Logistics & Hub Stock Radar
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Inventory distribution from live SKU stock
              </p>
            </div>
            <Link to="/inventory">
              <Button variant="secondary" size="sm">
                <Package className="h-3.5 w-3.5" /> Product Master
              </Button>
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hubStock}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" />
                <XAxis dataKey="hub" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-main)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="stock" radius={[8, 8, 0, 0]}>
                  {hubStock.map((entry) => (
                    <Cell key={entry.hub} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-[var(--border-main)] px-4 py-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)]">
              <Activity className="h-4 w-4" /> Live Operational Stream
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Latest system_logs from MongoDB
            </p>
          </div>
          <Link to="/system-logs">
            <Button variant="secondary" size="sm">
              View all
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Module</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Level</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((log) => {
                const logId = String(log.id ?? log._id ?? '')
                return (
                  <tr key={logId} className="border-t border-[var(--border-main)]">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {logId}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-main)]">{String(log.module)}</td>
                    <td className="max-w-md px-4 py-3 text-[var(--text-muted)]">{String(log.actor)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-dim)]">
                      {String(log.timestamp || log.relativeTime || '')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{String(log.level || 'info')}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
