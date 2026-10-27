import {
  Eye,
  ExternalLink,
  Lock,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, type ResourceRow } from '../api/client'
import { normalizeRoleCode } from '../auth/roles'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

type OrderTab = 'all' | 'pending' | 'packed' | 'transit' | 'delivered'

const RUG_PLACEHOLDER =
  'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=160&q=70'

const channelTone: Record<string, 'orange' | 'warning' | 'cyan' | 'purple' | 'primary' | 'slate'> = {
  'Amazon US': 'orange',
  'Etsy Direct': 'warning',
  'Walmart US': 'cyan',
  'B2B Wholesale': 'purple',
  'Wayfair US': 'primary',
  'Shopify DTC': 'slate',
  'Direct Offline': 'purple',
  'Third-Party Offline': 'purple',
}

const FORM_FIELDS = [
  'orderId',
  'channel',
  'marketplaceOrderId',
  'orderDate',
  'buyerName',
  'sku',
  'qty',
  'totalOrderUSD',
  'status',
  'fulfillmentWh',
  'shippingAddress',
  'awb',
] as const

type SkuInfo = {
  title: string
  imageUrl: string
  size: string
  material: string
  construction: string
  collection: string
  india: number
  usa: number
}

function inIndiaQueue(order: ResourceRow) {
  return String(order.queueOwner || 'india_wh') === 'india_wh'
}

function inUsQueue(order: ResourceRow) {
  return String(order.queueOwner || '') === 'usa_wh'
}

function isPending(st: string) {
  return (
    st === 'Pending Allocation' ||
    st === 'In Process' ||
    st.toLowerCase().includes('ready')
  )
}

function pendingRank(st: string) {
  if (st === 'Pending Allocation') return 0
  if (st === 'In Process') return 1
  if (st === 'In Transit') return 2
  if (st.includes('Packed')) return 3
  if (st === 'Delivered') return 4
  return 5
}

/** Where the rug is right now — only India WH / US WH / transit / make */
function locationInfo(order: ResourceRow) {
  const st = String(order.status || '')
  const sc = String(order.fulfillmentScenario || '')
  const q = String(order.queueOwner || 'india_wh')
  const stockAt = String(order.stockAt || '')

  if (st === 'In Transit' || stockAt === 'In transit') {
    return {
      wh: 'In transit',
      detail: 'Moving India Warehouse → US Warehouse',
      tone: 'warning' as const,
      step: 'US manager: click Receive when it arrives',
    }
  }
  if (st === 'In Process' || sc === 'MAKE') {
    return {
      wh: 'Not in stock',
      detail: 'Making at India side — not in either warehouse yet',
      tone: 'purple' as const,
      step: 'When ready: Mark ready → then Ship to US',
    }
  }
  if (q === 'usa_wh' || stockAt === 'US Warehouse' || (sc === 'US_STOCK' && order.barcodeGenerated)) {
    return {
      wh: 'US Warehouse',
      detail: 'Stock / order is with the US Warehouse',
      tone: 'success' as const,
      step: 'US: Pack & dispatch to customer',
    }
  }
  if (sc === 'US_STOCK') {
    return {
      wh: 'US Warehouse',
      detail: 'US has stock — waiting for India to send barcode',
      tone: 'success' as const,
      step: 'Step 1: Send barcode to US',
    }
  }
  return {
    wh: 'India Warehouse',
    detail: 'Stock / order is with the India Warehouse',
    tone: 'purple' as const,
    step:
      sc === 'INDIA_SHIP'
        ? 'Step 1: Ship India → US Warehouse'
        : 'Check stock / next action below',
  }
}

function skuStock(sku: ResourceRow) {
  const nested = (sku.stock as Record<string, number>) || {}
  return {
    india: Number(nested.indiaAvailable ?? sku.indiaAvailable ?? 0) || 0,
    usa: Number(nested.usaAvailable ?? sku.usaAvailable ?? 0) || 0,
  }
}

