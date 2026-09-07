import { useState } from 'react'
import { Globe, Sun, Moon, Bell, Mail, Smartphone, CheckSquare, Shield } from 'lucide-react'

export default function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [language, setLanguage] = useState('English')
  const [notifs, setNotifs] = useState({ email: true, push: true, approvals: true, comments: false, weekly: true })

  const toggle = (key: keyof typeof notifs) => setNotifs(v => ({ ...v, [key]: !v[key] }))

  const Toggle = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${active ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${active ? 'left-5.5' : 'left-0.5'}`} style={{ left: active ? '22px' : '2px' }} />
    </button>
  )

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="font-display text-2xl font-700 text-[#0F172A] mb-6">General Settings</h1>

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

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              <Bell size={18} className="text-[#2563EB]" />
            </div>
            <h2 className="font-display font-600 text-[#0F172A]">Notification Preferences</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: 'email' as const, icon: Mail, label: 'Email Notifications', desc: 'Receive notifications via email' },
              { key: 'push' as const, icon: Smartphone, label: 'Push Notifications', desc: 'Browser push notifications' },
              { key: 'approvals' as const, icon: CheckSquare, label: 'Approval Alerts', desc: 'Notified when documents need approval' },
              { key: 'comments' as const, icon: Bell, label: 'Comment Alerts', desc: 'Notified when comments are added' },
              { key: 'weekly' as const, icon: Shield, label: 'Weekly Summary', desc: 'Weekly digest of your document activity' },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center">
                    <n.icon size={15} className="text-[#64748B]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1E293B]">{n.label}</p>
                    <p className="text-xs text-[#94A3B8]">{n.desc}</p>
                  </div>
                </div>
                <Toggle active={notifs[n.key]} onToggle={() => toggle(n.key)} />
              </div>
            ))}
          </div>
        </div>

        <button className="w-full py-3 text-sm font-medium bg-[#2563EB] text-white rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-sm">
          Save Changes
        </button>
      </div>
    </div>
  )
}
