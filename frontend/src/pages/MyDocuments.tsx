import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Search, Filter, Upload, MoreHorizontal, Download, Share2, Eye, Edit3, Trash2,
  Loader2, AlertCircle, RefreshCw, X, Shield, Calendar, CheckCircle2, RotateCcw
} from 'lucide-react'
import type { Page } from '../App'
import { api } from '../utils/api'
import { downloadFileToPC } from '../utils/fileStorage'
import { toast } from '../components/Toast'

interface Props { onNavigate: (p: Page) => void }

interface DocumentDto {
  id: string
  title: string
  description?: string
  fileName: string
  fileType: string
  fileSize: number
  fileSizeKb: number
  storageUrl?: string
  isArchived: boolean
  currentVersion: number
  ownerUsername: string
  status: string
  category: string
  accessLevel: string
  retentionPeriodYears: number
  createdAt: string
  updatedAt: string
}

const statusStyles: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  Approved: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  PENDING: 'bg-amber-100 text-amber-800 border border-amber-200',
  Pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800 border border-amber-200',
  DRAFT: 'bg-slate-100 text-slate-700 border border-slate-200',
  Draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  REJECTED: 'bg-rose-100 text-rose-800 border border-rose-200',
  Rejected: 'bg-rose-100 text-rose-800 border border-rose-200',
  ARCHIVED: 'bg-purple-100 text-purple-800 border border-purple-200',
  Archived: 'bg-purple-100 text-purple-800 border border-purple-200',
  DELETED: 'bg-red-100 text-red-800 border border-red-200',
  Deleted: 'bg-red-100 text-red-800 border border-red-200',
}

const extColor: Record<string, string> = {
  pdf: '#EF4444', docx: '#2563EB', xlsx: '#16A34A', fig: '#7C3AED', zip: '#EAB308', txt: '#64748B', png: '#0891B2', jpg: '#0891B2'
}

const categories = ['ALL', 'Finance', 'Legal', 'HR', 'Engineering', 'Marketing', 'General']
const statuses = ['ALL', 'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED', 'DELETED']

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch (e) {
    return dateStr
  }
}

