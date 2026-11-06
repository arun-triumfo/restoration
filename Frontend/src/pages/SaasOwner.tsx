import {
  AlertTriangle,
  Building2,
  CreditCard,
  Plus,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, type ResourceRow, type TenantDto } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

type Overview = {
  totalTenants: number
  active: number
  pending: number
  expiringSoon: number
  suspendedOrExpired: number
  pendingDemos: number
  estimatedMrrUsd?: number
  estimatedMrrInr: number
  expiring: TenantDto[]
  pendingBuyers: TenantDto[]
}

type Tab = 'overview' | 'buyers' | 'subscriptions' | 'demos' | 'create'

function formatMoney(n: number, currency = 'USD') {
  const code = String(currency || 'USD').toUpperCase() === 'INR' ? 'INR' : 'USD'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  }).format(Number(n || 0))
}

function statusTone(s?: string): 'success' | 'warning' | 'danger' | 'purple' | 'slate' {
  const v = String(s || '').toLowerCase()
  if (v.includes('active')) return 'success'
  if (v.includes('pending')) return 'warning'
  if (v.includes('suspend') || v.includes('expir') || v.includes('cancel')) return 'danger'
  return 'slate'
}

export function SaasOwner() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [tenants, setTenants] = useState<TenantDto[]>([])
  const [demos, setDemos] = useState<ResourceRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [activateRow, setActivateRow] = useState<TenantDto | null>(null)
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [mode, setMode] = useState<'export' | 'import'>('export')
  const [createdCred, setCreatedCred] = useState<{ email: string; tempPassword: string } | null>(
    null,
  )
  const [form, setForm] = useState({
    name: '',
    slug: '',
    plan: 'growth',
    billingCycle: 'monthly',
    adminEmail: '',
    adminName: '',
    tempPassword: 'RugOS@2026',
  })

  const load = useCallback(async () => {
    try {
      setError(null)
      const [ov, ten, dem] = await Promise.all([
        api.platform.overview(),
        api.platform.listTenants(),
        api.platform.listDemoRequests(),
      ])
      setOverview(ov.data)
      setTenants(ten.data)
      setDemos(dem.data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load SaaS console')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const subscriptions = useMemo(
    () =>
      [...tenants].sort((a, b) => {
        const da = a.daysLeft ?? 9999
        const db = b.daysLeft ?? 9999
        return da - db
      }),
    [tenants],
  )

  if (user?.roleCode !== 'super_admin' && !user?.isPlatformOwner) {
    return (
      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
        SaaS owner console is only for the platform owner (Super Admin).
      </div>
    )
  }

  const activate = async () => {
    if (!activateRow) return
    setBusy(true)
    setMsg(null)
    setError(null)
    try {
      const res = await api.platform.activateTenant(activateRow.id, {
        billingCycle: cycle,
        businessMode: mode,
      })
      setMsg(res.message || 'Activated')
      if (res.admin) setCreatedCred(res.admin)
      setActivateRow(null)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Activate failed')
    } finally {
      setBusy(false)
    }
  }

  const suspend = async (id: string) => {
    if (!window.confirm('Suspend this company? Their users cannot log in.')) return
    setBusy(true)
    try {
      await api.platform.suspendTenant(id)
      setMsg('Tenant suspended')
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Suspend failed')
    } finally {
      setBusy(false)
    }
  }

  const renew = async (t: TenantDto) => {
    setBusy(true)
    try {
      const cycleNow = t.billingCycle === 'yearly' ? 'yearly' : 'monthly'
      await api.platform.updateTenant(t.id, {
        billingStatus: 'active',
        status: 'Active',
        billingCycle: cycleNow,
      })
      setMsg(`Renewed ${t.name || t.companyName}`)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Renew failed')
    } finally {
      setBusy(false)
    }
  }

  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setCreatedCred(null)
    try {
      const res = await api.platform.createTenant({
        name: form.name,
        slug: form.slug || form.name,
        plan: form.plan,
        billingCycle: form.billingCycle,
        adminEmail: form.adminEmail,
        adminName: form.adminName || 'Company Admin',
        tempPassword: form.tempPassword,
      })
      setCreatedCred({ email: res.admin.email, tempPassword: res.admin.tempPassword })
      setMsg(res.message || 'Tenant created')
      setForm({
        name: '',
        slug: '',
        plan: 'growth',
        billingCycle: 'monthly',
        adminEmail: '',
        adminName: '',
        tempPassword: 'RugOS@2026',
      })
      await load()
      setTab('buyers')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  const updateDemo = async (id: string, status: string) => {
    try {
      await api.platform.updateDemoRequest(id, status)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Demo update failed')
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'buyers', label: `Buyers (${tenants.length})` },
    { id: 'subscriptions', label: 'Subscriptions & expiry' },
    { id: 'demos', label: `Demo requests (${demos.length})` },
    { id: 'create', label: 'Create tenant' },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
            Platform owner · SaaS
          </p>
          <h1 className="text-2xl font-extrabold text-[var(--text-main)]">RugOS subscriptions</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage every company that bought RugOS — payment, plan, validity and activation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={busy}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Link
            to="/billing"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-main)] px-2.5 text-xs font-semibold no-underline"
          >
            <CreditCard className="h-3.5 w-3.5" /> Plans / Billing
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {msg ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          {msg}
        </div>
      ) : null}
      {createdCred ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          Admin login:{' '}
          <code className="font-mono font-bold">{createdCred.email}</code> /{' '}
          <code className="font-mono font-bold">{createdCred.tempPassword}</code>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              tab === t.id
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-muted)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview ? (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Active companies',
                value: overview.active,
                icon: Building2,
                hint: `${overview.totalTenants} total`,
              },
              {
                label: 'Pending activation',
                value: overview.pending,
                icon: Users,
                hint: 'Landing purchases waiting',
              },
              {
                label: 'Expiring ≤ 14 days',
                value: overview.expiringSoon,
                icon: AlertTriangle,
                hint: 'Renew soon',
              },
              {
                label: 'Est. MRR',
                value: formatMoney(overview.estimatedMrrUsd ?? overview.estimatedMrrInr, 'USD'),
                icon: CreditCard,
                hint: `${overview.pendingDemos} open demos`,
              },
            ].map((c) => {
              const Icon = c.icon
              return (
                <div
                  key={c.label}
                  className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase text-[var(--text-dim)]">{c.label}</p>
                    <Icon className="h-4 w-4 text-indigo-500" />
                  </div>
                  <p className="mt-2 font-mono text-2xl font-extrabold text-[var(--text-main)]">
                    {c.value}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{c.hint}</p>
                </div>
              )
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
              <h2 className="text-sm font-bold text-[var(--text-main)]">Pending buyers</h2>
              <ul className="mt-3 space-y-2">
                {(overview.pendingBuyers || []).slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{t.companyName || t.name}</p>
                      <p className="text-[11px] text-[var(--text-dim)]">
                        {t.planLabel || t.plan} · {t.billingCycle} · {t.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setActivateRow(t)
                        setCycle(t.billingCycle === 'yearly' ? 'yearly' : 'monthly')
                      }}
                    >
                      Activate
                    </Button>
                  </li>
                ))}
                {!overview.pendingBuyers?.length ? (
                  <li className="text-sm text-[var(--text-muted)]">No pending purchases.</li>
                ) : null}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
              <h2 className="text-sm font-bold text-[var(--text-main)]">Expiring soon</h2>
              <ul className="mt-3 space-y-2">
                {(overview.expiring || []).slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
                  >
                    <div>
                      <p className="font-semibold">{t.companyName || t.name}</p>
                      <p className="text-[11px] text-[var(--text-dim)]">
                        {t.daysLeft}d left · renews {String(t.renewsAt || '').slice(0, 10)} ·{' '}
                        {formatMoney(Number(t.amount || 0), t.currency || 'USD')}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => void renew(t)}>
                      Renew
                    </Button>
                  </li>
                ))}
                {!overview.expiring?.length ? (
                  <li className="text-sm text-[var(--text-muted)]">No upcoming expiries.</li>
                ) : null}
              </ul>
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'buyers' ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:hidden">
            {tenants.map((t) => (
              <article
                key={t.id}
                className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--text-main)]">{t.companyName || t.name}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">{t.email}</p>
                  </div>
                  <Badge tone={statusTone(t.status || t.billingStatus)}>
                    {t.status || t.billingStatus}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-[var(--text-dim)]">Plan</dt>
                    <dd className="font-semibold">
                      {t.planLabel || t.plan} · {t.billingCycle}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-dim)]">Payment</dt>
                    <dd className="font-semibold">{formatMoney(Number(t.amount || 0), t.currency || 'USD')}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[var(--text-dim)]">Validity</dt>
                    <dd className="font-semibold">
                      {t.renewsAt ? String(t.renewsAt).slice(0, 10) : '—'}
                      {t.daysLeft != null
                        ? t.expired
                          ? ' · Expired'
                          : ` · ${t.daysLeft}d left`
                        : ''}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {String(t.status || '')
                    .toLowerCase()
                    .includes('pending') ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setActivateRow(t)
                        setCycle(t.billingCycle === 'yearly' ? 'yearly' : 'monthly')
                      }}
                    >
                      Activate
                    </Button>
                  ) : null}
                  {String(t.billingStatus || '').toLowerCase() === 'active' &&
                  t.id !== 'tenant-restoration' &&
                  !String(t.id).includes('default') ? (
                    <Button size="sm" variant="ghost" onClick={() => void suspend(t.id)}>
                      Suspend
                    </Button>
                  ) : null}
                  {t.expired || t.expiresSoon ? (
                    <Button size="sm" variant="secondary" onClick={() => void renew(t)}>
                      Renew
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] md:block">
            <div className="table-scroll">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-dim)]">
                  <tr>
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Payment</th>
                    <th className="px-3 py-2">Validity</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} className="border-t border-[var(--border-subtle)] align-top">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-[var(--text-main)]">
                          {t.companyName || t.name}
                        </p>
                        <p className="font-mono text-[11px] text-[var(--text-dim)]">{t.id}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[var(--text-muted)]">
                        {t.contactName || '—'}
                        <br />
                        {t.email}
                      </td>
                      <td className="px-3 py-2.5">
                        {t.planLabel || t.plan}
                        <br />
                        <span className="text-[11px] text-[var(--text-dim)]">{t.billingCycle}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {formatMoney(Number(t.amount || 0), t.currency || 'USD')}
                        <br />
                        <span className="font-mono text-[var(--text-dim)]">{t.paymentRef || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {t.renewsAt ? String(t.renewsAt).slice(0, 10) : '—'}
                        {t.daysLeft != null ? (
                          <p
                            className={
                              t.expiresSoon || t.expired
                                ? 'font-semibold text-amber-700'
                                : 'text-[var(--text-dim)]'
                            }
                          >
                            {t.expired ? 'Expired' : `${t.daysLeft}d left`}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={statusTone(t.status || t.billingStatus)}>
                          {t.status || t.billingStatus}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {String(t.status || '')
                            .toLowerCase()
                            .includes('pending') ? (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setActivateRow(t)
                                setCycle(t.billingCycle === 'yearly' ? 'yearly' : 'monthly')
                              }}
                            >
                              Activate
                            </Button>
                          ) : null}
                          {String(t.billingStatus || '').toLowerCase() === 'active' &&
                          t.id !== 'tenant-restoration' &&
                          !String(t.id).includes('default') ? (
                            <Button size="sm" variant="ghost" onClick={() => void suspend(t.id)}>
                              Suspend
                            </Button>
                          ) : null}
                          {t.expired || t.expiresSoon ? (
                            <Button size="sm" variant="secondary" onClick={() => void renew(t)}>
                              Renew
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'subscriptions' ? (
        <div className="space-y-3">
          <p className="text-sm font-bold text-[var(--text-main)]">
            All subscriptions — sorted by days left
          </p>
          <div className="grid gap-3 md:hidden">
            {subscriptions.map((t) => (
              <article
                key={t.id}
                className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{t.companyName || t.name}</p>
                  <Badge tone={statusTone(t.billingStatus)}>{t.billingStatus}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t.planLabel || t.plan} · {t.billingCycle} · {formatMoney(Number(t.amount || 0), t.currency || 'USD')}
                </p>
                <p className="mt-2 font-mono text-[11px] text-[var(--text-dim)]">
                  {t.paymentRef || '—'}
                </p>
                <p className="mt-1 text-xs font-semibold">
                  Renews {t.renewsAt ? String(t.renewsAt).slice(0, 10) : '—'}
                  {t.daysLeft != null ? ` · ${t.daysLeft}d` : ''}
                </p>
              </article>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] md:block">
            <div className="table-scroll">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-dim)]">
                  <tr>
                    <th className="px-3 py-2">Buyer</th>
                    <th className="px-3 py-2">Plan / cycle</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Payment ref</th>
                    <th className="px-3 py-2">Renews</th>
                    <th className="px-3 py-2">Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((t) => (
                    <tr key={t.id} className="border-t border-[var(--border-subtle)]">
                      <td className="px-3 py-2 font-semibold">{t.companyName || t.name}</td>
                      <td className="px-3 py-2">
                        {t.planLabel || t.plan} · {t.billingCycle}
                      </td>
                      <td className="px-3 py-2 font-mono">{formatMoney(Number(t.amount || 0), t.currency || 'USD')}</td>
                      <td className="px-3 py-2 font-mono text-xs">{t.paymentRef || '—'}</td>
                      <td className="px-3 py-2 text-xs">
                        {t.renewsAt ? String(t.renewsAt).slice(0, 10) : '—'}
                        {t.daysLeft != null ? ` · ${t.daysLeft}d` : ''}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={statusTone(t.billingStatus)}>{t.billingStatus}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'demos' ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)]">
          <div className="table-scroll">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-dim)]">
              <tr>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {demos.map((d) => {
                const id = String(d.id || '')
                return (
                  <tr key={id} className="border-t border-[var(--border-subtle)]">
                    <td className="px-3 py-2 font-semibold">{String(d.companyName || '')}</td>
                    <td className="px-3 py-2 text-xs">{String(d.email || '')}</td>
                    <td className="px-3 py-2 text-xs">{String(d.businessType || '—')}</td>
                    <td className="px-3 py-2">
                      <Badge tone={statusTone(String(d.status))}>{String(d.status)}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {['Contacted', 'Approved', 'Rejected'].map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="ghost"
                            onClick={() => void updateDemo(id, s)}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!demos.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[var(--text-muted)]">
                    No demo requests yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        </div>
      ) : null}

      {tab === 'create' ? (
        <form
          onSubmit={createTenant}
          className="grid gap-3 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:grid-cols-2"
        >
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)] sm:col-span-2">
            <Shield className="h-4 w-4 text-indigo-500" /> Create company + admin (manual)
          </p>
          {(
            [
              ['Company name', 'name', 'text'],
              ['Slug', 'slug', 'text'],
              ['Admin email', 'adminEmail', 'email'],
              ['Admin name', 'adminName', 'text'],
              ['Temp password', 'tempPassword', 'text'],
            ] as const
          ).map(([label, key, type]) => (
            <label key={key} className="block text-[11px] font-bold uppercase text-[var(--text-dim)]">
              {label}
              <input
                required={key === 'name' || key === 'adminEmail'}
                type={type}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
              />
            </label>
          ))}
          <label className="block text-[11px] font-bold uppercase text-[var(--text-dim)]">
            Plan
            <select
              value={form.plan}
              onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case"
            >
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <label className="block text-[11px] font-bold uppercase text-[var(--text-dim)]">
            Billing cycle
            <select
              value={form.billingCycle}
              onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value }))}
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" disabled={busy}>
              <Plus className="h-3.5 w-3.5" />
              {busy ? 'Creating…' : 'Create tenant + admin'}
            </Button>
          </div>
        </form>
      ) : null}

      <Modal
        open={!!activateRow}
        title={activateRow ? `Activate ${activateRow.companyName || activateRow.name}` : 'Activate'}
        badge="SaaS"
        onClose={() => setActivateRow(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setActivateRow(null)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => void activate()}>
              {busy ? 'Activating…' : 'Approve & activate'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-[var(--text-muted)]">
            Starts validity from today. Admin user is created from the buyer email if missing.
          </p>
          <label className="block text-xs font-semibold">
            Billing cycle
            <select
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3"
              value={cycle}
              onChange={(e) => setCycle(e.target.value as 'monthly' | 'yearly')}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Business mode
            <select
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'export' | 'import')}
            >
              <option value="export">Export</option>
              <option value="import">Import</option>
            </select>
          </label>
        </div>
      </Modal>
    </div>
  )
}