export function Orders() {
  const { pushToast } = useApp()
  const { user } = useAuth()
  const { list, create, update, remove, loading, error, refresh } = useData()
  const orders = list('orders')
  const skus = list('skus')
  const role = normalizeRoleCode(String(user?.roleCode || ''))

  const skuMap = useMemo(() => {
    const map = new Map<string, SkuInfo>()
    for (const s of skus) {
      const stock = skuStock(s)
      map.set(String(s.sku), {
        title: String(s.title || ''),
        imageUrl: String(s.imageUrl || RUG_PLACEHOLDER),
        size: String(s.size || ''),
        material: String(s.material || ''),
        construction: String(s.construction || ''),
        collection: String(s.collection || ''),
        india: stock.india,
        usa: stock.usa,
      })
    }
    return map
  }, [skus])

  const [tab, setTab] = useState<OrderTab>('pending')
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewOrder, setViewOrder] = useState<ResourceRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const roleScoped = useMemo(() => {
    if (role === 'super_admin' || role === 'finance') return orders
    if (role === 'usa_wh') return orders.filter(inUsQueue)
    return orders.filter(
      (o) =>
        inIndiaQueue(o) ||
        String(o.status || '').toLowerCase().includes('in process') ||
        String(o.fulfillmentScenario || '') === 'MAKE',
    )
  }, [orders, role])

  const filtered = useMemo(() => {
    const rows = roleScoped.filter((order) => {
      const q = query.trim().toLowerCase()
      const orderId = String(order.orderId || '')
      const buyerName = String(order.buyerName || '')
      const sku = String(order.sku || '')
      const title = skuMap.get(sku)?.title || ''
      const ch = String(order.channel || '')
      const st = String(order.status || '')
      const locked = String(order.stockAllocation || '').toLowerCase().includes('lock')

      const matchesQuery =
        !q ||
        orderId.toLowerCase().includes(q) ||
        buyerName.toLowerCase().includes(q) ||
        sku.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q)

      const matchesChannel = channel === 'all' || ch.toLowerCase().includes(channel)
      const matchesStatus =
        status === 'all' ||
        (status === 'locked' && locked) ||
        (status === 'packed' && st.includes('Packed')) ||
        (status === 'transit' && st === 'In Transit') ||
        (status === 'delivered' && st === 'Delivered') ||
        (status === 'make' && (st === 'To Make (MTO)' || st === 'In Process'))

      const matchesTab =
        tab === 'all' ||
        (tab === 'pending' && isPending(st)) ||
        (tab === 'packed' && st.includes('Packed')) ||
        (tab === 'transit' && st === 'In Transit') ||
        (tab === 'delivered' && st === 'Delivered')

      return matchesQuery && matchesChannel && matchesStatus && matchesTab
    })

    return [...rows].sort((a, b) => {
      const ra = pendingRank(String(a.status || ''))
      const rb = pendingRank(String(b.status || ''))
      if (ra !== rb) return ra - rb
      return String(b.orderId).localeCompare(String(a.orderId))
    })
  }, [roleScoped, tab, query, channel, status, skuMap])

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const pendingCount = roleScoped.filter((o) => isPending(String(o.status || ''))).length

  const tabs: { id: OrderTab; label: string }[] = [
    { id: 'pending', label: `Pending first (${pendingCount})` },
    { id: 'all', label: `All Orders (${roleScoped.length})` },
    { id: 'packed', label: 'Packed & Handover' },
    { id: 'transit', label: 'In Transit' },
    { id: 'delivered', label: 'Delivered' },
  ]

  const openCreate = () => {
    setEditingId(null)
    setForm(Object.fromEntries(FORM_FIELDS.map((k) => [k, ''])))
    setEditorOpen(true)
  }

  const openEdit = (order: ResourceRow) => {
    const id = String(order.orderId)
    setEditingId(id)
    setForm(
      Object.fromEntries(
        FORM_FIELDS.map((k) => [k, order[k] == null ? '' : String(order[k])]),
      ),
    )
    setEditorOpen(true)
  }

  const save = async () => {
    try {
      setSaving(true)
      const ch = form.channel || 'Direct Offline'
      const payload: ResourceRow = {
        orderId: form.orderId,
        channel: ch,
        marketplaceOrderId: form.marketplaceOrderId,
        orderDate: form.orderDate,
        buyerName: form.buyerName,
        sku: form.sku,
        qty: Number(form.qty || 1),
        totalOrderUSD: Number(form.totalOrderUSD || 0),
        status: form.status || 'Pending Allocation',
        fulfillmentWh: form.fulfillmentWh,
        shippingAddress: form.shippingAddress,
        awb: form.awb,
      }
      if (!payload.orderId) throw new Error('orderId is required')
      if (editingId) {
        const existing = orders.find((o) => o.orderId === editingId)
        await update('orders', editingId, { ...existing, ...payload })
      } else {
        await create('orders', {
          ...payload,
          stockAllocation: 'Pending',
          mtoNeeded: false,
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
    if (!deleteId) return
    try {
      setSaving(true)
      await remove('orders', deleteId)
      setDeleteId(null)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Delete failed', 'danger')
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (key: string, fn: () => Promise<{ message?: string }>) => {
    try {
      setBusyAction(key)
      const res = await fn()
      await refresh('orders')
      pushToast(res.message || 'Done', 'success')
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Action failed',
        'danger',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const bulkAllocate = () => runAction('bulk', () => api.fulfillment.reRoute())

  const viewSku = viewOrder ? skuMap.get(String(viewOrder.sku || '')) : null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-2xl">
            Order Pipeline
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Only 2 warehouses: <strong>India Warehouse</strong> and <strong>US Warehouse</strong>.
            Pending work is listed first.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(role === 'india_wh' || role === 'super_admin') && (
            <Button variant="secondary" size="sm" onClick={bulkAllocate} disabled={!!busyAction}>
              <RefreshCw className="h-3.5 w-3.5" />
              {busyAction === 'bulk' ? 'Checking…' : 'Re-check all stock'}
            </Button>
          )}
          {(role === 'india_wh' || role === 'super_admin' || role === 'finance') && (
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> New Order
            </Button>
          )}
        </div>
      </div>

      {/* Step guide — less confusing for client */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100">
        <p className="font-bold">How to work an order (step by step)</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-[13px] text-indigo-900/90 dark:text-indigo-100/90">
          <li>
            <strong>View details</strong> — see rug photo, SKU, and if stock is in India or US.
          </li>
          <li>
            <strong>US has stock</strong> → India clicks <em>Send barcode to US</em> → US packs to
            customer.
          </li>
          <li>
            <strong>Only India has stock</strong> → India clicks <em>Ship to US</em> → US clicks{' '}
            <em>Receive at US</em> → then pack.
          </li>
          <li>
            <strong>No stock</strong> → status In Process → when ready click <em>Mark ready</em> →
            then Ship to US.
          </li>
        </ol>
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
            <span className="sr-only">Search orders</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search ORD-DEMO, buyer, SKU, rug title…"
              className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
            aria-label="Channel filter"
          >
            <option value="all">All Channels</option>
            <option value="amazon">Amazon US</option>
            <option value="shopify">Shopify DTC</option>
            <option value="walmart">Walmart US</option>
            <option value="offline">Direct / Offline</option>
            <option value="b2b">B2B Wholesale</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
            aria-label="Status filter"
          >
            <option value="all">All Statuses</option>
            <option value="locked">Stock Locked</option>
            <option value="packed">Packed & Handover</option>
            <option value="transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="make">In Process / Make</option>
          </select>
          <span className="text-xs font-medium text-[var(--text-muted)] lg:ml-auto">
            {loading ? 'Loading…' : `${filtered.length} orders`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Product (from inventory)</th>
                <th className="px-4 py-3 font-semibold">Order & customer</th>
                <th className="px-4 py-3 font-semibold">Qty & total</th>
                <th className="px-4 py-3 font-semibold">Where is it?</th>
                <th className="px-4 py-3 font-semibold">Next step / actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((order) => {
                const sku = String(order.sku || '')
                const info = skuMap.get(sku)
                const st = String(order.status || '')
                const scenario = String(order.fulfillmentScenario || '')
                const loc = locationInfo(order)
                const locked = String(order.stockAllocation || '').toLowerCase().includes('lock')
                const oid = String(order.orderId)
                const canIndiaAct = role === 'india_wh' || role === 'super_admin'
                const canUsAct = role === 'usa_wh' || role === 'super_admin'
                const showBarcode =
                  canIndiaAct &&
                  (scenario === 'US_STOCK' ||
                    String(order.stockAllocation || '').toLowerCase().includes('us stock')) &&
                  !order.barcodeGenerated
                const showShip =
                  canIndiaAct &&
                  (scenario === 'INDIA_SHIP' || (scenario === 'MAKE' && st !== 'In Process'))
                const showMake = canIndiaAct && st === 'In Process'
                const showReceive = canUsAct && st === 'In Transit'

                return (
                  <tr key={oid} className="border-t border-[var(--border-main)] align-top">
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <img
                          src={info?.imageUrl || RUG_PLACEHOLDER}
                          alt={info?.title || sku}
                          className="h-16 w-16 shrink-0 rounded-lg border border-[var(--border-main)] object-cover"
                        />
                        <div className="min-w-0">
                          <Link
                            to="/inventory"
                            className="font-mono text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                            title="Open Inventory (linked by SKU)"
                          >
                            {sku}
                          </Link>
                          <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-[var(--text-main)]">
                            {info?.title || 'SKU not found in inventory — add this SKU'}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--text-dim)]">
                            {[info?.size, info?.material, info?.construction]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                            Inventory stock → India: <strong>{info?.india ?? '—'}</strong> · US:{' '}
                            <strong>{info?.usa ?? '—'}</strong>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-[var(--text-main)]">{oid}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge tone={channelTone[String(order.channel)] ?? 'slate'}>
                          {String(order.channel)}
                        </Badge>
                        {order.financeTagged ? <Badge tone="warning">Finance</Badge> : null}
                        {locked ? (
                          <Badge tone="success">
                            <Lock className="h-3 w-3" /> Locked
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1.5 font-semibold text-[var(--text-main)]">
                        {String(order.buyerName)}
                      </p>
                      <p className="mt-0.5 max-w-xs text-xs text-[var(--text-muted)]">
                        {String(order.shippingAddress || '')}
                      </p>
                      <Badge className="mt-1.5">{st}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-base font-extrabold text-[var(--text-main)]">
                        ${Number(order.totalOrderUSD || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-[var(--text-dim)]">Qty: {Number(order.qty || 0)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={loc.tone}>{loc.wh}</Badge>
                      <p className="mt-1.5 max-w-[200px] text-xs text-[var(--text-muted)]">
                        {loc.detail}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                        {loc.step}
                      </p>
                      {order.expectedWarehouseDeliveryDate ? (
                        <p className="mt-1 text-[11px] text-[var(--text-dim)]">
                          ETA: {String(order.expectedWarehouseDeliveryDate)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[280px] flex-col gap-1.5">
                        {showBarcode ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="justify-start"
                            disabled={!!busyAction}
                            onClick={() =>
                              runAction(`bc-${oid}`, () => api.fulfillment.generateBarcode(oid))
                            }
                          >
                            <Zap className="h-3.5 w-3.5" />
                            Send barcode to US
                          </Button>
                        ) : null}
                        {showShip ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="justify-start"
                            disabled={!!busyAction}
                            onClick={() =>
                              runAction(`ship-${oid}`, () => api.fulfillment.shipIndiaToUs(oid))
                            }
                          >
                            <Truck className="h-3.5 w-3.5" />
                            Ship to US Warehouse
                          </Button>
                        ) : null}
                        {showMake ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="justify-start"
                            disabled={!!busyAction}
                            onClick={() =>
                              runAction(`prod-${oid}`, () =>
                                api.fulfillment.productionComplete(oid),
                              )
                            }
                          >
                            <Package className="h-3.5 w-3.5" />
                            Mark ready (made)
                          </Button>
                        ) : null}
                        {showReceive ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="justify-start"
                            disabled={!!busyAction}
                            onClick={() =>
                              runAction(`recv-${oid}`, () => api.fulfillment.usReceive(oid))
                            }
                          >
                            <Package className="h-3.5 w-3.5" />
                            Receive at US
                          </Button>
                        ) : null}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewOrder(order)}
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(order)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          {(canIndiaAct || role === 'super_admin') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!!busyAction}
                              onClick={() =>
                                runAction(`rr-${oid}`, () => api.fulfillment.reRoute([oid]))
                              }
                            >
                              <RefreshCw
                                className={`h-3.5 w-3.5 ${busyAction === `rr-${oid}` ? 'animate-spin' : ''}`}
                              />
                              Re-check
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(oid)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" /> Delete
                          </Button>
                        </div>
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
        title={editingId ? 'Edit Order' : 'New Order'}
        badge={editingId ? 'Update' : 'Create'}
        size="lg"
        onClose={() => setEditorOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Order'}
            </Button>
          </>
        }
      >
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
          {FORM_FIELDS.map((key) => (
            <label
              key={key}
              className={`block text-xs font-semibold text-[var(--text-main)] ${
                key === 'shippingAddress' ? 'sm:col-span-2' : ''
              }`}
            >
              {key}
              {key === 'channel' ? (
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                  value={form[key] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                >
                  <option value="">Select channel</option>
                  <option value="Amazon US">Amazon US</option>
                  <option value="Shopify DTC">Shopify DTC</option>
                  <option value="B2B Wholesale">B2B Wholesale</option>
                  <option value="Direct Offline">Direct Offline</option>
                  <option value="Third-Party Offline">Third-Party Offline</option>
                  <option value="Etsy Direct">Etsy Direct</option>
                  <option value="Walmart US">Walmart US</option>
                </select>
              ) : key === 'sku' ? (
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                  value={form[key] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                >
                  <option value="">Select SKU from inventory</option>
                  {skus.map((s) => (
                    <option key={String(s.sku)} value={String(s.sku)}>
                      {String(s.sku)} — {String(s.title || '').slice(0, 48)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                  value={form[key] ?? ''}
                  disabled={!!editingId && key === 'orderId'}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
        {!editingId ? (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Pick a SKU from Inventory so photo and stock link automatically. Offline channels get a
            Finance tag.
          </p>
        ) : null}
      </Modal>

      <Modal
        open={!!deleteId}
        title="Delete order?"
        badge="Danger"
        badgeTone="danger"
        onClose={() => setDeleteId(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmDelete} disabled={saving}>
              {saving ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        <p>
          Permanently delete <span className="font-mono font-semibold">{deleteId}</span>?
        </p>
      </Modal>

      <Modal
        open={!!viewOrder}
        title={viewOrder ? `Order ${String(viewOrder.orderId)}` : 'Order'}
        badge="Details"
        size="lg"
        onClose={() => setViewOrder(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewOrder(null)}>
              Close
            </Button>
            <Link
              to="/inventory"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-transparent bg-indigo-600 px-3.5 text-sm font-semibold text-white no-underline hover:bg-indigo-700"
              onClick={() => setViewOrder(null)}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open Inventory
            </Link>
          </>
        }
      >
        {viewOrder ? (
          <div className="max-h-[65vh] space-y-4 overflow-y-auto text-sm">
            <div className="flex gap-4">
              <img
                src={viewSku?.imageUrl || RUG_PLACEHOLDER}
                alt=""
                className="h-28 w-28 rounded-xl border border-[var(--border-main)] object-cover"
              />
              <div>
                <p className="font-mono text-xs font-bold text-indigo-600">{String(viewOrder.sku)}</p>
                <p className="mt-1 text-base font-extrabold text-[var(--text-main)]">
                  {viewSku?.title || 'Not linked — SKU missing in Inventory'}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {[viewSku?.size, viewSku?.material, viewSku?.construction, viewSku?.collection]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="mt-2 text-xs">
                  Inventory now → India Warehouse: <strong>{viewSku?.india ?? '—'}</strong> · US
                  Warehouse: <strong>{viewSku?.usa ?? '—'}</strong>
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] p-3">
              <p className="text-[10px] font-bold uppercase text-[var(--text-dim)]">Where is it?</p>
              <p className="mt-1 font-bold text-[var(--text-main)]">
                {locationInfo(viewOrder).wh}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{locationInfo(viewOrder).detail}</p>
              <p className="mt-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                {locationInfo(viewOrder).step}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['Buyer', viewOrder.buyerName],
                ['Channel', viewOrder.channel],
                ['Qty', viewOrder.qty],
                ['Total USD', viewOrder.totalOrderUSD],
                ['Status', viewOrder.status],
                ['Ship to', viewOrder.shippingAddress],
                ['Barcode', viewOrder.barcode || '—'],
                ['AWB', viewOrder.awb || '—'],
                ['Finance tag', viewOrder.financeTagged ? 'Yes' : 'No'],
                ['ETA', viewOrder.expectedWarehouseDeliveryDate || '—'],
              ].map(([label, val]) => (
                <div key={String(label)}>
                  <p className="text-[10px] font-bold uppercase text-[var(--text-dim)]">{label}</p>
                  <p className="font-semibold text-[var(--text-main)]">{String(val ?? '—')}</p>
                </div>
              ))}
            </div>

            {Array.isArray(viewOrder.history) && viewOrder.history.length > 0 ? (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-[var(--text-dim)]">
                  Step history
                </p>
                <ul className="space-y-1.5">
                  {(viewOrder.history as { time?: string; action?: string; detail?: string }[])
                    .slice(0, 12)
                    .map((h, i) => (
                      <li
                        key={`${h.time}-${i}`}
                        className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs"
                      >
                        <span className="font-bold">{h.action}</span>
                        <span className="text-[var(--text-dim)]"> · {h.time}</span>
                        <p className="mt-0.5 text-[var(--text-muted)]">{h.detail}</p>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