export default function MyDocuments({ onNavigate }: Props) {
  const [documents, setDocuments] = useState<DocumentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('modified')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [viewTab, setViewTab] = useState<'active' | 'recycle'>('active')

  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [shareNotice, setShareNotice] = useState<string | null>(null)

  // Edit Metadata Modal state
  const [editDoc, setEditDoc] = useState<DocumentDto | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('General')
  const [editAccessLevel, setEditAccessLevel] = useState('Internal')
  const [editRetentionYears, setEditRetentionYears] = useState(5)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState<DocumentDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true)
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
          fileSizeKb: d.fileSizeKb || 0,
          isArchived: d.status === 'ARCHIVED',
          status: d.status || 'DRAFT',
          category: d.category || 'General',
          accessLevel: d.accessLevel || 'Internal',
          retentionPeriodYears: d.retentionPeriodYears || 5,
          ownerUsername: d.ownerUsername || d.ownerName || 'User',
          createdAt: d.createdAt || d.createdDate || new Date().toISOString(),
          updatedAt: d.updatedAt || d.createdAt || new Date().toISOString(),
          storageUrl: d.storageUrl
        })) : []
        setDocuments(mapped)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const savedUser = localStorage.getItem('user')
  const user = savedUser ? JSON.parse(savedUser) : null
  const isAdmin = user?.roles?.some((r: string) => String(r).toUpperCase().includes('ADMIN'))

  const handleDownload = async (doc: DocumentDto) => {
    try {
      toast.info(`Downloading ${doc.title}...`, 'File Download')
      await downloadFileToPC(doc.title || doc.fileName || 'document', doc.fileType, doc.storageUrl)
    } catch (err) {
      console.error(err)
      toast.error('Could not download document.')
    }
  }

  const handleShare = (doc: DocumentDto) => {
    const link = `${window.location.origin}/#document-details?id=${doc.id}`
    navigator.clipboard?.writeText(link)
    toast.success(`Share link for "${doc.title}" copied to clipboard!`, 'Link Copied')
    setMenuOpen(null)
  }

  const openEditModal = (doc: DocumentDto) => {
    if (doc.status === 'ARCHIVED') {
      toast.error('Archived documents are read-only and cannot be modified or deleted.', 'Read-Only Document')
      setMenuOpen(null)
      return
    }
    setEditDoc(doc)
    setEditTitle(doc.title)
    setEditCategory(doc.category || 'General')
    setEditAccessLevel(doc.accessLevel || 'Internal')
    setEditRetentionYears(doc.retentionPeriodYears || 5)
    setEditError(null)
    setMenuOpen(null)
  }

  const handleSaveMetadata = async () => {
    if (!editDoc) return
    const newTitle = editTitle.trim()
    if (!newTitle) {
      setEditError('Title is required')
      toast.error('Title is required', 'Validation Error')
      return
    }
    if (newTitle.length > 200) {
      setEditError('Title must not exceed 200 characters')
      toast.error('Title must not exceed 200 characters', 'Validation Error')
      return
    }

    setSavingEdit(true)
    setEditError(null)
    try {
      const response = await api.put<any>(`/api/documents/${editDoc.id}/metadata`, {
        title: newTitle,
        category: editCategory,
        accessLevel: editAccessLevel,
        retentionPeriodYears: editRetentionYears
      })

      if (response.success) {
        setDocuments(prev => prev.map(d => d.id === editDoc.id ? {
          ...d,
          title: newTitle,
          category: editCategory,
          accessLevel: editAccessLevel,
          retentionPeriodYears: editRetentionYears,
          updatedAt: new Date().toISOString()
        } : d))
        setEditDoc(null)
        toast.success('Document metadata updated successfully!', 'Metadata Saved')
      } else {
        setEditError(response.message || 'Failed to update metadata.')
        toast.error(response.message || 'Failed to update metadata.')
      }
    } catch (err: any) {
      setEditError(err.message || 'Failed to save metadata.')
      toast.error(err.message || 'Failed to save metadata.')
    } finally {
      setSavingEdit(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const response = await api.delete<any>(`/api/documents/${deleteTarget.id}`)
      if (response.success) {
        setDocuments(prev => prev.map(d => d.id === deleteTarget.id ? { ...d, status: 'DELETED' } : d))
        setDeleteTarget(null)
        setMenuOpen(null)
        toast.success(`"${deleteTarget.title}" moved to Recycle Bin.`, 'Document Deleted')
      } else {
        toast.error(response.message || 'Failed to delete document.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete document.')
    } finally {
      setDeleting(false)
    }
  }

  // Filter & Search Logic
  const filtered = documents.filter(d => {
    // Owner check
    const isOwner = isAdmin ||
      d.ownerUsername?.toLowerCase() === user?.username?.toLowerCase() ||
      d.ownerUsername?.toLowerCase() === user?.email?.toLowerCase()
    if (!isOwner) return false

    // Recycle bin tab vs Active tab
    if (viewTab === 'active' && d.status === 'DELETED') return false
    if (viewTab === 'recycle' && d.status !== 'DELETED') return false

    // Status filter dropdown
    if (statusFilter !== 'ALL' && d.status.toUpperCase() !== statusFilter) return false

    // Category filter dropdown
    if (categoryFilter !== 'ALL' && d.category?.toUpperCase() !== categoryFilter.toUpperCase()) return false

    // Search term check
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const titleMatch = (d.title || '').toLowerCase().includes(q)
      const fileMatch = (d.fileName || '').toLowerCase().includes(q)
      const catMatch = (d.category || '').toLowerCase().includes(q)
      const statusMatch = (d.status || '').toLowerCase().includes(q)
      return titleMatch || fileMatch || catMatch || statusMatch
    }

    return true
  })

  // Multi-field Sorting Logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.title || a.fileName).localeCompare(b.title || b.fileName)
    }
    if (sortBy === 'size') {
      return (b.fileSize || 0) - (a.fileSize || 0)
    }
    if (sortBy === 'date') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    }
    // Default: 'modified' (Last Modified)
    return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
  })

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#2563EB]" size={36} />
      </div>
    )
  }

  return (
    <div className="p-8 animate-in fade-in duration-200 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-700 text-[#0F172A]">My Documents</h1>
          <p className="text-[#64748B] text-xs mt-1">
            {sorted.length} {viewTab === 'active' ? 'active' : 'deleted'} documents found in repository
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#F1F5F9] p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewTab('active')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewTab === 'active' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
            >
              Active Workspace
            </button>
            <button
              onClick={() => setViewTab('recycle')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${viewTab === 'recycle' ? 'bg-white text-red-600 shadow-sm' : 'text-[#64748B] hover:text-red-600'
                }`}
            >
              <Trash2 size={13} /> Recycle Bin
            </button>
          </div>

          {(() => {
            const savedUser = localStorage.getItem('user')
            const currentUser = savedUser ? JSON.parse(savedUser) : null
            const isViewerOrGuest = currentUser?.roles?.some((r: string) => r.includes('VIEWER') || r.includes('GUEST'))
            return (
              <button
                onClick={() => !isViewerOrGuest && onNavigate('upload')}
                disabled={isViewerOrGuest}
                title={isViewerOrGuest ? 'Upload disabled for Viewer / Guest role' : undefined}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors shadow-sm ${isViewerOrGuest
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 opacity-60'
                    : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                  }`}
              >
                <Upload size={14} /> Upload Document
              </button>
            )
          })()}
        </div>
      </div>

      {shareNotice && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{shareNotice}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs leading-relaxed">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar (Search, Filter, Sort) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <label htmlFor="search-documents" className="sr-only">Search documents by title or category</label>
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
          <input
            id="search-documents"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents by title, category..."
            aria-label="Search documents by title, category"
            className="w-full pl-9 pr-8 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search input" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B]">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#475569]">
            <Filter size={13} className="text-[#64748B]" aria-hidden="true" />
            <label htmlFor="status-filter-select" className="font-semibold">Status:</label>
            <select
              id="status-filter-select"
              aria-label="Filter documents by status"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            >
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#475569]">
            <label htmlFor="category-filter-select" className="font-semibold">Category:</label>
            <select
              id="category-filter-select"
              aria-label="Filter documents by category"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-[#475569]">
            <label htmlFor="sort-by-select" className="font-semibold">Sort:</label>
            <select
              id="sort-by-select"
              aria-label="Sort documents by field"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 font-medium"
            >
              <option value="modified">Last Modified</option>
              <option value="name">Name (A-Z)</option>
              <option value="size">Size (Largest)</option>
              <option value="date">Date Uploaded</option>
            </select>
          </div>

          <button
            onClick={loadDocuments}
            aria-label="Reload Documents List"
            className="p-2 text-[#475569] hover:text-[#2563EB] bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl hover:border-[#2563EB] transition-colors"
            title="Reload Documents List"
          >
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="text-xs font-bold text-[#64748B] px-5 py-3.5 uppercase tracking-wider">Document Name</th>
              <th className="text-xs font-bold text-[#64748B] px-5 py-3.5 uppercase tracking-wider">Category</th>
              <th className="text-xs font-bold text-[#64748B] px-5 py-3.5 uppercase tracking-wider">Owner</th>
              <th className="text-xs font-bold text-[#64748B] px-5 py-3.5 uppercase tracking-wider">Uploaded Date</th>
              <th className="text-xs font-bold text-[#64748B] px-5 py-3.5 uppercase tracking-wider">Size</th>
              <th className="text-xs font-bold text-[#64748B] px-5 py-3.5 uppercase tracking-wider">Status</th>
              <th className="text-xs font-bold text-[#64748B] px-5 py-3.5 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-[#94A3B8] text-xs">
                  <FileText size={32} className="mx-auto mb-2 text-[#CBD5E1]" />
                  No documents found matching the search or filter criteria.
                </td>
              </tr>
            ) : (
              sorted.map((doc) => {
                const ext = (doc.fileType || doc.fileName.split('.').pop() || 'pdf').toLowerCase()
                const color = extColor[ext] || '#64748B'
                return (
                  <tr
                    key={doc.id}
                    className="hover:bg-[#F8FAFC] transition-colors group"
                  >
                    {/* Document Name */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => {
                          localStorage.setItem('selectedDocumentId', doc.id)
                          onNavigate('document-details')
                        }}
                        className="flex items-center gap-3 text-left group/title max-w-sm"
                      >
                        <div style={{ background: color + '15' }} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FileText size={18} style={{ color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1E293B] group-hover/title:text-[#2563EB] transition-colors truncate">
                            {doc.title || doc.fileName}
                          </p>
                          <p className="text-[11px] text-[#94A3B8]">
                            v{doc.currentVersion || 1} • {doc.accessLevel || 'Internal'}
                          </p>
                        </div>
                      </button>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                        {doc.category || 'General'}
                      </span>
                    </td>

                    {/* Owner */}
                    <td className="px-5 py-3.5 text-xs text-[#64748B] font-medium">
                      {doc.ownerUsername}
                    </td>

                    {/* Uploaded Date */}
                    <td className="px-5 py-3.5 text-xs text-[#64748B]">
                      {formatDate(doc.createdAt)}
                    </td>

                    {/* Size */}
                    <td className="px-5 py-3.5 text-xs font-mono text-[#64748B]">
                      {formatBytes(doc.fileSize)}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${statusStyles[doc.status] || 'bg-slate-100 text-slate-700'}`}>
                        {doc.status}
                      </span>
                    </td>

                    {/* Actions Menu */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setMenuOpen(menuOpen === doc.id ? null : doc.id)}
                          className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B] transition-colors"
                          title="Actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {menuOpen === doc.id && (
                          <div className="absolute right-0 top-8 z-30 bg-white border border-[#CBD5E1] rounded-xl shadow-xl py-1.5 w-44 animate-in fade-in duration-150">
                            <button
                              onClick={() => {
                                localStorage.setItem('selectedDocumentId', doc.id)
                                onNavigate('document-details')
                                setMenuOpen(null)
                              }}
                              className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC]"
                            >
                              <Eye size={14} className="text-[#2563EB]" /> View Details
                            </button>

                            <button
                              onClick={() => {
                                handleDownload(doc)
                                setMenuOpen(null)
                              }}
                              className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC]"
                            >
                              <Download size={14} className="text-[#16A34A]" /> Download
                            </button>

                            <button
                              onClick={() => openEditModal(doc)}
                              className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC]"
                            >
                              <Edit3 size={14} className="text-[#D97706]" /> Edit Metadata
                            </button>

                            <button
                              onClick={() => handleShare(doc)}
                              className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC]"
                            >
                              <Share2 size={14} className="text-[#7C3AED]" /> Share Link
                            </button>

                            {doc.status !== 'DELETED' && (
                              <button
                                onClick={() => {
                                  if (doc.status === 'ARCHIVED') {
                                    toast.warning('Archived documents are read-only and cannot be modified or deleted.', 'Action Restricted')
                                    setMenuOpen(null)
                                    return
                                  }
                                  setDeleteTarget(doc)
                                  setMenuOpen(null)
                                }}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border-t border-[#F1F5F9]"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Metadata Modal (PROMPT 4.8) */}
      {editDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-display text-lg font-700 text-[#0F172A]">Edit Document Metadata</h3>
                <p className="text-xs text-[#64748B]">Version number will remain unchanged (v{editDoc.currentVersion})</p>
              </div>
              <button onClick={() => setEditDoc(null)} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A]">
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1 uppercase tracking-wider">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-1 uppercase tracking-wider">Category</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-white"
                  >
                    {categories.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-1 uppercase tracking-wider">Access Level</label>
                  <select
                    value={editAccessLevel}
                    onChange={e => setEditAccessLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-white"
                  >
                    <option value="Private">Private</option>
                    <option value="Internal">Internal</option>
                    <option value="Public">Public</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-1 uppercase tracking-wider">Retention (Yrs)</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editRetentionYears}
                    onChange={e => setEditRetentionYears(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setEditDoc(null)}
                disabled={savingEdit}
                className="px-4 py-2 text-xs font-bold text-[#64748B] bg-white border border-[#CBD5E1] rounded-xl hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMetadata}
                disabled={savingEdit}
                className="px-5 py-2 text-xs font-bold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] shadow-sm flex items-center gap-1.5"
              >
                {savingEdit && <Loader2 size={14} className="animate-spin" />}
                {savingEdit ? 'Saving...' : 'Save Metadata'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (PROMPT 4.9) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-red-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-display text-base font-700 text-[#0F172A]">Delete Document</h3>
              <p className="text-xs text-[#64748B] mt-1">
                Are you sure? This action cannot be undone.
              </p>
              <p className="text-xs font-bold text-[#1E293B] mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200 truncate">
                "{deleteTarget.title}"
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2 text-xs font-bold text-[#64748B] bg-white border border-[#CBD5E1] rounded-xl hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-md flex items-center justify-center gap-1.5"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
