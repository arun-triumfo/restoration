import { Outlet } from 'react-router-dom'
import { AlertDrawer } from './AlertDrawer'
import { GlobalModals } from './GlobalModals'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ToastStack } from './ToastStack'

export function AppShell() {
  return (
    <div className="rugos-shell flex h-full flex-col bg-[var(--bg-app)]">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
      <GlobalModals />
      <AlertDrawer />
      <ToastStack />
    </div>
  )
}
