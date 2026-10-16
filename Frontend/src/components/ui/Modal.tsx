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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-xl ${
          size === 'lg' ? 'max-w-2xl' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[var(--border-main)] px-5 py-4">
          <div>
            {badge ? (
              <Badge tone={badgeTone} className="mb-2">
                {badge}
              </Badge>
            ) : null}
            <h3 className="text-base font-bold text-[var(--text-main)]">{title}</h3>
          </div>
          <Button variant="ghost" size="sm" aria-label="Close modal" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-5 py-4 text-sm text-[var(--text-muted)]">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-[var(--border-main)] px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
