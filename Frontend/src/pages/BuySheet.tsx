import { FilePlus2, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useData } from '../context/DataContext'
import { Button } from '../components/ui/Button'

type Line = { sku: string; qty: number; title: string }

export function BuySheet() {
  const { list, refresh } = useData()
  const skus = list('skus')
  const [lines, setLines] = useState<Line[]>([])
  const [vendor, setVendor] = useState('India Mill / Weavers')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [createdPo, setCreatedPo] = useState<string | null>(null)

  const suggestions = useMemo(
    () =>
      skus.slice(0, 40).map((s) => ({
        sku: String(s.sku || ''),
        title: String(s.title || s.name || s.sku || ''),
      })),
    [skus],
  )

  const addSku = (sku: string, title: string) => {
    setLines((prev) => {
      const hit = prev.find((l) => l.sku === sku)
      if (hit) return prev.map((l) => (l.sku === sku ? { ...l, qty: l.qty + 1 } : l))
      return [...prev, { sku, title, qty: 1 }]
    })
  }

  const createPo = async () => {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const res = await api.purchaseOrders.fromBuySheet({
        lines,
        vendor,
        notes: 'Created from RugOS Buy Sheet',
      })
      setCreatedPo(String(res.data.poNumber || ''))
      setMsg(res.message || 'Draft PO created')
      setLines([])
      await refresh('purchase_orders')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Create PO failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          Purchasing · Buy sheet → PO
        </p>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)]">Build buy sheet</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          A shopping list for restocking. Pick the rugs you need more of, set quantities, and one
          click turns the list into a <strong>Draft</strong> purchase order for the vendor.
        </p>
        <ol className="mt-3 grid gap-2 text-[12px] sm:grid-cols-3">
          {[
            ['1. Pick SKUs', 'Click + Add on any rug in the catalog. Clicking again adds one more.'],
            ['2. Set qty & vendor', 'Adjust pieces per SKU and confirm the weaver / mill.'],
            ['3. Create draft PO', 'Saved under Purchase Orders as Draft for review before sending.'],
          ].map(([t, d]) => (
            <li
              key={t}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2"
            >
              <div className="font-bold text-[var(--text-main)]">{t}</div>
              <div className="text-[var(--text-muted)]">{d}</div>
            </li>
          ))}
        </ol>
      </header>

      {msg ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          {msg}{' '}
          {createdPo ? (
            <Link to="/purchase-orders" className="font-bold underline">
              Open Purchase Orders ({createdPo})
            </Link>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
          <h2 className="text-sm font-bold text-[var(--text-main)]">SKU catalog</h2>
          <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {suggestions.map((s) => (
              <li key={s.sku}>
                <button
                  type="button"
                  onClick={() => addSku(s.sku, s.title)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--bg-elevated)]"
                >
                  <span>
                    <span className="font-mono font-semibold text-[var(--text-main)]">{s.sku}</span>
                    <span className="ml-2 text-[12px] text-[var(--text-muted)]">{s.title}</span>
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300">+ Add</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
          <h2 className="text-sm font-bold text-[var(--text-main)]">Buy sheet ({lines.length})</h2>
          <label className="mt-2 block text-[11px] font-bold uppercase text-[var(--text-dim)]">
            Vendor
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
            />
          </label>
          <ul className="mt-3 space-y-2">
            {lines.map((l) => (
              <li
                key={l.sku}
                className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm font-bold text-[var(--text-main)]">{l.sku}</div>
                  <div className="truncate text-[11px] text-[var(--text-muted)]">{l.title}</div>
                </div>
                <input
                  type="number"
                  min={1}
                  value={l.qty}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((x) =>
                        x.sku === l.sku ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x,
                      ),
                    )
                  }
                  className="h-9 w-16 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-sm text-[var(--text-main)]"
                />
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => setLines((prev) => prev.filter((x) => x.sku !== l.sku))}
                  className="rounded-lg p-2 text-[var(--text-dim)] hover:bg-[var(--bg-elevated)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="primary"
            className="mt-4 w-full"
            disabled={busy || !lines.length}
            onClick={createPo}
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            {busy ? 'Creating…' : 'Create draft PO'}
          </Button>
        </div>
      </div>
    </div>
  )
}
