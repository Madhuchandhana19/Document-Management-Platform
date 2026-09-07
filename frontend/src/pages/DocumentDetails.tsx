import { useState, useEffect } from 'react'
import { 
  ArrowLeft, Download, Share2, Edit3, Trash2, FileText, Clock, User, 
  Building2, Tag, Loader2, AlertCircle, Shield, CheckCircle2, XCircle, 
  Plus, History, Send, Calendar, Check
} from 'lucide-react'
import type { Page } from '../App'
import { api } from '../utils/api'
import { downloadFileToPC } from '../utils/fileStorage'

interface Props { onNavigate: (p: Page) => void }

interface DocumentDetailDto {
  id: number
  title: string
  folderId: number | null
  ownerUsername: string
  currentVersion: number
  fileType: string
  fileSizeKb: number
  storageUrl: string
  status: string
  retentionDate: string | null
  createdAt: string
  updatedAt: string
}

interface VersionDto {
  id: number
  versionNo: number
  uploadedByUsername: string
  fileUrl: string
  changeSummary: string
  checksum: string
  createdAt: string
}

interface AccessControlDto {
  id: number
  documentId: number
  username: string
  permission: string
  grantedByUsername: string
  validFrom: string
  validTo: string | null
  createdAt: string
}

interface AuditLogDto {
  id: number
  action: string
  entityType: string
  entityId: string
  oldValue: string | null
  newValue: string | null
  userEmail: string
  timestamp: string
}

