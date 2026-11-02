import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from './Badge'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  title: string
  badge?: string
  badgeTone?: 'primary' | 'cyan' | 'danger' | 'warning'
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}

export function Modal({
  open,
  title,
  badge,
  badgeTone = 'primary',
  onClose,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-xl sm:max-h-[90vh] sm:rounded-2xl ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-[var(--border-main)] px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0 pr-2">
            {badge ? (
              <Badge tone={badgeTone} className="mb-2">
                {badge}
              </Badge>
            ) : null}
            <h3 className="text-sm font-bold text-[var(--text-main)] sm:text-base">{title}</h3>
          </div>
          <Button variant="ghost" size="sm" aria-label="Close modal" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 text-sm text-[var(--text-muted)] sm:px-5 sm:py-4">
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--border-main)] px-4 py-3 sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
