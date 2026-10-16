import { Construction } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { NAV_SECTIONS } from '../data/navigation'

export function ModuleStub() {
  const { pathname } = useLocation()
  const { openModal } = useApp()
  const label =
    NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.path === pathname)?.label ?? 'Module'

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-main)] bg-[var(--bg-card)] px-6 py-16 text-center shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
        <Construction className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-extrabold text-[var(--text-main)]">{label}</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">
        Wireframe placeholder for the {label} module. Navigation, shell chrome, theme, and modal
        affordances are fully wired — detailed grids can be expanded here next.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={() => openModal('create', label)}>
          Add New Item
        </Button>
        <Button variant="secondary" onClick={() => openModal('export', label)}>
          Export Data
        </Button>
        <Button variant="secondary" onClick={() => openModal('import')}>
          Bulk Import
        </Button>
      </div>
    </div>
  )
}
