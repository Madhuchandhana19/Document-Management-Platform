import { useState, useEffect } from 'react'
import { api } from '../utils/api'

export let notificationsData: any[] = []

export const setNotificationsData = (data: any[]) => {
  notificationsData = data
  notifyListeners()
}

const listeners = new Set<() => void>()
export const notifyListeners = () => listeners.forEach(fn => fn())

export const fetchNotifications = async () => {
  try {
    const res = await api.get<any[]>('/api/notifications')
    notificationsData = Array.isArray(res.data) ? res.data : []
    notifyListeners()
  } catch (err) {
    console.error('Failed to fetch notifications', err)
  }
}

export const useNotificationsCount = () => {
  const [unread, setUnread] = useState(() => notificationsData.filter(i => !i.read).length)
  
  useEffect(() => {
    // Initial fetch
    fetchNotifications()
    
    // Polling every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)

    const fn = () => setUnread(notificationsData.filter(i => !i.read).length)
    listeners.add(fn)
    
    return () => {
      clearInterval(interval)
      listeners.delete(fn)
    }
  }, [])
  
  return unread
}
