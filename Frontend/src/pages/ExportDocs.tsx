import { ArrowLeft, Download, FilePlus, Link2, Plus, Printer, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type ResourceRow } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'

type Tab = 'overview' | 'customs' | 'documents' | 'lines' | 'timeline'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'customs', label: 'Customs' },
  { id: 'documents', label: 'Documents' },
  { id: 'lines', label: 'SKU lines' },
  { id: 'timeline', label: 'Timeline' },
]

const DOC_TYPES = [
  'Commercial invoice',
  'Packing list',
  'Certificate of origin',
  'India shipping bill',
  'BL / AWB',
  'ISF confirmation',
  'Customs entry',
  'Duty statement',
  'Other',
]

function openHtmlPrint(html: string) {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

export function ExportDocs() {
  const { pushToast } = useApp()
  const { list, create, update, remove, refresh, loading, error } = useData()
  const rows = list('export_docs')
  const transfers = list('replenishment')

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<ResourceRow | null>(null)
  const [fromTransfer, setFromTransfer] = useState('')
  const [newDoc, setNewDoc] = useState({
    type: 'Commercial invoice',
    refNo: '',
    issueDate: '',
    status: 'Received',
    notes: '',
    fileName: '',
    fileUrl: '',
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const listRows = [...rows].sort((a, b) =>
      String(b.exportShipmentId || b.invoiceNo || '').localeCompare(
        String(a.exportShipmentId || a.invoiceNo || ''),
      ),
    )
    if (!q) return listRows
    return listRows.filter((r) =>
      [
        r.invoiceNo,
        r.exportShipmentId,
        r.stockTransferId,
        r.consignee,
        r.blNumber,
        r.containerNo,
        r.docStatus,
        r.customsStatus,
      ]
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

  const openCreateBlank = () => {
    const year = new Date().getFullYear()
    const d: ResourceRow = {
      invoiceNo: `CI-${Date.now().toString().slice(-6)}`,
      exportShipmentId: `EXP-USA-${year}-${String(rows.length + 1).padStart(4, '0')}`,
      stockTransferId: '',
      date: new Date().toISOString().slice(0, 10),
      consignee: '',
      destination: 'USA',
      shipmentType: 'SEA_FCL_40',
      incoterms: 'FOB',
      hsn: '5701.10',
      customsStatus: 'Pending',
      docStatus: 'Draft',
      documents: [],
      documentChecklist: [],
      lineItems: [],
      timeline: [],
    }
    setDraft(d)
    setSelectedId(String(d.invoiceNo))
    setTab('overview')
  }

  const save = async () => {
    if (!form) return
    try {
      setBusy(true)
      const id = String(form.invoiceNo || '')
      if (!id) throw new Error('Invoice no required')
      const exists = rows.some((r) => String(r.invoiceNo) === id && selected && !draft)
      if (draft && !rows.some((r) => String(r.invoiceNo) === id)) {
        await create('export_docs', form)
      } else {
        await update('export_docs', id, form)
      }
      setDraft(null)
      setSelectedId(id)
      pushToast(exists || selected ? 'Export file saved' : 'Export file created', 'success')
      await refresh('export_docs')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const createFromTransfer = async () => {
    if (!fromTransfer) return
    try {
      setBusy(true)
      const res = await api.exportDocsApi.createFromTransfer(fromTransfer)
      pushToast(res.message || 'Created', 'success')
      await refresh('export_docs')
      if (res.data?.invoiceNo) {
        setSelectedId(String(res.data.invoiceNo))
        setDraft(null)
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Create failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const runGenerate = async (kind: 'commercial' | 'packing') => {
    if (!form?.invoiceNo) return
    try {
      setBusy(true)
      // persist first if draft
      if (draft) await save()
      const res = await api.exportDocsApi.generatePdf(String(form.invoiceNo), kind)
      if (res.html) openHtmlPrint(res.html)
      pushToast(res.message || 'Opened print view', 'success')
      await refresh('export_docs')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Generate failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const addDocument = async () => {
    if (!form?.invoiceNo) return
    try {
      setBusy(true)
      if (draft) await save()
      const res = await api.exportDocsApi.addDocument(String(form.invoiceNo), newDoc)
      pushToast(res.message || 'Document added', 'success')
      setNewDoc({
        type: 'Commercial invoice',
        refNo: '',
        issueDate: '',
        status: 'Received',
        notes: '',
        fileName: '',
        fileUrl: '',
      })
      await refresh('export_docs')
      setDraft(null)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Add doc failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onFile = (file: File | null) => {
    if (!file) return
    if (file.size > 2_500_000) {
      pushToast('Keep attachments under ~2.5MB (data URL storage)', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setNewDoc((d) => ({
        ...d,
        fileName: file.name,
        fileUrl: String(reader.result || ''),
      }))
    }
    reader.readAsDataURL(file)
  }

  const docs = Array.isArray(form?.documents) ? (form!.documents as ResourceRow[]) : []
  const checklist = Array.isArray(form?.documentChecklist)
    ? (form!.documentChecklist as ResourceRow[])
    : []
  const lines = Array.isArray(form?.lineItems) ? (form!.lineItems as ResourceRow[]) : []
  const timeline = Array.isArray(form?.timeline) ? (form!.timeline as ResourceRow[]) : []

  if (form) {
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
          <ArrowLeft className="h-4 w-4" /> All export files
        </button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)]">
              {String(form.invoiceNo)}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Master ID <strong>{String(form.exportShipmentId || '—')}</strong>
              {form.stockTransferId ? (
                <>
                  {' '}
                  · Transfer{' '}
                  <Link className="text-indigo-600 underline" to="/stock-transfers">
                    {String(form.stockTransferId)}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge>{String(form.docStatus || 'Draft')}</Badge>
            <Badge>{String(form.customsStatus || '—')}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save export file'}
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void runGenerate('commercial')}>
            <Printer className="h-3.5 w-3.5" /> Generate commercial invoice PDF
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void runGenerate('packing')}>
            <Printer className="h-3.5 w-3.5" /> Generate packing list PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!docs.length}
            onClick={() => {
              docs.forEach((d) => {
                const url = String(d.fileUrl || '')
                if (url) window.open(url, '_blank')
              })
              pushToast(docs.length ? `Opened ${docs.length} attachment(s)` : 'No files', 'success')
            }}
          >
            <Download className="h-3.5 w-3.5" /> Download all documents
          </Button>
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
                  ['invoiceNo', 'Invoice no'],
                  ['exportShipmentId', 'Export Shipment ID (master)'],
                  ['stockTransferId', 'Stock Transfer ID'],
                  ['loadingPlanId', 'Loading Plan ID'],
                  ['date', 'Invoice date'],
                  ['consignee', 'Consignee / importer'],
                  ['destination', 'Destination'],
                  ['shipmentType', 'Shipment type'],
                  ['incoterms', 'Incoterms'],
                  ['hsn', 'HSN'],
                  ['blNumber', 'BL / AWB'],
                  ['containerNo', 'Container'],
                  ['pol', 'POL'],
                  ['pod', 'POD'],
                  ['vesselVoyage', 'Vessel / voyage'],
                  ['docStatus', 'Document status'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs font-semibold">
                  {label}
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                    value={String(form[key] ?? '')}
                    disabled={key === 'invoiceNo' && Boolean(selected) && !draft}
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
                  ['indiaShippingBill', 'India shipping bill'],
                  ['leoDate', 'LEO date'],
                  ['customsStatus', 'Export customs status'],
                  ['usIsfStatus', 'US ISF status'],
                  ['importerOfRecord', 'Importer of record'],
                  ['entryNumber', 'US entry number'],
                  ['dutiesUSD', 'Duties USD'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs font-semibold">
                  {label}
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                    value={String(form[key] ?? '')}
                    onChange={(e) =>
                      patch({
                        [key]: key === 'dutiesUSD' ? Number(e.target.value) : e.target.value,
                      })
                    }
                  />
                </label>
              ))}
              <p className="sm:col-span-2 text-[12px] text-[var(--text-dim)]">
                Uploading an ISF PDF is not proof of timely filing — set ISF status from broker
                confirmation.
              </p>
            </div>
          ) : null}

          {tab === 'documents' ? (
            <div className="space-y-4">
              {checklist.length ? (
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--text-dim)]">Checklist</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {checklist.map((c, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 border-b border-[var(--border-main)] py-1.5">
                        <span>{String(c.category)}</span>
                        <Badge>{String(c.state)}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="rounded-lg border border-dashed border-[var(--border-main)] p-3">
                <p className="text-xs font-bold">Add document</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-semibold">
                    Type
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-sm"
                      value={newDoc.type}
                      onChange={(e) => setNewDoc((d) => ({ ...d, type: e.target.value }))}
                    >
                      {DOC_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold">
                    Status
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-sm"
                      value={newDoc.status}
                      onChange={(e) => setNewDoc((d) => ({ ...d, status: e.target.value }))}
                    >
                      {['Pending', 'Received', 'Verified', 'Needs Correction'].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold">
                    Reference no
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                      value={newDoc.refNo}
                      onChange={(e) => setNewDoc((d) => ({ ...d, refNo: e.target.value }))}
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Issue date
                    <input
                      type="date"
                      className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                      value={newDoc.issueDate}
                      onChange={(e) => setNewDoc((d) => ({ ...d, issueDate: e.target.value }))}
                    />
                  </label>
                  <label className="text-xs font-semibold sm:col-span-2">
                    Attach PDF / image (optional)
                    <input
                      type="file"
                      accept=".pdf,image/*,.xlsx,.csv"
                      className="mt-1 block w-full text-sm"
                      onChange={(e) => onFile(e.target.files?.[0] || null)}
                    />
                    {newDoc.fileName ? (
                      <span className="text-[11px] text-[var(--text-dim)]">{newDoc.fileName}</span>
                    ) : null}
                  </label>
                </div>
                <Button className="mt-2" size="sm" variant="primary" disabled={busy} onClick={() => void addDocument()}>
                  <FilePlus className="h-3.5 w-3.5" /> Save document (keeps prior version)
                </Button>
              </div>

              <div className="space-y-2">
                {docs.map((d) => (
                  <div
                    key={String(d.id)}
                    className="flex flex-col gap-1 rounded-lg border border-[var(--border-main)] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {String(d.type)} · v{String(d.version || 1)}
                      </p>
                      <p className="text-[12px] text-[var(--text-muted)]">
                        {String(d.refNo || '—')} · {String(d.issueDate || '')} · {String(d.fileName || 'no file')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{String(d.status)}</Badge>
                      {d.fileUrl ? (
                        <a
                          href={String(d.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-indigo-600 underline"
                        >
                          Preview
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
                {!docs.length ? (
                  <p className="text-sm text-[var(--text-muted)]">No documents yet.</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === 'lines' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-[10px] uppercase text-[var(--text-dim)]">
                  <tr>
                    <th className="py-2">SKU</th>
                    <th>Title</th>
                    <th>HSN</th>
                    <th>Qty</th>
                    <th>Unit USD</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="border-t border-[var(--border-main)]">
                      <td className="py-2 font-mono text-xs">{String(l.sku)}</td>
                      <td>{String(l.title || '')}</td>
                      <td>{String(l.hsn || form.hsn || '')}</td>
                      <td>{String(l.qty || 0)}</td>
                      <td>${Number(l.unitValueUsd || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!lines.length ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Create from a Stock Transfer to pull SKU lines automatically.
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === 'timeline' ? (
            <ul className="space-y-2 text-sm">
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
              {!timeline.length ? (
                <p className="text-[var(--text-muted)]">No events yet.</p>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-2xl">
            Export Documentation
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            One master Export Shipment ID (EXP-USA-…) links invoices, packing lists, BL/AWB — same ID as
            Stock Transfers. Do not duplicate a shipment just to add another file.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={openCreateBlank}>
            <Plus className="h-3.5 w-3.5" /> Create export file
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void refresh('export_docs')}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-950 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-100">
        <p className="font-bold">Create from Stock Transfer</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="h-10 flex-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
            value={fromTransfer}
            onChange={(e) => setFromTransfer(e.target.value)}
          >
            <option value="">Select transfer…</option>
            {transfers.map((t) => (
              <option key={String(t.shipmentId)} value={String(t.shipmentId)}>
                {String(t.shipmentId)} · {String(t.exportShipmentId || 'no EXP-ID')} ·{' '}
                {String(t.status || '')}
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" disabled={busy || !fromTransfer} onClick={() => void createFromTransfer()}>
            <Link2 className="h-3.5 w-3.5" /> Create / open export file
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border-main)] p-3 sm:flex-row sm:items-center sm:p-4">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search EXP-ID, invoice, BL, container…"
            className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
          />
          <span className="text-xs text-[var(--text-muted)]">
            {loading ? 'Loading…' : `${filtered.length} files`}
          </span>
        </div>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-3">Export Shipment ID</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Transfer</th>
                <th className="px-4 py-3">Consignee</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Customs</th>
                <th className="px-4 py-3">Open</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={String(row.invoiceNo)} className="border-t border-[var(--border-main)]">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {String(row.exportShipmentId || '—')}
                  </td>
                  <td className="px-4 py-3">{String(row.invoiceNo)}</td>
                  <td className="px-4 py-3 text-xs">{String(row.stockTransferId || '—')}</td>
                  <td className="px-4 py-3">{String(row.consignee || '—')}</td>
                  <td className="px-4 py-3">
                    <Badge>{String(row.docStatus || '—')}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{String(row.customsStatus || '—')}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedId(String(row.invoiceNo))
                        setDraft(null)
                        setTab('overview')
                      }}
                    >
                      View / Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-1"
                      onClick={() => {
                        if (!confirm('Delete export file?')) return
                        void remove('export_docs', String(row.invoiceNo))
                      }}
                    >
                      Del
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && !pageItems.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                    No export files — create blank or from a Stock Transfer.
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
