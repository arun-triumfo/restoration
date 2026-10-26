import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, type ResourceRow } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

const ROLE_OPTIONS = [
  { code: 'super_admin', label: 'Super Admin' },
  { code: 'india_wh', label: 'India Warehouse' },
  { code: 'usa_wh', label: 'USA 3PL' },
  { code: 'logistics', label: 'Logistics' },
  { code: 'finance', label: 'Finance' },
  { code: 'sales', label: 'Sales' },
  { code: 'scm', label: 'SCM / Planning' },
  { code: 'auditor', label: 'Auditor' },
]

export function UsersAdmin() {
  const { user } = useAuth()
  const [rows, setRows] = useState<ResourceRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.list('users')
      setRows(res.data)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load users')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (user?.roleCode !== 'super_admin') {
    return (
      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
        Users & RBAC editing is Super Admin only. Your role menus are already locked by login.
      </div>
    )
  }

  const saveRole = async (email: string, roleCode: string) => {
    setBusy(email)
    setError(null)
    setMsg(null)
    try {
      const meta = ROLE_OPTIONS.find((r) => r.code === roleCode)
      await api.update('users', email, {
        email,
        roleCode,
        role: meta?.label || roleCode,
      })
      setMsg(`Updated ${email} → ${meta?.label || roleCode}. User must re-login for JWT menus.`)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          Users & RBAC
        </p>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)]">Team roles</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Role changes save to Mongo and apply on next login (JWT). Password hashes never shown.
        </p>
      </header>

      {msg ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          {msg}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-dim)]">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Save</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const email = String(u.email || '')
              const current = String(u.roleCode || 'auditor')
              return (
                <UserRow
                  key={email}
                  email={email}
                  name={String(u.name || '')}
                  roleCode={current}
                  busy={busy === email}
                  onSave={saveRole}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserRow({
  email,
  name,
  roleCode,
  busy,
  onSave,
}: {
  email: string
  name: string
  roleCode: string
  busy: boolean
  onSave: (email: string, roleCode: string) => void
}) {
  const [code, setCode] = useState(roleCode)
  useEffect(() => setCode(roleCode), [roleCode])

  return (
    <tr className="border-t border-[var(--border-subtle)]">
      <td className="px-3 py-2.5">
        <div className="font-semibold text-[var(--text-main)]">{name || email}</div>
        <div className="font-mono text-[11px] text-[var(--text-dim)]">{email}</div>
      </td>
      <td className="px-3 py-2.5">
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-9 w-full max-w-[14rem] rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 text-sm text-[var(--text-main)]"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2.5">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy || code === roleCode}
          onClick={() => onSave(email, code)}
        >
          {busy ? '…' : 'Save'}
        </Button>
      </td>
    </tr>
  )
}
