import { ArrowLeft, Plus, RefreshCw, Ship, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, type ResourceRow } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'
import {
  DOC_CATEGORIES,
  emptyTransferDraft,
  modeLabel,
  normalizeMode,
  SHIPPING_MODES,
  TRANSFER_STATUSES,
  type TransferExpense,
  type TransferItem,
  type TransferPackage,
} from '../lib/stockTransfer'

type Tab =
  | 'overview'
  | 'rugs'
  | 'ocean'
  | 'customs'
  | 'documents'
  | 'expenses'
  | 'receipt'
  | 'timeline'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'rugs', label: 'Rugs & Packing' },
  { id: 'ocean', label: 'Ocean / Container / LCL' },
  { id: 'customs', label: 'Customs & Compliance' },
  { id: 'documents', label: 'Documents' },
  { id: 'expenses', label: 'Expenses & Landed Cost' },
  { id: 'receipt', label: 'USA Warehouse Receipt' },
  { id: 'timeline', label: 'Timeline & Audit' },
]

function asItems(row: ResourceRow): TransferItem[] {
  return Array.isArray(row.items) ? (row.items as TransferItem[]) : []
}

function asPackages(row: ResourceRow): TransferPackage[] {
  return Array.isArray(row.packages) ? (row.packages as TransferPackage[]) : []
}

function asExpenses(row: ResourceRow): TransferExpense[] {
  return Array.isArray(row.expenses) ? (row.expenses as TransferExpense[]) : []
}

function asTimeline(row: ResourceRow) {
  return Array.isArray(row.timeline) ? row.timeline : []
}

