import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string
  icon: LucideIcon
  accent: string
  badge?: ReactNode
  detail?: ReactNode
  compact?: boolean
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  badge,
  detail,
  compact = false,
}: MetricCardProps) {
  return (
    <article
      className={`relative overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)] ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {label}
          </p>
          <p className={`mt-1 font-extrabold tracking-tight text-[var(--text-main)] ${compact ? 'text-xl' : 'text-2xl'}`}>
            {value}
          </p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
          style={{ background: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {badge ? <div className="mt-3">{badge}</div> : null}
      {detail ? <div className="mt-2 text-xs text-[var(--text-muted)]">{detail}</div> : null}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1 opacity-80"
        style={{ background: `linear-gradient(90deg, transparent, ${accent})` }}
      />
    </article>
  )
}
