import {
  Camera,
  Download,
  Eye,
  MapPin,
  MoveHorizontal,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { api, ApiError, type ResourceRow } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'
import {
  CSV_LOCATION_HEADERS,
  flattenLocToForm,
  locOf,
  locationsFromCsv,
  locationsFromForm,
  isUsablePhotoUrl,
  mediaUrl,
  pickPath,
  type WhKey,
} from '../lib/inventoryLocation'

function SafePhoto({
  src,
  className,
  alt = '',
  onBroken,
}: {
  src: string
  className?: string
  alt?: string
  onBroken?: () => void
}) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) return null
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        setBroken(true)
        onBroken?.()
      }}
    />
  )
}

function WarehousePhotoStrip({ urls }: { urls: string[] }) {
  const [failed, setFailed] = useState(0)
  if (!urls.length || failed >= urls.length) {
    return (
      <p className="mt-3 text-xs text-[var(--text-dim)]">
        No live photos yet — use <strong>Add photo</strong>. Old server file links break after
        restart; re-upload once and the photo is kept in the database.
      </p>
    )
  }
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto">
      {urls.map((src) => (
        <SafePhoto
          key={src.slice(0, 64)}
          src={src}
          className="h-24 w-36 shrink-0 rounded-lg border border-[var(--border-main)] object-cover"
          onBroken={() => setFailed((n) => n + 1)}
        />
      ))}
    </div>
  )
}

type StockTab = 'all' | 'pickup' | 'lowStock' | 'india' | 'usa' | 'inTransit' | 'heritage' | 'boho'

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

