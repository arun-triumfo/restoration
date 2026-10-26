import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/auth/RequireAuth'
import { RequirePath } from './components/auth/RequirePath'
import { AppShell } from './components/layout/AppShell'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { RESOURCE_META } from './data/resources'
import { PATH_TO_MODULE } from './lib/wireframe/moduleMap'
import { Billing } from './pages/Billing'
import { BuySheet } from './pages/BuySheet'
import { HomeRoute } from './pages/HomeRoute'
import { IntegrationsHub } from './pages/IntegrationsHub'
import { Login } from './pages/Login'
import { PackingStation } from './pages/PackingStation'
import { ResourcePage } from './pages/ResourcePage'
import { ShippingDesk } from './pages/ShippingDesk'
import { SystemWorkflow } from './pages/SystemWorkflow'
import { TenantsAdmin } from './pages/TenantsAdmin'
import { UsersAdmin } from './pages/UsersAdmin'
import { WireframeModule } from './pages/WireframeModule'

/** Native React apps (not generic CRUD table, not wireframe host) */
const NATIVE_PATHS = new Set([
  '/integrations',
  '/billing',
  '/tenants',
  '/shipping',
  '/packing',
  '/buy-sheet',
  '/users',
  '/workflow',
])

/** Prefer live Mongo CRUD tables over wireframe for client add/edit/delete */
const CRUD_SKIP = new Set([
  ...NATIVE_PATHS,
  '/alerts-data',
  '/automations-data',
])

const crudResources = RESOURCE_META.filter((m) => !CRUD_SKIP.has(m.path))
const crudPathSet = new Set(crudResources.map((m) => m.path))

const wireframePaths = Object.keys(PATH_TO_MODULE).filter(
  (p) => p !== '/' && !NATIVE_PATHS.has(p) && !crudPathSet.has(p),
)

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <DataProvider>
                    <AppShell />
                  </DataProvider>
                </RequireAuth>
              }
            >
              <Route index element={<HomeRoute />} />
              <Route path="workflow" element={<SystemWorkflow />} />
              <Route
                path="integrations"
                element={
                  <RequirePath>
                    <IntegrationsHub />
                  </RequirePath>
                }
              />
              <Route
                path="billing"
                element={
                  <RequirePath>
                    <Billing />
                  </RequirePath>
                }
              />
              <Route
                path="tenants"
                element={
                  <RequirePath>
                    <TenantsAdmin />
                  </RequirePath>
                }
              />
              <Route
                path="shipping"
                element={
                  <RequirePath>
                    <ShippingDesk />
                  </RequirePath>
                }
              />
              <Route
                path="packing"
                element={
                  <RequirePath>
                    <PackingStation />
                  </RequirePath>
                }
              />
              <Route
                path="buy-sheet"
                element={
                  <RequirePath>
                    <BuySheet />
                  </RequirePath>
                }
              />
              <Route
                path="users"
                element={
                  <RequirePath>
                    <UsersAdmin />
                  </RequirePath>
                }
              />
              {crudResources.map((meta) => (
                <Route
                  key={meta.path}
                  path={meta.path.startsWith('/') ? meta.path.slice(1) : meta.path}
                  element={
                    <RequirePath>
                      <ResourcePage meta={meta} />
                    </RequirePath>
                  }
                />
              ))}
              {wireframePaths.map((path) => (
                <Route
                  key={path}
                  path={path.startsWith('/') ? path.slice(1) : path}
                  element={
                    <RequirePath>
                      <WireframeModule />
                    </RequirePath>
                  }
                />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppProvider>
  )
}
