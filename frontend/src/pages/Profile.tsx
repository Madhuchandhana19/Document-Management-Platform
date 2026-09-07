import { useState, useEffect } from 'react'
import { Mail, Phone, Building2, Hash, Shield, CheckCircle2, User, Loader2 } from 'lucide-react'
import { api } from '../utils/api'

interface ProfileDto {
  id: number
  name: string
  email: string
  phoneNumber: string
  role: string
  active: boolean
  lastLogin: string | null
  createdDate: string
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const res = await api.get<any>('/api/users/profile')
        if (res.success && res.data) {
          setProfile(res.data)
        }
      } catch (err) {
        // Fallback to local storage
        const saved = localStorage.getItem('user')
        if (saved) {
          const u = JSON.parse(saved)
          setProfile({
            id: Number(u.id) || 1,
            name: u.username || 'Administrator',
            email: u.email || 'admin@dms.com',
            phoneNumber: '+91 9876543210',
            role: (u.roles && u.roles[0]?.replace('ROLE_', '')) || 'ADMIN',
            active: true,
            lastLogin: new Date().toISOString(),
            createdDate: '2026-01-01'
          })
        }
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[#2563EB]" size={32} />
      </div>
    )
  }

  const initials = (profile?.name || 'User').substring(0, 2).toUpperCase()

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <h1 className="font-display text-2xl font-700 text-[#0F172A]">My Profile & Account</h1>

      <div className="space-y-5">
        {/* User Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex items-center gap-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white font-display font-700 text-xl flex-shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="font-display text-xl font-700 text-[#0F172A]">{profile?.name}</h2>
            <p className="text-xs text-[#64748B] mt-0.5">{profile?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                Active Account
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                {profile?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="font-display font-700 text-[#0F172A] text-sm mb-4">Account Attributes</h3>
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            {[
              { icon: Mail, label: 'Email Address', value: profile?.email },
              { icon: Phone, label: 'Phone Number', value: profile?.phoneNumber || '+91 9876543210' },
              { icon: Shield, label: 'Assigned Role', value: profile?.role },
              { icon: Hash, label: 'User ID (Database PK)', value: `USR-${profile?.id}` },
            ].map(f => (
              <div key={f.label} className="p-3 bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl">
                <div className="flex items-center gap-1.5 text-[#94A3B8] mb-1">
                  <f.icon size={13} />
                  <span className="text-[11px] font-semibold">{f.label}</span>
                </div>
                <p className="font-bold text-[#1E293B]">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