export function StockTransfers() {
  const { pushToast } = useApp()
  const { list, create, update, remove, refresh, loading, error } = useData()
  const rows = list('replenishment')
  const skus = list('skus')

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<ResourceRow | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const listRows = [...rows].sort((a, b) =>
      String(b.shipmentId || '').localeCompare(String(a.shipmentId || '')),
    )
    if (!q) return listRows
    return listRows.filter((r) =>
      [
        r.shipmentId,
        r.exportShipmentId,
        r.status,
        r.originWh,
        r.destWh,
        r.transitMode,
        r.shippingMode,
        r.carrier,
        r.containerNo,
        r.blNumber,
        r.skuSummary,
      ]
        .map((x) => String(x || '').toLowerCase())
        .some((s) => s.includes(q)),
    )
  }, [rows, query])

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const selected = selectedId ? rows.find((r) => String(r.shipmentId) === selectedId) : null
  const form = draft || selected

  const openCreate = () => {
    const d = emptyTransferDraft() as unknown as ResourceRow
    setDraft(d)
    setSelectedId(String(d.shipmentId))
    setTab('overview')
  }

  const openRow = (id: string) => {
    setSelectedId(id)
    setDraft(null)
    setTab('overview')
  }

  const patch = (partial: Record<string, unknown>) => {
    setDraft((prev) => {
      const base = prev || selected
      if (!base) return prev
      return { ...base, ...partial }
    })
  }

  const save = async () => {
    if (!form) return
    const shipmentId = String(form.shipmentId || '').trim()
    if (!shipmentId) {
      pushToast('Shipment ID required', 'danger')
      return
    }
    try {
      setBusy(true)
      const mode = normalizeMode(form.shippingMode || form.transitMode)
      const payload: ResourceRow = {
        ...form,
        shipmentId,
        shippingMode: mode,
        transitMode: modeLabel(mode),
        exportShipmentId: form.exportShipmentId || `EXP-USA-${new Date().getFullYear()}-NEW`,
      }
      const exists = rows.some((r) => String(r.shipmentId) === shipmentId)
      if (exists) await update('replenishment', shipmentId, payload)
      else await create('replenishment', payload)
      await refresh('replenishment')
      setDraft(null)
      setSelectedId(shipmentId)
      pushToast('Transfer saved', 'success')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Save failed', 'danger')
    } finally {
      setBusy(false)
    }
  }

  const pushTimeline = (status: string, note: string) => {
    const ev = {
      id: `ev-${Date.now()}`,
      at: new Date().toISOString(),
      status,
      by: 'user',
      note,
    }
    const timeline = [...asTimeline(form || {}), ev]
    patch({ status, timeline })
  }

  const runDispatch = async () => {
    if (!form?.shipmentId) return
    try {
      setBusy(true)
      await save()
      const res = await api.transfers.dispatch(String(form.shipmentId))
      await refresh('replenishment')
      await refresh('skus')
      await refresh('sku_history')
      if (res.transfer) {
        setDraft(null)
        setSelectedId(String(res.transfer.shipmentId))
      }
      pushToast(res.message || 'Dispatched', 'success')
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Dispatch failed', 'danger')
    } finally {
      setBusy(false)
    }
  }

  const runReceive = async () => {
    if (!form?.shipmentId) return
    try {
      setBusy(true)
      const items = asItems(form)
      const lines = items.map((i) => {
        const good = Number(i.receivedQty ?? i.qty) - Number(i.damagedQty || 0) - Number(i.missingQty || 0)
        return {
          sku: i.sku,
          good: Math.max(0, good),
          damaged: Number(i.damagedQty || 0),
          missing: Number(i.missingQty || 0),
        }
      })
      // persist receive qtys first
      await update('replenishment', String(form.shipmentId), { ...form, items })
      const res = await api.transfers.receive(String(form.shipmentId), lines)
      await refresh('replenishment')
      await refresh('skus')
      await refresh('sku_history')
      setDraft(null)
      pushToast(res.message || 'Received', 'success')
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Receive failed', 'danger')
    } finally {
      setBusy(false)
    }
  }

  const addSkuLine = (skuCode: string) => {
    const sku = skus.find((s) => String(s.sku) === skuCode)
    if (!sku || !form) return
    const items = [...asItems(form)]
    if (items.some((i) => i.sku === skuCode)) {
      pushToast('SKU already on this transfer', 'info')
      return
    }
    items.push({
      sku: skuCode,
      title: String(sku.title || ''),
      qty: 1,
      unitValueUsd: Number(sku.sellingPriceUSD || 0),
      receivedQty: 1,
      damagedQty: 0,
      missingQty: 0,
    })
    const total = items.reduce((s, i) => s + Number(i.qty || 0), 0)
    patch({ items, skuSummary: `${total} rugs · ${items.length} SKU lines` })
  }

  /** LIST VIEW */
  if (!form) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-[var(--text-main)] sm:text-2xl">
              Stock Transfers · India → US
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Sea LCL / 20ft / 40ft FCL + Air. Existing list kept — open a row for full shipment tabs
              (docs, customs, landed cost, US receipt).
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> New transfer
          </Button>
        </div>

        <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm dark:border-teal-500/30 dark:bg-teal-500/10">
          <p className="font-bold text-[var(--text-main)]">How movement works (no double stock)</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-[13px] text-[var(--text-muted)]">
            <li>Add rug SKU lines → Save.</li>
            <li>
              <strong>Post dispatch</strong> moves India available → In Transit (Stock History).
            </li>
            <li>
              US receive posts good qty to US available; damaged/missing stay as exceptions — cannot
              auto-close until resolved.
            </li>
            <li>
              Link <strong>Export Shipment ID</strong> on Export Docs / Loading Plans (same ID).
            </li>
          </ol>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)]">
          <div className="flex flex-col gap-3 border-b border-[var(--border-main)] p-3 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search shipment, EXP-ID, container, BL, carrier…"
              className="h-10 flex-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
            />
            <span className="text-xs text-[var(--text-muted)]">
              {loading ? 'Loading…' : `${filtered.length} transfers`}
            </span>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-dim)]">
                <tr>
                  <th className="px-3 py-2">Shipment</th>
                  <th className="px-3 py-2">Export ID</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">From → To</th>
                  <th className="px-3 py-2">Container / BL</th>
                  <th className="px-3 py-2">ETD / ETA</th>
                  <th className="px-3 py-2">Rugs</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => {
                  const items = asItems(r)
                  const qty = items.reduce((s, i) => s + Number(i.qty || 0), 0)
                  return (
                    <tr
                      key={String(r.shipmentId)}
                      className="cursor-pointer border-t border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]/50"
                      onClick={() => openRow(String(r.shipmentId))}
                    >
                      <td className="px-3 py-2 font-semibold text-indigo-700">
                        {String(r.shipmentId)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {String(r.exportShipmentId || '—')}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone="cyan">{String(r.status || '—')}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {modeLabel(r.shippingMode || r.transitMode)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {String(r.originWh || '—')} → {String(r.destWh || '—')}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {String(r.containerNo || r.blNumber || '—')}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {String(r.etd || '—')} / {String(r.eta || '—')}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {qty || String(r.skuSummary || '—')}
                      </td>
                    </tr>
                  )
                })}
                {!pageItems.length ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">
                      No transfers yet — create one for a sea / air India→US move.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--border-main)] p-3">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n)
                setPage(1)
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  /** DETAIL VIEW */
  const items = asItems(form)
  const packages = asPackages(form)
  const expenses = asExpenses(form)
  const timeline = asTimeline(form)
  const docs = Array.isArray(form.documents) ? form.documents : []
  const landed =
    expenses.reduce((s, e) => s + Number(e.amount || 0), 0) +
    items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.unitValueUsd || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setSelectedId(null)
            setDraft(null)
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to list
        </Button>
        <Badge tone="purple">{String(form.shipmentId)}</Badge>
        {form.exportShipmentId ? (
          <Badge tone="slate">{String(form.exportShipmentId)}</Badge>
        ) : null}
        <Badge tone="cyan">{String(form.status || 'Draft')}</Badge>
        <span className="text-xs text-[var(--text-dim)]">
          {modeLabel(form.shippingMode || form.transitMode)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save transfer'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || Boolean(form.dispatchedPosted)}
          onClick={() => void runDispatch()}
        >
          <Ship className="h-3.5 w-3.5" />
          {form.dispatchedPosted ? 'Dispatch posted' : 'Post dispatch (India → Transit)'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || !form.dispatchedPosted || Boolean(form.receivedPosted)}
          onClick={() => void runReceive()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {form.receivedPosted ? 'Receive posted' : 'Post US receive'}
        </Button>
        <Link
          to="/export-docs"
          className="inline-flex h-8 items-center rounded-lg border border-[var(--border-main)] px-2.5 text-xs font-semibold text-[var(--text-main)] no-underline"
        >
          Open Export Docs
        </Link>
        {selected && !draft ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!confirm('Delete this transfer record? Inventory already posted is not auto-reversed.'))
                return
              void remove('replenishment', String(form.shipmentId)).then(() => {
                setSelectedId(null)
                pushToast('Transfer deleted', 'success')
              })
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold sm:text-xs ${
              tab === t.id
                ? 'bg-indigo-600 text-white'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
        {tab === 'overview' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['shipmentId', 'Shipment ID'],
                ['exportShipmentId', 'Export Shipment ID (master)'],
                ['originWh', 'Origin warehouse'],
                ['destWh', 'Destination warehouse'],
                ['carrier', 'Carrier / line'],
                ['forwarder', 'Freight forwarder'],
                ['bookingNumber', 'Booking number'],
                ['blNumber', 'B/L or AWB'],
                ['containerNo', 'Container / tracking'],
                ['pol', 'Load port (POL)'],
                ['pod', 'Discharge port (POD)'],
                ['vesselVoyage', 'Vessel / voyage or flight'],
                ['incoterm', 'Incoterm'],
                ['etd', 'ETD (planned)'],
                ['eta', 'ETA (planned)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs font-semibold">
                {label}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                  value={String(form[key] ?? '')}
                  disabled={key === 'shipmentId' && Boolean(selected) && !draft}
                  onChange={(e) => patch({ [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="block text-xs font-semibold">
              Shipping mode
              <select
                className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                value={normalizeMode(form.shippingMode || form.transitMode)}
                onChange={(e) => patch({ shippingMode: e.target.value, transitMode: modeLabel(e.target.value) })}
              >
                {SHIPPING_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold">
              Status
              <select
                className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                value={String(form.status || 'Draft')}
                onChange={(e) => {
                  pushTimeline(e.target.value, `Status set to ${e.target.value}`)
                }}
              >
                {TRANSFER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {!TRANSFER_STATUSES.includes(String(form.status || '') as never) && form.status ? (
                  <option value={String(form.status)}>{String(form.status)}</option>
                ) : null}
              </select>
            </label>
            <label className="block text-xs font-semibold sm:col-span-2">
              SKU / qty note (legacy summary)
              <textarea
                className="mt-1 min-h-[70px] w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
                value={String(form.skuSummary || '')}
                onChange={(e) => patch({ skuSummary: e.target.value })}
              />
            </label>
          </div>
        ) : null}

        {tab === 'rugs' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="block text-xs font-semibold">
                Add SKU from Inventory
                <select
                  className="mt-1 h-10 min-w-[220px] rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) addSkuLine(e.target.value)
                    e.target.value = ''
                  }}
                >
                  <option value="">Select SKU…</option>
                  {skus.slice(0, 200).map((s) => (
                    <option key={String(s.sku)} value={String(s.sku)}>
                      {String(s.sku)} — {String(s.title || '').slice(0, 40)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="table-scroll">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-dim)]">
                  <tr>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">Qty ship</th>
                    <th className="px-2 py-2">Recv good</th>
                    <th className="px-2 py-2">Damaged</th>
                    <th className="px-2 py-2">Missing</th>
                    <th className="px-2 py-2">Value USD</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((line, idx) => (
                    <tr key={line.sku} className="border-t border-[var(--border-subtle)]">
                      <td className="px-2 py-2">
                        <div className="font-semibold">{line.sku}</div>
                        <div className="text-[11px] text-[var(--text-dim)]">{line.title}</div>
                      </td>
                      {(['qty', 'receivedQty', 'damagedQty', 'missingQty', 'unitValueUsd'] as const).map(
                        (field) => (
                          <td key={field} className="px-2 py-2">
                            <input
                              type="number"
                              className="h-9 w-20 rounded border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-sm"
                              value={Number(line[field] ?? 0)}
                              onChange={(e) => {
                                const next = [...items]
                                next[idx] = { ...line, [field]: Number(e.target.value) }
                                patch({ items: next })
                              }}
                            />
                          </td>
                        ),
                      )}
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600"
                          onClick={() => patch({ items: items.filter((_, i) => i !== idx) })}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[var(--text-dim)]">
              Packages (optional): add roll/carton IDs for packing proof.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                patch({
                  packages: [
                    ...packages,
                    {
                      packageId: `ROLL-${packages.length + 1}`,
                      lengthCm: 0,
                      widthCm: 0,
                      heightCm: 0,
                      grossKg: 0,
                      cbm: 0,
                    },
                  ],
                })
              }
            >
              + Package / roll
            </Button>
            {packages.length ? (
              <ul className="space-y-1 text-xs">
                {packages.map((p, i) => (
                  <li key={p.packageId} className="flex flex-wrap gap-2 rounded border border-[var(--border-subtle)] px-2 py-1.5">
                    <input
                      className="h-8 rounded border px-2"
                      value={p.packageId}
                      onChange={(e) => {
                        const next = [...packages]
                        next[i] = { ...p, packageId: e.target.value }
                        patch({ packages: next })
                      }}
                    />
                    <span className="text-[var(--text-dim)]">L×W×H cm / kg editable after save in notes for now</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {tab === 'ocean' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="text-sm text-[var(--text-muted)] sm:col-span-2">
              LCL: container number optional. FCL: enter container + seal. Air: use AWB in B/L field.
            </p>
            {(
              [
                ['bookingNumber', 'Booking number'],
                ['blNumber', 'HBL / MBL / AWB'],
                ['containerNo', 'Container number'],
                ['sealNumber', 'Seal number'],
                ['vesselVoyage', 'Vessel + voyage / flight'],
                ['pol', 'POL'],
                ['pod', 'POD'],
                ['originCfs', 'Origin CFS'],
                ['destCfs', 'US destination CFS'],
                ['freeTimeDays', 'Free time (days)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs font-semibold">
                {label}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                  value={String(form[key] ?? '')}
                  onChange={(e) => patch({ [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
        ) : null}

        {tab === 'customs' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['indiaShippingBill', 'India Shipping Bill no.'],
                ['leoDate', 'LEO date'],
                ['usIsfStatus', 'US ISF status'],
                ['isfDeadline', 'ISF filing deadline'],
                ['customsBroker', 'US customs broker'],
                ['importerOfRecord', 'Importer of Record (IOR)'],
                ['entryNumber', 'US entry number'],
                ['dutyAmount', 'Duty / taxes amount'],
                ['customsReleaseDate', 'Customs release date'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs font-semibold">
                {label}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                  value={String(form[key] ?? '')}
                  onChange={(e) => patch({ [key]: e.target.value })}
                />
              </label>
            ))}
            <p className="text-xs text-[var(--text-dim)] sm:col-span-2">
              Uploading an ISF PDF is not the same as timely filing — set ISF status from broker
              confirmation.
            </p>
          </div>
        ) : null}

        {tab === 'documents' ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              Checklist by category. Mark Missing / Uploaded / Verified. Full file storage can attach
              via Export Docs using the same Export Shipment ID.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DOC_CATEGORIES.map((cat) => {
                const checklist = Array.isArray(form.documentChecklist)
                  ? form.documentChecklist
                  : DOC_CATEGORIES.map((c) => ({ category: c, state: 'Missing' }))
                const row = checklist.find((c: { category: string }) => c.category === cat) || {
                  category: cat,
                  state: 'Missing',
                }
                return (
                  <label key={cat} className="rounded-lg border border-[var(--border-main)] p-3 text-xs font-semibold">
                    {cat}
                    <select
                      className="mt-1 h-9 w-full rounded border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2"
                      value={String(row.state || 'Missing')}
                      onChange={(e) => {
                        const next = DOC_CATEGORIES.map((c) => {
                          const prev = checklist.find((x: { category: string }) => x.category === c)
                          if (c === cat) return { category: c, state: e.target.value }
                          return prev || { category: c, state: 'Missing' }
                        })
                        patch({ documentChecklist: next })
                      }}
                    >
                      {['Not required', 'Missing', 'Uploaded', 'Verified', 'Rejected'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                patch({
                  documents: [
                    ...docs,
                    {
                      id: `doc-${Date.now()}`,
                      category: 'Commercial',
                      name: 'Commercial invoice',
                      referenceNumber: '',
                      reviewState: 'Uploaded',
                    },
                  ],
                })
              }
            >
              + Document metadata row
            </Button>
            <ul className="space-y-1 text-xs">
              {docs.map((d: { id: string; name: string; category: string; reviewState?: string }, i: number) => (
                <li key={d.id} className="rounded border border-[var(--border-subtle)] px-2 py-1.5">
                  {d.category} · {d.name} · {d.reviewState || 'Uploaded'}
                  <button
                    type="button"
                    className="ml-2 text-red-600"
                    onClick={() => patch({ documents: docs.filter((_: unknown, j: number) => j !== i) })}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === 'expenses' ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              Estimated vs actual charge lines. Landed preview (rug value + expenses):{' '}
              <strong>${landed.toLocaleString()}</strong>
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                patch({
                  expenses: [
                    ...expenses,
                    {
                      id: `exp-${Date.now()}`,
                      chargeType: 'Ocean freight',
                      amount: 0,
                      currency: 'USD',
                      estimatedOrActual: 'estimated',
                      vendor: '',
                      allocationMethod: 'by quantity',
                    },
                  ],
                })
              }
            >
              + Expense line
            </Button>
            <div className="space-y-2">
              {expenses.map((e, i) => (
                <div key={e.id} className="grid gap-2 rounded-lg border border-[var(--border-main)] p-2 sm:grid-cols-4">
                  <input
                    className="h-9 rounded border px-2 text-sm"
                    placeholder="Charge type"
                    value={e.chargeType}
                    onChange={(ev) => {
                      const next = [...expenses]
                      next[i] = { ...e, chargeType: ev.target.value }
                      patch({ expenses: next })
                    }}
                  />
                  <input
                    className="h-9 rounded border px-2 text-sm"
                    placeholder="Vendor"
                    value={e.vendor || ''}
                    onChange={(ev) => {
                      const next = [...expenses]
                      next[i] = { ...e, vendor: ev.target.value }
                      patch({ expenses: next })
                    }}
                  />
                  <input
                    type="number"
                    className="h-9 rounded border px-2 text-sm"
                    value={e.amount}
                    onChange={(ev) => {
                      const next = [...expenses]
                      next[i] = { ...e, amount: Number(ev.target.value) }
                      patch({ expenses: next })
                    }}
                  />
                  <select
                    className="h-9 rounded border px-2 text-sm"
                    value={e.estimatedOrActual || 'estimated'}
                    onChange={(ev) => {
                      const next = [...expenses]
                      next[i] = {
                        ...e,
                        estimatedOrActual: ev.target.value as 'estimated' | 'actual',
                      }
                      patch({ expenses: next })
                    }}
                  >
                    <option value="estimated">Estimated</option>
                    <option value="actual">Actual</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === 'receipt' ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              Enter received / damaged / missing on <strong>Rugs &amp; Packing</strong>, then{' '}
              <strong>Post US receive</strong>. US available only increases for good qty — never on
              Delivered alone.
            </p>
            <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] p-3 text-sm">
              <p>
                Receipt summary:{' '}
                good {String((form.receipt as { receivedGood?: number })?.receivedGood ?? '—')} ·
                damaged {String((form.receipt as { damaged?: number })?.damaged ?? '—')} · missing{' '}
                {String((form.receipt as { missing?: number })?.missing ?? '—')}
              </p>
              <p className="mt-1 text-xs text-[var(--text-dim)]">
                Reconciliation: {String(form.reconciliationStatus || 'Not received yet')}
              </p>
            </div>
            {form.receivedPosted &&
            (Number((form.receipt as { damaged?: number })?.damaged || 0) > 0 ||
              Number((form.receipt as { missing?: number })?.missing || 0) > 0) ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Exceptions open — transfer should not Close until damaged/missing are resolved
                (client rule).
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'timeline' ? (
          <ol className="space-y-2">
            {[...timeline].reverse().map((ev: { id: string; at: string; status: string; by?: string; note?: string }) => (
              <li key={ev.id} className="rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="slate">{ev.status}</Badge>
                  <span className="font-mono text-[11px] text-[var(--text-dim)]">
                    {String(ev.at).replace('T', ' ').slice(0, 19)}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">{ev.by}</span>
                </div>
                {ev.note ? <p className="mt-1 text-xs text-[var(--text-muted)]">{ev.note}</p> : null}
              </li>
            ))}
            {!timeline.length ? (
              <li className="text-sm text-[var(--text-muted)]">No events yet — save or change status.</li>
            ) : null}
          </ol>
        ) : null}
      </div>
    </div>
  )
}
