import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { AppProvider } from './context/AppContext'
import { DataProvider } from './context/DataContext'
import { PATH_TO_MODULE } from './lib/wireframe/moduleMap'
import { WireframeModule } from './pages/WireframeModule'

/** Every nav path that has a wireframe module renderer */
const wireframePaths = Object.keys(PATH_TO_MODULE).filter((p) => p !== '/')

export default function App() {
  return (
    <AppProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<WireframeModule />} />
              {wireframePaths.map((path) => (
                <Route
                  key={path}
                  path={path.startsWith('/') ? path.slice(1) : path}
                  element={<WireframeModule />}
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