const PRODUCT_FIELDS = [
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

const FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  odetteSku: 'Odette SKU',
  title: 'Title',
  collection: 'Collection',
  construction: 'Construction',
  material: 'Material',
  size: 'Size',
  sellingPriceUSD: 'Selling price USD',
  mfgCostUSD: 'Mfg cost USD',
  weightKg: 'Weight kg',
  barcode: 'Barcode',
  imageUrl: 'Product image URL',
  indiaAvailable: 'Qty India WH',
  usaAvailable: 'Qty US WH',
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function Inventory() {
  const { openModal, pushToast } = useApp()
  const { list, create, update, remove, loading, error } = useData()
  const skus = list('skus')
  const warehouses = list('warehouses')

  const [tab, setTab] = useState<StockTab>('all')
  const [query, setQuery] = useState('')
  const [collection, setCollection] = useState('all')
  const [status, setStatus] = useState('all')
  const [whFilter, setWhFilter] = useState<'all' | WhKey>('all')
  const [rackFilter, setRackFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSku, setEditingSku] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [deleteSku, setDeleteSku] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pickSku, setPickSku] = useState<ResourceRow | null>(null)
  const [photoBusy, setPhotoBusy] = useState<string | null>(null)

  const CSV_HEADERS = [
    ...PRODUCT_FIELDS.filter((k) => k !== 'indiaAvailable' && k !== 'usaAvailable'),
    'indiaAvailable',
    'usaAvailable',
    ...CSV_LOCATION_HEADERS,
  ]

  const downloadTemplate = () => {
    const sample = [
      CSV_HEADERS.join(','),
      'SKU-SAMPLE-001,,Sample Braided Jute Rug,Heritage,Flatweave,Jute,5x8,420,180,4.5,BC-SAMPLE-001,,10,0,A,01,R-04,B-02,India floor left of wash bay,,C,02,R-11,B-06,US Edison aisle 2,',
      'SKU-SAMPLE-002,,Sample Wool Kilim,Boho,Handwoven,Wool,2.5x8,310,140,2.2,BC-SAMPLE-002,,5,3,B,03,R-08,B-01,India mezzanine,,D,01,R-03,B-04,US rack near pack bench,',
    ].join('\n')
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rugos-inventory-bulk-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    pushToast('Template downloaded — include rack / aisle / bin so pickers can find stock', 'success')
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
        const existing = skus.find((s) => String(s.sku) === sku)
        const incomingLoc = locationsFromCsv(row)
        const prevLoc = (existing?.locations as Record<string, Record<string, string>>) || {}
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
            indiaPacked: Number((existing?.stock as Stock)?.indiaPacked || 0),
            inTransit: Number((existing?.stock as Stock)?.inTransit || 0),
            usaAvailable: usa,
            usaReserved: Number((existing?.stock as Stock)?.usaReserved || 0),
            fba: Number((existing?.stock as Stock)?.fba || 0),
          },
          locations: {
            india: { ...(prevLoc.india || {}), ...incomingLoc.india },
            usa: { ...(prevLoc.usa || {}), ...incomingLoc.usa },
          },
        }
        try {
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

  const rackOptions = useMemo(() => {
    const set = new Set<string>()
    for (const sku of skus) {
      const i = locOf(sku, 'india').rack
      const u = locOf(sku, 'usa').rack
      if (i) set.add(`IN ${i}`)
      if (u) set.add(`US ${u}`)
    }
    return [...set].sort()
  }, [skus])

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
      const indiaLoc = locOf(sku, 'india')
      const usaLoc = locOf(sku, 'usa')
      const locHay = [indiaLoc, usaLoc]
        .flatMap((l) => [l.zone, l.aisle, l.rack, l.bin, l.note])
        .join(' ')
        .toLowerCase()

      const matchesQuery =
        !q ||
        skuCode.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        construction.toLowerCase().includes(q) ||
        material.toLowerCase().includes(q) ||
        barcode.includes(q) ||
        locHay.includes(q)

      const matchesCollection = collection === 'all' || coll === collection

      const matchesTab =
        tab === 'all' ||
        (tab === 'pickup' && (Number(s.indiaAvailable || 0) > 0 || Number(s.usaAvailable || 0) > 0)) ||
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

      const matchesWh =
        whFilter === 'all' ||
        (whFilter === 'india' && Number(s.indiaAvailable || 0) > 0) ||
        (whFilter === 'usa' && Number(s.usaAvailable || 0) > 0)

      const matchesRack =
        rackFilter === 'all' ||
        (rackFilter.startsWith('IN ') && indiaLoc.rack === rackFilter.slice(3)) ||
        (rackFilter.startsWith('US ') && usaLoc.rack === rackFilter.slice(3))

      return (
        matchesQuery &&
        matchesCollection &&
        matchesTab &&
        matchesStatus &&
        matchesWh &&
        matchesRack
      )
    })
  }, [skus, tab, query, collection, status, whFilter, rackFilter])

  const sorted = useMemo(() => {
    if (tab !== 'pickup') return filtered
    return [...filtered].sort((a, b) => {
      const pa = pickPath(locOf(a, Number(stockOf(a).usaAvailable || 0) > 0 ? 'usa' : 'india'), '')
      const pb = pickPath(locOf(b, Number(stockOf(b).usaAvailable || 0) > 0 ? 'usa' : 'india'), '')
      return pa.localeCompare(pb)
    })
  }, [filtered, tab])

  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize)
  const inTransitTotal = skus.reduce((sum, s) => sum + Number(stockOf(s).inTransit || 0), 0)

  const tabs: { id: StockTab; label: string }[] = [
    { id: 'all', label: `All Rug SKUs (${skus.length})` },
    { id: 'pickup', label: 'Pickup / dispatch' },
    { id: 'lowStock', label: 'Low Stock Risk (< 15 Days)' },
    { id: 'india', label: 'In Stock (India WH)' },
    { id: 'usa', label: 'In Stock (USA WH)' },
    { id: 'inTransit', label: `In-Transit Cargo (${inTransitTotal})` },
    { id: 'heritage', label: 'Heritage Collection' },
    { id: 'boho', label: 'Modern / Jute' },
  ]

  const emptyForm = () =>
    Object.fromEntries(
      [
        ...PRODUCT_FIELDS,
        'indiaZone',
        'indiaAisle',
        'indiaRack',
        'indiaBin',
        'indiaNote',
        'indiaPhotoUrl',
        'usaZone',
        'usaAisle',
        'usaRack',
        'usaBin',
        'usaNote',
        'usaPhotoUrl',
      ].map((k) => [k, '']),
    )

  const openCreate = () => {
    setEditingSku(null)
    setForm(emptyForm())
    setEditorOpen(true)
  }

  const openEdit = (sku: ResourceRow) => {
    const code = String(sku.sku)
    const s = stockOf(sku)
    setEditingSku(code)
    setForm({
      ...emptyForm(),
      ...Object.fromEntries(
        PRODUCT_FIELDS.map((k) => {
          if (k === 'indiaAvailable') return [k, String(s.indiaAvailable ?? sku.indiaAvailable ?? '')]
          if (k === 'usaAvailable') return [k, String(s.usaAvailable ?? sku.usaAvailable ?? '')]
          return [k, sku[k] == null ? '' : String(sku[k])]
        }),
      ),
      ...flattenLocToForm(sku),
    })
    setEditorOpen(true)
  }

  const save = async () => {
    try {
      setSaving(true)
      const india = Number(form.indiaAvailable || 0) || 0
      const usa = Number(form.usaAvailable || 0) || 0
      const existing = editingSku ? skus.find((s) => s.sku === editingSku) : undefined
      const prevStock = stockOf(existing || {})
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
        indiaAvailable: india,
        usaAvailable: usa,
        stock: {
          indiaAvailable: india,
          indiaPacked: Number(prevStock.indiaPacked || 0),
          inTransit: Number(prevStock.inTransit || 0),
          usaAvailable: usa,
          usaReserved: Number(prevStock.usaReserved || 0),
          fba: Number(prevStock.fba || 0),
        },
        locations: locationsFromForm(form),
      }
      if (!payload.sku) throw new Error('SKU is required')
      if (!payload.title) throw new Error('Title is required')
      if (editingSku) {
        await update('skus', editingSku, { ...existing, ...payload })
      } else {
        await create('skus', payload)
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

  /** Prefer data URL so photos survive Render redeploys (disk /uploads is wiped). */
  const uploadPhoto = async (folder: 'inventory-locations' | 'warehouse-photos', key: string, file: File) => {
    const dataUrl = await fileToDataUrl(file)
    try {
      if (file.size <= 900_000) {
        const res = await api.uploads.photo({ photoDataUrl: dataUrl, folder, key })
        // Keep data URL as source of truth; server path is bonus for local/dev
        return dataUrl || mediaUrl(res.url, api.base)
      }
    } catch {
      /* fall through — still save data URL into Mongo */
    }
    return dataUrl
  }

  const onLocPhoto = async (wh: WhKey, file: File | undefined) => {
    if (!file) return
    try {
      setPhotoBusy(wh)
      const url = await uploadPhoto('inventory-locations', `${form.sku || 'sku'}-${wh}`, file)
      setForm((f) => ({ ...f, [`${wh}PhotoUrl`]: url }))
      pushToast('Location photo saved', 'success')
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Photo upload failed', 'danger')
    } finally {
      setPhotoBusy(null)
    }
  }

  const onWarehousePhoto = async (wh: ResourceRow, file: File | undefined) => {
    if (!file) return
    const id = String(wh.id || '')
    try {
      setPhotoBusy(id)
      const url = await uploadPhoto('warehouse-photos', id || 'wh', file)
      const next: ResourceRow = { ...wh }
      if (!isUsablePhotoUrl(next.imageUrl, api.base)) next.imageUrl = url
      else if (!isUsablePhotoUrl(next.photo2Url, api.base)) next.photo2Url = url
      else next.photo3Url = url
      await update('warehouses', id, next)
      pushToast('Warehouse photo saved (kept in database)', 'success')
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Warehouse photo failed', 'danger')
    } finally {
      setPhotoBusy(null)
    }
  }

  const locLine = (sku: ResourceRow, wh: WhKey) => pickPath(locOf(sku, wh), wh === 'india' ? 'India WH' : 'US WH')

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-2xl">
            Inventory · rack location & pickup
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Upload SKUs with warehouse, zone, aisle, rack and bin. Dispatch picks from that location.
            Add live photos of the warehouse and the bin where the rug sits.
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

      <div className="grid gap-3 md:grid-cols-2">
        {warehouses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-main)] px-4 py-6 text-sm text-[var(--text-muted)]">
            No warehouse master photos yet. Add India / US warehouses under Masters → Warehouses, then
            upload floor photos here.
          </div>
        ) : (
          warehouses.map((wh) => {
            const pics = [wh.imageUrl, wh.photo2Url, wh.photo3Url, wh.floorPlanUrl]
              .map((p) => mediaUrl(p, api.base))
              .filter(Boolean)
            const id = String(wh.id || '')
            return (
              <article
                key={id}
                className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                      Warehouse floor
                    </p>
                    <h2 className="text-sm font-bold text-[var(--text-main)]">{String(wh.name || id)}</h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      {[wh.city, wh.country, wh.address].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--border-main)] px-2 text-[11px] font-semibold">
                    <Camera className="h-3.5 w-3.5" />
                    {photoBusy === id ? 'Saving…' : 'Add photo'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={photoBusy === id}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        void onWarehousePhoto(wh, file)
                      }}
                    />
                  </label>
                </div>
                <WarehousePhotoStrip urls={pics} />
              </article>
            )
          })
        )}
      </div>

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
        <div className="flex flex-col gap-3 border-b border-[var(--border-main)] p-4 lg:flex-row lg:flex-wrap lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search inventory</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search SKU, title, rack, aisle, bin…"
              className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <select
            value={whFilter}
            onChange={(e) => {
              setWhFilter(e.target.value as 'all' | WhKey)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
            aria-label="Warehouse filter"
          >
            <option value="all">All warehouses</option>
            <option value="india">India WH</option>
            <option value="usa">US WH</option>
          </select>
          <select
            value={rackFilter}
            onChange={(e) => {
              setRackFilter(e.target.value)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
            aria-label="Rack filter"
          >
            <option value="all">All racks</option>
            {rackOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
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
            <option value="inStockUSA">Available at USA WH</option>
            <option value="inStockIndia">Available in India WH</option>
            <option value="inTransit">Currently In-Transit</option>
          </select>
          <span className="text-xs font-medium text-[var(--text-muted)] lg:ml-auto">
            {loading ? 'Loading…' : `${sorted.length} matching SKUs`}
          </span>
        </div>

        <div className="table-scroll">
          <table className="min-w-[720px] w-full text-left text-sm sm:min-w-[960px] lg:min-w-[1100px]">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-3 font-semibold">SKU & Thumbnail</th>
                <th className="px-4 py-3 font-semibold">Rug Title & Collection</th>
                <th className="px-4 py-3 font-semibold">Pick location (rack / bin)</th>
                <th className="px-4 py-3 font-semibold">Selling Price</th>
                <th className="px-4 py-3 font-semibold">In Stock</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                    No SKUs match these filters.
                  </td>
                </tr>
              ) : null}
              {pageItems.map((sku) => {
                const days = getDaysOfCover(sku)
                const total = getSkuTotalStock(sku)
                const s = stockOf(sku)
                const img = String(sku.imageUrl || '')
                const indiaLoc = locOf(sku, 'india')
                const usaLoc = locOf(sku, 'usa')
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
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {String(sku.size || '—')} · {String(sku.construction || '')} ·{' '}
                        {Number(sku.weightKg || 0)} kg
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {indiaLoc.photoUrl ? (
                          <img
                            src={mediaUrl(indiaLoc.photoUrl, api.base)}
                            alt="India bin"
                            className="h-12 w-12 rounded-lg border object-cover"
                          />
                        ) : null}
                        {usaLoc.photoUrl ? (
                          <img
                            src={mediaUrl(usaLoc.photoUrl, api.base)}
                            alt="US bin"
                            className="h-12 w-12 rounded-lg border object-cover"
                          />
                        ) : null}
                        <div>
                          <p className="flex items-center gap-1 text-xs font-semibold text-[var(--text-main)]">
                            <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                            {locLine(sku, 'india')}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[var(--text-main)]">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                            {locLine(sku, 'usa')}
                          </p>
                        </div>
                      </div>
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
                        <Button variant="secondary" size="sm" onClick={() => setPickSku(sku)}>
                          <MapPin className="h-3.5 w-3.5" /> Pick
                        </Button>
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
          total={sorted.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </div>

      <Modal
        open={editorOpen}
        title={editingSku ? 'Edit Rug SKU + location' : 'Add Rug SKU + rack location'}
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
        <div className="grid max-h-[65vh] gap-3 overflow-y-auto sm:grid-cols-2">
          {PRODUCT_FIELDS.map((key) => (
            <label
              key={key}
              className={`block text-xs font-semibold text-[var(--text-main)] ${
                key === 'title' || key === 'material' ? 'sm:col-span-2' : ''
              }`}
            >
              {FIELD_LABELS[key] || key}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                value={form[key] ?? ''}
                disabled={!!editingSku && key === 'sku'}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}

          {(['india', 'usa'] as const).map((wh) => (
            <fieldset
              key={wh}
              className="sm:col-span-2 grid gap-3 rounded-xl border border-[var(--border-main)] p-3 sm:grid-cols-4"
            >
              <legend className="px-1 text-xs font-bold uppercase text-indigo-600">
                {wh === 'india' ? 'India warehouse location' : 'US warehouse location'}
              </legend>
              {(
                [
                  ['Zone', `${wh}Zone`],
                  ['Aisle', `${wh}Aisle`],
                  ['Rack', `${wh}Rack`],
                  ['Bin', `${wh}Bin`],
                ] as const
              ).map(([label, key]) => (
                <label key={key} className="block text-xs font-semibold text-[var(--text-main)]">
                  {label}
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                    value={form[key] ?? ''}
                    placeholder={label === 'Rack' ? 'R-04' : label === 'Bin' ? 'B-02' : ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <label className="block text-xs font-semibold text-[var(--text-main)] sm:col-span-3">
                Location note
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                  value={form[`${wh}Note`] ?? ''}
                  placeholder="e.g. left of wash bay / near pack bench"
                  onChange={(e) => setForm((f) => ({ ...f, [`${wh}Note`]: e.target.value }))}
                />
              </label>
              <div className="sm:col-span-1">
                <p className="text-xs font-semibold text-[var(--text-main)]">Bin photo</p>
                {form[`${wh}PhotoUrl`] ? (
                  <img
                    src={mediaUrl(form[`${wh}PhotoUrl`], api.base)}
                    alt=""
                    className="mt-1 h-16 w-full rounded-lg border object-cover"
                  />
                ) : (
                  <div className="mt-1 flex h-16 items-center justify-center rounded-lg border border-dashed text-[10px] text-[var(--text-dim)]">
                    No photo
                  </div>
                )}
                <label className="mt-1 inline-flex h-8 cursor-pointer items-center gap-1 text-[11px] font-semibold text-indigo-700">
                  <Camera className="h-3.5 w-3.5" />
                  {photoBusy === wh ? 'Saving…' : 'Upload / camera'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={photoBusy === wh}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      void onLocPhoto(wh, file)
                    }}
                  />
                </label>
              </div>
            </fieldset>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!pickSku}
        title={pickSku ? `Pick ${String(pickSku.sku)}` : 'Pick location'}
        badge="Dispatch"
        size="lg"
        onClose={() => setPickSku(null)}
        footer={
          <Button variant="secondary" onClick={() => setPickSku(null)}>
            Close
          </Button>
        }
      >
        {pickSku ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--text-main)]">{String(pickSku.title)}</p>
            {(['india', 'usa'] as const).map((wh) => {
              const loc = locOf(pickSku, wh)
              const s = stockOf(pickSku)
              const qty = wh === 'india' ? Number(s.indiaAvailable || 0) : Number(s.usaAvailable || 0)
              return (
                <div key={wh} className="rounded-xl border border-[var(--border-main)] p-3">
                  <p className="text-xs font-bold uppercase text-indigo-600">
                    {wh === 'india' ? 'India Warehouse' : 'US Warehouse'} · qty {qty}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{pickPath(loc, wh === 'india' ? 'India WH' : 'US WH')}</p>
                  {loc.note ? <p className="mt-1 text-xs text-[var(--text-muted)]">{loc.note}</p> : null}
                  {loc.photoUrl ? (
                    <img
                      src={mediaUrl(loc.photoUrl, api.base)}
                      alt=""
                      className="mt-2 max-h-48 w-full rounded-lg border object-cover"
                    />
                  ) : (
                    <p className="mt-2 text-xs text-[var(--text-dim)]">No bin photo yet — edit SKU to add one.</p>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
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
