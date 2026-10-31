import {
  Download,
  Eye,
  MoveHorizontal,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ResourceRow } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'

type StockTab = 'all' | 'lowStock' | 'india' | 'usa' | 'inTransit' | 'heritage' | 'boho'

type Stock = {
  indiaAvailable?: number
  indiaPacked?: number
  inTransit?: number
  usaAvailable?: number
  usaReserved?: number
  fba?: number
}

function stockOf(sku: ResourceRow): Stock {
  return (sku.stock as Stock) || {}
}

function getSkuTotalStock(sku: ResourceRow): number {
  const s = stockOf(sku)
  return (
    Number(s.indiaAvailable || 0) +
    Number(s.indiaPacked || 0) +
    Number(s.inTransit || 0) +
    Number(s.usaAvailable || 0) +
    Number(s.usaReserved || 0) +
    Number(s.fba || 0)
  )
}

function getDaysOfCover(sku: ResourceRow): number {
  const s = stockOf(sku)
  const available = Number(s.usaAvailable || 0) + Number(s.indiaAvailable || 0)
  return Math.round(available / 1.8)
}

const FORM_FIELDS = [
  'sku',
  'odetteSku',
  'title',
  'collection',
  'construction',
  'material',
  'size',
  'sellingPriceUSD',
  'mfgCostUSD',
  'weightKg',
  'barcode',
  'imageUrl',
] as const

