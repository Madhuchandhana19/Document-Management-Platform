import { useState } from 'react'
import { Menu, Bell, Search, ChevronDown, Settings } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import type { Page, UserProfile } from '../App'
import Dashboard from './Dashboard'
import MyDocuments from './MyDocuments'
import UploadDocument from './UploadDocument'
import DocumentDetails from './DocumentDetails'
import Approvals from './Approvals'
import SharedWorkspace from './SharedWorkspace'
import Notifications from './Notifications'
import Profile from './Profile'
import SettingsPage from './Settings'
import Reports from './Reports'
import { useNotificationsCount } from '../stores/notifications'

interface Props {
  page: Page
  onNavigate: (p: Page) => void
  user: UserProfile | null
  onLogout: () => void
}

const pageTitles: Partial<Record<Page, string>> = {
  dashboard: 'Dashboard',
  documents: 'My Documents',
  upload: 'Upload Document',
  'document-details': 'Document Details',
  approvals: 'Approvals',
  workspace: 'Shared Workspace',
  notifications: 'Notifications',
  profile: 'My Profile',
  settings: 'Settings',
  reports: 'Reports',
}

function PageContent({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) {
  switch (page) {
    case 'dashboard': return <Dashboard onNavigate={onNavigate} />
    case 'documents': return <MyDocuments onNavigate={onNavigate} />
    case 'upload': return <UploadDocument onNavigate={onNavigate} />
    case 'document-details': return <DocumentDetails onNavigate={onNavigate} />
    case 'approvals': return <Approvals onNavigate={onNavigate} />
    case 'workspace': return <SharedWorkspace />
    case 'notifications': return <Notifications />
    case 'profile': return <Profile />
    case 'settings': return <SettingsPage />
    case 'reports': return <Reports />
    default: return <Dashboard onNavigate={onNavigate} />
  }
}

export default function AppShell({ page, onNavigate, user, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  
  const username = user?.username || 'Guest'
  const initials = username.substring(0, 2).toUpperCase()
  const role = user?.roles && user.roles.length > 0 ? user.roles[0].replace('ROLE_', '') : 'Viewer'
  const notifCount = useNotificationsCount()

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar current={page} onNavigate={onNavigate} collapsed={collapsed} user={user} onLogout={onLogout} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header role="banner" className="h-16 bg-white border-b border-[#E2E8F0] flex items-center px-5 gap-4 flex-shrink-0 z-10">
          <button
            onClick={() => setCollapsed(v => !v)}
            aria-label={collapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
            className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#475569] hover:text-[#1E293B] transition-colors"
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb navigation" className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-[#64748B] font-medium">DWS</span>
            <span className="text-[#94A3B8]" aria-hidden="true">/</span>
            <span className="font-600 text-[#1E293B]">{pageTitles[page] ?? 'Dashboard'}</span>
          </nav>

          <div className="flex-1 max-w-sm ml-2">
            <div className="relative">
              <label htmlFor="global-search-input" className="sr-only">Search documents</label>
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
              <input
                id="global-search-input"
                type="text"
                placeholder="Search documents..."
                aria-label="Search documents"
                className="w-full pl-9 pr-4 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-[#1E293B] placeholder:text-[#64748B]"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Notification bell */}
            <button
              onClick={() => onNavigate('notifications')}
              aria-label={`Notifications, ${notifCount} unread`}
              className="relative p-2 rounded-xl hover:bg-[#F1F5F9] text-[#475569] hover:text-[#1E293B] transition-colors"
            >
              <Bell size={17} aria-hidden="true" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {notifCount}
                </span>
              )}
            </button>

            {/* Settings */}
            <button
              onClick={() => onNavigate('settings')}
              aria-label="Application settings"
              className="p-2 rounded-xl hover:bg-[#F1F5F9] text-[#475569] hover:text-[#1E293B] transition-colors"
            >
              <Settings size={17} aria-hidden="true" />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-[#E2E8F0] mx-1" aria-hidden="true" />

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => onNavigate('profile')}
                aria-label={`User profile for ${username}, role ${role}`}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-[#F1F5F9] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white text-xs font-700">
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-700 text-[#1E293B] leading-none">{username}</p>
                  <p className="text-[10px] text-[#64748B] leading-none mt-0.5">{role}</p>
                </div>
                <ChevronDown size={13} className="text-[#64748B] hidden sm:block" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          <PageContent page={page} onNavigate={onNavigate} />
        </main>
      </div>
    </div>
  )
}