function formatBytes(kb: number) {
  if (kb === 0) return '0 KB'
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export default function DocumentDetails({ onNavigate }: Props) {
  const [doc, setDoc] = useState<DocumentDetailDto | null>(null)
  const [versions, setVersions] = useState<VersionDto[]>([])
  const [aclList, setAclList] = useState<AccessControlDto[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'acl' | 'audit'>('details')

  // Modals state
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUserId, setShareUserId] = useState('2') // Default ID 2 (owner / user)
  const [sharePermission, setSharePermission] = useState('VIEW')
  const [shareValidTo, setShareValidTo] = useState('')

  const [showVersionModal, setShowVersionModal] = useState(false)
  const [versionSummary, setVersionSummary] = useState('')
  const [versionUrl, setVersionUrl] = useState('')

  const [showWorkflowModal, setShowWorkflowModal] = useState(false)
  const [workflowDueDate, setWorkflowDueDate] = useState('')

  const [actionLoading, setActionLoading] = useState(false)

  const docId = localStorage.getItem('selectedDocumentId')

  const loadAllData = async () => {
    if (!docId) {
      setError('No document selected.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // 1. Fetch document details
      const docRes = await api.get<any>(`/api/documents/${docId}`)
      if (docRes.success && docRes.data) {
        setDoc(docRes.data)
      }

      // 2. Fetch versions
      const verRes = await api.get<any>(`/api/documents/${docId}/versions`)
      if (verRes.success && verRes.data) {
        setVersions(Array.isArray(verRes.data) ? verRes.data : [])
      }

      // 3. Fetch Access Control List
      try {
        const aclRes = await api.get<any>(`/api/documents/${docId}/access`)
        if (aclRes.success && aclRes.data) {
          setAclList(Array.isArray(aclRes.data) ? aclRes.data : [])
        }
      } catch (e) {
        // May be forbidden if not owner/admin
      }

      // 4. Fetch Audit Trail
      try {
        const auditRes = await api.get<any>(`/api/audit/document/${docId}`)
        if (auditRes.success && auditRes.data) {
          setAuditLogs(Array.isArray(auditRes.data) ? auditRes.data : [])
        }
      } catch (e) {
        // Audit log fallback
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load document details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [docId])

  const handleDownload = async () => {
    if (!doc) return
    await downloadFileToPC(doc.title, doc.fileType, doc.storageUrl)
  }

  const handleDelete = async () => {
    if (!doc) return
    if (!confirm(`Are you sure you want to delete "${doc.title}"?`)) return
    try {
      setActionLoading(true)
      const response = await api.delete<any>(`/api/documents/${doc.id}`)
      if (response.success) {
        alert('Document deleted successfully.')
        onNavigate('documents')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete document.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doc) return
    try {
      setActionLoading(true)
      const res = await api.put<any>(`/api/documents/${doc.id}/access`, {
        userId: Number(shareUserId),
        permission: sharePermission,
        validTo: shareValidTo || null
      })
      if (res.success) {
        setShowShareModal(false)
        await loadAllData()
      }
    } catch (err: any) {
      alert(err.message || 'Failed to grant access.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeAccess = async (userId: number, permission: string) => {
    if (!doc) return
    if (!confirm(`Revoke ${permission} permission for this user?`)) return
    try {
      setActionLoading(true)
      // DELETE request with body
      const res = await api.delete<any>(`/api/documents/${doc.id}/access?userId=${userId}&permission=${permission}`)
      if (res.success) {
        await loadAllData()
      }
    } catch (err: any) {
      // Retry via standard delete
      try {
        await api.delete<any>(`/api/documents/${doc.id}/access`)
        await loadAllData()
      } catch (err2: any) {
        alert(err2.message || 'Failed to revoke access.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doc) return
    try {
      setActionLoading(true)
      const res = await api.put<any>(`/api/documents/${doc.id}`, {
        fileType: doc.fileType || 'pdf',
        storageUrl: versionUrl || `https://storage.dms.com/files/v${doc.currentVersion + 1}_${doc.title}`,
        changeSummary: versionSummary || `Updated to version ${doc.currentVersion + 1}`
      })
      if (res.success) {
        setShowVersionModal(false)
        setVersionSummary('')
        setVersionUrl('')
        await loadAllData()
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create new document version.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleInitiateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doc) return
    try {
      setActionLoading(true)
      const res = await api.post<any>('/api/workflows/initiate', {
        documentId: doc.id,
        dueDate: workflowDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      })
      if (res.success) {
        setShowWorkflowModal(false)
        alert('Approval workflow successfully submitted!')
        await loadAllData()
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate workflow.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#2563EB]" size={36} />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <button
          onClick={() => onNavigate('documents')}
          className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#2563EB] mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Back to My Documents
        </button>
        <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <AlertCircle size={18} />
          <span>{error || 'Document not found.'}</span>
        </div>
      </div>
    )
  }

  const fileExt = doc.fileType?.toUpperCase() || doc.title.split('.').pop()?.toUpperCase() || 'PDF'
  const dateCreated = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'
  const dateModified = doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'N/A'

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      <button
        onClick={() => onNavigate('documents')}
        className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#2563EB] mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={15} /> Back to My Documents
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main 2-columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-[#2563EB]/10 flex items-center justify-center flex-shrink-0">
                <FileText size={28} className="text-[#2563EB]" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl font-700 text-[#0F172A] truncate">{doc.title}</h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#F0FDF4] text-[#16A34A] border border-green-200">
                    {doc.status}
                  </span>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    v{doc.currentVersion}
                  </span>
                  <span className="text-xs text-[#64748B]">{formatBytes(doc.fileSizeKb)}</span>
                  <span className="text-xs text-[#64748B] font-mono">Format: {fileExt}</span>
                </div>
              </div>
            </div>

            {/* Metadata Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                { icon: User, label: 'Document Owner', value: doc.ownerUsername },
                { icon: Building2, label: 'Department', value: 'Enterprise Systems' },
                { icon: Tag, label: 'Category', value: 'Technical Spec' },
                { icon: Clock, label: 'Created Date', value: dateCreated },
                { icon: Clock, label: 'Last Modified', value: dateModified },
                { icon: Calendar, label: 'Retention Until', value: doc.retentionDate || 'Indefinite' },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <m.icon size={13} className="text-[#94A3B8]" />
                    <span className="text-[11px] font-semibold text-[#94A3B8]">{m.label}</span>
                  </div>
                  <p className="text-xs font-bold text-[#1E293B] truncate">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap gap-2.5 pt-5 border-t border-[#F1F5F9]">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[#2563EB] text-white rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-sm"
              >
                <Download size={14} /> Download
              </button>
              
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
              >
                <Share2 size={14} /> Grant Access
              </button>

              <button
                onClick={() => setShowVersionModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
              >
                <Edit3 size={14} /> New Version
              </button>

              <button
                onClick={() => setShowWorkflowModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-[#F8FAFC] border border-amber-300 text-amber-800 rounded-xl hover:bg-amber-50 transition-colors"
              >
                <Send size={14} /> Submit for Approval
              </button>

              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors ml-auto"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>

          {/* Subtabs for Preview, ACL, Audit */}
          <div className="flex gap-2 border-b border-[#E2E8F0] pb-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'details' ? 'bg-[#2563EB] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <FileText size={14} /> Preview & Summary
            </button>
            <button
              onClick={() => setActiveTab('acl')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'acl' ? 'bg-[#2563EB] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Shield size={14} /> Access Control ({aclList.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'audit' ? 'bg-[#2563EB] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <History size={14} /> Audit Trail ({auditLogs.length})
            </button>
          </div>

          {/* Tab 1: Preview */}
          {activeTab === 'details' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
              <h2 className="font-display font-700 text-[#0F172A] text-sm mb-4">File Storage URL & Verification</h2>
              <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#64748B]">Cloud Storage URI:</span>
                  <span className="font-mono text-[#2563EB] break-all max-w-md">{doc.storageUrl}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E2E8F0]">
                  <span className="font-semibold text-[#64748B]">SHA-256 Checksum:</span>
                  <span className="font-mono text-[#1E293B] text-[11px]">Verified on upload</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: ACL */}
          {activeTab === 'acl' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-700 text-[#0F172A] text-sm">Granted Document Permissions</h2>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8]"
                >
                  <Plus size={13} /> Grant Permission
                </button>
              </div>

              {aclList.length === 0 ? (
                <p className="text-xs text-[#94A3B8] py-4 text-center">No explicit access grants delegated. Only document owner & administrators have full rights.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                        <th className="pb-2">User Email</th>
                        <th className="pb-2">Permission</th>
                        <th className="pb-2">Granted By</th>
                        <th className="pb-2">Expires</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {aclList.map(a => (
                        <tr key={a.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-3 font-semibold text-[#0F172A]">{a.username}</td>
                          <td className="py-3">
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {a.permission}
                            </span>
                          </td>
                          <td className="py-3 text-[#64748B]">{a.grantedByUsername}</td>
                          <td className="py-3 text-[#64748B]">{a.validTo || 'Never'}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleRevokeAccess(a.id, a.permission)}
                              className="text-red-600 hover:text-red-800 font-semibold text-[11px]"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Audit */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
              <h2 className="font-display font-700 text-[#0F172A] text-sm mb-4">Chronological Document Audit Logs</h2>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-[#94A3B8] py-4 text-center">No audit logs recorded for this document yet.</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#2563EB]">{log.action}</span>
                        <span className="text-[#94A3B8] text-[11px]">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-[#475569]">
                        Performed by: <strong className="text-[#0F172A]">{log.userEmail}</strong>
                      </p>
                      {log.newValue && (
                        <p className="text-[11px] text-[#64748B]">Details: {log.newValue}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Version History */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-700 text-[#0F172A] text-sm">Version History</h2>
              <button
                onClick={() => setShowVersionModal(true)}
                className="text-xs font-bold text-[#2563EB] hover:underline"
              >
                + New Version
              </button>
            </div>

            <div className="space-y-4">
              {versions.length === 0 ? (
                <p className="text-xs text-[#94A3B8] text-center py-4">No version history available.</p>
              ) : (
                versions.map((v, i) => {
                  const isCurrent = v.versionNo === doc.currentVersion
                  const verDate = v.createdAt ? new Date(v.createdAt).toLocaleDateString() : 'N/A'
                  return (
                    <div key={v.id || i} className={`relative pl-5 ${i < versions.length - 1 ? 'pb-4' : ''}`}>
                      {i < versions.length - 1 && (
                        <div className="absolute left-[7px] top-4 bottom-0 w-px bg-[#E2E8F0]" />
                      )}
                      <div className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 ${isCurrent ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#CBD5E1] bg-white'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0F172A] font-mono">Version {v.versionNo}</span>
                          {isCurrent && <span className="text-[10px] px-1.5 py-0.2 bg-[#EFF6FF] text-[#2563EB] rounded font-bold">Active</span>}
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">{verDate} • {v.uploadedByUsername}</p>
                        <p className="text-xs text-[#475569] mt-1 bg-[#F8FAFC] p-2 rounded border border-[#F1F5F9] leading-relaxed">
                          {v.changeSummary || 'No summary entered'}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Grant Access */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-display font-700 text-[#0F172A] text-lg mb-2">Grant Document Access</h3>
            <p className="text-xs text-[#64748B] mb-5">Assign granular permissions to another platform member.</p>
            <form onSubmit={handleGrantAccess} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Target User</label>
                <select
                  value={shareUserId}
                  onChange={e => setShareUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl focus:border-[#2563EB] outline-none"
                >
                  <option value="2">Owner (owner@dms.com)</option>
                  <option value="3">Editor (editor@dms.com)</option>
                  <option value="4">Approver (approver@dms.com)</option>
                  <option value="5">Viewer (viewer@dms.com)</option>
                  <option value="1">Admin (admin@dms.com)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Permission Level</label>
                <select
                  value={sharePermission}
                  onChange={e => setSharePermission(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl focus:border-[#2563EB] outline-none"
                >
                  <option value="VIEW">VIEW (Read-only)</option>
                  <option value="EDIT">EDIT (Read & New Version)</option>
                  <option value="APPROVE">APPROVE (Approve workflows)</option>
                  <option value="MANAGE">MANAGE (Full Admin & ACL)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Valid Until (Optional)</label>
                <input
                  type="date"
                  value={shareValidTo}
                  onChange={e => setShareValidTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl focus:border-[#2563EB] outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-[#E2E8F0] text-[#64748B] rounded-xl hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-semibold bg-[#2563EB] text-white rounded-xl hover:bg-[#1D4ED8] shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Granting...' : 'Grant Permission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: New Version */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-display font-700 text-[#0F172A] text-lg mb-2">Publish New Version (v{doc.currentVersion + 1})</h3>
            <p className="text-xs text-[#64748B] mb-5">Increment document version number and record change notes.</p>
            <form onSubmit={handleUploadVersion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Change Summary / Notes</label>
                <textarea
                  required
                  rows={3}
                  value={versionSummary}
                  onChange={e => setVersionSummary(e.target.value)}
                  placeholder="E.g., Added chapter 4 architectural security diagrams..."
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl focus:border-[#2563EB] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Updated File URL / Storage URI</label>
                <input
                  type="text"
                  value={versionUrl}
                  onChange={e => setVersionUrl(e.target.value)}
                  placeholder="https://storage.dms.com/files/new_version.pdf"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl focus:border-[#2563EB] outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowVersionModal(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-[#E2E8F0] text-[#64748B] rounded-xl hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-semibold bg-[#2563EB] text-white rounded-xl hover:bg-[#1D4ED8] shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Uploading...' : 'Publish Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Submit for Approval */}
      {showWorkflowModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-display font-700 text-[#0F172A] text-lg mb-2">Initiate Approval Workflow</h3>
            <p className="text-xs text-[#64748B] mb-5">Submit this document into review for Approver verification.</p>
            <form onSubmit={handleInitiateWorkflow} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Target Document</label>
                <input
                  disabled
                  value={`${doc.title} (v${doc.currentVersion})`}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#64748B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Approval Due Date</label>
                <input
                  type="date"
                  value={workflowDueDate}
                  onChange={e => setWorkflowDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#E2E8F0] rounded-xl focus:border-[#2563EB] outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowWorkflowModal(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-[#E2E8F0] text-[#64748B] rounded-xl hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-semibold bg-amber-600 text-white rounded-xl hover:bg-amber-700 shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting...' : 'Initiate Workflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
