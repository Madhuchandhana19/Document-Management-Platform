import { useState } from 'react'
import type { Page } from '../App'
import {
  ShieldCheck, GitBranch, Zap, Users, Search, Bell,
  ArrowRight, FileText, ChevronRight, Check, Menu, X
} from 'lucide-react'

interface Props { onNavigate: (p: Page) => void }

const features = [
  { icon: ShieldCheck, title: 'Secure Storage', desc: 'Store documents safely with role-based access control and end-to-end encryption.' },
  { icon: GitBranch, title: 'Version Control', desc: 'Track complete document history and restore any previous version instantly.' },
  { icon: Zap, title: 'Workflow Automation', desc: 'Approve, reject, and review documents with configurable automated workflows.' },
  { icon: Users, title: 'Collaboration', desc: 'Share documents and collaborate with your team in real time, from anywhere.' },
  { icon: Search, title: 'Advanced Search', desc: 'Quickly find any file using smart filters, tags, categories, and full-text search.' },
  { icon: Bell, title: 'Notifications', desc: 'Receive instant alerts for approvals, updates, comments, and shared files.' },
]

const stats = [
  { value: '10,000+', label: 'Documents Managed' },
  { value: '500+', label: 'Active Users' },
  { value: '99.9%', label: 'System Availability' },
  { value: '50+', label: 'Organizations' },
]

const recentDocs = [
  { name: 'Project Proposal.pdf', status: 'Approved', time: '10m ago', ext: 'pdf', color: '#EF4444' },
  { name: 'HR Policy.docx', status: 'Pending', time: '42m ago', ext: 'docx', color: '#2563EB' },
  { name: 'Budget Report.xlsx', status: 'Approved', time: '2h ago', ext: 'xlsx', color: '#16A34A' },
]

const trust = ['Role-based access control', 'End-to-end encryption', 'Audit trail logs', 'GDPR compliant']

