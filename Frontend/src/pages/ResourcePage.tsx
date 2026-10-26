import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import type { ColumnDef, ResourceMeta } from '../data/resources'
import type { ResourceRow } from '../api/client'

function cellValue(row: ResourceRow, col: ColumnDef): string {
  const raw = row[col.key]
  if (raw == null) return '—'
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
  if (typeof raw === 'object') return JSON.stringify(raw)
  if (col.format === 'currency' && typeof raw === 'number') {
    return `$${raw.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }
  return String(raw)
}

function emptyForm(columns: ColumnDef[]): Record<string, string> {
  const form: Record<string, string> = {}
  for (const c of columns.filter((x) => x.form !== false)) {
    form[c.key] = ''
  }
  return form
}

function rowToForm(row: ResourceRow, columns: ColumnDef[]): Record<string, string> {
  const form: Record<string, string> = {}
  for (const c of columns.filter((x) => x.form !== false)) {
    const v = row[c.key]
    form[c.key] = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  }
  return form
}

function formToPayload(
  form: Record<string, string>,
  columns: ColumnDef[],
): ResourceRow {
  const payload: ResourceRow = {}
  for (const c of columns.filter((x) => x.form !== false)) {
    const raw = form[c.key] ?? ''
    if (c.type === 'number') {
      payload[c.key] = raw === '' ? 0 : Number(raw)
    } else if (c.format === 'bool') {
      payload[c.key] = raw === 'true' || raw === '1' || raw.toLowerCase() === 'yes'
    } else {
      payload[c.key] = raw
    }
  }
  return payload
}

export function ResourcePage({ meta }: { meta: ResourceMeta }) {
  const { user } = useAuth()
  const { list, create, update, remove, getId, loading, error } = useData()
  const rows = list(meta.key)
  const canWrite =
    user?.roleCode === 'super_admin' ||
    Boolean(user?.permissions?.actions?.includes('write')) ||
    (user?.roleCode !== 'auditor' && user?.roleCode !== undefined)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>(() => emptyForm(meta.columns))
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const tableCols = meta.columns.filter((c) => c.table !== false)
  const formCols = meta.columns.filter((c) => c.form !== false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      tableCols.some((c) => cellValue(row, c).toLowerCase().includes(q)),
    )
  }, [rows, query, tableCols])

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm(meta.columns))
    setEditorOpen(true)
  }

  const openEdit = (row: ResourceRow) => {
    setEditingId(getId(meta.key, row))
    setForm(rowToForm(row, meta.columns))
    setEditorOpen(true)
  }

  const save = async () => {
    try {
      setSaving(true)
      const payload = formToPayload(form, meta.columns)
      const idVal = String(payload[meta.idField] ?? '')
      if (!idVal) throw new Error(`${meta.idField} is required`)
      if (editingId) {
        await update(meta.key, editingId, payload)
      } else {
        await create(meta.key, payload)
      }
      setEditorOpen(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      setSaving(true)
      await remove(meta.key, deleteId)
      setDeleteId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-2xl">
            {meta.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{meta.subtitle}</p>
        </div>
        {canWrite ? (
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Add {meta.label.replace(/s$/, '')}
          </Button>
        ) : (
          <span className="rounded-full border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--text-dim)]">
            Read only
          </span>
        )}
      </div>
      <p className="text-[11px] text-[var(--text-dim)]">
        Live Mongo CRUD{canWrite ? ' — Add / Edit / Delete' : ' — view only for your role'} · tenant{' '}
        <code>{user?.tenantId}</code>
      </p>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          API error: {error}. Check backend at https://restoration-b.onrender.com/api/health
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border-main)] p-4 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder={`Search ${meta.label.toLowerCase()}...`}
              className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {loading ? 'Loading…' : `${filtered.length} records`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
              <tr>
                {tableCols.map((c) => (
                  <th key={c.key} className="px-4 py-3 font-semibold">
                    {c.label}
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => {
                const id = getId(meta.key, row)
                return (
                  <tr key={id || String(row._id)} className="border-t border-[var(--border-main)] align-top">
                    {tableCols.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-[var(--text-main)]">
                        {c.format === 'badge' ? (
                          <Badge>{cellValue(row, c)}</Badge>
                        ) : (
                          <span className="break-words">{cellValue(row, c)}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      {canWrite ? (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => openEdit(row)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Delete"
                            onClick={() => setDeleteId(id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-dim)]">View</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!loading && pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableCols.length + 1}
                    className="px-4 py-10 text-center text-sm text-[var(--text-muted)]"
                  >
                    No records found
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
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </div>

      <Modal
        open={editorOpen}
        title={editingId ? `Edit ${meta.label}` : `Add ${meta.label}`}
        badge={editingId ? 'Update' : 'Create'}
        size="lg"
        onClose={() => setEditorOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
          {formCols.map((c) => (
            <label
              key={c.key}
              className={`block text-xs font-semibold text-[var(--text-main)] ${
                c.type === 'textarea' ? 'sm:col-span-2' : ''
              }`}
            >
              {c.label}
              {c.key === meta.idField ? ' *' : ''}
              {c.type === 'textarea' ? (
                <textarea
                  className="mt-1 min-h-20 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
                  value={form[c.key] ?? ''}
                  disabled={!!editingId && c.key === meta.idField}
                  onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                />
              ) : (
                <input
                  type={c.type === 'number' ? 'number' : 'text'}
                  className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                  value={form[c.key] ?? ''}
                  disabled={!!editingId && c.key === meta.idField}
                  onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!deleteId}
        title="Delete record?"
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
          Permanently delete <span className="font-mono font-semibold">{deleteId}</span> from{' '}
          {meta.label}?
        </p>
      </Modal>
    </div>
  )
}
