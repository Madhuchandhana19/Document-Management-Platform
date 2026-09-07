import { useState, useEffect } from 'react'
import { FileText, Users, Clock, Share2, FolderOpen, Loader2, AlertCircle, Eye, Shield } from 'lucide-react'
import { api } from '../utils/api'

interface DocumentDto {
  id: string
  title: string
  ownerUsername: string
  fileType: string
  fileSizeKb: number
  status: string
  createdAt: string
  storageUrl: string
}

interface AuditLogDto {
  id: number
  action: string
  entityType: string
  entityId: string
  userEmail: string
  timestamp: string
  newValue: string | null
}

const teamMembers = [
  { name: 'Admin Administrator', email: 'admin@dms.com', role: 'ADMIN', initials: 'AD', color: '#0F172A' },
  { name: 'Document Owner', email: 'owner@dms.com', role: 'DOCUMENT_OWNER', initials: 'DO', color: '#2563EB' },
  { name: 'Senior Editor', email: 'editor@dms.com', role: 'EDITOR', initials: 'ED', color: '#7C3AED' },
  { name: 'Executive Approver', email: 'approver@dms.com', role: 'APPROVER', initials: 'AP', color: '#D97706' },
  { name: 'General Viewer', email: 'viewer@dms.com', role: 'VIEWER', initials: 'VW', color: '#0891B2' },
]

export default function SharedWorkspace() {
  const [tab, setTab] = useState<'Team Files' | 'Audit Feed' | 'Members'>('Team Files')
  const [documents, setDocuments] = useState<DocumentDto[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadWorkspaceData() {
      try {
        setLoading(true)
        setError(null)
        
        // 1. Load documents (only APPROVED / ACTIVE shared documents for this user, or all for Admin)
        const savedUser = localStorage.getItem('user')
        const user = savedUser ? JSON.parse(savedUser) : null
        const isAdmin = user?.roles?.some((r: string) => r.includes('ADMIN'))

        const docRes = await api.get<any>('/api/documents/search')
        if (docRes.success && docRes.data) {
          const content = docRes.data.content || docRes.data
          const sharedDocs = (Array.isArray(content) ? content : []).filter((d: any) => {
            if (d.status !== 'APPROVED' && d.status !== 'ACTIVE') return false
            if (isAdmin) return true
            return d.ownerUsername?.toLowerCase() === user?.username?.toLowerCase() ||
                   d.ownerUsername?.toLowerCase() === user?.email?.toLowerCase()
          })
          setDocuments(sharedDocs)
        }

        // 2. Load audit logs
        try {
          const auditRes = await api.get<any>('/api/admin/audit-logs')
          if (auditRes.success && auditRes.data) {
            setAuditLogs(Array.isArray(auditRes.data) ? auditRes.data : [])
          }
        } catch (e) {
          // May be restricted for non-admin
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load workspace data.')
      } finally {
        setLoading(false)
      }
    }
    loadWorkspaceData()
  }, [])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-700 text-[#0F172A]">Enterprise Workspace</h1>
          <p className="text-[#64748B] text-sm mt-1">Shared corporate document hub, permissions, and collaboration feed</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-[#F1F5F9] p-1.5 rounded-xl w-fit">
        {(['Team Files', 'Audit Feed', 'Members'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === t ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white rounded-2xl border border-[#E2E8F0]">
          <Loader2 className="animate-spin text-[#2563EB]" size={32} />
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {tab === 'Team Files' && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]">
                      <th className="px-5 py-3.5 font-semibold">Document</th>
                      <th className="px-5 py-3.5 font-semibold">Owner</th>
                      <th className="px-5 py-3.5 font-semibold">Size</th>
                      <th className="px-5 py-3.5 font-semibold">Status</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {documents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#94A3B8]">No files in workspace</td>
                      </tr>
                    ) : (
                      documents.map(d => (
                        <tr key={d.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-5 py-4 font-semibold text-[#0F172A] flex items-center gap-2.5">
                            <FileText size={15} className="text-[#2563EB]" />
                            <span>{d.title}</span>
                          </td>
                          <td className="px-5 py-4 text-[#64748B]">{d.ownerUsername}</td>
                          <td className="px-5 py-4 font-mono text-[#94A3B8]">{d.fileSizeKb || 0} KB</td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                              {d.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <a
                              href={d.storageUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2563EB] font-semibold hover:underline"
                            >
                              Open
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'Audit Feed' && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
                <h3 className="font-display font-700 text-[#0F172A] text-sm mb-3">Live Enterprise Audit Feed</h3>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-[#94A3B8] text-center py-6">No audit activities recorded.</p>
                ) : (
                  auditLogs.slice(0, 15).map(l => (
                    <div key={l.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono font-bold text-[#2563EB]">{l.action}</span>
                          <span className="text-[11px] text-[#64748B]">by {l.userEmail || 'system'}</span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8]">{l.entityType} #{l.entityId} {l.newValue ? `• ${l.newValue}` : ''}</p>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] flex-shrink-0 font-mono">
                        {new Date(l.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'Members' && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
                <h3 className="font-display font-700 text-[#0F172A] text-sm mb-3">Directory Roles & Permissions</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {teamMembers.map(m => (
                    <div key={m.email} className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-3">
                      <div style={{ background: m.color }} className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {m.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#0F172A] truncate">{m.name}</p>
                        <p className="text-[11px] text-[#64748B] truncate">{m.email}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.2 rounded bg-slate-200 text-slate-700">
                          {m.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick info right col */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-3">
              <h3 className="font-display font-700 text-[#0F172A] text-xs uppercase tracking-wider">Access Policy</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Role-based access control (RBAC) and explicit document ACLs are enforced by the Spring Boot backend security filter.
              </p>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-medium">
                JWT Authenticated Session Active
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
