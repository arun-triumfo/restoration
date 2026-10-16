import { Button } from '../ui/Button'
import type { WireModalPayload } from '../../lib/wireframe/bridge'

interface Props {
  modal: WireModalPayload | null
  onClose: () => void
}

export function WireframeHtmlModal({ modal, onClose }: Props) {
  if (!modal) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-[8vh]">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
          <div>
            {modal.badge ? (
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                {modal.badge}
              </div>
            ) : null}
            <h2 className="text-base font-bold text-[var(--text-main)]">{modal.title}</h2>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div
          className="wf-viewport max-h-[70vh] overflow-y-auto px-4 py-4 text-[var(--text-main)]"
          dangerouslySetInnerHTML={{ __html: modal.bodyHtml }}
        />
        {modal.footerHtml ? (
          <div
            className="flex justify-end gap-2 border-t border-[var(--border-subtle)] px-4 py-3"
            dangerouslySetInnerHTML={{ __html: modal.footerHtml }}
          />
        ) : (
          <div className="flex justify-end border-t border-[var(--border-subtle)] px-4 py-3">
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
