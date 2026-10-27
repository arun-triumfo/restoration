import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'

type Stock = {
  indiaAvailable?: number
  indiaPacked?: number
  inTransit?: number
  usaAvailable?: number
  usaReserved?: number
  fba?: number
}

function stockTotal(sku: Record<string, unknown>) {
  const s = (sku.stock as Stock) || {}
  return (
    Number(s.indiaAvailable || 0) +
    Number(s.indiaPacked || 0) +
    Number(s.inTransit || 0) +
    Number(s.usaAvailable || 0) +
    Number(s.usaReserved || 0) +
    Number(s.fba || 0)
  )
}

export function DemandForecast() {
  const { list, loading } = useData()
  const skus = list('skus')
  const orders = list('orders')

  const rows = useMemo(() => {
    const sold: Record<string, number> = {}
    for (const o of orders) {
      const sku = String(o.sku || '')
      if (!sku) continue
      sold[sku] = (sold[sku] || 0) + Number(o.qty || 0)
    }
    return skus
      .map((sku) => {
        const code = String(sku.sku || '')
        const onHand = stockTotal(sku)
        const demand = sold[code] || 0
        const suggested = Math.max(0, demand * 2 - onHand)
        return {
          sku: code,
          title: String(sku.title || ''),
          onHand,
          demand,
          suggested,
          imageUrl: String(sku.imageUrl || ''),
        }
      })
      .sort((a, b) => b.suggested - a.suggested || b.demand - a.demand)
  }, [skus, orders])

  const toBuy = rows.filter((r) => r.suggested > 0).length

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          Step 16 · Make or buy
        </p>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)]">Demand Forecast</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Built only from live Inventory and Orders. Suggested buy = (qty sold in current orders × 2)
          minus on-hand. No dummy catalog.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-3">
          <div className="font-mono text-xl font-extrabold text-[var(--text-main)]">{skus.length}</div>
          <div className="text-[11px] text-[var(--text-dim)]">SKUs in catalog</div>
        </div>
        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-3">
          <div className="font-mono text-xl font-extrabold text-[var(--text-main)]">{orders.length}</div>
          <div className="text-[11px] text-[var(--text-dim)]">Orders counted</div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-3">
          <div className="font-mono text-xl font-extrabold text-[var(--text-main)]">{toBuy}</div>
          <div className="text-[11px] text-[var(--text-dim)]">SKUs suggested to buy</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-dim)]">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">On hand</th>
              <th className="px-3 py-2">Sold (orders)</th>
              <th className="px-3 py-2">Suggest buy</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[var(--text-muted)]">
                  Loading catalog from Mongo…
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.sku} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {r.imageUrl ? (
                      <img src={r.imageUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
                    ) : null}
                    <div>
                      <div className="font-mono text-[12px] font-bold text-[var(--text-main)]">{r.sku}</div>
                      <div className="max-w-xs truncate text-[11px] text-[var(--text-muted)]">{r.title}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-[var(--text-main)]">{r.onHand}</td>
                <td className="px-3 py-2 font-mono text-[var(--text-main)]">{r.demand}</td>
                <td className="px-3 py-2 font-mono font-bold text-[var(--text-main)]">{r.suggested}</td>
                <td className="px-3 py-2 text-right">
                  <Link
                    to="/buy-sheet"
                    className="text-[11px] font-bold text-indigo-600 no-underline dark:text-indigo-300"
                  >
                    Buy sheet
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
