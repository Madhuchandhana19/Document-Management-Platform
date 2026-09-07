import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { FileText, Clock, Share2, HardDrive, Upload, CheckCircle2, Edit3, ArrowUpRight, TrendingUp, Loader2, AlertCircle, Shield, RefreshCw } from 'lucide-react'
import type { Page } from '../App'

interface Props { onNavigate: (p: Page) => void }

interface DocumentDto {
  id: string
  title: string
  fileName: string
  fileType: string
  fileSize: number
  fileSizeKb: number
  isArchived: boolean
  currentVersion: number
  ownerUsername: string
  status: string
  createdAt: string
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

const statusStyles: Record<string, string> = {
  Approved: 'bg-[#F0FDF4] text-[#16A34A]',
  APPROVED: 'bg-[#F0FDF4] text-[#16A34A]',
  Pending: 'bg-[#FFFBEB] text-[#D97706]',
  PENDING: 'bg-[#FFFBEB] text-[#D97706]',
  UNDER_REVIEW: 'bg-[#FFFBEB] text-[#D97706]',
  Draft: 'bg-[#F1F5F9] text-[#64748B]',
  DRAFT: 'bg-[#F1F5F9] text-[#64748B]',
}

const extColor: Record<string, string> = {
  pdf: '#EF4444', docx: '#2563EB', xlsx: '#16A34A', fig: '#7C3AED', zip: '#EAB308',
}

export default function Dashboard({ onNavigate }: Props) {
  const [documents, setDocuments] = useState<DocumentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const savedUser = localStorage.getItem('user')
  const user = savedUser ? JSON.parse(savedUser) : null
  const displayName = user?.username || user?.email || 'User'

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get<any>('/api/documents/search')
      if (response.success && response.data) {
        const content = response.data.content || response.data
        const mapped = Array.isArray(content) ? content.map((d: any) => ({
          ...d,
          id: String(d.id),
          fileName: d.title,
          fileSize: (d.fileSizeKb || 0) * 1024,
          isArchived: d.status === 'ARCHIVED',
          status: d.status || 'DRAFT'
        })) : []
        setDocuments(mapped)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter documents for current user (Admins see all)
  const isAdmin = user?.roles?.some((r: string) => r.includes('ADMIN'))
  const userDocs = isAdmin
    ? documents
    : documents.filter(d =>
        d.ownerUsername?.toLowerCase() === user?.username?.toLowerCase() ||
        d.ownerUsername?.toLowerCase() === user?.email?.toLowerCase()
      )

  // Calculate real metrics for the logged-in user
  const totalDocsCount = userDocs.length
  const pendingApprovalsCount = userDocs.filter(d => d.status === 'UNDER_REVIEW' || d.status === 'PENDING' || d.status === 'DRAFT').length
  const totalApprovedCount = userDocs.filter(d => d.status === 'APPROVED').length
  const totalStorageBytes = userDocs.reduce((sum, d) => sum + (d.fileSize || 0), 0)
  
  // Storage limit 10 GB
  const storageLimitBytes = 10 * 1024 * 1024 * 1024
  const storagePercentage = Math.min(100, Math.max(0, Math.round((totalStorageBytes / storageLimitBytes) * 100)))

  const cards = [
    {
      icon: FileText, label: 'Total Documents', value: totalDocsCount.toLocaleString(),
      sub: 'Active repository files', color: '#2563EB', bg: '#EFF6FF',
    },
    {
      icon: Clock, label: 'Pending Review', value: pendingApprovalsCount.toLocaleString(),
      sub: 'Drafts & workflows', color: '#D97706', bg: '#FFFBEB',
    },
    {
      icon: CheckCircle2, label: 'Approved Documents', value: totalApprovedCount.toLocaleString(),
      sub: 'Production verified', color: '#16A34A', bg: '#F0FDF4',
    },
    {
      icon: HardDrive, label: 'Cloud Storage', value: formatBytes(totalStorageBytes),
      sub: 'Capacity: 10 GB quota', color: '#7C3AED', bg: '#F5F3FF',
    },
  ]

  const recentDocs = [...userDocs].slice(0, 6)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#60A5FA]">{greeting}</p>
          <h1 className="font-display text-2xl font-700">{displayName}</h1>
          <p className="text-xs text-[#94A3B8] max-w-lg">Welcome to the enterprise Document Management Platform. All document systems and security controls are active.</p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition-all shadow-md"
          >
            <Upload size={14} /> Upload Document
          </button>
          <button
            onClick={() => onNavigate('approvals')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/10"
          >
            <Clock size={14} /> Approvals
          </button>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition-shadow">
            <div style={{ background: c.bg }} className="w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <c.icon size={20} style={{ color: c.color }} />
            </div>
            <div className="font-display text-2xl font-700 text-[#0F172A]">{c.value}</div>
            <div className="text-xs font-semibold text-[#64748B] mt-0.5">{c.label}</div>
            <div className="text-[11px] text-[#94A3B8] mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Main split */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Documents Table (2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-700 text-[#0F172A] text-base">Recent Documents</h2>
              <p className="text-xs text-[#64748B]">Quick access to latest workspace additions</p>
            </div>
            <button
              onClick={() => onNavigate('documents')}
              className="text-xs font-bold text-[#2563EB] hover:underline"
            >
              View all ({userDocs.length})
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-[#2563EB]" size={28} />
            </div>
          ) : recentDocs.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-8 text-center">No documents found. Upload your first document to get started.</p>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {recentDocs.map(d => {
                const ext = d.fileName.split('.').pop()?.toLowerCase() || 'pdf'
                const color = extColor[ext] || '#64748B'
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      localStorage.setItem('selectedDocumentId', d.id)
                      onNavigate('document-details')
                    }}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] px-2 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div style={{ background: color + '15' }} className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText size={16} style={{ color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1E293B] truncate">{d.title}</p>
                        <p className="text-[11px] text-[#94A3B8]">v{d.currentVersion} • {d.ownerUsername}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyles[d.status] || 'bg-slate-100 text-slate-700'}`}>
                        {d.status}
                      </span>
                      <span className="text-[11px] text-[#94A3B8] font-mono">{formatBytes(d.fileSize)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Launch & Storage */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
            <h2 className="font-display font-700 text-[#0F172A] text-base">Quick Shortcuts</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Upload Doc', page: 'upload' as Page, icon: Upload, color: '#2563EB', bg: '#EFF6FF' },
                { label: 'Workflows', page: 'approvals' as Page, icon: Clock, color: '#D97706', bg: '#FFFBEB' },
                { label: 'Workspace', page: 'workspace' as Page, icon: Share2, color: '#7C3AED', bg: '#F5F3FF' },
                { label: 'Analytics', page: 'reports' as Page, icon: TrendingUp, color: '#16A34A', bg: '#F0FDF4' },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => onNavigate(s.page)}
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#F8FAFC] transition-all text-center gap-2"
                >
                  <div style={{ background: s.bg }} className="w-8 h-8 rounded-lg flex items-center justify-center">
                    <s.icon size={16} style={{ color: s.color }} />
                  </div>
                  <span className="text-xs font-bold text-[#1E293B]">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#0F172A]">Storage Allocated</span>
              <span className="text-[#2563EB] font-bold">{storagePercentage}%</span>
            </div>
            <div className="w-full bg-[#E2E8F0] rounded-full h-2">
              <div className="h-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED]" style={{ width: `${storagePercentage}%` }} />
            </div>
            <p className="text-[11px] text-[#94A3B8]">Using {formatBytes(totalStorageBytes)} of 10.0 GB enterprise cloud quota.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
