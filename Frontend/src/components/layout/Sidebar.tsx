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
import { NavLink } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { NAV_SECTIONS } from '../../data/navigation'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
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

  return (
    <>
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-16 left-0 z-50 flex w-64 flex-col border-r border-[var(--border-main)] bg-[var(--bg-sidebar)] transition-transform duration-200 lg:static lg:inset-auto lg:z-0 lg:translate-x-0 lg:pointer-events-auto ${
          mobileNavOpen
            ? 'translate-x-0'
            : '-translate-x-full pointer-events-none lg:pointer-events-auto'
        } ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
      >
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Primary">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-3">
              <div
                className={`mb-1.5 flex items-center gap-2 px-2 ${
                  sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] ${
                    sidebarCollapsed ? 'lg:hidden' : ''
                  }`}
                >
                  {section.title}
                </span>
              </div>

              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? Package
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end={item.path === '/'}
                        title={item.label}
                        onClick={() => setMobileNavOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]'
                          } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`
                        }
                      >
                        <Icon className="h-[15px] w-[15px] shrink-0" />
                        <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
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
