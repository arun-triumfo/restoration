import { CreditCard, Shield } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, type IntegrationConnection, type TenantDto } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

const PLANS = [
  {
    id: 'starter',
    label: 'Starter',
    seats: 5,
    blurb: 'Inventory, orders, shipping',
    modules: ['core', 'inventory', 'orders', 'shipping'],
  },
  {
    id: 'growth',
    label: 'Growth',
    seats: 15,
    blurb: '+ Forecast, export docs, integrations',
    modules: ['core', 'inventory', 'orders', 'shipping', 'forecast', 'export', 'integrations'],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    seats: 50,
    blurb: 'All modules (demo)',
    modules: ['*'],
  },
]

export function Billing() {
  const { user, refreshMe } = useAuth()
  const [tenant, setTenant] = useState<TenantDto | null>(user?.tenant || null)
  const [gateways, setGateways] = useState<IntegrationConnection[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.platform.myTenant()
      setTenant(res.tenant)
      try {
        const integ = await api.integrations.list()
        setGateways(integ.data.filter((d) => d.channel === 'razorpay' || d.channel === 'stripe'))
      } catch {
        setGateways([])
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load billing')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setPlan = async (plan: string) => {
    if (!tenant?.id) return
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const res = await api.platform.updateTenant(tenant.id, {
        plan,
        billingStatus: 'active',
      })
      setTenant(res.tenant)
      setMsg(`Plan updated to ${res.tenant.planLabel || plan}.`)
      await refreshMe()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const loadRazorpay = () =>
    new Promise<void>((resolve, reject) => {
      if (document.querySelector('script[src*="checkout.razorpay.com"]')) return resolve()
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Could not load Razorpay checkout'))
      document.body.appendChild(s)
    })

  const pay = async (provider: string, plan: string) => {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const res = await api.integrations.checkout(provider, {
        plan,
        successUrl: `${window.location.origin}/billing?paid=1`,
        cancelUrl: `${window.location.origin}/billing?paid=0`,
      })
      if (res.free) {
        setMsg(res.message || 'Starter is free')
        return
      }
      if (res.url) {
        window.location.href = res.url
        return
      }
      if (res.orderId && res.keyId) {
        await loadRazorpay()
        const Razorpay = (window as unknown as { Razorpay: new (opts: object) => { open: () => void } }).Razorpay
        const rzp = new Razorpay({
          key: res.keyId,
          order_id: res.orderId,
          name: 'RugOS',
          description: `Plan ${plan}`,
          handler: () => {
            setMsg('Payment received. Refreshing…')
            load()
          },
        })
        rzp.open()
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  const setBillingStatus = async (billingStatus: string) => {
    if (!tenant?.id || user?.roleCode !== 'super_admin') return
    setBusy(true)
    try {
      const res = await api.platform.updateTenant(tenant.id, { billingStatus })
      setTenant(res.tenant)
      setMsg(`Billing status → ${billingStatus}`)
      await refreshMe()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          P2 · Billing
        </p>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)]">Plan & subscription</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Super Admin can switch plans in demo. Live Razorpay / Stripe checkout starts the moment keys
          are saved on{' '}
          <Link to="/integrations" className="font-bold text-indigo-600 no-underline dark:text-indigo-300">
            Integrations
          </Link>
          .
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)]">
              <Shield className="h-4 w-4 text-indigo-500" />
              {tenant?.name || 'Your company'}
            </div>
            <p className="mt-1 font-mono text-[12px] text-[var(--text-dim)]">{tenant?.id}</p>
          </div>
          <div className="text-right text-sm">
            <div className="font-bold text-[var(--text-main)]">{tenant?.planLabel || tenant?.plan}</div>
            <div className="text-[12px] text-[var(--text-muted)]">
              Billing: {tenant?.billingStatus || 'active'} · Seats: {tenant?.seats ?? '—'}
            </div>
          </div>
        </div>
        {tenant?.modules?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tenant.modules.map((m) => (
              <span
                key={m}
                className="rounded-full border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--text-muted)]"
              >
                {m}
              </span>
            ))}
          </div>
        ) : null}
      </div>

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

      <div className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((p) => {
          const on = tenant?.plan === p.id
          return (
            <button
              key={p.id}
              type="button"
              disabled={busy || user?.roleCode !== 'super_admin'}
              onClick={() => setPlan(p.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                on
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-[var(--border-main)] bg-[var(--bg-card)] hover:border-indigo-400/50'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-[var(--text-main)]">
                <CreditCard className="h-4 w-4 text-indigo-500" />
                {p.label}
              </div>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">{p.blurb}</p>
              <p className="mt-2 font-mono text-[11px] text-[var(--text-dim)]">{p.seats} seats</p>
              {on ? (
                <span className="mt-2 inline-block text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-300">
                  Current
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {user?.roleCode === 'super_admin' ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setBillingStatus('active')}>
            Mark active
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => setBillingStatus('suspended')}
          >
            Suspend (test 402)
          </Button>
          {gateways
            .filter((g) => g.status === 'connected' && g.mode === 'live')
            .map((g) => (
              <Button
                key={g.channel}
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() => pay(g.channel, tenant?.plan || 'growth')}
              >
                Pay with {g.channel === 'razorpay' ? 'Razorpay' : 'Stripe'}
              </Button>
            ))}
        </div>
      ) : (
        <p className="text-[12px] text-[var(--text-dim)]">Only Super Admin can change plan.</p>
      )}
    </div>
  )
}
