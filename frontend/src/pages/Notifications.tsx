import { Bell, X, CheckCircle2, Share2, Upload, MessageSquare, Lock, Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { notificationsData, notifyListeners, setNotificationsData } from '../stores/notifications'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const getTypeConfig = (type: string) => {
  switch (type) {
    case 'APPROVAL': return { icon: CheckCircle2, color: '#22C55E', bg: '#F0FDF4' }
    case 'SHARE': return { icon: Share2, color: '#2563EB', bg: '#EFF6FF' }
    case 'UPLOAD': return { icon: Upload, color: '#7C3AED', bg: '#F5F3FF' }
    case 'COMMENT': return { icon: MessageSquare, color: '#0891B2', bg: '#ECFEFF' }
    case 'SECURITY': return { icon: Lock, color: '#F59E0B', bg: '#FFFBEB' }
    default: return { icon: Info, color: '#64748B', bg: '#F1F5F9' }
  }
}

export default function Notifications() {
  const [items, setItems] = useState(notificationsData)
  const unread = items.filter(i => !i.read).length

  // Keep items in sync with store
  useEffect(() => {
    setItems(notificationsData)
    const interval = setInterval(() => setItems([...notificationsData]), 1000)
    return () => clearInterval(interval)
  }, [])

  const markAll = async () => {
    try {
      await api.put('/api/notifications/mark-all-read', {})
      const newData = notificationsData.map(i => ({ ...i, read: true }))
      setNotificationsData(newData)
      setItems(newData)
    } catch (err) {
      console.error('Failed to mark all as read', err)
    }
  }

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/api/notifications/${id}/read`, {})
      const newData = notificationsData.map(i => i.id === id ? { ...i, read: true } : i)
      setNotificationsData(newData)
      setItems(newData)
    } catch (err) {
      console.error('Failed to mark as read', err)
    }
  }

  const dismiss = async (id: number) => {
    try {
      await api.delete(`/api/notifications/${id}`)
      const newData = notificationsData.filter(i => i.id !== id)
      setNotificationsData(newData)
      setItems(newData)
    } catch (err) {
      console.error('Failed to dismiss', err)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-700 text-[#0F172A]">Notifications</h1>
          {unread > 0 && (
            <span className="px-2.5 py-0.5 bg-[#2563EB] text-white text-xs font-600 rounded-full">{unread}</span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors">
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {items.map((n) => {
          const config = getTypeConfig(n.type)
          const Icon = config.icon
          
          return (
            <div
              key={n.id}
              onClick={() => {
                if (!n.read) markAsRead(n.id);
                if (n.type === 'APPROVAL' || n.type === 'WORKFLOW_ASSIGNED' || n.type === 'WORKFLOW_APPROVED' || n.type === 'WORKFLOW_REJECTED') {
                  window.location.hash = 'approvals';
                } else {
                  window.location.hash = 'documents';
                }
              }}
              className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:border-[#2563EB]/40 ${
                !n.read ? 'bg-white border-[#BFDBFE] shadow-sm' : 'bg-white border-[#E2E8F0]'
              }`}
            >
              {!n.read && <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-[#2563EB] -translate-x-3" />}
              <div style={{ background: config.bg }} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={18} style={{ color: config.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.read ? 'font-600 text-[#0F172A]' : 'font-medium text-[#1E293B]'}`}>{n.message}</p>
                <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{n.detail}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Bell size={11} className="text-[#94A3B8]" />
                  <span className="text-xs text-[#94A3B8]">{dayjs(n.createdAt).fromNow()}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(n.id);
                }}
                className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#CBD5E1] hover:text-[#94A3B8] transition-colors flex-shrink-0 z-10"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="text-center py-16">
            <Bell size={40} className="text-[#CBD5E1] mx-auto mb-4" />
            <p className="text-[#64748B] font-medium">All caught up!</p>
            <p className="text-[#94A3B8] text-sm mt-1">No notifications at this time.</p>
          </div>
        )}
      </div>
    </div>
  )
}
