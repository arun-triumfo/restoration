import { MODULE_TO_PATH } from './moduleMap'

type NavigateFn = (path: string) => void
type ToastFn = (message: string, tone?: 'success' | 'info' | 'danger') => void

declare global {
  interface Window {
    AppState?: Record<string, unknown> & {
      activeModule?: string
      activeDetail?: unknown
      activePoSubtab?: string
      skus?: unknown[]
      orders?: unknown[]
      warehouses?: Array<Record<string, unknown>>
    }
    switchView?: (moduleKey: string) => void
    renderCurrentView?: () => void
    showToast?: (message: string, type?: string) => void
    raWarehouseAnalyticsTab?: (wh: Record<string, unknown>) => string
    __rugosNavigate?: NavigateFn
    __rugosEngineReady?: boolean
    __rugosOrigSwitchView?: (moduleKey: string) => void
    RUGOS_API_BASE?: string
  }
}

const SCRIPT_SRCS = [
  '/rugos-api.js',
  '/app.js',
  '/analytics-core.js',
  '/analytics-actions.js',
  '/analytics-forecast.js',
  '/analytics-warehouse.js',
]

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-rugos-engine="${src}"]`)) {
      resolve()
      return
    }
    const el = document.createElement('script')
    el.src = src
    el.async = false
    el.dataset.rugosEngine = src
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(el)
  })
}

function ensureStylesheet() {
  if (document.getElementById('rugos-wf-styles')) return
  const link = document.createElement('link')
  link.id = 'rugos-wf-styles'
  link.rel = 'stylesheet'
  link.href = '/styles.css'
  document.head.appendChild(link)
}

/** Hidden DOM shells required by app.js modals / router */
export function ensureWireframeDom() {
  if (document.getElementById('rugos-wf-shells')) return

  const wrap = document.createElement('div')
  wrap.id = 'rugos-wf-shells'
  wrap.innerHTML = `
    <span id="crumbModule" style="display:none"></span>
    <span id="crumbView" style="display:none"></span>
    <div id="toastContainer" class="toast-container"></div>

    <div class="modal-backdrop" id="crudModal" style="display:none;">
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="badge badge-primary" id="crudBadge">Create Record</span>
            <h3 id="crudModalTitle">Add New Record</h3>
          </div>
          <button class="modal-close" type="button" onclick="closeModal('crudModal')">&times;</button>
        </div>
        <div class="modal-body" id="crudModalBody"></div>
        <div class="modal-footer" id="crudModalFooter"></div>
      </div>
    </div>

    <div class="modal-backdrop" id="importModal" style="display:none;">
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="badge badge-cyan">Import</span>
            <h3 id="importModalTitle">Bulk Importer</h3>
          </div>
          <button class="modal-close" type="button" onclick="closeModal('importModal')">&times;</button>
        </div>
        <div class="modal-body" id="importModalBody"></div>
        <div class="modal-footer" id="importModalFooter"></div>
      </div>
    </div>

    <div class="modal-backdrop" id="exportModal" style="display:none;">
      <div class="modal-box modal-md">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="badge badge-primary">Export</span>
            <h3 id="exportModalTitle">Export Data</h3>
          </div>
          <button class="modal-close" type="button" onclick="closeModal('exportModal')">&times;</button>
        </div>
        <div class="modal-body" id="exportModalBody"></div>
        <div class="modal-footer" id="exportModalFooter"></div>
      </div>
    </div>

    <div class="modal-backdrop" id="deleteConfirmModal" style="display:none;">
      <div class="modal-box modal-md">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="badge badge-danger">Confirm Deletion</span>
            <h3 id="deleteModalTitle">Delete Confirmation</h3>
          </div>
          <button class="modal-close" type="button" onclick="closeModal('deleteConfirmModal')">&times;</button>
        </div>
        <div class="modal-body" id="deleteModalBody">
          <p id="deleteModalMessage"></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" onclick="closeModal('deleteConfirmModal')">Cancel</button>
          <button class="btn btn-danger" type="button" id="confirmDeleteBtn">Delete Record</button>
        </div>
      </div>
    </div>

    <div class="drawer-backdrop" id="alertDrawer" style="display:none;">
      <div class="drawer-box">
        <div class="drawer-header">
          <h3>Operational & Financial Alerts</h3>
          <button class="drawer-close" type="button" onclick="toggleAlertDrawer && toggleAlertDrawer()">&times;</button>
        </div>
        <div class="drawer-body" id="alertDrawerList"></div>
      </div>
    </div>
  `
  document.body.appendChild(wrap)
}

function syncThemeToWireframe() {
  const dark = document.documentElement.classList.contains('dark')
  document.body.classList.remove('theme-dark', 'theme-light')
  document.body.classList.add(dark ? 'theme-dark' : 'theme-light')
}

function patchGlobals(pushToast: ToastFn) {
  if (!window.__rugosOrigSwitchView && typeof window.switchView === 'function') {
    window.__rugosOrigSwitchView = window.switchView.bind(window)
  }

  window.showToast = (message, type = 'success') => {
    const tone =
      type === 'danger' || type === 'error'
        ? 'danger'
        : type === 'warning' || type === 'info'
          ? 'info'
          : 'success'
    pushToast(String(message || ''), tone)
  }

  window.switchView = (moduleKey: string) => {
    let key = moduleKey
    if (key === 'mod2-history') key = 'mod2-hist'
    if (key === 'mod3-orders') key = 'mod3'
    if (key === 'mod6-courier-audit') key = 'mod6-audit'
    if (key === 'mod4-returns') key = 'mod6-ret'

    const path = MODULE_TO_PATH[key]
    if (path && window.__rugosNavigate) {
      window.__rugosNavigate(path)
      return
    }

    paintWireframeModule(key)
  }
}

export async function ensureWireframeEngine(pushToast: ToastFn): Promise<void> {
  ensureStylesheet()
  ensureWireframeDom()

  // Point vanilla ApiClient at production/live backend when available
  const envBase = import.meta.env.VITE_API_URL as string | undefined
  if (envBase) {
    window.RUGOS_API_BASE = envBase.replace(/\/$/, '')
  } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    window.RUGOS_API_BASE = 'https://restoration-b.onrender.com/api'
  }

  if (!window.__rugosEngineReady) {
    for (const src of SCRIPT_SRCS) {
      await loadScript(src)
    }
    window.__rugosEngineReady = true
  }

  patchGlobals(pushToast)
  syncThemeToWireframe()
}

function renderWarehouseAnalyticsFallback(): string {
  const warehouses = window.AppState?.warehouses || []
  const wh = warehouses[0]
  const tab =
    wh && typeof window.raWarehouseAnalyticsTab === 'function'
      ? window.raWarehouseAnalyticsTab(wh)
      : `<div class="card" style="padding:24px;color:var(--text-muted);">No warehouse analytics available.</div>`

  return `
    <div class="page-header" style="margin-bottom:16px;">
      <div class="page-title-wrap">
        <h1 style="margin:0;font-size:20px;">📊 Warehouse Analytics</h1>
        <p style="margin:4px 0 0;font-size:12px;color:var(--text-muted);">
          Node-level velocity, dwell, profit decline and ageing — same engine as the wireframe warehouse detail tab.
        </p>
      </div>
    </div>
    ${tab}
  `
}

export function paintWireframeModule(moduleKey: string) {
  ensureWireframeDom()
  syncThemeToWireframe()

  const viewport = document.getElementById('viewViewport')
  if (!viewport || !window.AppState) return

  // Ensure router can fill crumbs / quick actions
  if (!document.getElementById('crumbModule')) {
    /* shells created above */
  }

  window.AppState.activeDetail = null

  let key = moduleKey

  // MTO / packing are PO subtabs in the wireframe
  if (key === 'mod4-mto') {
    window.AppState.activePoSubtab = 'mto'
    key = 'mod4-po'
  } else if (key === 'mod4-pack') {
    window.AppState.activePoSubtab = 'packing'
    key = 'mod4-po'
  }

  window.AppState.activeModule = key

  if (key === 'mod3-wh-analytics') {
    const quick = document.getElementById('moduleQuickActions')
    if (quick) quick.innerHTML = ''
    viewport.innerHTML = renderWarehouseAnalyticsFallback()
    return
  }

  if (typeof window.renderCurrentView === 'function') {
    window.renderCurrentView()
    return
  }

  // Fallback: use original switchView (will also update hash — harmless)
  if (window.__rugosOrigSwitchView) {
    window.__rugosOrigSwitchView(key)
  }
}

export function hydrateAppStateFromApi(partial: {
  skus?: unknown[]
  orders?: unknown[]
}) {
  if (!window.AppState) return
  // Never wipe wireframe seed data with empty API failures
  if (Array.isArray(partial.skus) && partial.skus.length > 0) {
    window.AppState.skus = partial.skus
  }
  if (Array.isArray(partial.orders) && partial.orders.length > 0) {
    window.AppState.orders = partial.orders
  }
}
