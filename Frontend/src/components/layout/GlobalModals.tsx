import { useApp } from '../../context/AppContext'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function GlobalModals() {
  const { activeModal, modalPayload, closeModal, pushToast } = useApp()

  return (
    <>
      <Modal
        open={activeModal === 'create'}
        title="Add New Record"
        badge="Create Record"
        badgeTone="primary"
        size="lg"
        onClose={closeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                pushToast(`${modalPayload || 'Record'} saved successfully`)
                closeModal()
              }}
            >
              Save Record
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-[var(--text-main)]">
            Title / Name
            <input
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
              placeholder="Enter record title"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--text-main)]">
            SKU / Reference
            <input
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
              placeholder="SKU-RUG-..."
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--text-main)] sm:col-span-2">
            Notes
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
              placeholder="Optional operational notes"
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={activeModal === 'import'}
        title="Advanced CSV / Excel Bulk Importer"
        badge="SOW Module 2.3 & 9.1"
        badgeTone="cyan"
        size="lg"
        onClose={closeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="cyan"
              onClick={() => {
                pushToast('Import queued for processing', 'info')
                closeModal()
              }}
            >
              Start Import
            </Button>
          </>
        }
      >
        <div className="rounded-xl border border-dashed border-[var(--border-main)] bg-[var(--bg-elevated)] px-6 py-10 text-center">
          <p className="font-semibold text-[var(--text-main)]">Drop CSV / Excel file here</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Supports product master, stock adjustments, and order bulk upsert templates.
          </p>
          <Button variant="secondary" className="mt-4" type="button">
            Browse Files
          </Button>
        </div>
      </Modal>

      <Modal
        open={activeModal === 'export'}
        title="Export Data Report"
        badge="SOW Module 7.2"
        onClose={closeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                pushToast('Export ready — download started', 'info')
                closeModal()
              }}
            >
              Download Report
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[var(--text-main)]">
            Format
            <select className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm">
              <option>CSV</option>
              <option>Excel (.xlsx)</option>
              <option>PDF Summary</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-[var(--text-main)]">
            Scope
            <select className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm">
              <option>Current filtered view</option>
              <option>Full dataset</option>
              <option>Selected columns only</option>
            </select>
          </label>
        </div>
      </Modal>

      <Modal
        open={activeModal === 'delete'}
        title="Delete Confirmation"
        badge="Confirm Deletion"
        badgeTone="danger"
        onClose={closeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                pushToast(`${modalPayload || 'Record'} deleted`, 'danger')
                closeModal()
              }}
            >
              Delete Record
            </Button>
          </>
        }
      >
        <p className="text-[var(--text-main)]">
          Are you sure you want to permanently delete{' '}
          <strong>{modalPayload || 'this record'}</strong>?
        </p>
        <p className="mt-3 text-xs">
          This action is logged in the operational audit trail as required by SOW Module 2.1.
        </p>
      </Modal>
    </>
  )
}
