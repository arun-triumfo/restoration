import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { AppProvider } from './context/AppContext'
import { DataProvider } from './context/DataContext'
import { RESOURCE_META } from './data/resources'
import { Dashboard } from './pages/Dashboard'
import { Inventory } from './pages/Inventory'
import { Orders } from './pages/Orders'
import { ResourcePage } from './pages/ResourcePage'
import { WarehouseAnalytics } from './pages/WarehouseAnalytics'

const customPaths = new Set(['/inventory', '/orders'])

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
