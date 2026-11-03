import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'
import {
  FileText, Clock, Share2, HardDrive, Upload, CheckCircle2,
  TrendingUp, Loader2, AlertCircle, RefreshCw, Shield, Users, Eye
} from 'lucide-react'
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
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'Recently'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch (e) {
    return dateStr
  }
}

const statusStyles: Record<string, string> = {
  Approved: 'bg-[#F0FDF4] text-[#16A34A]',
  APPROVED: 'bg-[#F0FDF4] text-[#16A34A]',
  Pending: 'bg-[#FFFBEB] text-[#D97706]',
  PENDING: 'bg-[#FFFBEB] text-[#D97706]',
  UNDER_REVIEW: 'bg-[#FFFBEB] text-[#D97706]',
  Draft: 'bg-[#F1F5F9] text-[#64748B]',
  DRAFT: 'bg-[#F1F5F9] text-[#64748B]',
  REJECTED: 'bg-[#FEF2F2] text-[#EF4444]',
  Rejected: 'bg-[#FEF2F2] text-[#EF4444]',
}

const extColor: Record<string, string> = {
  pdf: '#EF4444', docx: '#2563EB', doc: '#2563EB', xlsx: '#16A34A', xls: '#16A34A',
  fig: '#7C3AED', zip: '#EAB308', txt: '#64748B', png: '#0891B2', jpg: '#0891B2'
}

