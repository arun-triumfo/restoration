import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { DEMO_PASSWORD } from '../auth/roles'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

/** Company (buyer) roles — ops app. Platform owner uses /login/owner → /saas only. */
const COMPANY_DEMOS = [
  {
    email: 'company-admin@restoration.com',
    role: 'Company Admin',
    hint: 'Bought the SaaS plan · full company ops (not SaaS console)',
  },
  {
    email: 'india@restoration.com',
    role: 'India Warehouse Manager',
    hint: 'Orders · MTO · India ship',
  },
  {
    email: 'usa@restoration.com',
    role: 'US Warehouse Manager',
    hint: 'US bucket · pack · dispatch',
  },
  {
    email: 'finance@restoration.com',
    role: 'Finance Manager',
    hint: 'Receivables · P&L · reports',
  },
] as const

export function Login() {
  const { user, loading, login, logout, isPlatformOwner } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('company-admin@restoration.com')
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    if (isPlatformOwner) return <Navigate to="/saas" replace />
    return <Navigate to="/dashboard" replace />
  }

  const finishCompanyLogin = async (em: string, pw: string) => {
    setBusy(true)
    setError(null)
    try {
      const res = await login(em.trim(), pw)
      if (res.isPlatformOwner) {
        logout()
        setError(
          'That account is Platform Owner (SaaS seller). Use Owner sign-in. Company Admin is company-admin@restoration.com.',
        )
        return
      }
      navigate(res.redirectTo || '/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await finishCompanyLogin(email, password)
  }

  return (
    <div className="rugos-public flex min-h-dvh flex-col lg:min-h-screen lg:flex-row">
      <div className="relative hidden w-[48%] flex-col justify-between bg-teal-950 p-10 text-white lg:flex">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-300">
            Company workspace
          </p>
          <p className="landing-display mt-2 text-2xl font-semibold tracking-tight">
            RugOS / ExportOS
          </p>
          <p className="mt-2 max-w-md text-sm text-teal-100/80">
            For the company that purchased a subscription — Admin + warehouse + finance. Never the
            SaaS seller console.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-teal-100/80">
          <li>• Company Admin — bought the plan · full ops menus</li>
          <li>• India WH — mill, India stock, direct ship</li>
          <li>• US WH — pack & dispatch from US bucket</li>
          <li>• Finance — receivables & profitability</li>
        </ul>
        <div className="space-y-2 text-sm">
          <Link to="/login" className="block text-teal-300 hover:text-teal-200">
            ← Choose login type
          </Link>
          <Link to="/login/owner" className="block text-teal-200/70 hover:text-white">
            Platform owner (SaaS seller) →
          </Link>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-[var(--bg-app)] px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-12 sm:py-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">
              Company workspace
            </p>
            <p className="landing-display text-xl font-semibold text-[var(--text-main)]">
              Company sign in
            </p>
            <Link to="/login" className="mt-2 inline-block text-xs font-semibold text-teal-700">
              ← Choose login type
            </Link>
          </div>

          <h1 className="text-xl font-semibold text-[var(--text-main)]">Company sign in</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            <strong>Company Admin</strong> = buyer who purchased SaaS → company dashboard. Not{' '}
            <code className="text-[11px]">admin@restoration.com</code> (that is Platform Owner).
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-teal-600 sm:h-10"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
                Password
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-teal-600 sm:h-10"
              />
            </label>

            {error ? (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="w-full !bg-teal-700 hover:!bg-teal-800"
              disabled={busy}
            >
              {busy ? 'Signing in…' : 'Sign in to company app'}
            </Button>
          </form>

          <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
              Demo company roles · password{' '}
              <code className="text-[var(--text-main)]">{DEMO_PASSWORD}</code>
            </p>
            <div className="grid gap-2">
              {COMPANY_DEMOS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  disabled={busy}
                  onClick={() => void finishCompanyLogin(a.email, DEMO_PASSWORD)}
                  className={`flex flex-col rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-60 ${
                    a.email.startsWith('company-admin')
                      ? 'border-teal-600 bg-teal-50 hover:border-teal-700 dark:bg-teal-950/30'
                      : 'border-[var(--border-main)] bg-[var(--bg-elevated)] hover:border-teal-600'
                  }`}
                >
                  <span className="text-sm font-bold text-[var(--text-main)]">{a.role}</span>
                  <span className="font-mono text-[11px] text-[var(--text-dim)]">{a.email}</span>
                  <span className="mt-0.5 text-[11px] text-[var(--text-muted)]">{a.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
            SaaS seller console?{' '}
            <Link to="/login/owner" className="font-semibold text-indigo-600 hover:underline">
              Platform owner sign-in
            </Link>
            {' · '}
            <Link to="/#pricing" className="font-semibold text-teal-700 hover:underline">
              Buy a plan
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