export function Inventory() {
  const { openModal, pushToast } = useApp()
  const { list, create, update, remove, loading, error } = useData()
  const skus = list('skus')

  const [tab, setTab] = useState<StockTab>('all')
  const [query, setQuery] = useState('')
  const [collection, setCollection] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSku, setEditingSku] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [deleteSku, setDeleteSku] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  const CSV_HEADERS = [
    'sku',
    'odetteSku',
    'title',
    'collection',
    'construction',
    'material',
    'size',
    'sellingPriceUSD',
    'mfgCostUSD',
    'weightKg',
    'barcode',
    'imageUrl',
    'indiaAvailable',
    'usaAvailable',
  ] as const

  const downloadTemplate = () => {
    const sample = [
      CSV_HEADERS.join(','),
      'SKU-SAMPLE-001,,Sample Braided Jute Rug,Heritage,Flatweave,Jute,5x8,420,180,4.5,BC-SAMPLE-001,,10,0',
      'SKU-SAMPLE-002,,Sample Wool Kilim,Boho,Handwoven,Wool,2.5x8,310,140,2.2,BC-SAMPLE-002,,5,0',
    ].join('\n')
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rugos-inventory-bulk-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    pushToast('Template downloaded — fill rows and Bulk CSV Import', 'success')
  }

  const parseCsvLine = (line: string) => {
    const out: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQ = !inQ
        continue
      }
      if (ch === ',' && !inQ) {
        out.push(cur.trim())
        cur = ''
        continue
      }
      cur += ch
    }
    out.push(cur.trim())
    return out
  }

  const importCsvFile = async (file: File) => {
    try {
      setImporting(true)
      const text = await file.text()
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
      if (lines.length < 2) throw new Error('CSV needs a header row + at least 1 data row')
      const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ''))
      let ok = 0
      let fail = 0
      for (const line of lines.slice(1)) {
        const cols = parseCsvLine(line)
        const row: Record<string, string> = {}
        headers.forEach((h, i) => {
          row[h] = cols[i] ?? ''
        })
        const sku = String(row.sku || '').trim()
        if (!sku) {
          fail += 1
          continue
        }
        const india = Number(row.indiaAvailable || 0) || 0
        const usa = Number(row.usaAvailable || 0) || 0
        const payload: ResourceRow = {
          sku,
          odetteSku: row.odetteSku || '',
          title: row.title || sku,
          collection: row.collection || '',
          construction: row.construction || '',
          material: row.material || '',
          size: row.size || '',
          sellingPriceUSD: Number(row.sellingPriceUSD || 0),
          mfgCostUSD: Number(row.mfgCostUSD || 0),
          weightKg: Number(row.weightKg || 0),
          barcode: row.barcode || '',
          imageUrl: row.imageUrl || '',
          indiaAvailable: india,
          usaAvailable: usa,
          stock: {
            indiaAvailable: india,
            indiaPacked: 0,
            inTransit: 0,
            usaAvailable: usa,
            usaReserved: 0,
            fba: 0,
          },
        }
        try {
          const existing = skus.find((s) => String(s.sku) === sku)
          if (existing) {
            await update('skus', sku, { ...existing, ...payload })
          } else {
            await create('skus', payload)
          }
          ok += 1
        } catch {
          fail += 1
        }
      }
      pushToast(`Bulk import done: ${ok} saved${fail ? `, ${fail} failed` : ''}`, ok ? 'success' : 'danger')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'CSV import failed', 'danger')
    } finally {
      setImporting(false)
    }
  }

  const filtered = useMemo(() => {
    return skus.filter((sku) => {
      const q = query.trim().toLowerCase()
      const title = String(sku.title || '')
      const construction = String(sku.construction || '')
      const material = String(sku.material || '')
      const barcode = String(sku.barcode || '')
      const skuCode = String(sku.sku || '')
      const coll = String(sku.collection || '')
      const s = stockOf(sku)
      const days = getDaysOfCover(sku)

      const matchesQuery =
        !q ||
        skuCode.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        construction.toLowerCase().includes(q) ||
        material.toLowerCase().includes(q) ||
        barcode.includes(q)

      const matchesCollection = collection === 'all' || coll === collection

      const matchesTab =
        tab === 'all' ||
        (tab === 'lowStock' && days < 15) ||
        (tab === 'india' && Number(s.indiaAvailable || 0) > 0) ||
        (tab === 'usa' && Number(s.usaAvailable || 0) > 0) ||
        (tab === 'inTransit' && Number(s.inTransit || 0) > 0) ||
        (tab === 'heritage' && coll === 'Heritage') ||
        (tab === 'boho' && (coll === 'Boho' || coll.toLowerCase().includes('jute')))

      const matchesStatus =
        status === 'all' ||
        (status === 'lowStock' && days < 15) ||
        (status === 'inStockUSA' && Number(s.usaAvailable || 0) > 0) ||
        (status === 'inStockIndia' && Number(s.indiaAvailable || 0) > 0) ||
        (status === 'inTransit' && Number(s.inTransit || 0) > 0)

      return matchesQuery && matchesCollection && matchesTab && matchesStatus
    })
  }, [skus, tab, query, collection, status])

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const inTransitTotal = skus.reduce((sum, s) => sum + Number(stockOf(s).inTransit || 0), 0)

  const tabs: { id: StockTab; label: string }[] = [
    { id: 'all', label: `All Rug SKUs (${skus.length})` },
    { id: 'lowStock', label: 'Low Stock Risk (< 15 Days)' },
    { id: 'india', label: 'In Stock (India WH)' },
    { id: 'usa', label: 'In Stock (USA 3PL)' },
    { id: 'inTransit', label: `In-Transit Cargo (${inTransitTotal})` },
    { id: 'heritage', label: 'Heritage Collection' },
    { id: 'boho', label: 'Modern / Jute' },
  ]

  const openCreate = () => {
    setEditingSku(null)
    setForm(Object.fromEntries(FORM_FIELDS.map((k) => [k, ''])))
    setEditorOpen(true)
  }

  const openEdit = (sku: ResourceRow) => {
    const code = String(sku.sku)
    setEditingSku(code)
    setForm(
      Object.fromEntries(
        FORM_FIELDS.map((k) => [k, sku[k] == null ? '' : String(sku[k])]),
      ),
    )
    setEditorOpen(true)
  }

  const save = async () => {
    try {
      setSaving(true)
      const payload: ResourceRow = {
        sku: form.sku,
        odetteSku: form.odetteSku,
        title: form.title,
        collection: form.collection,
        construction: form.construction,
        material: form.material,
        size: form.size,
        sellingPriceUSD: Number(form.sellingPriceUSD || 0),
        mfgCostUSD: Number(form.mfgCostUSD || 0),
        weightKg: Number(form.weightKg || 0),
        barcode: form.barcode,
        imageUrl: form.imageUrl,
      }
      if (!payload.sku) throw new Error('SKU is required')
      if (editingSku) {
        const existing = skus.find((s) => s.sku === editingSku)
        await update('skus', editingSku, { ...existing, ...payload })
      } else {
        await create('skus', {
          ...payload,
          stock: {
            indiaAvailable: 0,
            indiaPacked: 0,
            inTransit: 0,
            usaAvailable: 0,
            usaReserved: 0,
            fba: 0,
          },
        })
      }
      setEditorOpen(false)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Save failed', 'danger')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteSku) return
    try {
      setSaving(true)
      await remove('skus', deleteSku)
      setDeleteSku(null)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Delete failed', 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-2xl">
            Products & Global Multi-Warehouse Inventory Hub
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Live MongoDB SKU master — add, edit, and delete persist to rugos_erp
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5" /> Download CSV template
          </Button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-2.5 text-xs font-semibold hover:bg-[var(--bg-elevated)]">
            <Upload className="h-3.5 w-3.5" />
            {importing ? 'Importing…' : 'Bulk CSV Import'}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void importCsvFile(file)
              }}
            />
          </label>
          <Button variant="secondary" size="sm" onClick={() => openModal('export', 'Catalog')}>
            <Download className="h-3.5 w-3.5" /> Export Catalog
          </Button>
          <Button variant="purple" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Add New Rug SKU
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          API error: {error}
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id)
              setPage(1)
            }}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border-main)] p-4 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search inventory</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search by SKU code, title, weave, material, or barcode..."
              className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <select
            value={collection}
            onChange={(e) => {
              setCollection(e.target.value)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
            aria-label="Collection filter"
          >
            <option value="all">All Collections</option>
            <option value="Heritage">Royal Heritage</option>
            <option value="Modern">Modern Geometric</option>
            <option value="Boho">Boho Earth (Jute)</option>
            <option value="Abstract Rugs">Abstract Rugs</option>
            <option value="Animal Rugs">Animal Rugs</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
            aria-label="Stock status filter"
          >
            <option value="all">All Stock Statuses</option>
            <option value="lowStock">Low Stock Alert (&lt; 15 Days)</option>
            <option value="inStockUSA">Available at USA 3PL</option>
            <option value="inStockIndia">Available in India WH</option>
            <option value="inTransit">Currently In-Transit</option>
          </select>
          <div className="flex items-center gap-2 lg:ml-auto">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {loading ? 'Loading…' : `${filtered.length} matching SKUs`}
            </span>
            <Button variant="purple" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> New SKU
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-3 font-semibold">SKU & Thumbnail</th>
                <th className="px-4 py-3 font-semibold">Rug Title & Collection</th>
                <th className="px-4 py-3 font-semibold">Construction & Specs</th>
                <th className="px-4 py-3 font-semibold">Selling Price</th>
                <th className="px-4 py-3 font-semibold">In Stock</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((sku) => {
                const days = getDaysOfCover(sku)
                const total = getSkuTotalStock(sku)
                const s = stockOf(sku)
                const img = String(sku.imageUrl || '')
                const material = String(sku.material || '')
                return (
                  <tr key={String(sku.sku)} className="border-t border-[var(--border-main)] align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            className="h-12 w-12 rounded-lg border border-[var(--border-main)] object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-xs text-[var(--text-dim)]">
                            N/A
                          </div>
                        )}
                        <div>
                          <p className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {String(sku.sku)}
                          </p>
                          <p className="text-[11px] text-[var(--text-dim)]">{String(sku.odetteSku || '')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--text-main)]">{String(sku.title)}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Badge>{String(sku.collection || '—')}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--text-main)]">{String(sku.size || '—')}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {String(sku.construction || '')}
                      </p>
                      <p className="text-xs text-[var(--text-dim)]">
                        {material.slice(0, 48)}
                        {material.length > 48 ? '…' : ''} · {Number(sku.weightKg || 0)} kg
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        ${Number(sku.sellingPriceUSD || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-[var(--text-dim)]">
                        Cost ${Number(sku.mfgCostUSD || 0).toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-[var(--text-main)]">{total} units</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        IN {Number(s.indiaAvailable || 0)} · US {Number(s.usaAvailable || 0)} · Transit{' '}
                        {Number(s.inTransit || 0)}
                      </p>
                      {days < 15 ? (
                        <Badge tone="danger" className="mt-1">
                          {days}d cover
                        </Badge>
                      ) : (
                        <Badge tone="success" className="mt-1">
                          {days}d cover
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button variant="secondary" size="sm" title="GRN">
                          <PackagePlus className="h-3.5 w-3.5" /> GRN
                        </Button>
                        <Button variant="secondary" size="sm" title="Studio">
                          <Eye className="h-3.5 w-3.5" /> Studio
                        </Button>
                        <Button variant="secondary" size="sm" title="Add Stock">
                          <Plus className="h-3.5 w-3.5" /> Stock
                        </Button>
                        <Button variant="secondary" size="sm" title="Move">
                          <MoveHorizontal className="h-3.5 w-3.5" /> Move
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${String(sku.sku)}`}
                          onClick={() => openEdit(sku)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${String(sku.sku)}`}
                          onClick={() => setDeleteSku(String(sku.sku))}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </div>

      <Modal
        open={editorOpen}
        title={editingSku ? 'Edit Rug SKU' : 'Add New Rug SKU'}
        badge={editingSku ? 'Update' : 'Create'}
        size="lg"
        onClose={() => setEditorOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save SKU'}
            </Button>
          </>
        }
      >
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
          {FORM_FIELDS.map((key) => (
            <label
              key={key}
              className={`block text-xs font-semibold text-[var(--text-main)] ${
                key === 'title' || key === 'material' ? 'sm:col-span-2' : ''
              }`}
            >
              {key}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                value={form[key] ?? ''}
                disabled={!!editingSku && key === 'sku'}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!deleteSku}
        title="Delete SKU?"
        badge="Danger"
        badgeTone="danger"
        onClose={() => setDeleteSku(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteSku(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmDelete} disabled={saving}>
              {saving ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        <p>
          Permanently delete <span className="font-mono font-semibold">{deleteSku}</span> from
          MongoDB?
        </p>
      </Modal>
    </div>
  )
}
