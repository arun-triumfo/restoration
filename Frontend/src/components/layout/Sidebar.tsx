import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Clock,
  Coins,
  Container,
  CreditCard,
  DollarSign,
  Factory,
  FileCheck,
  FileText,
  GitBranch,
  Hammer,
  Layers,
  LayoutDashboard,
  Package,
  PieChart,
  RotateCcw,
  Settings,
  ShieldCheck,
  Ship,
  ShoppingBag,
  Terminal,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { canAccessPath } from '../../auth/roles'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { NAV_SECTIONS } from '../../data/navigation'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  GitBranch,
  TrendingUp,
  Bell,
  Zap,
  AlertTriangle,
  Package,
  Warehouse,
  BarChart3,
  Clock,
  Layers,
  ShoppingBag,
  Factory,
  FileText,
  ArrowLeftRight,
  Truck,
  Container,
  FileCheck,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  DollarSign,
  PieChart,
  Building2,
  Users,
  Briefcase,
  Hammer,
  Ship,
  Coins,
  Terminal,
  Settings,
}

export function Sidebar() {
  const { sidebarCollapsed, mobileNavOpen, setMobileNavOpen } = useApp()
  const { user } = useAuth()

  const sections = useMemo(() => {
    const tenant = user?.tenant
      ? { modules: user.tenant.modules, plan: user.tenant.plan }
      : undefined
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessPath(user?.roleCode, item.path, tenant)),
    })).filter((section) => section.items.length > 0)
  }, [user?.roleCode, user?.tenant])

  return (
    <>
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 top-16 z-40 bg-slate-950/45 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={`rugos-sidebar fixed bottom-0 left-0 top-16 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-[var(--border-main)] bg-[var(--bg-sidebar)] shadow-xl transition-transform duration-200 lg:static lg:top-auto lg:z-0 lg:h-auto lg:w-64 lg:translate-x-0 lg:shadow-none lg:pointer-events-auto ${
          mobileNavOpen
            ? 'translate-x-0 pointer-events-auto'
            : '-translate-x-full pointer-events-none lg:pointer-events-auto'
        } ${sidebarCollapsed ? 'lg:!w-[72px]' : 'lg:!w-64'}`}
      >
        <nav
          className="rugos-sidebar-nav flex-1 overflow-y-auto overscroll-contain px-2.5 py-3"
          aria-label="Primary"
        >
          {sections.map((section) => (
            <div key={section.title} className="mb-4">
              <div
                className={`mb-2 flex items-center gap-2 px-2.5 ${
                  sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
                }`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400/70" />
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-dim)] ${
                    sidebarCollapsed ? 'lg:hidden' : ''
                  }`}
                >
                  {section.title}
                </span>
              </div>

              <ul className="m-0 list-none space-y-1 p-0">
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? Package
                  return (
                    <li key={item.path} className="m-0 p-0">
                      <NavLink
                        to={item.path}
                        end={item.path === '/'}
                        title={item.label}
                        onClick={() => setMobileNavOpen(false)}
                        className={({ isActive }) =>
                          [
                            'rugos-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium leading-snug no-underline transition',
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]',
                            sidebarCollapsed ? 'lg:justify-center lg:px-2' : '',
                          ].join(' ')
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                        <span
                          className={`min-w-0 truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}
                        >
                          {item.label}
                        </span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
