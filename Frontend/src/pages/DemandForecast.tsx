import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'
import { WireframeHtmlModal } from '../components/wireframe/WireframeHtmlModal'
import {
  installWireframeBridge,
  loadForecastAnalytics,
  syncAppStateSkus,
  type WireModalPayload,
} from '../lib/wireframe/bridge'

export function DemandForecast() {
  const { list, loading } = useData()
  const { pushToast } = useApp()
  const hostRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<WireModalPayload | null>(null)

  const skus = list('skus')

  const paint = useCallback(() => {
    const host = hostRef.current
    if (!host || typeof window.renderForecastingView !== 'function') return
    syncAppStateSkus(skus)
    host.innerHTML = window.renderForecastingView()
  }, [skus])

  const skusRef = useRef(skus)
  skusRef.current = skus

  useEffect(() => {
    installWireframeBridge({
      onRerender: () => {
        const host = hostRef.current
        if (!host || typeof window.renderForecastingView !== 'function') return
        syncAppStateSkus(skusRef.current)
        host.innerHTML = window.renderForecastingView()
      },
      pushToast: (message, tone) => {
        const mapped =
          tone === 'danger' ? 'danger' : tone === 'info' ? 'info' : 'success'
        pushToast(message, mapped)
      },
      openModal: setModal,
      closeModal: () => setModal(null),
    })

    let cancelled = false
    ;(async () => {
      try {
        await loadForecastAnalytics()
        if (!cancelled) setReady(true)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load forecast engine')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pushToast])

  useEffect(() => {
    if (!ready) return
    paint()
  }, [ready, paint, loading])

  return (
    <div className="space-y-0">
      {error ? (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {!ready || (loading && skus.length === 0) ? (
        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
          Loading Demand & Replenishment Planning Workbench…
        </div>
      ) : null}
      <div ref={hostRef} className="wf-viewport" />
      <WireframeHtmlModal modal={modal} onClose={() => setModal(null)} />
    </div>
  )
}
