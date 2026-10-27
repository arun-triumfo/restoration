import {
  ArrowRight,
  Bell,
  Boxes,
  Factory,
  Package,
  ShoppingBag,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { normalizeRoleCode } from '../auth/roles'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

type Card = { label: string; value: string; hint: string; to: string; icon: typeof Package }

export function DepartmentHome() {
  const { user } = useAuth()
  const { list, loading } = useData()
  const role = normalizeRoleCode(String(user?.roleCode || 'india_wh'))

  const cards = useMemo((): Card[] => {
    const orders = list('orders')
    const alerts = list('alerts').filter((a) => !a.resolved)
    const skus = list('skus')
    const pos = list('purchase_orders')
    const transfers = list('replenishment')

    const indiaQueue = orders.filter(
      (o) => String(o.queueOwner || 'india_wh') === 'india_wh',
    ).length
    const usQueue = orders.filter((o) => String(o.queueOwner || '') === 'usa_wh').length
    const financeTagged = orders.filter((o) => o.financeTagged).length

    const base: Record<string, Card[]> = {
      super_admin: [
        {
          label: 'Open alerts',
          value: String(alerts.length),
          hint: 'Needs attention across ops',
          to: '/alerts',
          icon: Bell,
        },
        {
          label: 'Orders in pipeline',
          value: String(orders.length),
          hint: `${indiaQueue} India queue · ${usQueue} US bucket`,
          to: '/orders',
          icon: ShoppingBag,
        },
        {
          label: 'SKU catalog',
          value: String(skus.length),
          hint: 'Global inventory master',
          to: '/inventory',
          icon: Package,
        },
        {
          label: 'Demand forecast',
          value: 'Workbench',
          hint: 'Plan next buy sheet',
          to: '/forecast',
          icon: TrendingUp,
        },
      ],
      india_wh: [
        {
          label: 'India order queue',
          value: String(indiaQueue),
          hint: 'Barcode · ship to US · make',
          to: '/orders',
          icon: ShoppingBag,
        },
        {
          label: 'MTO / PO work',
          value: String(pos.length),
          hint: 'In Process / weaving',
          to: '/mto',
          icon: Factory,
        },
        {
          label: 'Stock transfers',
          value: String(transfers.length),
          hint: 'India → USA moves',
          to: '/stock-transfers',
          icon: Truck,
        },
        {
          label: 'Inventory',
          value: String(skus.length),
          hint: 'India free stock',
          to: '/inventory',
          icon: Boxes,
        },
      ],
      usa_wh: [
        {
          label: 'US order bucket',
          value: String(usQueue),
          hint: 'Pack & dispatch to customer',
          to: '/orders',
          icon: ShoppingBag,
        },
        {
          label: 'Receive transfers',
          value: String(transfers.length),
          hint: 'Confirm inbound GRN',
          to: '/stock-transfers',
          icon: Truck,
        },
        {
          label: 'USA inventory',
          value: String(skus.length),
          hint: 'Edison + FBA view',
          to: '/inventory',
          icon: Package,
        },
        {
          label: 'Returns inbound',
          value: 'RMA',
          hint: 'Grade & restock',
          to: '/returns',
          icon: Boxes,
        },
      ],
      finance: [
        {
          label: 'Offline / tagged',
          value: String(financeTagged),
          hint: 'Direct orders in P&L',
          to: '/orders',
          icon: ShoppingBag,
        },
        {
          label: 'Profitability',
          value: 'True cost',
          hint: 'Mfg + ship + US vs sell',
          to: '/profitability',
          icon: TrendingUp,
        },
        {
          label: 'Logistics errors',
          value: 'Courier audit',
          hint: 'Weight / rate variance',
          to: '/courier-audit',
          icon: Bell,
        },
        {
          label: 'Export docs',
          value: 'Repository',
          hint: 'Invoice · customs · bills',
          to: '/export-docs',
          icon: Boxes,
        },
      ],
    }

    return base[role] || base.india_wh
  }, [list, role])

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] px-5 py-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          My day · {user?.role}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--text-main)]">
          Welcome, {user?.name?.split(' ')[0] || 'teammate'}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
          Quick home for your role. Use the cards below to start work — the full menu is in the left
          sidebar (only items your role can access).
        </p>
        {loading ? (
          <p className="mt-3 text-xs text-[var(--text-dim)]">Loading live counts…</p>
        ) : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.to + c.label}
              to={c.to}
              className="group rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 no-underline transition hover:border-indigo-400 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--text-dim)] transition group-hover:text-indigo-500" />
              </div>
              <div className="mt-3 font-mono text-2xl font-extrabold text-[var(--text-main)]">
                {c.value}
              </div>
              <div className="text-sm font-bold text-[var(--text-main)]">{c.label}</div>
              <div className="text-[12px] text-[var(--text-muted)]">{c.hint}</div>
            </Link>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/workflow"
          className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-700 no-underline dark:text-indigo-300"
        >
          Open System Workflow
        </Link>
      </div>
    </div>
  )
}