export default function LandingPage({ onNavigate }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-body overflow-x-hidden">

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate('landing')}>
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center shadow-sm">
              <FileText size={15} className="text-white" />
            </div>
            <span className="font-display font-700 text-[#0F172A] text-lg tracking-tight">
              Digital<span className="text-[#2563EB]">WS</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-[#64748B]">
            <button onClick={() => onNavigate('landing')} className="hover:text-[#2563EB] transition-colors font-medium">Home</button>
            <a href="#features" className="hover:text-[#2563EB] transition-colors font-medium">Features</a>
            <a href="#statistics" className="hover:text-[#2563EB] transition-colors font-medium">Statistics</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => onNavigate('login')} className="px-4 py-2 text-sm font-medium text-[#1E293B] hover:text-[#2563EB] transition-colors">
              Sign In
            </button>
            <button onClick={() => onNavigate('register')} className="px-4 py-2 text-sm font-600 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors shadow-sm">
              Get Started Free
            </button>
          </div>

          <button className="md:hidden p-2 rounded-lg hover:bg-[#F1F5F9]" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X size={20} className="text-[#1E293B]" /> : <Menu size={20} className="text-[#1E293B]" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-[#E2E8F0] bg-white px-6 py-4 space-y-3">
            <button onClick={() => onNavigate('login')} className="block w-full py-2.5 text-center text-sm font-medium text-[#1E293B] border border-[#E2E8F0] rounded-lg">Sign In</button>
            <button onClick={() => onNavigate('register')} className="block w-full py-2.5 text-center text-sm font-600 bg-[#2563EB] text-white rounded-lg">Get Started Free</button>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#EFF6FF]/60 via-[#F8FAFC] to-[#F8FAFC]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[#2563EB]/5 rounded-full blur-3xl" />
        <div className="absolute top-10 right-0 w-72 h-72 bg-[#7C3AED]/5 rounded-full blur-2xl" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-[#BFDBFE] text-[#2563EB] rounded-full text-xs font-600 mb-8 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                Enterprise Document Management
              </div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-[56px] font-800 text-[#0F172A] leading-[1.08] tracking-tight mb-6">
                Manage Documents<br />
                <span className="relative">
                  <span className="text-[#2563EB]">Smarter, Faster</span>
                </span><br />
                &amp; Securely
              </h1>

              <p className="text-[#475569] text-lg leading-relaxed mb-10 max-w-[500px]">
                A centralized document management platform that enables secure file storage, collaboration, approval workflows, version control, and real-time notifications.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <button
                  onClick={() => onNavigate('register')}
                  className="flex items-center gap-2 px-6 py-3.5 bg-[#2563EB] text-white font-600 rounded-xl hover:bg-[#1D4ED8] transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                >
                  Get Started <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="flex items-center gap-2 px-6 py-3.5 bg-white text-[#1E293B] font-600 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] hover:text-[#2563EB] transition-all shadow-sm"
                >
                  View Demo <ChevronRight size={16} />
                </button>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-2">
                {trust.map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#F0FDF4] flex items-center justify-center flex-shrink-0">
                      <Check size={10} className="text-[#16A34A]" />
                    </div>
                    <span className="text-xs text-[#64748B]">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Dashboard mockup */}
            <div className="hidden lg:block relative">
              {/* Glow */}
              <div className="absolute inset-4 bg-[#2563EB]/10 rounded-3xl blur-2xl" />

              <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden">
                {/* Titlebar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                  <div className="flex-1 mx-4">
                    <div className="bg-white border border-[#E2E8F0] rounded-md px-3 py-1 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                      <span className="text-xs text-[#94A3B8] font-mono">dashboard.dws.app</span>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {/* Greeting */}
                  <div className="mb-4">
                    <p className="text-xs text-[#94A3B8]">Good Morning,</p>
                    <p className="font-display font-700 text-[#0F172A]">Alice 👋</p>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: 'Documents', val: '1,248', c: '#2563EB', bg: '#EFF6FF' },
                      { label: 'Pending', val: '18', c: '#D97706', bg: '#FFFBEB' },
                      { label: 'Shared', val: '342', c: '#16A34A', bg: '#F0FDF4' },
                      { label: 'Storage', val: '65%', c: '#E11D48', bg: '#FFF1F2' },
                    ].map(s => (
                      <div key={s.label} style={{ background: s.bg }} className="rounded-xl p-3">
                        <div style={{ color: s.c }} className="font-display text-lg font-700">{s.val}</div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent docs */}
                  <div className="mb-3">
                    <p className="text-xs font-600 text-[#64748B] mb-2">Recent Documents</p>
                    <div className="space-y-1.5">
                      {recentDocs.map(d => (
                        <div key={d.name} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors">
                          <div style={{ background: d.color + '18' }} className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText size={13} style={{ color: d.color }} />
                          </div>
                          <span className="text-xs font-medium text-[#1E293B] flex-1 truncate">{d.name}</span>
                          <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${d.status === 'Approved' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#FFFBEB] text-[#D97706]'}`}>
                            {d.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upload btn */}
                  <button className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-600 flex items-center justify-center gap-1.5">
                    <ArrowRight size={13} /> Upload New Document
                  </button>
                </div>
              </div>

              {/* Floating notification card */}
              <div className="absolute -right-8 top-16 bg-white rounded-xl shadow-xl border border-[#E2E8F0] px-4 py-3 flex items-center gap-3 w-56">
                <div className="w-8 h-8 rounded-full bg-[#F0FDF4] flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-[#16A34A]" />
                </div>
                <div>
                  <p className="text-xs font-600 text-[#0F172A]">Document Approved</p>
                  <p className="text-[10px] text-[#94A3B8]">Project Proposal.pdf</p>
                </div>
              </div>

              {/* Floating user card */}
              <div className="absolute -left-8 bottom-20 bg-white rounded-xl shadow-xl border border-[#E2E8F0] px-4 py-3">
                <p className="text-[10px] text-[#94A3B8] mb-2">Active Members</p>
                <div className="flex -space-x-2">
                  {['#2563EB', '#7C3AED', '#0891B2', '#16A34A'].map((c, i) => (
                    <div key={i} style={{ background: c }} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-700">
                      {['AL', 'RS', 'PN', 'AD'][i]}
                    </div>
                  ))}
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-[#F1F5F9] flex items-center justify-center text-[9px] text-[#64748B] font-600">+4</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-[#EFF6FF] text-[#2563EB] text-xs font-600 rounded-full mb-4 border border-[#BFDBFE]">Features</span>
            <h2 className="font-display text-3xl md:text-4xl font-700 text-[#0F172A] mb-4">
              Everything you need to manage documents
            </h2>
            <p className="text-[#64748B] text-lg max-w-xl mx-auto leading-relaxed">
              Powerful tools designed to streamline your document workflows from upload to approval.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative p-6 rounded-2xl border border-[#E2E8F0] hover:border-[#2563EB]/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all bg-[#F8FAFC] hover:bg-white cursor-default"
              >
                <div className="absolute top-5 right-5 text-4xl font-display font-800 text-[#E2E8F0] group-hover:text-[#BFDBFE] transition-colors select-none">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] group-hover:bg-[#2563EB] flex items-center justify-center mb-5 transition-all duration-200">
                  <f.icon size={22} className="text-[#2563EB] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-display font-700 text-[#0F172A] mb-2 text-[15px]">{f.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section id="statistics" className="py-20 bg-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A]/30 to-transparent" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#2563EB]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#7C3AED]/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 bg-white/10 text-white/70 text-xs font-600 rounded-full mb-4">By the numbers</span>
            <h2 className="font-display text-3xl md:text-4xl font-700 text-white">
              Trusted by organizations worldwide
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(s => (
              <div key={s.label} className="text-center group">
                <div className="font-display text-4xl md:text-5xl font-800 text-white mb-2 group-hover:text-[#60A5FA] transition-colors">
                  {s.value}
                </div>
                <div className="text-[#64748B] text-sm font-medium">{s.label}</div>
                <div className="w-8 h-0.5 bg-[#2563EB]/50 mx-auto mt-3 group-hover:w-16 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-700 text-[#0F172A] mb-4">
            Ready to transform your document workflow?
          </h2>
          <p className="text-[#64748B] text-lg mb-8">
            Join 500+ users already managing their documents smarter with Digital Workspace System.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => onNavigate('register')} className="flex items-center gap-2 px-8 py-4 bg-[#2563EB] text-white font-600 rounded-xl hover:bg-[#1D4ED8] transition-all shadow-lg shadow-blue-500/30">
              Get Started Free <ArrowRight size={16} />
            </button>
            <button onClick={() => onNavigate('login')} className="px-8 py-4 bg-white text-[#1E293B] font-600 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] hover:text-[#2563EB] transition-all shadow-sm">
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer id="footer" className="bg-[#0F172A] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
                <FileText size={15} className="text-white" />
              </div>
              <div>
                <p className="font-display font-700 text-white text-sm">Digital Workspace System</p>
                <p className="text-[#475569] text-xs">© 2026 Enterprise Document Platform. All rights reserved.</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-[#475569]">
              {['Privacy Policy', 'Terms & Conditions', 'Support', 'Contact Us'].map(l => (
                <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
