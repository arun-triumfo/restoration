import {
  Eye,
  Lock,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Truck,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
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

function inIndiaQueue(order: ResourceRow) {
  const owner = String(order.queueOwner || 'india_wh')
  return owner === 'india_wh'
}

function inUsQueue(order: ResourceRow) {
  return String(order.queueOwner || '') === 'usa_wh'
}

export function Orders() {
  const { pushToast } = useApp()
  const { user } = useAuth()
  const { list, create, update, remove, loading, error, refresh } = useData()
  const orders = list('orders')
  const skus = list('skus')
  const role = normalizeRoleCode(String(user?.roleCode || ''))

  const skuTitle = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of skus) map.set(String(s.sku), String(s.title || ''))
    return map
  }, [skus])

  const [tab, setTab] = useState<OrderTab>('all')
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const roleScoped = useMemo(() => {
    if (role === 'super_admin' || role === 'finance') return orders
    if (role === 'usa_wh') return orders.filter(inUsQueue)
    // India WH: India queue + In Process make orders
    return orders.filter(
      (o) =>
        inIndiaQueue(o) ||
        String(o.status || '').toLowerCase().includes('in process') ||
        String(o.fulfillmentScenario || '') === 'MAKE',
    )
  }, [orders, role])

  const filtered = useMemo(() => {
    return roleScoped.filter((order) => {
      const q = query.trim().toLowerCase()
      const orderId = String(order.orderId || '')
      const buyerName = String(order.buyerName || '')
      const sku = String(order.sku || '')
      const title = skuTitle.get(sku) || ''
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
        (tab === 'pending' &&
          (st === 'Pending Allocation' || st === 'In Process' || st.includes('Ready'))) ||
        (tab === 'packed' && st.includes('Packed')) ||
        (tab === 'transit' && st === 'In Transit') ||
        (tab === 'delivered' && st === 'Delivered')

      return matchesQuery && matchesChannel && matchesStatus && matchesTab
    })
  }, [roleScoped, tab, query, channel, status, skuTitle])

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)

  const tabs: { id: OrderTab; label: string }[] = [
    { id: 'all', label: `All Orders (${roleScoped.length})` },
    { id: 'pending', label: 'Pending Allocation' },
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
        // Backend applies India-first routing + finance tag for offline channels
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
      pushToast(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Action failed', 'danger')
    } finally {
      setBusyAction(null)
    }
  }

  const bulkAllocate = () =>
    runAction('bulk', () => api.fulfillment.reRoute())

  const queueHint =
    role === 'usa_wh'
      ? 'US Warehouse Manager queue — pack & dispatch to customer'
      : role === 'india_wh'
        ? 'India Warehouse Manager queue — barcode, India→US ship, or make'
        : role === 'finance'
          ? 'Finance view — offline / tagged orders feed P&L and courier audit'
          : 'Live MongoDB orders — India-first routing (US stock → India → make)'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-2xl">
            Order Pipeline
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{queueHint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(role === 'india_wh' || role === 'super_admin') && (
            <Button variant="secondary" size="sm" onClick={bulkAllocate} disabled={!!busyAction}>
              <Zap className="h-3.5 w-3.5 text-orange-500" />
              {busyAction === 'bulk' ? 'Allocating…' : 'Bulk Allocate'}
            </Button>
          )}
          {(role === 'india_wh' || role === 'super_admin' || role === 'finance') && (
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> New Order
            </Button>
          )}
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
            <span className="sr-only">Search orders</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search orders, buyers, SKUs..."
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
            <option value="etsy">Etsy Direct</option>
            <option value="walmart">Walmart US</option>
            <option value="shopify">Shopify DTC</option>
            <option value="b2b">B2B Wholesale</option>
            <option value="offline">Direct / Offline</option>
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
            <option value="locked">Concurrency Locked</option>
            <option value="packed">Packed & Handover</option>
            <option value="transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="make">In Process / MTO</option>
          </select>
          <span className="text-xs font-medium text-[var(--text-muted)] lg:ml-auto">
            {loading ? 'Loading…' : `${filtered.length} Orders matching`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Order ID & Channel</th>
                <th className="px-4 py-3 font-semibold">Customer & Destination</th>
                <th className="px-4 py-3 font-semibold">Rug SKU & Specs</th>
                <th className="px-4 py-3 font-semibold">Qty & Total</th>
                <th className="px-4 py-3 font-semibold">Fulfillment</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((order) => {
                const sku = String(order.sku || '')
                const title = skuTitle.get(sku) || ''
                const st = String(order.status || '')
                const wh = String(order.fulfillmentWh || '')
                const scenario = String(order.fulfillmentScenario || '')
                const region = wh.toLowerCase().includes('usa') || inUsQueue(order) ? 'USA' : 'India'
                const locked = String(order.stockAllocation || '').toLowerCase().includes('lock')
                const oid = String(order.orderId)
                const canIndiaAct = role === 'india_wh' || role === 'super_admin'
                const canUsAct = role === 'usa_wh' || role === 'super_admin'
                return (
                  <tr
                    key={oid}
                    className="border-t border-[var(--border-main)] align-top"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-[var(--text-main)]">{oid}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone={channelTone[String(order.channel)] ?? 'slate'}>
                          {String(order.channel)}
                        </Badge>
                        {order.financeTagged ? <Badge tone="warning">Finance</Badge> : null}
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-[var(--text-dim)]">
                        {String(order.marketplaceOrderId || '')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--text-main)]">
                        {String(order.buyerName)}
                      </p>
                      <p className="mt-1 max-w-xs text-xs text-[var(--text-muted)]">
                        {String(order.shippingAddress || '')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {sku}
                        </span>
                        {locked ? (
                          <Badge tone="success">
                            <Lock className="h-3 w-3" /> Stock Locked
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{title}</p>
                      <Badge className="mt-1.5">{st}</Badge>
                      {order.expectedWarehouseDeliveryDate ? (
                        <p className="mt-1 text-[11px] text-[var(--text-dim)]">
                          ETA WH: {String(order.expectedWarehouseDeliveryDate)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-base font-extrabold text-[var(--text-main)]">
                        ${Number(order.totalOrderUSD || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-[var(--text-dim)]">Qty: {Number(order.qty || 0)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={region === 'USA' ? 'success' : 'purple'}>{region}</Badge>
                      {scenario ? (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                          {scenario.replace('_', ' ')}
                        </p>
                      ) : null}
                      <p className="mt-1.5 max-w-[180px] text-xs text-[var(--text-muted)]">{wh}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {canIndiaAct && scenario === 'US_STOCK' && !order.barcodeGenerated ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Generate barcode → US bucket"
                            disabled={!!busyAction}
                            onClick={() =>
                              runAction(`bc-${oid}`, () => api.fulfillment.generateBarcode(oid))
                            }
                          >
                            <Zap className="h-3.5 w-3.5 text-orange-500" />
                          </Button>
                        ) : null}
                        {canIndiaAct &&
                        (scenario === 'INDIA_SHIP' ||
                          (scenario === 'MAKE' && st !== 'In Process')) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Ship India → US"
                            disabled={!!busyAction}
                            onClick={() =>
                              runAction(`ship-${oid}`, () => api.fulfillment.shipIndiaToUs(oid))
                            }
                          >
                            <Truck className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {canIndiaAct && st === 'In Process' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Production complete"
                            disabled={!!busyAction}
                            onClick={() =>
                              runAction(`prod-${oid}`, () =>
                                api.fulfillment.productionComplete(oid),
                              )
                            }
                          >
                            <Package className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {canUsAct && st === 'In Transit' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Confirm US receive"
                            disabled={!!busyAction}
                            onClick={() =>
                              runAction(`recv-${oid}`, () => api.fulfillment.usReceive(oid))
                            }
                          >
                            <Package className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" aria-label={`View ${oid}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${oid}`}
                          onClick={() => openEdit(order)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" aria-label={`Return ${oid}`}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${oid}`}
                          onClick={() => setDeleteId(oid)}
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
            New orders route to the India Warehouse Manager queue. Offline / direct channels are
            tagged for Finance P&amp;L automatically.
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
          Permanently delete <span className="font-mono font-semibold">{deleteId}</span> from
          MongoDB?
        </p>
      </Modal>
    </div>
  )
}
