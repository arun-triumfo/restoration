import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, ApiError, type ResourceRow } from '../api/client'
import { ALL_RESOURCE_KEYS, RESOURCE_BY_KEY } from '../data/resources'
import { useApp } from './AppContext'
import { useAuth } from './AuthContext'

type Store = Record<string, ResourceRow[]>

interface DataContextValue {
  loading: boolean
  error: string | null
  store: Store
  refresh: (resource?: string) => Promise<void>
  list: (resource: string) => ResourceRow[]
  create: (resource: string, payload: ResourceRow) => Promise<ResourceRow>
  update: (resource: string, id: string, payload: ResourceRow) => Promise<ResourceRow>
  remove: (resource: string, id: string) => Promise<void>
  getId: (resource: string, row: ResourceRow) => string
}

const DataContext = createContext<DataContextValue | null>(null)

/** Load these first so Inventory / Orders / Dashboard feel instant */
const PRIORITY_KEYS = [
  'skus',
  'orders',
  'alerts',
  'automations',
  'warehouses',
  'system_logs',
  'monthly_financials',
]

async function fetchKeys(keys: string[]) {
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      const res = await api.list(key)
      return [key, res.data] as const
    }),
  )
  const loaded: Store = {}
  const failures: string[] = []
  const forbidden: string[] = []
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const key = keys[i]
    if (result.status === 'fulfilled') {
      const [k, data] = result.value
      loaded[k] = data
    } else {
      const reason = result.reason
      // Role cannot read this module — not a real outage
      if (reason instanceof ApiError && (reason.status === 403 || reason.status === 401)) {
        forbidden.push(key)
        loaded[key] = []
      } else {
        failures.push(reason?.message || `${key} failed`)
      }
    }
  }
  return { loaded, failures, forbidden }
}

function keysForUser(resources: string[] | undefined): string[] {
  if (!resources || resources.includes('*')) return ALL_RESOURCE_KEYS
  const allowed = new Set(resources)
  return ALL_RESOURCE_KEYS.filter((k) => allowed.has(k))
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { pushToast } = useApp()
  const { user } = useAuth()
  const [store, setStore] = useState<Store>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const allowedKeys = useMemo(
    () => keysForUser(user?.permissions?.resources),
    [user?.permissions?.resources],
  )

  const refresh = useCallback(
    async (resource?: string) => {
      if (resource) {
        const { loaded, failures } = await fetchKeys([resource])
        if (failures.length) throw new Error(failures[0])
        setStore((prev) => ({ ...prev, ...loaded }))
        setError(null)
        return
      }

      const scope = allowedKeys.length ? allowedKeys : ALL_RESOURCE_KEYS
      const priority = PRIORITY_KEYS.filter((k) => scope.includes(k))
      const rest = scope.filter((k) => !PRIORITY_KEYS.includes(k))

      const first = await fetchKeys(priority)
      setStore((prev) => ({ ...prev, ...first.loaded }))
      setLoading(false)

      const second = await fetchKeys(rest)
      setStore((prev) => ({ ...prev, ...second.loaded }))

      const failCount = first.failures.length + second.failures.length
      if (failCount && failCount >= scope.length) {
        throw new Error(first.failures[0] || second.failures[0] || 'Failed to load data')
      }
      // Only surface real network/server failures — not role 403s
      setError(failCount ? `${failCount} module(s) failed to load` : null)
    },
    [allowedKeys],
  )

  useEffect(() => {
    if (!user) return
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        await refresh()
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [refresh, user?.email, user?.roleCode])

  const getId = useCallback((resource: string, row: ResourceRow) => {
    const idField = RESOURCE_BY_KEY[resource]?.idField
    const val = (idField ? row[idField] : null) ?? row._id
    return String(val ?? '')
  }, [])

  const list = useCallback((resource: string) => store[resource] ?? [], [store])

  const create = useCallback(
    async (resource: string, payload: ResourceRow) => {
      const res = await api.create(resource, payload)
      await refresh(resource)
      pushToast(`${RESOURCE_BY_KEY[resource]?.label || resource} created`)
      return res.data
    },
    [pushToast, refresh],
  )

  const update = useCallback(
    async (resource: string, id: string, payload: ResourceRow) => {
      const res = await api.update(resource, id, payload)
      await refresh(resource)
      pushToast(`${RESOURCE_BY_KEY[resource]?.label || resource} updated`)
      return res.data
    },
    [pushToast, refresh],
  )

  const remove = useCallback(
    async (resource: string, id: string) => {
      await api.remove(resource, id)
      await refresh(resource)
      pushToast(`${RESOURCE_BY_KEY[resource]?.label || resource} deleted`, 'danger')
    },
    [pushToast, refresh],
  )

  const value = useMemo(
    () => ({
      loading,
      error,
      store,
      refresh,
      list,
      create,
      update,
      remove,
      getId,
    }),
    [loading, error, store, refresh, list, create, update, remove, getId],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
