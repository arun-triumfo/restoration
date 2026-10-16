import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ModalType, Theme } from '../types'

interface Toast {
  id: number
  message: string
  tone: 'success' | 'info' | 'danger'
}

interface AppContextValue {
  theme: Theme
  toggleTheme: () => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  alertsOpen: boolean
  setAlertsOpen: (open: boolean) => void
  activeModal: ModalType
  modalPayload: string
  openModal: (type: Exclude<ModalType, null>, payload?: string) => void
  closeModal: () => void
  toasts: Toast[]
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('rugos-theme')
    return saved === 'dark' || saved === 'light' ? saved : 'light'
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [modalPayload, setModalPayload] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('rugos-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }, [])

  const toggleSidebar = useCallback(() => {
    if (window.innerWidth < 1024) {
      setMobileNavOpen((v) => !v)
      return
    }
    setSidebarCollapsed((v) => !v)
  }, [])

  const openModal = useCallback((type: Exclude<ModalType, null>, payload = '') => {
    setActiveModal(type)
    setModalPayload(payload)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
    setModalPayload('')
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback(
    (message: string, tone: Toast['tone'] = 'success') => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, message, tone }])
      window.setTimeout(() => dismissToast(id), 3200)
    },
    [dismissToast],
  )

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      sidebarCollapsed,
      toggleSidebar,
      mobileNavOpen,
      setMobileNavOpen,
      alertsOpen,
      setAlertsOpen,
      activeModal,
      modalPayload,
      openModal,
      closeModal,
      toasts,
      pushToast,
      dismissToast,
    }),
    [
      theme,
      toggleTheme,
      sidebarCollapsed,
      toggleSidebar,
      mobileNavOpen,
      alertsOpen,
      activeModal,
      modalPayload,
      openModal,
      closeModal,
      toasts,
      pushToast,
      dismissToast,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
