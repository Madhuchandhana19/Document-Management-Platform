import { useState, useEffect } from 'react'
import { Globe, Sun, Moon, Bell, Mail, Smartphone, CheckSquare, Shield, Clock, AlertTriangle } from 'lucide-react'
import { api } from '../utils/api'
import { toast } from '../components/Toast'

interface NotificationPreferences {
  approvalInApp: boolean
  approvalEmail: boolean
  approvalSms: boolean
  shareInApp: boolean
  shareEmail: boolean
  shareSms: boolean
  slaBreachInApp: boolean
  slaBreachEmail: boolean
  expiryInApp: boolean
  expiryEmail: boolean
}

export default function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [language, setLanguage] = useState('English')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    approvalInApp: true,
    approvalEmail: true,
    approvalSms: false,
    shareInApp: true,
    shareEmail: true,
    shareSms: false,
    slaBreachInApp: true,
    slaBreachEmail: true,
    expiryInApp: true,
    expiryEmail: true,
  })

  useEffect(() => {
    async function loadPrefs() {
      try {
        const res = await api.get<NotificationPreferences>('/api/notifications/preferences')
        if (res?.data) {
          setPrefs(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch notification preferences', err)
      }
    }
    loadPrefs()
  }, [])

  const toggle = (key: keyof NotificationPreferences) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const saveChanges = async () => {
    try {
      const res = await api.put<NotificationPreferences>('/api/notifications/preferences', prefs)
      if (res?.data) {
        setPrefs(res.data)
      }
      setSaveSuccess(true)
      toast.success('Notification preferences saved successfully!', 'Preferences Saved')
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save notification preferences', 'Settings Error')
    }
  }

  const CheckboxChannel = ({
    label,
    checked,
    onChange,
  }: {
    label: string
    checked: boolean
    onChange: () => void
  }) => (
    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-[#475569]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-[#2563EB] border-[#CBD5E1] rounded focus:ring-[#2563EB]"
      />
      <span>{label}</span>
    </label>
  )

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="font-display text-2xl font-700 text-[#0F172A] mb-6">General Settings</h1>

      {saveSuccess && (
        <div className="mb-6 p-4 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded-xl text-sm font-medium">
          Notification preferences saved successfully!
        </div>
      )}

      <div className="space-y-5">
        {/* Language */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              <Globe size={18} className="text-[#2563EB]" />
            </div>
            <h2 className="font-display font-600 text-[#0F172A]">Language</h2>
          </div>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all bg-white"
          >
            {['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        {/* Theme */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              {theme === 'light' ? <Sun size={18} className="text-[#2563EB]" /> : <Moon size={18} className="text-[#2563EB]" />}
            </div>
            <h2 className="font-display font-600 text-[#0F172A]">Theme</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'light' as const, icon: Sun, label: 'Light', desc: 'Clean & bright interface' },
              { value: 'dark' as const, icon: Moon, label: 'Dark', desc: 'Easy on the eyes at night' },
            ].map(t => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  theme === t.value ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <t.icon size={20} className={theme === t.value ? 'text-[#2563EB]' : 'text-[#94A3B8]'} />
                <div>
                  <p className={`text-sm font-600 ${theme === t.value ? 'text-[#2563EB]' : 'text-[#1E293B]'}`}>{t.label}</p>
                  <p className="text-xs text-[#94A3B8]">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PROMPT 9.4: Notifications Preferences */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              <Bell size={18} className="text-[#2563EB]" />
            </div>
            <div>
              <h2 className="font-display font-600 text-[#0F172A]">Notification Preferences</h2>
              <p className="text-xs text-[#64748B]">Customize notification channels for each event type</p>
            </div>
          </div>

          <div className="space-y-5 divide-y divide-[#F1F5F9]">
            {/* Approval requests */}
            <div className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center">
                  <CheckSquare size={16} className="text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1E293B]">Approval requests</p>
                  <p className="text-xs text-[#94A3B8]">When documents are submitted for review</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pl-11 sm:pl-0">
                <CheckboxChannel label="In-app" checked={prefs.approvalInApp} onChange={() => toggle('approvalInApp')} />
                <CheckboxChannel label="Email" checked={prefs.approvalEmail} onChange={() => toggle('approvalEmail')} />
                <CheckboxChannel label="SMS" checked={prefs.approvalSms} onChange={() => toggle('approvalSms')} />
              </div>
            </div>

            {/* Document shared with me */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center">
                  <Mail size={16} className="text-[#7C3AED]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1E293B]">Document shared with me</p>
                  <p className="text-xs text-[#94A3B8]">When colleagues share workspace access</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pl-11 sm:pl-0">
                <CheckboxChannel label="In-app" checked={prefs.shareInApp} onChange={() => toggle('shareInApp')} />
                <CheckboxChannel label="Email" checked={prefs.shareEmail} onChange={() => toggle('shareEmail')} />
                <CheckboxChannel label="SMS" checked={prefs.shareSms} onChange={() => toggle('shareSms')} />
              </div>
            </div>

            {/* SLA breach alerts */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center">
                  <AlertTriangle size={16} className="text-[#EF4444]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1E293B]">SLA breach alerts</p>
                  <p className="text-xs text-[#94A3B8]">When approval workflows exceed target due date</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pl-11 sm:pl-0">
                <CheckboxChannel label="In-app" checked={prefs.slaBreachInApp} onChange={() => toggle('slaBreachInApp')} />
                <CheckboxChannel label="Email" checked={prefs.slaBreachEmail} onChange={() => toggle('slaBreachEmail')} />
              </div>
            </div>

            {/* Expiry reminders */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center">
                  <Clock size={16} className="text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1E293B]">Expiry reminders</p>
                  <p className="text-xs text-[#94A3B8]">Proactive 30-day retention and archival alerts</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pl-11 sm:pl-0">
                <CheckboxChannel label="In-app" checked={prefs.expiryInApp} onChange={() => toggle('expiryInApp')} />
                <CheckboxChannel label="Email" checked={prefs.expiryEmail} onChange={() => toggle('expiryEmail')} />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={saveChanges}
          className="w-full py-3 text-sm font-medium bg-[#2563EB] text-white rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-sm"
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}
