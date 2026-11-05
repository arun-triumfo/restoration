import { Navigate, useLocation } from 'react-router-dom'
import { canAccessPath } from '../../auth/roles'
import { useAuth } from '../../context/AuthContext'

/** Blocks deep-links to menus outside the user's role. */
export function RequirePath({ children }: { children: React.ReactNode }) {
  const { user, isPlatformOwner } = useAuth()
  const location = useLocation()
  const path = location.pathname === '' ? '/' : location.pathname

  // SaaS console / tenants are platform-owner only
  if ((path === '/saas' || path === '/tenants') && !isPlatformOwner) {
    return <Navigate to="/dashboard" replace />
  }
  // Platform owner stays on SaaS world — not company ops menus
  const ownerPaths = new Set(['/saas', '/tenants', '/dashboard', '/workflow', '/billing'])
  if (isPlatformOwner && !ownerPaths.has(path)) {
    return <Navigate to="/saas" replace />
  }

  const tenant = user?.tenant
    ? { modules: user.tenant.modules, plan: user.tenant.plan }
    : undefined
  if (!canAccessPath(user?.roleCode, path, tenant)) {
    return <Navigate to={isPlatformOwner ? '/saas' : '/dashboard'} replace />
  }

  return <>{children}</>
}
