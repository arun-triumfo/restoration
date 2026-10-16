import { X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useData } from '../../context/DataContext'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const severityTone: Record<string, 'danger' | 'warning' | 'cyan' | 'slate'> = {
  critical: 'danger',
  Critical: 'danger',
  warning: 'warning',
  Warning: 'warning',
  info: 'cyan',
  Info: 'cyan',
  high: 'danger',
  medium: 'warning',
  low: 'cyan',
}

export function AlertDrawer() {
  const { alertsOpen, setAlertsOpen } = useApp()
  const { list } = useData()
  const alerts = list('alerts')

  if (!alertsOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40" onClick={() => setAlertsOpen(false)}>
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-[var(--border-main)] bg-[var(--bg-card)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-main)] px-5 py-4">
          <h3 className="text-base font-bold text-[var(--text-main)]">
            Operational & Financial Alerts ({alerts.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setAlertsOpen(false)} aria-label="Close alerts">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {alerts.map((alert) => (
            <article
              key={String(alert.id ?? alert._id)}
              className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge tone={severityTone[String(alert.severity)] ?? 'slate'}>
                  {String(alert.severity)}
                </Badge>
                <Badge>{String(alert.domain || alert.type || 'ops')}</Badge>
              </div>
              <h4 className="text-sm font-bold text-[var(--text-main)]">{String(alert.title)}</h4>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                {String(alert.detail || '')}
              </p>
            </article>
          ))}
          {alerts.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No alerts loaded from API.</p>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
