import { Factory, RefreshCw, SkipForward } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, type ResourceRow } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'
import { firstDate, inDateRange } from '../lib/dateRange'

const STAGES = ['Queued', 'Weaving', 'QC', 'Ready'] as const

function stageKeyOf(row: ResourceRow) {
  const raw = String(row.stageKey || row.stage || 'Queued')
  return STAGES.find((s) => raw === s || raw.toLowerCase().includes(s.toLowerCase())) || 'Queued'
}

function StagePills({ current }: { current: string }) {
  const key = STAGES.find((s) => current === s || current.toLowerCase().includes(s.toLowerCase())) || 'Queued'
  const idx = STAGES.indexOf(key as (typeof STAGES)[number])
  return (
    <div className="flex flex-wrap gap-1">
      {STAGES.map((s, i) => (
        <span
          key={s}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            i < idx
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
              : i === idx
                ? 'bg-indigo-600 text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-dim)]'
          }`}
        >
          {s}
        </span>
      ))}
    </div>
  )
}

export function MtoJobs() {
  const { pushToast } = useApp()
  const { list, refresh, loading, error } = useData()
  const jobs = list('mto')
  const [busy, setBusy] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = [...jobs]
      .filter((r) => {
        const key = stageKeyOf(r)
        const matchesQuery =
          !q ||
          [r.orderId, r.sku, r.title, r.stage, r.status, r.loomId]
            .map((x) => String(x || '').toLowerCase())
            .some((s) => s.includes(q))
        const matchesStage = stage === 'all' || key === stage
        const when = firstDate(r.expectedReadyDate, r.createdAt, r.updatedAt)
        return matchesQuery && matchesStage && inDateRange(when, dateFrom, dateTo)
      })
      .sort((a, b) => String(a.orderId || '').localeCompare(String(b.orderId || '')))
    return rows
  }, [jobs, query, stage, dateFrom, dateTo])

  const advance = async (row: ResourceRow) => {
    const id = String(row.id || '')
    try {
      setBusy(id)
      const res = await api.mto.advance(id)
      pushToast(res.message || 'Stage advanced', 'success')
      await refresh()
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Advance failed',
        'danger',
      )
    } finally {
      setBusy(null)
    }
  }

  const syncJobs = async () => {
    try {
      setBusy('sync')
      const res = await api.mto.ensureJobs()
      pushToast(res.message || 'Synced', 'success')
      await refresh()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Sync failed', 'danger')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-2xl">
            MTO Jobs — Mill flow
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Queued → Weaving → QC → <strong>Ready</strong>. Jab Ready ho, Orders pe{' '}
            <strong>Mark ready (made)</strong> enable hoga, phir ship.
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => void syncJobs()}>
          <RefreshCw className="h-3.5 w-3.5" />
          {busy === 'sync' ? 'Syncing…' : 'Sync jobs from orders'}
        </Button>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Stock 0 order → yahan auto job + loom</li>
          <li>Har row pe <strong>Advance stage</strong> dabate raho jab tak Ready na ho</li>
          <li>
            Ready ke baad <Link to="/orders" className="font-bold underline">Orders</Link> → Mark
            ready → Prep ship → label → pack → dispatch
          </li>
        </ol>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          API error: {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="block min-w-0 flex-1 sm:max-w-md">
          <span className="sr-only">Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order / SKU / loom…"
            className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-indigo-500"
          />
        </label>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
          aria-label="MTO status"
        >
          <option value="all">All statuses</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-xs text-[var(--text-muted)]">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 bg-transparent text-sm text-[var(--text-main)] outline-none"
            aria-label="MTO date from"
          />
        </label>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-xs text-[var(--text-muted)]">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 bg-transparent text-sm text-[var(--text-main)] outline-none"
            aria-label="MTO date to"
          />
        </label>
        <span className="text-xs font-medium text-[var(--text-muted)]">
          {loading ? 'Loading…' : `${filtered.length} jobs`}
        </span>
      </div>

      <div className="space-y-3">
        {filtered.map((row) => {
          const id = String(row.id || '')
          const key = stageKeyOf(row)
          const isReady = key === 'Ready' || String(row.status) === 'Ready'
          return (
            <div
              key={id}
              className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Factory className="h-4 w-4 text-indigo-600" />
                    <span className="font-mono text-xs font-bold text-indigo-600">{id}</span>
                    <Badge tone={isReady ? 'success' : 'purple'}>{String(row.status || key)}</Badge>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-main)]">
                    Order{' '}
                    <Link
                      to={`/orders?q=${encodeURIComponent(String(row.orderId || ''))}`}
                      className="text-indigo-600 underline"
                    >
                      {String(row.orderId)}
                    </Link>
                    {' · '}
                    {String(row.sku)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{String(row.title || '')}</p>
                  <p className="text-[11px] text-[var(--text-dim)]">
                    Loom: <strong>{String(row.loomId || '—')}</strong>
                    {row.expectedReadyDate ? ` · ETA ${String(row.expectedReadyDate)}` : ''}
                  </p>
                  <StagePills current={key} />
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {!isReady ? (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!!busy}
                      onClick={() => void advance(row)}
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                      {busy === id ? 'Updating…' : `Advance → next stage`}
                    </Button>
                  ) : (
                    <Link
                      to="/orders"
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white no-underline hover:bg-emerald-700"
                    >
                      Orders pe Mark ready
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {!loading && filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-main)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            No MTO jobs. Click <strong>Sync jobs from orders</strong> for In Process / MAKE orders.
          </div>
        ) : null}
      </div>
    </div>
  )
}
