import { Navigate, useLocation } from 'react-router-dom'
import { canAccessPath } from '../../auth/roles'
import { useAuth } from '../../context/AuthContext'

/** Blocks deep-links to menus outside the user's role. */
export function RequirePath({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  const path = location.pathname === '' ? '/' : location.pathname

  const tenant = user?.tenant
    ? { modules: user.tenant.modules, plan: user.tenant.plan }
    : undefined
  if (!canAccessPath(user?.roleCode, path, tenant)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
