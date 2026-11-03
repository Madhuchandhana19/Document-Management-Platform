import { useState } from 'react'
import { FileText, Eye, EyeOff, User, Mail, Lock, ArrowLeft, Check, AlertCircle, Loader2 } from 'lucide-react'
import type { Page } from '../App'
import { api } from '../utils/api'
import { toast } from '../components/Toast'

interface Props { onNavigate: (p: Page) => void }

const perks = [
  'Secure cloud document storage',
  'Real-time team collaboration',
  'Automated approval workflows',
  'Version history & restore',
  'Smart search & filters',
]

export default function RegisterPage({ onNavigate }: Props) {
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('DOCUMENT_OWNER')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !email || !password || !fullName) {
      const msg = 'Please fill in all required fields.'
      setError(msg)
      toast.warning(msg, 'Required Fields Missing')
      return
    }
    const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9\s])(?=\S+$).{8,}$/
    if (!passwordRegex.test(password)) {
      const msg = 'Password must be at least 8 characters long and contain uppercase (A-Z), lowercase (a-z), a number (0-9), at least 1 special character (e.g. @, #, $, !, etc.), and no spaces.'
      setError(msg)
      toast.warning(msg, 'Weak Password')
      return
    }
    if (!/^[A-Za-z ]{2,100}$/.test(fullName)) {
      const msg = 'Name must not contain numbers or special characters'
      setError(msg)
      toast.warning(msg, 'Invalid Name')
      return
    }
    if (!/^\d{10}$/.test(phoneNumber)) {
      const msg = 'Phone Number must be exactly 10 digits long'
      setError(msg)
      toast.warning(msg, 'Invalid Phone Number')
      return
    }
    if (password !== confirmPassword) {
      const msg = 'Passwords do not match.'
      setError(msg)
      toast.warning(msg, 'Password Mismatch')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const response = await api.post<any>('/api/auth/register', {
        name: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role
      })

      if (response.success) {
        setSuccess(true)
        toast.success(`Account registered successfully for ${email.trim()}!`, 'Registration Successful')
        setTimeout(() => {
          onNavigate('login')
        }, 2000)
      } else {
        const msg = response.message || 'Registration failed.'
        setError(msg)
        toast.error(msg, 'Registration Failed')
      }
    } catch (err: any) {
      const msg = err.message || 'Connection error. Please try again.'
      setError(msg)
      toast.error(msg, 'Registration Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[40%] bg-[#0F172A] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E40AF]/30 via-transparent to-[#7C3AED]/20" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px'
          }} />
        </div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#2563EB]/15 rounded-full translate-x-1/3 translate-y-1/3 blur-2xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-lg">
            <FileText size={20} className="text-white" />
          </div>
          <span className="font-display font-700 text-white text-xl tracking-tight">Digital<span className="text-[#60A5FA]">WS</span></span>
        </div>

        <div className="relative">
          <h2 className="font-display text-4xl font-700 text-white leading-tight mb-4">
            Join the Digital<br />Workspace today.
          </h2>
          <p className="text-[#64748B] text-base leading-relaxed mb-8">
            Streamline your document management with powerful tools built for modern teams.
          </p>
          <div className="space-y-3">
            {perks.map(p => (
              <div key={p} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#16A34A]/20 border border-[#16A34A]/30 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-[#4ADE80]" />
                </div>
                <span className="text-[#64748B] text-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[#334155] text-xs">© 2026 Digital Workspace System</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-[480px] py-8">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#64748B] mb-8 transition-colors"
          >
            <ArrowLeft size={13} /> Back to home
          </button>

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
              <FileText size={15} className="text-white" />
            </div>
            <span className="font-display font-700 text-[#0F172A] text-lg">DigitalWS</span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-[28px] font-700 text-[#0F172A] mb-2">Create Your Account</h1>
            <p className="text-[#64748B] text-sm">Join the Digital Workspace System today.</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs leading-relaxed animate-in fade-in">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs leading-relaxed animate-in fade-in">
              <Check size={16} className="flex-shrink-0 mt-0.5 text-green-600" />
              <span>Registration successful! Please verify your email.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-700 text-[#1E293B] mb-2 uppercase tracking-wide">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
                <input
                  type="text"
                  value={fullName}
                  disabled={loading || success}
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] focus:bg-white transition-all"
                  placeholder="First Last"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-700 text-[#1E293B] mb-2 uppercase tracking-wide">Username</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
                <input
                  type="text"
                  value={username}
                  disabled={loading || success}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] focus:bg-white transition-all"
                  placeholder="johndoe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-700 text-[#1E293B] mb-2 uppercase tracking-wide">Phone Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={phoneNumber}
                  disabled={loading || success}
                  onChange={e => setPhoneNumber(e.target.value)}
                  autoComplete="off"
                  className="w-full pl-4 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] focus:bg-white transition-all"
                  placeholder="1234567890"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-700 text-[#1E293B] mb-2 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
                <input
                  type="email"
                  value={email}
                  disabled={loading || success}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] focus:bg-white transition-all"
                  placeholder="user@dms.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-700 text-[#1E293B] mb-2 uppercase tracking-wide">System Role</label>
              <select
                value={role}
                disabled={loading || success}
                onChange={e => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] focus:bg-white transition-all font-medium"
              >
                <option value="VIEWER">Viewer (Read-only access)</option>
                <option value="EDITOR">Editor (Create, upload & modify documents)</option>
                <option value="APPROVER">Approver (Approve & reject workflows)</option>
                <option value="MANAGER">Manager (Departmental oversight)</option>
                <option value="SUPERVISOR">Supervisor (Team workflow supervision)</option>
                <option value="OFFICER">Officer (Compliance & policy auditing)</option>
                <option value="DOCUMENT_OWNER">Owner (Full control over own docs)</option>
                <option value="ADMIN">Admin (Full system control)</option>
                <option value="GUEST">Guest (Very limited access)</option>
                <option value="COMPLIANCE_OFFICER">Compliance Officer (Auditing & retention)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-700 text-[#1E293B] mb-2 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    disabled={loading || success}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] focus:bg-white transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#CBD5E1] hover:text-[#94A3B8]">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-700 text-[#1E293B] mb-2 uppercase tracking-wide">Confirm Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    disabled={loading || success}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] focus:bg-white transition-all"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#CBD5E1] hover:text-[#94A3B8]">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password strength meter */}
            {password.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-[#64748B]">Password Strength:</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9\s]/.test(password)
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : password.length >= 6
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}>
                  {password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9\s]/.test(password)
                    ? 'Strong'
                    : password.length >= 6
                    ? 'Medium'
                    : 'Weak'}
                </span>
              </div>
            )}

            {/* Password requirements visual guide */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-[11px] text-[#64748B] space-y-1">
              <p className="font-600 text-[#334155]">Password Requirements:</p>
              <ul className="grid grid-cols-2 gap-x-2 gap-y-1 list-disc list-inside text-[10.5px]">
                <li className={password.length >= 8 ? 'text-green-600 font-600' : ''}>At least 8 characters</li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600 font-600' : ''}>At least 1 uppercase (A-Z)</li>
                <li className={/[a-z]/.test(password) ? 'text-green-600 font-600' : ''}>At least 1 lowercase (a-z)</li>
                <li className={/[0-9]/.test(password) ? 'text-green-600 font-600' : ''}>At least 1 number (0-9)</li>
                <li className={/[^A-Za-z0-9\s]/.test(password) ? 'text-green-600 font-600' : ''}>At least 1 special character</li>
                <li className={password.length > 0 && !/\s/.test(password) ? 'text-green-600 font-600' : ''}>No spaces</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3.5 mt-2 bg-[#2563EB] text-white font-700 text-sm rounded-xl hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-all shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-75 disabled:hover:-translate-y-0"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-[#94A3B8] mt-5">
            Already have an account?{' '}
            <button onClick={() => onNavigate('login')} className="text-[#2563EB] hover:text-[#1D4ED8] font-700 transition-colors">
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
