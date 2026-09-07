import {
  LayoutDashboard, FileText, Share2, CheckSquare, FolderOpen,
  Bell, BarChart3, Settings, LogOut, ChevronRight
} from 'lucide-react'
import type { Page, UserProfile } from '../App'
import { useNotificationsCount } from '../stores/notifications'

interface Props {
  current: Page
  onNavigate: (p: Page) => void
  collapsed: boolean
  user: UserProfile | null
  onLogout: () => void
}

const nav = [
  { icon: LayoutDashboard, label: 'Dashboard', page: 'dashboard' as Page },
  { icon: FileText, label: 'My Documents', page: 'documents' as Page },
  { icon: Share2, label: 'Shared Workspace', page: 'workspace' as Page },
  { icon: CheckSquare, label: 'Approvals', page: 'approvals' as Page },
  { icon: Bell, label: 'Notifications', page: 'notifications' as Page, dynamicBadge: true },
  { icon: BarChart3, label: 'Reports', page: 'reports' as Page },
  { icon: Settings, label: 'Settings', page: 'settings' as Page },
]

export default function Sidebar({ current, onNavigate, collapsed, user, onLogout }: Props) {
  const username = user?.username || 'Guest'
  const email = user?.email || 'guest@example.com'
  const initials = username.substring(0, 2).toUpperCase()
  const role = user?.roles && user.roles.length > 0 ? user.roles[0].replace('ROLE_', '') : 'Viewer'
  const notifCount = useNotificationsCount()

  return (
    <aside
      className={`flex flex-col bg-[#0F172A] h-full transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-[68px]' : 'w-[232px]'}`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 h-16 border-b border-white/10 flex-shrink-0 ${collapsed ? 'justify-center px-4' : 'px-5'}`}>
        <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center flex-shrink-0 shadow-md">
          <FileText size={15} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-display font-700 text-white text-[16px] tracking-tight">
            Digital<span className="text-[#60A5FA]">WS</span>
          </span>
        )}
      </div>

      {/* User avatar */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white font-700 text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-600 truncate">{username}</p>
              <p className="text-[#475569] text-[10px] truncate">{role}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#22C55E] flex-shrink-0 ml-auto" />
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center py-3 border-b border-white/10 flex-shrink-0" title={`${username} (${role})`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white font-700 text-xs">
            {initials}
          </div>
        </div>
      )}

      {/* Nav label */}
      {!collapsed && (
        <p className="px-5 pt-4 pb-1 text-[10px] font-700 text-[#334155] uppercase tracking-widest">
          Main Menu
        </p>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-2.5 py-2 space-y-0.5 sidebar-scroll overflow-y-auto">
        {nav.map(item => {
          const active = current === item.page
          return (
            <button
              key={item.label}
              onClick={() => onNavigate(item.page)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 rounded-xl text-sm transition-all duration-150 group relative ${
                collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'
              } ${
                active
                  ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/20'
                  : 'text-[#64748B] hover:bg-white/8 hover:text-[#CBD5E1]'
              }`}
            >
              {/* Active left bar */}
              {active && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full -ml-2.5" />
              )}

              <item.icon size={17} className="flex-shrink-0" />

              {!collapsed && (
                <>
                  <span className="flex-1 text-left font-500">{item.label}</span>
                  {(item.badge || (item.dynamicBadge && notifCount > 0)) && !active && (
                    <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full bg-[#2563EB] text-white leading-none">
                      {item.dynamicBadge ? notifCount : item.badge}
                    </span>
                  )}
                  {active && <ChevronRight size={13} className="opacity-60" />}
                </>
              )}

              {/* Collapsed badge */}
              {collapsed && (item.badge || (item.dynamicBadge && notifCount > 0)) && !active && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EF4444]" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-white/10" />

      {/* Logout */}
      <div className={`px-2.5 py-3 flex-shrink-0`}>
        <button
          onClick={onLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl text-sm text-[#475569] hover:bg-[#EF4444]/10 hover:text-[#F87171] transition-all py-2.5 ${collapsed ? 'justify-center px-0' : 'px-3'}`}
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span className="font-500">Logout</span>}
        </button>
      </div>
    </aside>
  )
}
