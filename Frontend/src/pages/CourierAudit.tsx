import { ArrowLeft, Plus, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type ResourceRow } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'

function money(n: unknown) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export function CourierAudit() {
  const { pushToast } = useApp()
  const { list, create, update, refresh, loading, error } = useData()
  const rows = list('courier_audit')

  const [summary, setSummary] = useState<ResourceRow | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<ResourceRow | null>(null)
  const [csvText, setCsvText] = useState('')
  const [showImport, setShowImport] = useState(false)

  const loadSummary = async () => {
    try {
      const res = await api.courierAuditApi.summary()
      setSummary(res.data || null)
    } catch {
      setSummary(null)
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [rows.length])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const listRows = [...rows].sort((a, b) =>
      String(b.billDate || '').localeCompare(String(a.billDate || '')),
    )
    if (!q) return listRows
    return listRows.filter((r) =>
      [r.invoiceNo, r.carrier, r.awb, r.orderRef, r.auditStatus, r.status]
        .map((x) => String(x || '').toLowerCase())
        .some((s) => s.includes(q)),
    )
  }, [rows, query])

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const selected = selectedId ? rows.find((r) => String(r.invoiceNo) === selectedId) : null
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
      invoiceNo: `CA-${Date.now().toString().slice(-6)}`,
      carrier: '',
      billDate: new Date().toISOString().slice(0, 10),
      awb: '',
      orderRef: '',
      expectedUSD: 0,
      billedUSD: 0,
      auditStatus: 'Needs Review',
    }
    setDraft(d)
    setSelectedId(String(d.invoiceNo))
  }

  const save = async () => {
    if (!form) return
    try {
      setBusy(true)
      const id = String(form.invoiceNo)
      const billed = Number(form.billedUSD || 0)
      const expected = Number(form.expectedUSD || 0)
      const payload = {
        ...form,
        billedUSD: billed,
        expectedUSD: expected,
        differenceUSD: Math.round((billed - expected) * 100) / 100,
      }
      if (!rows.some((r) => String(r.invoiceNo) === id)) await create('courier_audit', payload)
      else await update('courier_audit', id, payload)
      setDraft(null)
      setSelectedId(id)
      pushToast('Audit line saved', 'success')
      await refresh('courier_audit')
      await loadSummary()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const run = async (fn: () => Promise<{ message?: string }>) => {
    try {
      setBusy(true)
      const res = await fn()
      pushToast(res.message || 'Done', 'success')
      await refresh('courier_audit')
      await loadSummary()
      setDraft(null)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (form) {
    const timeline = Array.isArray(form.timeline) ? (form.timeline as ResourceRow[]) : []
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
          <ArrowLeft className="h-4 w-4" /> All audits
        </button>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold">{String(form.invoiceNo)}</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {String(form.carrier || '—')} · AWB {String(form.awb || '—')}
            </p>
          </div>
          <Badge>{String(form.auditStatus || form.status || '—')}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" disabled={busy} onClick={() => void save()}>
            Save
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(() =>
                api.courierAuditApi.match(String(form.invoiceNo), {
                  awb: String(form.awb || ''),
                  orderRef: String(form.orderRef || ''),
                }),
              )
            }
          >
            Match AWB / order
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(() =>
                api.courierAuditApi.dispute(String(form.invoiceNo), {
                  note: 'Overbilling disputed from UI',
                }),
              )
            }
          >
            Open dispute
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || Boolean(form.creditPosted)}
            onClick={() =>
              void run(() =>
                api.courierAuditApi.resolveCredit(
                  String(form.invoiceNo),
                  Math.abs(Number(form.differenceUSD || form.creditUSD || 0)),
                ),
              )
            }
          >
            Confirm credit → P&L
          </Button>
          <Link to="/profitability" className="inline-flex h-8 items-center text-xs font-semibold underline">
            Profitability
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['carrier', 'Carrier'],
                  ['billDate', 'Bill date'],
                  ['awb', 'AWB'],
                  ['orderRef', 'Order ref'],
                  ['sku', 'SKU'],
                  ['expectedUSD', 'Expected USD'],
                  ['billedUSD', 'Billed USD'],
                  ['billedWeightKg', 'Billed weight kg'],
                  ['actualWeightKg', 'Recorded weight kg'],
                  ['creditUSD', 'Credit USD'],
                  ['disputeRef', 'Dispute ref'],
                  ['auditStatus', 'Status'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs font-semibold">
                  {label}
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-sm"
                    value={String(form[key] ?? '')}
                    onChange={(e) => {
                      const numKeys = [
                        'expectedUSD',
                        'billedUSD',
                        'billedWeightKg',
                        'actualWeightKg',
                        'creditUSD',
                      ]
                      patch({
                        [key]: numKeys.includes(key) ? Number(e.target.value) : e.target.value,
                      })
                    }}
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-[var(--bg-elevated)] p-2">
                <p className="text-[10px] uppercase text-[var(--text-dim)]">Diff</p>
                <p className="font-bold">{money(form.differenceUSD)}</p>
              </div>
              <div className="rounded-lg bg-[var(--bg-elevated)] p-2">
                <p className="text-[10px] uppercase text-[var(--text-dim)]">Net</p>
                <p className="font-bold">{money(form.netCostUSD)}</p>
              </div>
              <div className="rounded-lg bg-[var(--bg-elevated)] p-2">
                <p className="text-[10px] uppercase text-[var(--text-dim)]">Flag</p>
                <p className="font-bold text-xs">{form.overbilled ? 'Overbilled' : 'OK'}</p>
              </div>
            </div>
            {form.flagReason ? (
              <p className="mt-2 text-[12px] text-amber-700">{String(form.flagReason)}</p>
            ) : null}
            {form.creditPosted ? (
              <p className="mt-2 text-[12px] font-semibold text-teal-700">
                Credit already posted — double count blocked.
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
            <p className="text-xs font-bold uppercase text-[var(--text-dim)]">Audit trail</p>
            <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto text-sm">
              {timeline
                .slice()
                .reverse()
                .map((ev) => (
                  <li key={String(ev.id)} className="border-b border-[var(--border-main)] pb-2">
                    <p className="font-medium">{String(ev.note)}</p>
                    <p className="text-[11px] text-[var(--text-dim)]">
                      {String(ev.at)} · {String(ev.by || '')}
                    </p>
                  </li>
                ))}
              {!timeline.length ? <li className="text-[var(--text-muted)]">No events.</li> : null}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Courier Audit</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Match courier invoices to AWB / order. Flag overbilling, track disputes & credits. Only
            confirmed credits hit Profitability once.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Add bill line
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowImport((v) => !v)}>
            <Upload className="h-3.5 w-3.5" /> Import CSV
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void refresh('courier_audit')
              void loadSummary()
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              ['Billed', summary.billedUSD],
              ['Expected', summary.expectedUSD],
              ['Difference', summary.differenceUSD],
              ['Credits', summary.creditUSD],
              ['Net cost', summary.netCostUSD],
              ['Disputed', summary.disputed],
            ] as const
          ).map(([label, val]) => (
            <div
              key={label}
              className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-3 text-center"
            >
              <p className="text-[10px] font-bold uppercase text-[var(--text-dim)]">{label}</p>
              <p className="mt-1 text-sm font-extrabold">
                {typeof val === 'number' && label !== 'Disputed' ? money(val) : String(val ?? 0)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {showImport ? (
        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
          <p className="text-sm font-bold">CSV import</p>
          <p className="text-[12px] text-[var(--text-dim)]">
            Header example: invoiceNo,carrier,awb,orderRef,expectedUSD,billedUSD,billDate,billedWeightKg,actualWeightKg
          </p>
          <textarea
            className="mt-2 min-h-28 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] p-2 font-mono text-xs"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Paste CSV…"
          />
          <Button
            className="mt-2"
            size="sm"
            variant="primary"
            disabled={busy || !csvText.trim()}
            onClick={() =>
              void run(async () => {
                const res = await api.courierAuditApi.importCsv(csvText)
                setCsvText('')
                setShowImport(false)
                return res
              })
            }
          >
            Import rows
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)]">
        <div className="border-b border-[var(--border-main)] p-3">
          <input
            className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
            placeholder="Search invoice, AWB, order…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Carrier / AWB</th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Billed</th>
                <th className="px-4 py-3">Diff</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={String(row.invoiceNo)} className="border-t border-[var(--border-main)]">
                  <td className="px-4 py-3 font-mono text-xs">{String(row.invoiceNo)}</td>
                  <td className="px-4 py-3 text-xs">
                    {String(row.carrier || '—')}
                    <br />
                    {String(row.awb || '')}
                  </td>
                  <td className="px-4 py-3">{money(row.expectedUSD)}</td>
                  <td className="px-4 py-3">{money(row.billedUSD)}</td>
                  <td className="px-4 py-3">{money(row.differenceUSD)}</td>
                  <td className="px-4 py-3">
                    <Badge>{String(row.auditStatus || row.status || '—')}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedId(String(row.invoiceNo))
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
                  <td colSpan={7} className="px-4 py-10 text-center text-[var(--text-muted)]">
                    No courier bills yet
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
