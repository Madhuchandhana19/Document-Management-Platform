import { useState } from 'react'
import { FileText, Eye, EyeOff, Mail, Lock, ArrowLeft, AlertCircle, Loader2, ShieldCheck, UserCheck } from 'lucide-react'
import type { Page, UserProfile } from '../App'
import { api } from '../utils/api'
import { toast } from '../components/Toast'

interface Props {
  onNavigate: (p: Page) => void
  onLoginSuccess: (profile: UserProfile) => void
  sessionNotice?: string | null
}

const demoAccounts = [
  { role: 'Admin', email: 'admin@dms.com', color: '#0F172A' },
  { role: 'Owner', email: 'owner@dms.com', color: '#2563EB' },
  { role: 'Editor', email: 'editor@dms.com', color: '#7C3AED' },
  { role: 'Approver', email: 'approver@dms.com', color: '#D97706' },
  { role: 'Viewer', email: 'viewer@dms.com', color: '#0891B2' },
  { role: 'Compliance', email: 'compliance@dms.com', color: '#9333EA' },
  { role: 'Guest', email: 'guest@dms.com', color: '#64748B' },
]

export default function LoginPage({ onNavigate, onLoginSuccess, sessionNotice }: Props) {
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e?: React.FormEvent, targetEmail?: string, targetPw?: string) => {
    if (e) e.preventDefault()
    
    const loginEmail = targetEmail || email
    const loginPw = targetPw || password

    if (!loginEmail || !loginPw) {
      const msg = 'Please enter both email and password.'
      setError(msg)
      toast.warning(msg, 'Missing Credentials')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const response = await api.post<any>('/api/auth/login', {
        email: loginEmail.trim(),
        password: loginPw,
      })
      if (response.success && response.data) {
        const { token, name, email: resEmail, role, userId } = response.data
        localStorage.setItem('accessToken', token)
        localStorage.setItem('refreshToken', token)
        const profile: UserProfile = { 
          id: String(userId), 
          username: name, 
          email: resEmail, 
          roles: ["ROLE_" + role] 
        }
        localStorage.setItem('user', JSON.stringify(profile))
        toast.success(`Welcome back, ${name || resEmail}!`, 'Login Successful')
        onLoginSuccess(profile)
      } else {
        const msg = 'Login failed. Please check credentials.'
        setError(msg)
        toast.error(msg, 'Authentication Error')
      }
    } catch (err: any) {
      const msg = err.message || 'Connection error. Please ensure backend is reachable on port 8080.'
      setError(msg)
      toast.error(msg, 'Authentication Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('Password123!')
    handleSubmit(undefined, demoEmail, 'Password123!')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0F172A] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0">
        {/* Background texture */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E40AF]/30 via-transparent to-[#7C3AED]/20" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2563EB]/50 to-transparent" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px'
          }} />
        </div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#2563EB]/15 rounded-full translate-x-1/3 translate-y-1/3 blur-2xl" />
        <div className="absolute top-1/3 -left-16 w-48 h-48 bg-[#7C3AED]/10 rounded-full blur-2xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-lg">
            <FileText size={20} className="text-white" />
          </div>
          <span className="font-display font-700 text-white text-xl tracking-tight">Digital<span className="text-[#60A5FA]">WS</span></span>
        </div>

        {/* Middle content */}
        <div className="relative space-y-8">
          <div>
            <h2 className="font-display text-4xl font-700 text-white leading-tight mb-4">
              Enterprise Document<br />Management Platform
            </h2>
            <p className="text-[#94A3B8] text-base leading-relaxed max-w-sm">
              Role-Based Access Control, Versioning, and Automated Multi-Step Approval Workflows.
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#60A5FA]">
              <ShieldCheck size={16} /> PostgreSQL + Spring Security Active
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              All REST API endpoints authenticated via JWT Bearer tokens and audited in real-time.
            </p>
          </div>
        </div>

        <div className="relative text-[#64748B] text-xs">
          © 2026 Digital Workspace System • Production Grade
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-md">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#2563EB] mb-8 transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to home
          </button>

          <div className="mb-6">
            <h1 className="font-display text-2xl font-700 text-[#0F172A] tracking-tight mb-1">
              Welcome back
            </h1>
            <p className="text-[#64748B] text-xs">
              Sign in to manage and review enterprise documents.
            </p>
          </div>

          {sessionNotice && (
            <div role="status" aria-live="polite" className="mb-5 flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs leading-relaxed animate-in fade-in">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
              <span className="font-semibold">{sessionNotice}</span>
            </div>
          )}

          {error && (
            <div id="login-error" role="alert" aria-live="polite" className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs leading-relaxed animate-in fade-in">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[#1E293B] mb-1.5 uppercase tracking-wider">
                Email Address <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  required
                  aria-required="true"
                  aria-describedby={error ? "login-error" : undefined}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="off"
                  placeholder="admin@dms.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[#1E293B] mb-1.5 uppercase tracking-wider">
                Password <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  aria-required="true"
                  aria-describedby={error ? "login-error" : undefined}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="off"
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B] transition-colors p-1"
                >
                  {showPw ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#475569]">
                <input
                  id="show-pw-checkbox"
                  type="checkbox"
                  checked={showPw}
                  onChange={e => setShowPw(e.target.checked)}
                  aria-label="Show Password"
                  className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] w-4 h-4"
                />
                <span>Show Password</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#2563EB] text-white font-bold text-xs rounded-xl hover:bg-[#1D4ED8] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            </button>
          </form>

          <p className="text-center text-xs text-[#64748B] mt-6">
            {"Don't have an account? "}
            <button onClick={() => onNavigate('register')} className="text-[#2563EB] hover:text-[#1D4ED8] font-bold transition-colors">
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
