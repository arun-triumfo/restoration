import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../auth/roles'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { ApiError } from '../api/client'

export function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@ctasinfo.com')
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-[var(--bg-app)] p-4">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 20%, rgba(99,102,241,0.18), transparent), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(8,145,178,0.12), transparent)',
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <img
            src="https://www.odetterugs.com/cdn/shop/files/Odette-Rugs-Fave-IconOdette-Rugs-Fave-Icon_1.png?crop=center&height=32&v=1754630107&width=32"
            alt=""
            className="h-9 w-9 rounded-lg"
          />
          <div>
            <h1 className="text-lg font-extrabold text-[var(--text-main)]">RugOS Login</h1>
            <p className="text-[11px] text-[var(--text-muted)]">P1 · Role-locked SaaS access</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
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
        </div>
      </div>
    </div>
  )
}
