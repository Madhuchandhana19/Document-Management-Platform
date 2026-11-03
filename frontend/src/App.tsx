import { useState, useEffect, useRef, useCallback } from 'react'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AppShell from './pages/AppShell'
import { api } from './utils/api'

export type Page =
  | 'landing'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'documents'
  | 'upload'
  | 'document-details'
  | 'approvals'
  | 'workspace'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'reports'

export interface UserProfile {
  id: string
  username: string
  email: string
  roles: string[]
}

const VALID_PAGES: Page[] = [
  'landing', 'login', 'register', 'dashboard', 'documents',
  'upload', 'document-details', 'approvals', 'workspace',
  'notifications', 'profile', 'settings', 'reports'
]

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes inactivity timeout

const getInitialPage = (): Page => {
  const hash = window.location.hash.replace(/^#\/?/, '') as Page
  if (hash && VALID_PAGES.includes(hash)) {
    return hash
  }
  const savedPage = sessionStorage.getItem('currentPage') as Page
  if (savedPage && VALID_PAGES.includes(savedPage)) {
    return savedPage
  }
  return localStorage.getItem('accessToken') ? 'dashboard' : 'landing'
}

import { ToastProvider } from './components/Toast'

export default function App() {
  const [page, setPageState] = useState<Page>(getInitialPage)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  const lastActivityRef = useRef<number>(Date.now())

  const setPage = useCallback((newPage: Page) => {
    setPageState(newPage)
    window.location.hash = '#' + newPage
    sessionStorage.setItem('currentPage', newPage)
  }, [])

  const triggerSessionTimeout = useCallback((noticeMessage: string = 'Session expired. Please log in again.') => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    sessionStorage.removeItem('currentPage')
    setUser(null)
    setSessionNotice(noticeMessage)
    setPage('login')
  }, [setPage])

  // Expose simulation helper on window object for manual verification / automated testing
  useEffect(() => {
    ;(window as any).__simulateSessionTimeout = () => {
      console.log('[Auth] Simulating session timeout (30 min inactivity auto-logout)')
      triggerSessionTimeout('Session expired. Please log in again.')
    }
  }, [triggerSessionTimeout])

  // Inactivity tracking (30 min timer)
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    activityEvents.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }))

    const intervalId = setInterval(() => {
      const token = localStorage.getItem('accessToken')
      if (token && Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        triggerSessionTimeout('Session expired. Please log in again.')
      }
    }, 10000)

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity))
      clearInterval(intervalId)
    }
  }, [triggerSessionTimeout])

  // Navigation, auth event listeners, and multi-tab sync
  useEffect(() => {
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = '#' + page
    }
    sessionStorage.setItem('currentPage', page)

    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '') as Page
      if (hash && VALID_PAGES.includes(hash)) {
        setPageState(hash)
        sessionStorage.setItem('currentPage', hash)
      }
    }

    const handleAuthExpired = (e: Event) => {
      const customMsg = (e as CustomEvent)?.detail?.message || 'Session expired. Please log in again.'
      triggerSessionTimeout(customMsg)
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        // Logged out from another tab
        setUser(null)
        setSessionNotice('Logged out from another tab.')
        setPage('login')
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('auth-expired', handleAuthExpired)
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('auth-expired', handleAuthExpired)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [page, setPage, triggerSessionTimeout])

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile)
    setSessionNotice(null)
    setPage('dashboard')
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {})
    } catch (e) {
      console.error('Logout error', e)
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    sessionStorage.removeItem('currentPage')
    setUser(null)
    setSessionNotice(null)
    setPage('landing')
  }

  const renderContent = () => {
    if (page === 'landing') return <LandingPage onNavigate={setPage} />
    if (page === 'login') return <LoginPage onNavigate={setPage} onLoginSuccess={handleLoginSuccess} sessionNotice={sessionNotice} />
    if (page === 'register') return <RegisterPage onNavigate={setPage} />
    return <AppShell page={page} onNavigate={setPage} user={user} onLogout={handleLogout} />
  }

  return (
    <ToastProvider>
      {renderContent()}
    </ToastProvider>
  )
}
