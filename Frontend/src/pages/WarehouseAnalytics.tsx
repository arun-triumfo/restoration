import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useData } from '../context/DataContext'
import { Badge } from '../components/ui/Badge'
import { MetricCard } from '../components/ui/MetricCard'
import { Boxes, Package, Warehouse } from 'lucide-react'

type Stock = {
  indiaAvailable?: number
  indiaPacked?: number
  inTransit?: number
  usaAvailable?: number
  usaReserved?: number
  fba?: number
}

export function WarehouseAnalytics() {
  const { list, loading } = useData()
  const skus = list('skus')
  const warehouses = list('warehouses')

  const hub = useMemo(() => {
    const totals = {
      india: 0,
      packed: 0,
      transit: 0,
      usa: 0,
      reserved: 0,
      fba: 0,
    }
    for (const sku of skus) {
      const s = (sku.stock as Stock) || {}
      totals.india += Number(s.indiaAvailable || 0)
      totals.packed += Number(s.indiaPacked || 0)
      totals.transit += Number(s.inTransit || 0)
      totals.usa += Number(s.usaAvailable || 0)
      totals.reserved += Number(s.usaReserved || 0)
      totals.fba += Number(s.fba || 0)
    }
    return totals
  }, [skus])

  const chart = [
    { hub: 'India Avail', stock: hub.india, fill: '#4f46e5' },
    { hub: 'India Packed', stock: hub.packed, fill: '#6366f1' },
    { hub: 'In Transit', stock: hub.transit, fill: '#0891b2' },
    { hub: 'USA Avail', stock: hub.usa, fill: '#10b981' },
    { hub: 'USA Reserved', stock: hub.reserved, fill: '#f59e0b' },
    { hub: 'FBA', stock: hub.fba, fill: '#9333ea' },
  ]

  const total =
    hub.india + hub.packed + hub.transit + hub.usa + hub.reserved + hub.fba

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-2xl">
          Warehouse Analytics
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Live stock distribution from MongoDB SKU ledger
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          compact
          label="Total Physical Units"
          value={loading ? '…' : total.toLocaleString()}
          icon={Boxes}
          accent="#0891b2"
        />
        <MetricCard
          compact
          label="Active SKUs"
          value={loading ? '…' : String(skus.length)}
          icon={Package}
          accent="#4f46e5"
        />
        <MetricCard
          compact
          label="Warehouse Nodes"
          value={loading ? '…' : String(warehouses.length)}
          icon={Warehouse}
          accent="#9333ea"
        />
      </section>

      <article className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
        <h3 className="text-sm font-bold text-[var(--text-main)]">Hub Stock Radar</h3>
        <p className="mb-4 text-xs text-[var(--text-muted)]">Units by fulfillment node</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
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
                {chart.map((entry) => (
                  <Cell key={entry.hub} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--border-main)] px-4 py-3">
          <h3 className="text-sm font-bold text-[var(--text-main)]">Warehouse Nodes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Capacity</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((wh) => (
                <tr key={String(wh.id)} className="border-t border-[var(--border-main)]">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600">
                    {String(wh.id)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--text-main)]">
                    {String(wh.name)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{String(wh.type)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {String(wh.city)}, {String(wh.country)}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-main)]">
                    {String(wh.capacityCBM ?? '—')} CBM
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
