import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../auth/roles'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { ApiError } from '../api/client'

export function Login() {
  const { user, loading, login, isPlatformOwner } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@restoration.com')
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    return <Navigate to={isPlatformOwner ? '/saas' : '/dashboard'} replace />
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await login(email.trim(), password)
      navigate(res.redirectTo || '/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rugos-public flex min-h-dvh flex-col lg:min-h-screen lg:flex-row">
      <div className="relative hidden w-[48%] flex-col justify-between bg-[#0f2744] p-10 text-white lg:flex">
        <div>
          <p className="landing-display text-2xl font-semibold tracking-tight">RugOS / ExportOS</p>
          <p className="mt-2 max-w-md text-sm text-slate-300">
            Commerce · Orders · Inventory · Warehouse · Shipping · Export · Finance
          </p>
        </div>
        <div className="space-y-4">
          <p className="text-lg font-semibold">India → USA rug operations, subscription SaaS.</p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• Monthly / yearly plans per company (tenant)</li>
            <li>• Platform owner manages buyers, payments & expiry</li>
            <li>• India WH · US WH · Finance roles inside each company</li>
          </ul>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-500">Interactive operations platform</p>
          <Link to="/" className="text-sm text-teal-300 hover:text-teal-200">
            ← Marketing / pricing site
          </Link>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-[var(--bg-app)] px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-12 sm:py-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <p className="landing-display text-xl font-semibold text-[var(--text-main)]">
              RugOS / ExportOS
            </p>
            <p className="text-sm text-[var(--text-muted)]">Sign in to your company workspace</p>
            <Link to="/" className="mt-2 inline-block text-xs font-semibold text-teal-700 hover:underline">
              ← Back to pricing
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-main)]">Sign in</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Company users need an <strong>active subscription</strong>. Platform owner opens the SaaS
            console.
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
                className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-main)] outline-none focus:border-indigo-500"
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
                className="h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-main)] outline-none focus:border-indigo-500"
              />
            </label>

            {error ? (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
              Demo accounts · password <code className="text-[var(--text-main)]">{DEMO_PASSWORD}</code>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setEmail(a.email)
                    setPassword(DEMO_PASSWORD)
                  }}
                  className="rounded-full border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:border-indigo-400 hover:text-[var(--text-main)]"
                >
                  {a.role}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  setError(null)
                  try {
                    const res = await login('admin@restoration.com', DEMO_PASSWORD)
                    navigate(res.redirectTo || '/saas', { replace: true })
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : 'Login failed')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Platform owner
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  setError(null)
                  try {
                    const res = await login('india@restoration.com', DEMO_PASSWORD)
                    navigate(res.redirectTo || '/dashboard', { replace: true })
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : 'Login failed')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                India WH (tenant)
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
            New company?{' '}
            <Link to="/#pricing" className="font-semibold text-indigo-600 hover:underline">
              Choose a plan on the landing page
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
