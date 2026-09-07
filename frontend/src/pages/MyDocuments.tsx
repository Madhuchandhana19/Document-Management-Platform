import { useState, useEffect } from 'react'
import { FileText, Search, Filter, Upload, MoreHorizontal, Download, Share2, Eye, Loader2, AlertCircle } from 'lucide-react'
import type { Page } from '../App'
import { api } from '../utils/api'
import { downloadFileToPC } from '../utils/fileStorage'

interface Props { onNavigate: (p: Page) => void }

interface DocumentDto {
  id: string
  title: string
  description: string
  fileName: string
  fileType: string
  fileSize: number
  storageUrl?: string
  isArchived: boolean
  currentVersion: number
  ownerUsername: string
  status: string
  createdAt: string
}

const statusStyles: Record<string, string> = {
  Approved: 'bg-[#F0FDF4] text-[#16A34A]',
  Pending: 'bg-[#FFFBEB] text-[#D97706]',
  Draft: 'bg-[#F1F5F9] text-[#64748B]',
  ACTIVE: 'bg-[#F0FDF4] text-[#16A34A]',
}

const extColor: Record<string, string> = {
  pdf: '#EF4444', docx: '#2563EB', xlsx: '#16A34A', fig: '#7C3AED', zip: '#EAB308',
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export default function MyDocuments({ onNavigate }: Props) {
  const [documents, setDocuments] = useState<DocumentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('modified')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    async function loadDocuments() {
      try {
        setLoading(true)
        const response = await api.get<any>('/api/documents/search')
        if (response.success && response.data) {
          const content = response.data.content || response.data
          const mapped = Array.isArray(content) ? content.map((d: any) => ({
            ...d,
            id: String(d.id),
            fileName: d.title,
            fileSize: (d.fileSizeKb || 0) * 1024,
            isArchived: d.status === 'ARCHIVED',
            status: d.status === 'APPROVED' ? 'Approved' : (d.status === 'UNDER_REVIEW' ? 'Pending' : 'Draft'),
            storageUrl: d.storageUrl
          })) : []
          setDocuments(mapped)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load documents.')
      } finally {
        setLoading(false)
      }
    }
    loadDocuments()
  }, [])

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const doc = documents.find(d => d.id === docId)
      await downloadFileToPC(fileName || doc?.title || 'document', doc?.fileType, doc?.storageUrl)
    } catch (err) {
      console.error(err)
      alert('Could not download document.')
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      const response = await api.delete<any>(`/api/documents/${docId}`)
      if (response.success) {
        setDocuments(prev => prev.filter(d => d.id !== docId))
        setMenuOpen(null)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete document.')
    }
  }

  const savedUser = localStorage.getItem('user')
  const user = savedUser ? JSON.parse(savedUser) : null
  const isAdmin = user?.roles?.some((r: string) => r.includes('ADMIN'))

  const filtered = documents.filter(d => {
    const isOwner = isAdmin || 
      d.ownerUsername?.toLowerCase() === user?.username?.toLowerCase() ||
      d.ownerUsername?.toLowerCase() === user?.email?.toLowerCase()
    if (!isOwner) return false

    const titleMatch = (d.title || '').toLowerCase().includes(search.toLowerCase())
    const fileMatch = (d.fileName || '').toLowerCase().includes(search.toLowerCase())
    const descMatch = (d.description || '').toLowerCase().includes(search.toLowerCase())
    return titleMatch || fileMatch || descMatch
  })

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.title || a.fileName).localeCompare(b.title || b.fileName)
    }
    if (sortBy === 'size') {
      return (b.fileSize || 0) - (a.fileSize || 0)
    }
    // Default or modified
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#2563EB]" size={36} />
      </div>
    )
  }

  return (
    <div className="p-8 animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-700 text-[#0F172A]">My Documents</h1>
          <p className="text-[#64748B] text-sm mt-1">{sorted.length} documents found</p>
        </div>
        <button
          onClick={() => onNavigate('upload')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-sm"
        >
          <Upload size={15} />
          Upload Document
        </button>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs leading-relaxed">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#64748B] bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:text-[#2563EB] transition-all">
          <Filter size={15} />
          Filter
        </button>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-4 py-2.5 text-sm text-[#64748B] bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
        >
          <option value="modified">Sort: Last Modified</option>
          <option value="name">Sort: Name</option>
          <option value="size">Sort: Size</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {['Document', 'Category', 'Owner', 'Uploaded', 'Size', 'Status', ''].map(h => (
                <th key={h} className="text-left text-xs font-600 text-[#64748B] px-5 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#94A3B8] text-sm">
                  No documents found.
                </td>
              </tr>
            ) : (
              sorted.map((doc) => {
                const ext = doc.fileName.split('.').pop()?.toLowerCase() || 'pdf'
                const color = extColor[ext] || '#64748B'
                const dateStr = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'
                return (
                  <tr
                    key={doc.id}
                    className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="px-5 py-4">
                      <button
                        onClick={() => {
                          localStorage.setItem('selectedDocumentId', doc.id)
                          onNavigate('document-details')
                        }}
                        className="flex items-center gap-3 text-left"
                      >
                        <div style={{ background: color + '15' }} className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={16} style={{ color }} />
                        </div>
                        <span className="text-sm font-medium text-[#1E293B] hover:text-[#2563EB] transition-colors">{doc.title || doc.fileName}</span>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#64748B]">
                        {ext.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#64748B]">{doc.ownerUsername || 'User'}</td>
                    <td className="px-5 py-4 text-sm text-[#64748B]">{dateStr}</td>
                    <td className="px-5 py-4 text-xs font-mono text-[#94A3B8]">{formatBytes(doc.fileSize)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[doc.status] || 'bg-slate-100 text-slate-700'}`}>
                        {doc.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === doc.id ? null : doc.id)}
                          className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#64748B] transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {menuOpen === doc.id && (
                          <div className="absolute right-0 top-8 z-20 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 w-36">
                            <button
                              onClick={() => {
                                localStorage.setItem('selectedDocumentId', doc.id)
                                onNavigate('document-details')
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F8FAFC]"
                            >
                              <Eye size={14} />View
                            </button>
                            <button
                              onClick={() => handleDownload(doc.id, doc.fileName)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F8FAFC]"
                            >
                              <Download size={14} />Download
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
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
    </div>
  )
}
