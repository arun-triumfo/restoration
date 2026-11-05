import { Building2, Shield } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Pick which world you are testing — platform owner vs subscribed company. */
export function LoginHub() {
  const { user, loading, isPlatformOwner } = useAuth()

  if (!loading && user) {
    return <Navigate to={isPlatformOwner ? '/saas' : '/dashboard'} replace />
  }

  return (
    <div className="rugos-public flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-app)] px-4 py-10">
      <div className="mb-8 max-w-lg text-center">
        <p className="landing-display text-2xl font-semibold text-[var(--text-main)]">RugOS / ExportOS</p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Two separate logins — do not mix them while testing.
        </p>
        <Link to="/" className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline">
          ← Marketing / pricing
        </Link>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        <Link
          to="/login/owner"
          className="group rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 no-underline shadow-sm transition hover:border-indigo-500 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-lg font-extrabold text-[var(--text-main)]">Platform owner</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            You sell RugOS as SaaS. After login you only see the <strong>SaaS dashboard</strong> —
            buyers, plans, payments, expiry.
          </p>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-indigo-600">
            Open owner login →
          </p>
        </Link>

        <Link
          to="/login/company"
          className="group rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 no-underline shadow-sm transition hover:border-teal-600 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-700 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-lg font-extrabold text-[var(--text-main)]">Company (SaaS customer)</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            A subscribed company. Roles: India WH · US WH · Finance. After login you see the{' '}
            <strong>ops app</strong> (orders, inventory, shipping…).
          </p>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-teal-700">
            Open company login →
          </p>
        </Link>
      </div>
    </div>
  )
}
