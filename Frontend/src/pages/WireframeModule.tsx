import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'
import {
  ensureWireframeEngine,
  hydrateAppStateFromApi,
  paintWireframeModule,
} from '../lib/wireframe/engine'
import { moduleForPath } from '../lib/wireframe/moduleMap'

export function WireframeModule() {
  const location = useLocation()
  const navigate = useNavigate()
  const { pushToast } = useApp()
  const { list } = useData()
  const skus = list('skus')
  const orders = list('orders')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const moduleKey = moduleForPath(location.pathname) || 'mod8'

  useEffect(() => {
    window.__rugosNavigate = (path: string) => navigate(path)
    return () => {
      if (window.__rugosNavigate) delete window.__rugosNavigate
    }
  }, [navigate])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensureWireframeEngine((message, tone) => pushToast(message, tone))
        if (!cancelled) setReady(true)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load wireframe engine')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pushToast])

  useEffect(() => {
    if (!ready) return
    hydrateAppStateFromApi({ skus, orders })
    const id = requestAnimationFrame(() => paintWireframeModule(moduleKey))
    return () => cancelAnimationFrame(id)
  }, [ready, moduleKey, skus, orders])

  useEffect(() => {
    if (!ready) return
    const obs = new MutationObserver(() => {
      paintWireframeModule(moduleKey)
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [ready, moduleKey])

  return (
    <div className="wf-root -mx-3 -my-3 min-w-0 sm:-mx-4 sm:-my-4 lg:-mx-6 lg:-my-6">
      {error ? (
        <div className="m-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 sm:m-4">
          {error}
        </div>
      ) : null}

      {!ready ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">
          Loading wireframe module…
        </div>
      ) : null}

      <div
        id="moduleQuickActions"
        className="flex flex-wrap items-center justify-end gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 sm:px-4 lg:px-6"
      />

      <div
        id="viewViewport"
        className="view-viewport wf-viewport min-w-0 overflow-x-auto p-3 sm:p-4 lg:p-6"
      />
    </div>
  )
}
