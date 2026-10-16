import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, type ResourceRow } from '../api/client'
import { ALL_RESOURCE_KEYS, RESOURCE_BY_KEY } from '../data/resources'
import { useApp } from './AppContext'

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
const PRIORITY_KEYS = ['skus', 'orders', 'alerts', 'warehouses', 'system_logs', 'monthly_financials']

async function fetchKeys(keys: string[]) {
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      const res = await api.list(key)
      return [key, res.data] as const
    }),
  )
  const loaded: Store = {}
  const failures: string[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const [key, data] = result.value
      loaded[key] = data
    } else {
      failures.push(result.reason?.message || 'request failed')
    }
  }
  return { loaded, failures }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { pushToast } = useApp()
  const [store, setStore] = useState<Store>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (resource?: string) => {
    if (resource) {
      const { loaded, failures } = await fetchKeys([resource])
      if (failures.length) throw new Error(failures[0])
      setStore((prev) => ({ ...prev, ...loaded }))
      setError(null)
      return
    }

    const rest = ALL_RESOURCE_KEYS.filter((k) => !PRIORITY_KEYS.includes(k))
    const first = await fetchKeys(PRIORITY_KEYS.filter((k) => ALL_RESOURCE_KEYS.includes(k)))
    setStore((prev) => ({ ...prev, ...first.loaded }))
    setLoading(false)

    const second = await fetchKeys(rest)
    setStore((prev) => ({ ...prev, ...second.loaded }))

    const failCount = first.failures.length + second.failures.length
    if (failCount === ALL_RESOURCE_KEYS.length) {
      throw new Error(first.failures[0] || second.failures[0] || 'Failed to load data')
    }
    setError(failCount ? `${failCount} module(s) failed to load` : null)
  }, [])

  useEffect(() => {
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
  }, [refresh])

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
