import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { DEMO_PASSWORD } from '../auth/roles'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

const OWNER_EMAIL = 'admin@restoration.com'

/** Platform owner only → SaaS console (/saas). Not for warehouse / finance users. */
export function OwnerLogin() {
  const { user, loading, login, logout, isPlatformOwner } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(OWNER_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    if (isPlatformOwner) return <Navigate to="/saas" replace />
    return <Navigate to="/dashboard" replace />
  }

  const finishOwnerLogin = async (em: string, pw: string) => {
    setBusy(true)
    setError(null)
    try {
      const res = await login(em.trim(), pw)
      if (!res.isPlatformOwner) {
        logout()
        setError('This is Platform Owner login. Company users must use Company sign-in.')
        return
      }
      navigate('/saas', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await finishOwnerLogin(email, password)
  }

  return (
    <div className="rugos-public flex min-h-dvh flex-col lg:min-h-screen lg:flex-row">
      <div className="relative hidden w-[48%] flex-col justify-between bg-[#0f2744] p-10 text-white lg:flex">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300">
            Platform owner
          </p>
          <p className="landing-display mt-2 text-2xl font-semibold tracking-tight">
            RugOS SaaS console
          </p>
          <p className="mt-2 max-w-md text-sm text-slate-300">
            You sell RugOS. This is not the Company Admin who bought a plan.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          <li>• Buyers & activation</li>
          <li>• Plans · monthly / yearly · payments</li>
          <li>• Validity / expiry / suspend</li>
          <li>• Company Admin → use Company sign-in instead</li>
        </ul>
        <div className="space-y-2 text-sm">
          <Link to="/login" className="block text-teal-300 hover:text-teal-200">
            ← Choose login type
          </Link>
          <Link to="/login/company" className="block text-slate-400 hover:text-white">
            Company (tenant) sign-in →
          </Link>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-[var(--bg-app)] px-4 py-8 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
              Platform owner
            </p>
            <p className="landing-display text-xl font-semibold">SaaS console login</p>
            <Link to="/login" className="mt-2 inline-block text-xs font-semibold text-teal-700">
              ← Choose login type
            </Link>
          </div>

          <h1 className="text-xl font-semibold text-[var(--text-main)]">Owner sign in</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Lands on <strong>/saas</strong> only. Company Admin (buyer) is a different login —{' '}
            <Link to="/login/company" className="font-semibold text-teal-700 hover:underline">
              company-admin@restoration.com
            </Link>
            .
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--text-dim)]">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-indigo-500 sm:h-10"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--text-dim)]">
                Password
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-indigo-500 sm:h-10"
              />
            </label>
            {error ? (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in to SaaS console'}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 text-sm dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <p className="text-[11px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
              Demo · password {DEMO_PASSWORD}
            </p>
            <p className="mt-1 font-mono text-xs text-[var(--text-main)]">{OWNER_EMAIL}</p>
            <Button
              type="button"
              variant="primary"
              className="mt-3 w-full"
              disabled={busy}
              onClick={() => void finishOwnerLogin(OWNER_EMAIL, DEMO_PASSWORD)}
            >
              One-click: Platform owner
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
            India / US / Finance users?{' '}
            <Link to="/login/company" className="font-semibold text-teal-700 hover:underline">
              Company sign-in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