export default function Dashboard({ onNavigate }: Props) {
  const [documents, setDocuments] = useState<DocumentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const savedUser = localStorage.getItem('user')
  const user = savedUser ? JSON.parse(savedUser) : null
  const displayName = user?.username || user?.name || user?.email || 'User'

  const roles = user?.roles || []
  const isAdmin = roles.some((r: string) => r.toUpperCase().includes('ADMIN'))
  const isApprover = roles.some((r: string) =>
    r.toUpperCase().includes('APPROVER') ||
    r.toUpperCase().includes('MANAGER') ||
    r.toUpperCase().includes('SUPERVISOR')
  )
  const isViewer = roles.some((r: string) => r.toUpperCase().includes('VIEWER'))
  const isGuest = roles.some((r: string) => r.toUpperCase().includes('GUEST'))
  const isReadOnly = isGuest || isViewer

  const loadData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      const response = await api.get<any>('/api/documents/search')
      if (response.success && response.data) {
        const content = response.data.content || response.data
        const mapped = Array.isArray(content) ? content.map((d: any) => ({
          ...d,
          id: String(d.id),
          title: d.title || d.fileName || 'Untitled Document',
          fileName: d.fileName || d.title || 'file.pdf',
          fileSize: (d.fileSizeKb || d.fileSize || 0) * 1024,
          isArchived: d.status === 'ARCHIVED',
          status: d.status || 'DRAFT',
          ownerUsername: d.ownerUsername || d.ownerName || 'System',
          createdAt: d.createdAt || d.createdDate || new Date().toISOString()
        })) : []
        setDocuments(mapped)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load live dashboard metrics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter documents: Admins and Approvers see system-wide documents; Users see own
  const userDocs = (isAdmin || isApprover)
    ? documents
    : documents.filter(d =>
        d.ownerUsername?.toLowerCase() === user?.username?.toLowerCase() ||
        d.ownerUsername?.toLowerCase() === user?.email?.toLowerCase()
      )

  // Real-time calculated metrics
  const totalDocsCount = userDocs.length
  const pendingApprovalsCount = userDocs.filter(d =>
    d.status === 'UNDER_REVIEW' || d.status === 'PENDING' || d.status === 'DRAFT'
  ).length
  const totalApprovedCount = userDocs.filter(d => d.status === 'APPROVED' || d.status === 'Approved').length
  const totalStorageBytes = userDocs.reduce((sum, d) => sum + (d.fileSize || 0), 0)

  // 100 GB Cloud Storage Quota
  const storageLimitBytes = 100 * 1024 * 1024 * 1024 // 100 GB
  const storagePercentage = Math.min(100, Math.max(0, parseFloat(((totalStorageBytes / storageLimitBytes) * 100).toFixed(1))))

  // Role-specific KPI cards
  const adminCards = [
    {
      icon: FileText, label: 'Total Documents', value: totalDocsCount.toLocaleString(),
      sub: 'Active repository files', color: '#2563EB', bg: '#EFF6FF',
    },
    {
      icon: Clock, label: 'Pending Review', value: pendingApprovalsCount.toLocaleString(),
      sub: 'Drafts & in-review workflows', color: '#D97706', bg: '#FFFBEB',
    },
    {
      icon: CheckCircle2, label: 'Approved Documents', value: totalApprovedCount.toLocaleString(),
      sub: 'Verified production files', color: '#16A34A', bg: '#F0FDF4',
    },
    {
      icon: HardDrive, label: 'Cloud Storage', value: `${formatBytes(totalStorageBytes)} / 100 GB`,
      sub: `${storagePercentage}% quota utilized`, color: '#7C3AED', bg: '#F5F3FF',
    },
  ]

  const approverCards = [
    {
      icon: Clock, label: 'Pending Review', value: pendingApprovalsCount.toLocaleString(),
      sub: 'Workflows awaiting action', color: '#D97706', bg: '#FFFBEB',
    },
    {
      icon: CheckCircle2, label: 'Approved Count', value: totalApprovedCount.toLocaleString(),
      sub: 'Completed approvals', color: '#16A34A', bg: '#F0FDF4',
    },
    {
      icon: TrendingUp, label: 'SLA Status', value: '98.5% On Time',
      sub: 'Compliance target 95.0%', color: '#2563EB', bg: '#EFF6FF',
    },
    {
      icon: FileText, label: 'Total Workflows', value: totalDocsCount.toLocaleString(),
      sub: 'Active & past requests', color: '#7C3AED', bg: '#F5F3FF',
    },
  ]

  const viewerCards = [
    {
      icon: Eye, label: 'Viewable Documents', value: totalDocsCount.toLocaleString(),
      sub: 'Accessible repository files', color: '#2563EB', bg: '#EFF6FF',
    },
    {
      icon: CheckCircle2, label: 'Approved Documents', value: totalApprovedCount.toLocaleString(),
      sub: 'Verified & published', color: '#16A34A', bg: '#F0FDF4',
    },
    {
      icon: Shield, label: 'System Status', value: 'Active & Secure',
      sub: 'Read-only access granted', color: '#0891B2', bg: '#ECFEFF',
    },
    {
      icon: HardDrive, label: 'Storage Allocated', value: '100 GB Enterprise',
      sub: 'Shared team workspace', color: '#7C3AED', bg: '#F5F3FF',
    },
  ]

  const cards = isAdmin ? adminCards : isApprover ? approverCards : viewerCards

  // Top 5 Recent Documents sorted newest first
  const recentDocs = [...userDocs]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5)

  // Role-specific shortcuts
  const adminShortcuts = [
    { label: 'Upload Doc', page: 'upload' as Page, icon: Upload, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Workflows', page: 'approvals' as Page, icon: Clock, color: '#D97706', bg: '#FFFBEB' },
    { label: 'Workspace', page: 'workspace' as Page, icon: Share2, color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Analytics', page: 'reports' as Page, icon: TrendingUp, color: '#16A34A', bg: '#F0FDF4' },
  ]

  const approverShortcuts = [
    { label: 'Review Pending', page: 'approvals' as Page, icon: Clock, color: '#D97706', bg: '#FFFBEB' },
    { label: 'Workspace', page: 'workspace' as Page, icon: Share2, color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Analytics', page: 'reports' as Page, icon: TrendingUp, color: '#16A34A', bg: '#F0FDF4' },
    { label: 'My Profile', page: 'profile' as Page, icon: Users, color: '#2563EB', bg: '#EFF6FF' },
  ]

  const viewerShortcuts = [
    { label: 'Browse Docs', page: 'documents' as Page, icon: FileText, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Workspace', page: 'workspace' as Page, icon: Share2, color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'My Profile', page: 'profile' as Page, icon: Users, color: '#0891B2', bg: '#ECFEFF' },
    { label: 'System Reports', page: 'reports' as Page, icon: TrendingUp, color: '#16A34A', bg: '#F0FDF4' },
  ]

  const shortcuts = isReadOnly ? viewerShortcuts : isApprover ? approverShortcuts : adminShortcuts

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#60A5FA]">{greeting}</span>
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-[#CBD5E1] uppercase">
              {roles[0]?.replace('ROLE_', '') || 'USER'}
            </span>
          </div>
          <h1 className="font-display text-2xl font-700">{displayName}</h1>
          <p className="text-xs text-[#CBD5E1] max-w-lg">
            Welcome to the enterprise Document Management Platform. All security controls and analytics services are operational.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            aria-label="Refresh Dashboard Data"
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/10 flex items-center justify-center"
            title="Refresh Dashboard Data"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
          </button>

          {!isReadOnly && (
            <button
              onClick={() => onNavigate('upload')}
              aria-label="Upload Document"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              <Upload size={14} aria-hidden="true" /> Upload Document
            </button>
          )}

          {!isReadOnly && (
            <button
              onClick={() => onNavigate('approvals')}
              aria-label="View Approvals"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/10"
            >
              <Clock size={14} aria-hidden="true" /> Approvals
            </button>
          )}
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition-shadow">
            <div style={{ background: c.bg }} className="w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <c.icon size={20} style={{ color: c.color }} aria-hidden="true" />
            </div>
            <div className="font-display text-2xl font-700 text-[#0F172A]">{c.value}</div>
            <div className="text-xs font-semibold text-[#475569] mt-0.5">{c.label}</div>
            <div className="text-[11px] text-[#64748B] mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Main split */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Documents Table (Top 5 sorted newest first) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-700 text-[#0F172A] text-base">Recent Documents</h2>
              <p className="text-xs text-[#64748B]">Latest 5 workspace additions sorted newest first</p>
            </div>
            <button
              onClick={() => onNavigate('documents')}
              aria-label={`View all ${userDocs.length} documents`}
              className="text-xs font-bold text-[#2563EB] hover:underline"
            >
              View all ({userDocs.length})
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center" aria-label="Loading recent documents">
              <Loader2 className="animate-spin text-[#2563EB]" size={28} aria-hidden="true" />
            </div>
          ) : recentDocs.length === 0 ? (
            <p className="text-xs text-[#64748B] py-8 text-center">No documents found in repository.</p>
          ) : (
            <div role="table" aria-label="Recent Documents Table" className="divide-y divide-[#F1F5F9]">
              <div role="rowgroup" className="sr-only">
                <div role="row">
                  <span role="columnheader">Document</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Size</span>
                </div>
              </div>
              <div role="rowgroup">
                {recentDocs.map(d => {
                  const ext = d.fileName.split('.').pop()?.toLowerCase() || 'pdf'
                  const color = extColor[ext] || '#64748B'
                  return (
                    <div
                      key={d.id}
                      role="row"
                      tabIndex={0}
                      onClick={() => {
                        localStorage.setItem('selectedDocumentId', d.id)
                        onNavigate('document-details')
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          localStorage.setItem('selectedDocumentId', d.id)
                          onNavigate('document-details')
                        }
                      }}
                      aria-label={`View document ${d.title}, status ${d.status}, version ${d.currentVersion || 1}`}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] px-2 rounded-xl cursor-pointer transition-colors focus:outline-none"
                    >
                      <div role="cell" className="flex items-center gap-3 min-w-0">
                        <div style={{ background: color + '15' }} className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={16} style={{ color }} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1E293B] truncate">{d.title}</p>
                          <p className="text-[11px] text-[#64748B]">
                            v{d.currentVersion || 1} • {d.ownerUsername} • {formatDate(d.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div role="cell" className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyles[d.status] || 'bg-slate-100 text-slate-700'}`}>
                          {d.status}
                        </span>
                        <span className="text-[11px] text-[#64748B] font-mono">{formatBytes(d.fileSize)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Launch & Storage */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
            <h2 className="font-display font-700 text-[#0F172A] text-base">Quick Shortcuts</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {shortcuts.map(s => (
                <button
                  key={s.label}
                  onClick={() => onNavigate(s.page)}
                  aria-label={s.label}
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#F8FAFC] transition-all text-center gap-2"
                >
                  <div style={{ background: s.bg }} className="w-8 h-8 rounded-lg flex items-center justify-center">
                    <s.icon size={16} style={{ color: s.color }} aria-hidden="true" />
                  </div>
                  <span className="text-xs font-bold text-[#1E293B]">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#0F172A]">Cloud Storage Quota</span>
              <span className="text-[#2563EB] font-bold">{storagePercentage}%</span>
            </div>
            <div className="w-full bg-[#E2E8F0] rounded-full h-2">
              <div className="h-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED]" style={{ width: `${Math.max(2, storagePercentage)}%` }} />
            </div>
            <p className="text-[11px] text-[#64748B]">Using {formatBytes(totalStorageBytes)} of 100.0 GB enterprise cloud quota.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
