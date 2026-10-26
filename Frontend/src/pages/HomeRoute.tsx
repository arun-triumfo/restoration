import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DepartmentHome } from './DepartmentHome'
import { WireframeModule } from './WireframeModule'

/**
 * Super Admin can open full executive dashboard (?full=1).
 * Everyone else (and Super Admin by default) gets role home.
 */
export function HomeRoute() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const wantFull = params.get('full') === '1'

  if (user?.roleCode === 'super_admin' && wantFull) {
    return <WireframeModule />
  }

  // Super admin also sees department home first (clearer for SaaS demos);
  // they can jump to full dashboard from a button.
  if (user?.roleCode === 'super_admin' && !wantFull) {
    return (
      <div className="space-y-4">
        <DepartmentHome />
        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
          <p className="text-sm text-[var(--text-muted)]">
            Super Admin: full executive command center (wireframe Module 8 dashboard).
          </p>
          <a
            href="/?full=1"
            className="mt-2 inline-flex rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white no-underline"
          >
            Open full Dashboard
          </a>
        </div>
      </div>
    )
  }

  return <DepartmentHome />
}
