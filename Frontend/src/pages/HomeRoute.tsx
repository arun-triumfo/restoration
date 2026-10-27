import { useAuth } from '../context/AuthContext'
import { Dashboard } from './Dashboard'
import { DepartmentHome } from './DepartmentHome'

/** Super Admin sees live Mongo dashboard. Other roles see their department home. */
export function HomeRoute() {
  const { user } = useAuth()
  if (user?.roleCode === 'super_admin') return <Dashboard />
  return <DepartmentHome />
}
