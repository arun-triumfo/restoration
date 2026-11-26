import { ArrowLeft, Package, Plus, Printer, RefreshCw, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type ResourceRow } from '../api/client'
import { normalizeRoleCode } from '../auth/roles'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const INSPECTION = ['Restockable', 'Repair', 'Damaged', 'Write-off'] as const

function historyOf(row: ResourceRow) {
  return Array.isArray(row.history) ? row.history : []
}

export function ReturnsClaims() {
  const { user } = useAuth()
  const { pushToast } = useApp()
  const { list, create, update, refresh, loading, error } = useData()
  const rows = list('returns')
  const role = normalizeRoleCode(String(user?.roleCode || ''))

  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'Return' | 'Claim'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<ResourceRow | null>(null)
  const [inspectCondition, setInspectCondition] = useState<string>('Restockable')
  const [inspectNotes, setInspectNotes] = useState('')

  const scoped = useMemo(() => {
    let listRows = rows
    if (role === 'usa_wh') {
      listRows = rows.filter((r) => String(r.queueOwner || '') === 'usa_wh')
    } else if (role === 'india_wh') {
      listRows = rows.filter(
        (r) =>
          String(r.queueOwner || 'india_wh') === 'india_wh' ||
          String(r.status || '').includes('Pending'),
      )
    }
    if (filterType !== 'all') {
      listRows = listRows.filter((r) => String(r.caseType || 'Return') === filterType)
    }
    return listRows
  }, [rows, role, filterType])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return scoped
    return scoped.filter((r) =>
      [r.returnId, r.rmaNo, r.orderId, r.sku, r.customer, r.status, r.caseType, r.returnAwb]
        .map((x) => String(x || '').toLowerCase())
        .some((s) => s.includes(q)),
    )
  }, [scoped, query])

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const selected = selectedId ? rows.find((r) => String(r.returnId) === selectedId) : null
  const form = draft || selected

  const patch = (partial: Record<string, unknown>) => {
    setDraft((prev) => {
      const base = prev || selected
      if (!base) return prev
      return { ...base, ...partial }
    })
  }

  const openCreate = () => {
    const d: ResourceRow = {
      returnId: `RMA-${Date.now().toString().slice(-6)}`,
      caseType: 'Return',
      rmaNo: '',
      orderId: '',
      channel: '',
      sku: '',
      qty: 1,
      customer: '',
      reason: '',
      status: 'Pending Inspection',
      condition: '',
      owner: role === 'usa_wh' ? 'US WH' : 'India WH',
      refundUSD: 0,
    }
    setDraft(d)
    setSelectedId(String(d.returnId))
  }

  const save = async () => {
    if (!form) return
    try {
      setBusy(true)
      const id = String(form.returnId)
      if (!rows.some((r) => String(r.returnId) === id)) {
        await create('returns', form)
      } else {
        await update('returns', id, form)
      }
      setDraft(null)
      setSelectedId(id)
      pushToast('Case saved', 'success')
      await refresh('returns')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const run = async (fn: () => Promise<{ message?: string }>, ok = 'Done') => {
    try {
      setBusy(true)
      const res = await fn()
      pushToast(res.message || ok, 'success')
      await refresh('returns')
      setDraft(null)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Action failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (form) {
    const hist = historyOf(form)
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--text-muted)]"
          onClick={() => {
            setSelectedId(null)
            setDraft(null)
          }}
        >
          <ArrowLeft className="h-4 w-4" /> All cases
        </button>

        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold">{String(form.returnId)}</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {String(form.caseType || 'Return')} · Order {String(form.orderId || '—')} · SKU{' '}
              {String(form.sku || '—')}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Badge>{String(form.caseType || 'Return')}</Badge>
            <Badge>{String(form.status || '—')}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
          {(role === 'india_wh' || role === 'super_admin') && !form.returnAwb ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void run(() => api.returnsApi.buyReturnLabel(String(form.returnId)))}
            >
              <Printer className="h-3.5 w-3.5" /> Buy return label
            </Button>
          ) : null}
          {(role === 'usa_wh' || role === 'super_admin') &&
          String(form.status || '').includes('Awaiting US') ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  api.returnsApi.usReceive(String(form.returnId), {
                    restock: true,
                    condition: String(form.condition || 'Good'),
                  }),
                )
              }
            >
              <Package className="h-3.5 w-3.5" /> Receive + restock
            </Button>
          ) : null}
          {(role === 'finance' || role === 'super_admin' || role === 'india_wh') && !form.refundPosted ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  api.returnsApi.markRefunded(String(form.returnId), Number(form.refundUSD || 0)),
                )
              }
            >
              Mark refunded (once)
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(() =>
                api.returnsApi.openClaim(String(form.returnId), {
                  claimValueUSD: Number(form.claimValueUSD || form.refundUSD || 0),
                  pushCourierAudit: true,
                  notes: 'Opened from Returns UI',
                }),
              )
            }
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Open carrier claim
          </Button>
          {form.returnLabelPdfUrl ? (
            <a
              href={String(form.returnLabelPdfUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center text-xs font-semibold text-indigo-600 underline"
            >
              Label PDF
            </a>
          ) : null}
          <Link to="/profitability" className="inline-flex h-8 items-center text-xs font-semibold underline">
            Profitability
          </Link>
          <Link to="/courier-audit" className="inline-flex h-8 items-center text-xs font-semibold underline">
            Courier Audit
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
            <p className="text-xs font-bold uppercase text-[var(--text-dim)]">Case</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['caseType', 'Type (Return / Claim)'],
                  ['rmaNo', 'RMA'],
                  ['orderId', 'Order'],
                  ['channel', 'Channel'],
                  ['sku', 'SKU'],
                  ['qty', 'Qty'],
                  ['customer', 'Customer'],
                  ['reason', 'Reason'],
                  ['condition', 'Inspection'],
                  ['linkedShipmentId', 'Linked EXP / shipment'],
                  ['refundUSD', 'Refund USD'],
                  ['claimValueUSD', 'Claim value USD'],
                  ['returnAwb', 'Return AWB'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs font-semibold">
                  {label}
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-sm"
                    value={String(form[key] ?? '')}
                    disabled={key === 'returnId'}
                    onChange={(e) =>
                      patch({
                        [key]:
                          key === 'qty' || key === 'refundUSD' || key === 'claimValueUSD'
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </div>
            {form.pnlBreakdown ? (
              <p className="mt-3 rounded-lg bg-[var(--bg-elevated)] p-2 text-[12px] text-[var(--text-muted)]">
                {String(form.pnlBreakdown)}
              </p>
            ) : null}
            {form.refundPosted ? (
              <p className="mt-2 text-[12px] font-semibold text-amber-700">
                Refund already posted — double refund blocked.
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
              <p className="text-xs font-bold uppercase text-[var(--text-dim)]">Inspect</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <select
                  className="h-9 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-sm"
                  value={inspectCondition}
                  onChange={(e) => setInspectCondition(e.target.value)}
                >
                  {INSPECTION.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input
                  className="h-9 min-w-[160px] flex-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-sm"
                  placeholder="Notes"
                  value={inspectNotes}
                  onChange={(e) => setInspectNotes(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      api.returnsApi.inspect(String(form.returnId), {
                        condition: inspectCondition,
                        notes: inspectNotes,
                      }),
                    )
                  }
                >
                  Save inspection
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-dim)]">
                Inventory updates only after authorized US receive. Restockable → US available.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
              <p className="text-xs font-bold uppercase text-[var(--text-dim)]">Event trail</p>
              <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto text-sm">
                {hist
                  .slice()
                  .reverse()
                  .map((ev: ResourceRow, i: number) => (
                    <li key={i} className="border-b border-[var(--border-main)] pb-2">
                      <p className="font-medium">{String(ev.action || ev.note || ev.status || 'Event')}</p>
                      <p className="text-[11px] text-[var(--text-dim)]">
                        {String(ev.time || ev.at || ev.timestamp || '')} ·{' '}
                        {String(ev.detail || ev.note || '')}
                      </p>
                    </li>
                  ))}
                {!hist.length ? <li className="text-[var(--text-muted)]">No events yet.</li> : null}
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Returns & Claims</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Customer returns vs carrier claims. Inspection → receive → refund (once). Financial
            effects feed Profitability; disputed freight can open Courier Audit.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> New case
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void refresh('returns')}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)]">
        <div className="flex flex-col gap-2 border-b border-[var(--border-main)] p-3 sm:flex-row sm:items-center">
          <input
            className="h-10 flex-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
            placeholder="Search RMA, order, SKU, AWB…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
          <select
            className="h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
          >
            <option value="all">All types</option>
            <option value="Return">Returns</option>
            <option value="Claim">Claims</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Order / SKU</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">P&L</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={String(row.returnId)} className="border-t border-[var(--border-main)]">
                  <td className="px-4 py-3 font-mono text-xs">{String(row.returnId)}</td>
                  <td className="px-4 py-3">
                    <Badge>{String(row.caseType || 'Return')}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {String(row.orderId || '—')} · {String(row.sku || '—')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{String(row.status || '—')}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {row.profitImpactUSD != null
                      ? `$${Number(row.profitImpactUSD).toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedId(String(row.returnId))
                        setDraft(null)
                      }}
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && !pageItems.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-muted)]">
                    No cases
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(1)
          }}
        />
      </div>
    </div>
  )
}
