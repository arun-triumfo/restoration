import { useApp } from '../../context/AppContext'

export function ToastStack() {
  const { toasts, dismissToast } = useApp()

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismissToast(toast.id)}
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-left text-sm font-medium shadow-lg ${
            toast.tone === 'danger'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-950 dark:text-red-200'
              : toast.tone === 'info'
                ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-950 dark:text-sky-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950 dark:text-emerald-200'
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  )
}
