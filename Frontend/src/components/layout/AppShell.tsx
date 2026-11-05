import { Outlet } from 'react-router-dom'
import { AlertDrawer } from './AlertDrawer'
import { GlobalModals } from './GlobalModals'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ToastStack } from './ToastStack'

export function AppShell() {
  return (
    <div className="rugos-shell flex flex-col bg-[var(--bg-app)] pb-[env(safe-area-inset-bottom)]">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
          <div className="mx-auto w-full max-w-[1600px] px-3 py-3 sm:p-4 lg:p-6">
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
