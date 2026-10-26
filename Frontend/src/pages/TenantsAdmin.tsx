import { Building2, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, type TenantDto } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

export function TenantsAdmin() {
  const { user } = useAuth()
  const [rows, setRows] = useState<TenantDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [createdCred, setCreatedCred] = useState<{ email: string; tempPassword: string } | null>(
    null,
  )
  const [form, setForm] = useState({
    name: '',
    slug: '',
    plan: 'starter',
    adminEmail: '',
    adminName: '',
    tempPassword: 'RugOS@2026',
  })

  const load = useCallback(async () => {
    try {
      const res = await api.platform.listTenants()
      setRows(res.data)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load tenants')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (user?.roleCode !== 'super_admin') {
    return (
      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
        Platform Tenants admin is only for Super Admin.
      </div>
    )
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setCreatedCred(null)
    try {
      const res = await api.platform.createTenant({
        name: form.name,
        slug: form.slug || form.name,
        plan: form.plan,
        adminEmail: form.adminEmail,
        adminName: form.adminName || 'Tenant Admin',
        tempPassword: form.tempPassword,
      })
      setCreatedCred({ email: res.admin.email, tempPassword: res.admin.tempPassword })
      setForm({
        name: '',
        slug: '',
        plan: 'starter',
        adminEmail: '',
        adminName: '',
        tempPassword: 'RugOS@2026',
      })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          P2 · Multi-tenant
        </p>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)]">Platform tenants</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Create a new company — first Super Admin gets a temporary password. Data stays isolated per
          company.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {createdCred ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--text-main)]">
          Tenant created. Admin login:{' '}
          <code className="font-mono font-bold">{createdCred.email}</code> /{' '}
          <code className="font-mono font-bold">{createdCred.tempPassword}</code>
        </div>
      ) : null}

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:grid-cols-2"
      >
        <label className="block text-[11px] font-bold uppercase text-[var(--text-dim)]">
          Company name
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          />
        </label>
        <label className="block text-[11px] font-bold uppercase text-[var(--text-dim)]">
          Slug
          <input
            value={form.slug}
            placeholder="auto from name"
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          />
        </label>
        <label className="block text-[11px] font-bold uppercase text-[var(--text-dim)]">
          Plan
          <select
            value={form.plan}
            onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          >
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
        <label className="block text-[11px] font-bold uppercase text-[var(--text-dim)]">
          Admin email
          <input
            type="email"
            required
            value={form.adminEmail}
            onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          />
        </label>
        <label className="block text-[11px] font-bold uppercase text-[var(--text-dim)]">
          Admin name
          <input
            value={form.adminName}
            onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          />
        </label>
        <label className="block text-[11px] font-bold uppercase text-[var(--text-dim)]">
          Temp password
          <input
            value={form.tempPassword}
            onChange={(e) => setForm((f) => ({ ...f, tempPassword: e.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" disabled={busy}>
            <Plus className="h-3.5 w-3.5" />
            {busy ? 'Creating…' : 'Create tenant + admin'}
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
          <Building2 className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-[var(--text-main)]">All tenants ({rows.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wide text-[var(--text-dim)]">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Billing</th>
                <th className="px-3 py-2">Seats</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-[var(--text-main)]">{t.name}</div>
                    <div className="font-mono text-[11px] text-[var(--text-dim)]">{t.id}</div>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-muted)]">{t.planLabel || t.plan}</td>
                  <td className="px-3 py-2.5 text-[var(--text-muted)]">{t.billingStatus}</td>
                  <td className="px-3 py-2.5 font-mono text-[var(--text-main)]">{t.seats ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
