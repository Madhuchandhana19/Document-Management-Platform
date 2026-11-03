import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  title?: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void
    error: (message: string, title?: string) => void
    warning: (message: string, title?: string) => void
    info: (message: string, title?: string) => void
    custom: (item: Omit<ToastItem, 'id'>) => void
  }
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Global toast helper for non-react contexts
type ToastListener = (item: ToastItem) => void
const listeners = new Set<ToastListener>()

export const toast = {
  success: (message: string, title?: string) => {
    emitToast({ message, title, type: 'success' })
  },
  error: (message: string, title?: string) => {
    emitToast({ message, title, type: 'error' })
  },
  warning: (message: string, title?: string) => {
    emitToast({ message, title, type: 'warning' })
  },
  info: (message: string, title?: string) => {
    emitToast({ message, title, type: 'info' })
  }
}

function emitToast(item: Omit<ToastItem, 'id'>) {
  const fullItem: ToastItem = {
    ...item,
    id: Math.random().toString(36).substring(2, 9)
  }
  listeners.forEach((listener) => listener(fullItem))
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastItem = { ...item, id }
    setToasts((prev) => [...prev, newToast])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const handleGlobal = (item: ToastItem) => {
      setToasts((prev) => [...prev, item])
    }
    listeners.add(handleGlobal)
    return () => {
      listeners.delete(handleGlobal)
    }
  }, [])

  const contextValue: ToastContextType = {
    toast: {
      success: (message, title) => addToast({ message, title, type: 'success' }),
      error: (message, title) => addToast({ message, title, type: 'error' }),
      warning: (message, title) => addToast({ message, title, type: 'warning' }),
      info: (message, title) => addToast({ message, title, type: 'info' }),
      custom: (item) => addToast(item)
    },
    removeToast
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Return fallback global toast if used outside provider
    return toast
  }
  return context.toast
}

function ToastCard({ toast: t, onClose }: { toast: ToastItem; onClose: () => void }) {
  const duration = t.duration || 4000
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onClose()
      }
    }, 30)

    return () => clearInterval(interval)
  }, [duration, onClose])

  const getStyle = () => {
    switch (t.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
          border: 'border-emerald-500/30',
          glow: 'shadow-emerald-950/40',
          bar: 'bg-emerald-500',
          titleColor: 'text-emerald-300'
        }
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
          border: 'border-rose-500/30',
          glow: 'shadow-rose-950/40',
          bar: 'bg-rose-500',
          titleColor: 'text-rose-300'
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
          border: 'border-amber-500/30',
          glow: 'shadow-amber-950/40',
          bar: 'bg-amber-500',
          titleColor: 'text-amber-300'
        }
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
          border: 'border-blue-500/30',
          glow: 'shadow-blue-950/40',
          bar: 'bg-blue-500',
          titleColor: 'text-blue-300'
        }
    }
  }

  const style = getStyle()

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`pointer-events-auto relative overflow-hidden bg-slate-900/95 backdrop-blur-xl border ${style.border} text-slate-100 shadow-2xl ${style.glow} rounded-xl p-4 flex items-start gap-3 transition-all duration-300 transform translate-y-0 opacity-100`}
    >
      {style.icon}
      <div className="flex-1 pr-2">
        {t.title && <h4 className={`text-sm font-semibold mb-0.5 ${style.titleColor}`}>{t.title}</h4>}
        <p className="text-sm text-slate-200 leading-snug font-medium">{t.message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-100 transition-colors p-1 rounded-lg hover:bg-slate-800/60 shrink-0"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/50 overflow-hidden">
        <div
          className={`h-full ${style.bar} transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
