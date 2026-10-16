/**
 * Bridge so wireframe analytics scripts (public/analytics-*.js) can run
 * inside React and produce the same markup as the Vercel wireframe.
 */

export type WireToast = (message: string, tone?: 'success' | 'info' | 'danger' | 'warning' | 'error') => void

export interface WireModalPayload {
  title: string
  bodyHtml: string
  badge?: string
  footerHtml?: string
}

type BridgeHooks = {
  onRerender: () => void
  pushToast: WireToast
  openModal: (payload: WireModalPayload) => void
  closeModal: () => void
}

declare global {
  interface Window {
    AppState: Record<string, unknown>
    RA_CONST?: unknown
    RA_PERIODS?: unknown
    RA_FORMULAS?: unknown
    renderForecastingView?: () => string
    renderAutomationView?: () => string
    raSetForecastSort?: (key: string) => void
    raSetActionFilter?: (code: string) => void
    raSetPeriod?: (key: string) => void
    setForecastHorizon?: (days: number) => void
    setTableFilter?: (tableKey: string, filterKey: string, value: unknown) => void
    setTableSearch?: (tableKey: string, value: string) => void
    setTablePage?: (tableKey: string, pageNum: number) => void
    paginateArray?: typeof paginateArray
    showToast?: WireToast
    openModal?: (title: string, bodyHtml: string, badgeText?: string) => void
    closeModal?: () => void
    renderCurrentView?: () => void
    switchView?: (mod: string) => void
    __rugosBridgeInstalled?: boolean
    __rugosAnalyticsLoaded?: boolean
  }
}

function paginateArray<T>(items: T[], page: number, pageSize: number) {
  const total = items.length
  const totalPages = Math.ceil(total / pageSize) || 1
  const validPage = Math.min(Math.max(page, 1), totalPages)
  const start = (validPage - 1) * pageSize
  const paginated = items.slice(start, start + pageSize)
  return {
    items: paginated,
    total,
    totalPages,
    currentPage: validPage,
    start: total === 0 ? 0 : start + 1,
    end: Math.min(start + pageSize, total),
  }
}

function ensureAppState() {
  if (!window.AppState) {
    window.AppState = {
      skus: [],
      activeAlerts: [],
      automations: [],
      tableFilters: {},
      forecastHorizon: 60,
      forecastWindow: 260,
      buySheet: [],
    }
  }
  const state = window.AppState as {
    tableFilters: Record<string, Record<string, unknown>>
    forecastHorizon?: number
  }
  if (!state.tableFilters) state.tableFilters = {}
  if (!state.forecastHorizon) state.forecastHorizon = 60
  return window.AppState
}

export function installWireframeBridge(hooks: BridgeHooks) {
  ensureAppState()

  window.showToast = (message, type = 'success') => {
    const tone =
      type === 'error' || type === 'danger'
        ? 'danger'
        : type === 'warning'
          ? 'info'
          : type === 'info'
            ? 'info'
            : 'success'
    hooks.pushToast(message, tone)
  }

  window.openModal = (title, bodyHtml, badgeText = 'RugsOS Enterprise') => {
    hooks.openModal({ title, bodyHtml, badge: badgeText })
  }

  window.closeModal = () => hooks.closeModal()

  window.paginateArray = paginateArray

  window.renderCurrentView = () => hooks.onRerender()

  window.setTableSearch = (tableKey, value) => {
    const state = ensureAppState() as {
      tableFilters: Record<string, Record<string, unknown>>
    }
    if (!state.tableFilters[tableKey]) state.tableFilters[tableKey] = {}
    state.tableFilters[tableKey].search = value
    state.tableFilters[tableKey].page = 1
    hooks.onRerender()
  }

  window.setTableFilter = (tableKey, filterKey, value) => {
    const state = ensureAppState() as {
      tableFilters: Record<string, Record<string, unknown>>
    }
    if (!state.tableFilters[tableKey]) state.tableFilters[tableKey] = {}
    state.tableFilters[tableKey][filterKey] = value
    state.tableFilters[tableKey].page = 1
    hooks.onRerender()
  }

  window.setTablePage = (tableKey, pageNum) => {
    const state = ensureAppState() as {
      tableFilters: Record<string, Record<string, unknown>>
    }
    if (!state.tableFilters[tableKey]) state.tableFilters[tableKey] = {}
    state.tableFilters[tableKey].page = pageNum
    hooks.onRerender()
  }

  window.setForecastHorizon = (days: number) => {
    const state = ensureAppState() as { forecastHorizon: number }
    state.forecastHorizon = days
    hooks.onRerender()
  }

  window.switchView = () => {
    hooks.pushToast('Navigate via the sidebar to open that module.', 'info')
  }

  window.__rugosBridgeInstalled = true
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-rugos-src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const el = document.createElement('script')
    el.src = src
    el.async = false
    el.dataset.rugosSrc = src
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(el)
  })
}

export async function loadForecastAnalytics(): Promise<void> {
  if (window.__rugosAnalyticsLoaded && typeof window.renderForecastingView === 'function') {
    return
  }
  ensureAppState()
  await loadScript('/analytics-core.js')
  await loadScript('/analytics-actions.js')
  await loadScript('/analytics-forecast.js')
  window.__rugosAnalyticsLoaded = true
}

export function syncAppStateSkus(skus: unknown[]) {
  const state = ensureAppState() as { skus: unknown[] }
  state.skus = skus
}
