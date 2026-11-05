import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Dashboard } from './Dashboard'
import { DepartmentHome } from './DepartmentHome'

/** Platform owner → SaaS console. Super Admin (tenant) → live dashboard. Others → department home. */
export function HomeRoute() {
  const { user, isPlatformOwner } = useAuth()
  if (isPlatformOwner) return <Navigate to="/saas" replace />
  if (user?.roleCode === 'super_admin') return <Dashboard />
  return <DepartmentHome />
}
