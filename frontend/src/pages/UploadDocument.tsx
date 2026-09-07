import { useState, useRef } from 'react'
import { Upload, X, FileText, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import type { Page } from '../App'
import { api } from '../utils/api'
import { saveUploadedBlob } from '../utils/fileStorage'

interface Props { onNavigate: (p: Page) => void }

const categories = ['Project', 'HR', 'Finance', 'UI/UX', 'Legal', 'Operations', 'Marketing']
const departments = ['Information Technology', 'Human Resources', 'Finance', 'Operations', 'Design', 'Marketing', 'Legal']

export default function UploadDocument({ onNavigate }: Props) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Project')
  const [department, setDepartment] = useState('Information Technology')

  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags(v => [...v, t])
    setTagInput('')
  }

  const handleUploadSubmit = async () => {
    if (!file) {
      setError('Please select or drop a file to upload.')
      return
    }

    setLoading(true)
    setError(null)

    const fileType = file.name.split('.').pop() || 'pdf';
    const fileSizeKb = Math.max(1, Math.round(file.size / 1024));
    const storageUrl = 'https://storage.dms.com/files/' + file.name;
    const changeSummary = 'Initial upload';

    try {
      const docTitle = title || file.name
      await saveUploadedBlob(docTitle, file)
      
      const response = await api.post<any>('/api/documents/upload', {
        title: docTitle,
        folderId: null,
        fileType: fileType,
        fileSizeKb: fileSizeKb,
        storageUrl: storageUrl,
        changeSummary: changeSummary
      })
      if (response.success) {
        onNavigate('documents')
      } else {
        setError(response.message || 'Upload failed.')
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during file upload.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto animate-in fade-in duration-200">
      <button
        onClick={() => onNavigate('documents')}
        className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#2563EB] mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Documents
      </button>

      <h1 className="font-display text-2xl font-700 text-[#0F172A] mb-1">Upload New Document</h1>
      <p className="text-[#64748B] text-sm mb-8">Add a new document to your workspace.</p>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs leading-relaxed animate-in fade-in">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-6 ${
          dragging ? 'border-[#2563EB] bg-[#EFF6FF]' : file ? 'border-[#22C55E] bg-[#F0FDF4]' : 'border-[#CBD5E1] hover:border-[#2563EB] hover:bg-[#F8FAFC]'
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#22C55E]/10 flex items-center justify-center">
              <FileText size={24} className="text-[#22C55E]" />
            </div>
            <div className="text-left">
              <p className="font-medium text-[#1E293B]">{file.name}</p>
              <p className="text-sm text-[#64748B]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setFile(null) }}
              className="ml-4 p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8]"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4">
              <Upload size={24} className="text-[#2563EB]" />
            </div>
            <p className="font-600 text-[#1E293B] mb-1">Drag & Drop Files Here</p>
            <p className="text-sm text-[#94A3B8] mb-4">or</p>
            <span className="px-4 py-2 text-sm font-medium text-[#2563EB] border border-[#2563EB] rounded-lg hover:bg-[#EFF6FF] transition-colors">
              Browse Files
            </span>
          </>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-2">Document Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Project Proposal Q3 2026"
            className="w-full px-4 py-2.5 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-2">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all bg-white"
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-2">Department</label>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all bg-white"
            >
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-2">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of this document…"
            className="w-full px-4 py-2.5 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-2">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EFF6FF] text-[#2563EB] text-xs font-medium rounded-full">
                {t}
                <button onClick={() => setTags(v => v.filter(x => x !== t))} className="hover:text-[#1D4ED8]"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add a tag and press Enter"
              className="flex-1 px-4 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
            <button onClick={addTag} className="px-4 py-2 text-sm bg-[#F1F5F9] text-[#64748B] rounded-xl hover:bg-[#E2E8F0] transition-colors">
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => onNavigate('documents')}
          disabled={loading}
          className="flex-1 py-3 text-sm font-medium text-[#64748B] bg-white border border-[#E2E8F0] rounded-xl hover:border-[#CBD5E1] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleUploadSubmit}
          disabled={loading}
          className="flex-1 py-3 text-sm font-medium text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  )
}
