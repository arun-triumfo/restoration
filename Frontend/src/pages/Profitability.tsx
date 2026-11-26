import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type ResourceRow } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'

function money(n: unknown) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

type ViewId = 'period' | 'export' | 'returns' | 'courier' | 'channel'

export function Profitability() {
  const { pushToast } = useApp()
  const { list, refresh } = useData()
  const monthly = list('monthly_financials')

  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7))
  const [view, setView] = useState<ViewId>('period')
  const [busy, setBusy] = useState(false)
  const [dash, setDash] = useState<ResourceRow | null>(null)

  const load = useCallback(async () => {
    try {
      setBusy(true)
      const res = await api.profitabilityApi.dashboard(period)
      setDash(res.data || null)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Dashboard failed', 'error')
    } finally {
      setBusy(false)
    }
  }, [period, pushToast])

  useEffect(() => {
    void load()
  }, [load])

  const rollup = (dash?.rollup || {}) as ResourceRow
  const drill = (dash?.drillDown || {}) as ResourceRow
  const returns = Array.isArray(drill.returns) ? (drill.returns as ResourceRow[]) : []
  const courier = Array.isArray(drill.courier) ? (drill.courier as ResourceRow[]) : []
  const exports = Array.isArray(drill.exports) ? (drill.exports as ResourceRow[]) : []
  const transfers = Array.isArray(drill.transfers) ? (drill.transfers as ResourceRow[]) : []

  const sync = async () => {
    try {
      setBusy(true)
      const res = await api.profitabilityApi.syncPeriod(period)
      pushToast(res.message || 'Synced', 'success')
      await refresh('monthly_financials')
      await load()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Sync failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const cards = [
    { label: 'Order inflows', value: rollup.orderInflowsUSD },
    { label: 'Export inflows', value: rollup.exportInflowsUSD },
    { label: 'Shipping out', value: rollup.shippingOutflowsUSD },
    { label: 'Returns cost', value: rollup.returnsCostUSD },
    { label: 'Courier credits', value: rollup.courierCreditsUSD },
    { label: 'Est. margin', value: rollup.estimatedMarginUSD },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Profitability</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Period P&amp;L with drill-down into returns, courier credits, and export shipments.
            Estimated freight while in transit; sync when bills arrive.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            className="h-9 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" /> Load
          </Button>
          <Button size="sm" variant="primary" disabled={busy} onClick={() => void sync()}>
            Sync period to monthly
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-3"
          >
            <p className="text-[10px] font-bold uppercase text-[var(--text-dim)]">{c.label}</p>
            <p className="mt-1 text-sm font-extrabold">{money(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-1.5">
        {(
          [
            ['period', 'By period'],
            ['export', 'By export shipment'],
            ['returns', 'Returns & claims'],
            ['courier', 'Courier net'],
            ['channel', 'Monthly rows'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              view === id ? 'bg-indigo-600 text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
        {view === 'period' ? (
          <div className="space-y-3 text-sm">
            <p>
              <strong>Returns P&amp;L:</strong> {money(rollup.returnsPnLUSD)} ·{' '}
              <strong>Courier billed:</strong> {money(rollup.courierBilledUSD)} ·{' '}
              <strong>Courier net:</strong> {money(rollup.courierNetUSD)} ·{' '}
              <strong>Export freight (est/actual mix):</strong> {money(rollup.exportFreightUSD)}
            </p>
            <p className="text-[12px] text-[var(--text-dim)]">
              Shipped orders in period: {String(drill.shippedOrderCount ?? 0)}. Container shared costs
              should use allocation method on Stock Transfer expenses (by qty / weight / CBM).
            </p>
            <div className="flex flex-wrap gap-3 text-xs font-semibold">
              <Link className="underline" to="/returns">
                Open Returns
              </Link>
              <Link className="underline" to="/courier-audit">
                Open Courier Audit
              </Link>
              <Link className="underline" to="/export-docs">
                Open Export Docs
              </Link>
              <Link className="underline" to="/stock-transfers">
                Open Stock Transfers
              </Link>
            </div>
          </div>
        ) : null}

        {view === 'export' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-[10px] uppercase text-[var(--text-dim)]">
                <tr>
                  <th className="py-2">EXP-ID</th>
                  <th>Invoice</th>
                  <th>Transfer</th>
                  <th>Docs</th>
                  <th>Customs</th>
                </tr>
              </thead>
              <tbody>
                {exports.map((e) => (
                  <tr key={String(e.invoiceNo)} className="border-t border-[var(--border-main)]">
                    <td className="py-2 font-mono text-xs">{String(e.exportShipmentId || '—')}</td>
                    <td>{String(e.invoiceNo)}</td>
                    <td className="text-xs">{String(e.stockTransferId || '—')}</td>
                    <td>
                      <Badge>{String(e.docStatus || '—')}</Badge>
                    </td>
                    <td>
                      <Badge>{String(e.customsStatus || '—')}</Badge>
                    </td>
                  </tr>
                ))}
                {transfers.map((t) => (
                  <tr key={String(t.shipmentId)} className="border-t border-[var(--border-main)]">
                    <td className="py-2 font-mono text-xs">{String(t.exportShipmentId || '—')}</td>
                    <td className="text-[var(--text-dim)]">—</td>
                    <td className="text-xs">
                      {String(t.shipmentId)} · {money(t.expenseTotal)} freight
                    </td>
                    <td>
                      <Badge>{String(t.status || '—')}</Badge>
                    </td>
                    <td>{String(t.shippingMode || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!exports.length && !transfers.length ? (
              <p className="text-[var(--text-muted)]">No export activity in this period.</p>
            ) : null}
          </div>
        ) : null}

        {view === 'returns' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-[10px] uppercase text-[var(--text-dim)]">
                <tr>
                  <th className="py-2">Case</th>
                  <th>Type</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Refund</th>
                  <th>P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={String(r.returnId)} className="border-t border-[var(--border-main)]">
                    <td className="py-2 font-mono text-xs">{String(r.returnId)}</td>
                    <td>
                      <Badge>{String(r.caseType || 'Return')}</Badge>
                    </td>
                    <td>{String(r.orderId || '—')}</td>
                    <td>{String(r.status || '—')}</td>
                    <td>{money(r.refundUSD)}</td>
                    <td>{money(r.profitImpactUSD)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!returns.length ? (
              <p className="text-[var(--text-muted)]">No returns impacting this period.</p>
            ) : null}
          </div>
        ) : null}

        {view === 'courier' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-[10px] uppercase text-[var(--text-dim)]">
                <tr>
                  <th className="py-2">Invoice</th>
                  <th>AWB</th>
                  <th>Billed</th>
                  <th>Expected</th>
                  <th>Credit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {courier.map((c) => (
                  <tr key={String(c.invoiceNo)} className="border-t border-[var(--border-main)]">
                    <td className="py-2 font-mono text-xs">{String(c.invoiceNo)}</td>
                    <td className="text-xs">{String(c.awb || '—')}</td>
                    <td>{money(c.billedUSD)}</td>
                    <td>{money(c.expectedUSD)}</td>
                    <td>{money(c.creditUSD)}</td>
                    <td>
                      <Badge>{String(c.auditStatus || '—')}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!courier.length ? (
              <p className="text-[var(--text-muted)]">No courier audits in this period.</p>
            ) : null}
          </div>
        ) : null}

        {view === 'channel' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[10px] uppercase text-[var(--text-dim)]">
                <tr>
                  <th className="py-2">Period</th>
                  <th>Orders in</th>
                  <th>Export in</th>
                  <th>Shipping out</th>
                  <th>Returns</th>
                  <th>Courier credits</th>
                </tr>
              </thead>
              <tbody>
                {[...monthly]
                  .sort((a, b) => String(b.period).localeCompare(String(a.period)))
                  .map((m) => (
                    <tr key={String(m.period)} className="border-t border-[var(--border-main)]">
                      <td className="py-2 font-semibold">
                        <button
                          type="button"
                          className="underline"
                          onClick={() => setPeriod(String(m.period))}
                        >
                          {String(m.period)}
                        </button>
                      </td>
                      <td>{money(m.orderInflowsUSD)}</td>
                      <td>{money(m.exportInflowsUSD)}</td>
                      <td>{money(m.shippingOutflowsUSD)}</td>
                      <td>{money(m.returnsPnLUSD ?? m.returnsCostUSD)}</td>
                      <td>{money(m.courierCreditsUSD)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!monthly.length ? (
              <p className="text-[var(--text-muted)]">No monthly rows — use Sync period.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
