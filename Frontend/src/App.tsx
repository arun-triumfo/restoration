import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { AppProvider } from './context/AppContext'
import { DataProvider } from './context/DataContext'
import { RESOURCE_META } from './data/resources'
import { AutomationAlerts } from './pages/AutomationAlerts'
import { Dashboard } from './pages/Dashboard'
import { DemandForecast } from './pages/DemandForecast'
import { Inventory } from './pages/Inventory'
import { Orders } from './pages/Orders'
import { ResourcePage } from './pages/ResourcePage'
import { WarehouseAnalytics } from './pages/WarehouseAnalytics'

/** Paths with dedicated wireframe-parity pages (not generic CRUD) */
const customPaths = new Set([
  '/inventory',
  '/orders',
  '/warehouse-analytics',
  '/forecast',
  '/alerts',
])

export default function App() {
  return (
    <AppProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="orders" element={<Orders />} />
              <Route path="warehouse-analytics" element={<WarehouseAnalytics />} />
              <Route path="forecast" element={<DemandForecast />} />
              <Route path="alerts" element={<AutomationAlerts />} />
              {RESOURCE_META.filter((m) => !customPaths.has(m.path)).map((meta) => (
                <Route
                  key={meta.key}
                  path={meta.path.slice(1)}
                  element={<ResourcePage meta={meta} />}
                />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AppProvider>
  )
}
