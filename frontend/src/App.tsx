import { useState, useEffect } from 'react'
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

export default function App() {
  const [page, setPage] = useState<Page>(() => {
    return localStorage.getItem('accessToken') ? 'dashboard' : 'landing'
  })
  
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null)
      setPage('login')
    }

    window.addEventListener('auth-expired', handleAuthExpired)
    return () => window.removeEventListener('auth-expired', handleAuthExpired)
  }, [])

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile)
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
    setUser(null)
    setPage('landing')
  }

  if (page === 'landing') return <LandingPage onNavigate={setPage} />
  if (page === 'login') return <LoginPage onNavigate={setPage} onLoginSuccess={handleLoginSuccess} />
  if (page === 'register') return <RegisterPage onNavigate={setPage} />

  return <AppShell page={page} onNavigate={setPage} user={user} onLogout={handleLogout} />
}
