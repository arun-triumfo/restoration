import { LogOut, Menu, Moon, Search, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'

function initials(name?: string, email?: string) {
  const src = (name || email || 'U').trim()
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

export function Header() {
  const { theme, toggleTheme, toggleSidebar } = useApp()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="z-50 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-main)] bg-[var(--bg-header)] px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          className="!h-9 !w-9 !px-0"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
          title="Toggle Sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="https://www.odetterugs.com/cdn/shop/files/Odette-Rugs-Fave-IconOdette-Rugs-Fave-Icon_1.png?crop=center&height=32&v=1754630107&width=32"
            alt="Odette Rugs"
            className="h-7 w-7 rounded-md object-contain"
          />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-[15px] font-extrabold tracking-tight text-[var(--text-main)]">
              {user?.tenant?.name || 'Odette Rugs'}{' '}
              <span className="text-cyan-600 dark:text-cyan-400">/ RugOS</span>
            </p>
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {user?.tenant?.planLabel || user?.tenant?.plan || 'plan'} ·{' '}
              {user?.tenant?.billingStatus || 'active'}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto hidden max-w-xl flex-1 md:block">
        <label className="relative block">
          <span className="sr-only">Global search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
          <input
            type="search"
            placeholder="Quick find Order, SKU, AWB, Shipping Bill, Invoice..."
            className="h-10 w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-elevated)] pl-10 pr-14 text-sm text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-dim)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-dim)]">
            ⌘K
          </kbd>
        </label>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleTheme}
          className="!hidden sm:!inline-flex"
        >
          {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="!inline-flex !h-9 !w-9 !px-0 sm:!hidden"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <div
          className="flex max-w-[48vw] items-center gap-2 rounded-full border border-[var(--border-main)] bg-[var(--bg-card)] py-1 pl-1 pr-1.5 sm:pr-2"
          title={user?.email || 'Signed in'}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {initials(user?.name, user?.email)}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-xs font-semibold text-[var(--text-main)]">
              {user?.name || 'User'}
            </span>
            <span className="block truncate text-[10px] text-[var(--text-muted)]">
              {user?.role || user?.roleCode || 'Role'}
            </span>
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  )
}
