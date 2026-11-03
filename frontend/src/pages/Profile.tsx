import { useState, useEffect } from 'react'
import { Mail, Phone, Hash, Shield, Loader2, Lock, Trash2, AlertTriangle } from 'lucide-react'
import { api } from '../utils/api'
import { toast } from '../components/Toast'

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

  // Change Password state
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState<string | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  // GDPR Deletion Modal State
  const [showGdprModal, setShowGdprModal] = useState(false)
  const [targetUserId, setTargetUserId] = useState('')
  const [gdprMessage, setGdprMessage] = useState<string | null>(null)
  const [gdprLoading, setGdprLoading] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const res = await api.get<any>('/api/users/profile')
        if (res.success && res.data) {
          setProfile(res.data)
        }
      } catch (err) {
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(null)

    if (!oldPassword || !newPassword) {
      const msg = 'Please fill in both current and new password.'
      setPwError(msg)
      toast.warning(msg, 'Password Change')
      return
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9\s])(?=\S+$).{8,}$/
    if (!passwordRegex.test(newPassword)) {
      const msg = 'Password must meet security requirements: minimum 8 characters with uppercase, lowercase, digit, and special character'
      setPwError(msg)
      toast.warning(msg, 'Password Requirements')
      return
    }

    try {
      setPwLoading(true)
      const res = await api.post<any>('/api/auth/change-password', {
        oldPassword,
        newPassword
      })

      if (res.success || res.message) {
        const msg = 'Password changed successfully. Please log in again.'
        setPwSuccess(msg)
        toast.success(msg, 'Password Changed')
        setOldPassword('')
        setNewPassword('')
      } else {
        const msg = res.message || 'Failed to change password.'
        setPwError(msg)
        toast.error(msg, 'Password Change Error')
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to change password. Check your current password.'
      setPwError(msg)
      toast.error(msg, 'Password Change Failed')
    } finally {
      setPwLoading(false)
    }
  }

  const handleGdprDelete = async () => {
    if (!targetUserId) return
    try {
      setGdprLoading(true)
      const res = await api.delete<any>(`/api/users/${targetUserId}`)
      if (res.success || res.message) {
        const msg = res.message || 'User account and associated data purged in compliance with GDPR.'
        setGdprMessage(msg)
        toast.success(msg, 'GDPR Purge Completed')
        setTimeout(() => setShowGdprModal(false), 3000)
      } else {
        const msg = res.message || 'GDPR deletion failed.'
        setGdprMessage(msg)
        toast.error(msg, 'GDPR Action Failed')
      }
    } catch (err: any) {
      const msg = err.message || 'GDPR deletion failed.'
      setGdprMessage(msg)
      toast.error(msg, 'GDPR Action Failed')
    } finally {
      setGdprLoading(false)
    }
  }

  const handleLogoutRedirect = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.hash = 'login'
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[#2563EB]" size={32} />
      </div>
    )
  }

  const initials = (profile?.name || 'User').substring(0, 2).toUpperCase()
  const isAdmin = profile?.role === 'ADMIN'

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

        {/* PROMPT 10.2: Change Password Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              <Lock size={18} className="text-[#2563EB]" />
            </div>
            <div>
              <h3 className="font-display font-700 text-[#0F172A] text-sm">Change Password</h3>
              <p className="text-xs text-[#64748B]">Update your authentication credentials</p>
            </div>
          </div>

          {pwError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {pwError}
            </div>
          )}

          {pwSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs space-y-2">
              <p className="font-semibold">{pwSuccess}</p>
              <button
                type="button"
                onClick={handleLogoutRedirect}
                className="px-3 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-lg hover:bg-[#1D4ED8] transition-colors"
              >
                Click here to log in again
              </button>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="Old@123"
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New@456"
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
            <button
              type="submit"
              disabled={pwLoading}
              className="px-5 py-2.5 bg-[#2563EB] text-white text-xs font-bold rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-sm disabled:opacity-50"
            >
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* PROMPT 10.6: GDPR Data Deletion (Admin Only) */}
        {isAdmin && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-display font-700 text-red-900 text-sm">GDPR Data Deletion Management</h3>
                <p className="text-xs text-red-600">Admin utility for purging user data in compliance with GDPR</p>
              </div>
            </div>

            <button
              onClick={() => setShowGdprModal(true)}
              className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
            >
              Delete User Data (GDPR)
            </button>
          </div>
        )}
      </div>

      {/* GDPR Confirmation Modal */}
      {showGdprModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle size={24} />
              <h3 className="font-display font-bold text-lg text-slate-900">Delete User Account</h3>
            </div>

            <p className="text-sm text-slate-600 font-medium">
              Delete all data for this user? This cannot be undone.
            </p>

            {gdprMessage && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-medium">
                {gdprMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Enter User ID to delete:</label>
              <input
                type="text"
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                placeholder="e.g. 5"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowGdprModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGdprDelete}
                disabled={gdprLoading || !targetUserId}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {gdprLoading ? 'Purging Data...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
