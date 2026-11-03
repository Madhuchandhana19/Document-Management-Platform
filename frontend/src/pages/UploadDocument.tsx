import { useState, useRef } from 'react'
import { Upload, X, FileText, ArrowLeft, Loader2, AlertCircle, Shield, Calendar } from 'lucide-react'
import type { Page } from '../App'
import { api } from '../utils/api'
import { saveUploadedBlob } from '../utils/fileStorage'
import { toast } from '../components/Toast'

interface Props { onNavigate: (p: Page) => void }

const categories = ['Finance', 'Legal', 'HR', 'Engineering', 'Marketing', 'General']
const accessLevels = ['Private', 'Internal', 'Public']
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'txt', 'png', 'jpg', 'fig', 'zip']

export default function UploadDocument({ onNavigate }: Props) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Finance')
  const [accessLevel, setAccessLevel] = useState('Internal')
  const [retentionPeriodYears, setRetentionPeriodYears] = useState<number>(5)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFile: File | null) => {
    setError(null)
    setTitleError(null)
    setCategoryError(null)
    if (!selectedFile) {
      setFile(null)
      return
    }

    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const msg = 'Unsupported file type. Allowed types: PDF, DOCX, XLSX, TXT, PNG, JPG, FIG, ZIP'
      setError(msg)
      toast.error(msg, 'Invalid File Type')
      setFile(null)
      return
    }

    // 50 MB limit
    if (selectedFile.size > 50 * 1024 * 1024) {
      const msg = 'File size must not exceed 50 MB'
      setError(msg)
      toast.warning(msg, 'File Too Large')
      setFile(null)
      return
    }

    setFile(selectedFile)
    toast.info(`Selected file "${selectedFile.name}" (${(selectedFile.size / 1024).toFixed(1)} KB)`, 'File Selected')
    if (!title) {
      setTitle(selectedFile.name)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  const handleUploadSubmit = async () => {
    setTitleError(null)
    setCategoryError(null)
    setError(null)

    if (!file) {
      const msg = 'Please select or drop a valid file to upload.'
      setError(msg)
      toast.warning(msg, 'No File Selected')
      return
    }

    const docTitle = title.trim()
    if (!docTitle) {
      setTitleError('Title is required')
      setError('Title is required')
      toast.warning('Document title is required.', 'Missing Title')
      return
    }

    if (docTitle.length > 200) {
      setTitleError('Title must not exceed 200 characters')
      setError('Title must not exceed 200 characters')
      toast.warning('Title must not exceed 200 characters.', 'Title Too Long')
      return
    }

    if (!category || !category.trim()) {
      setCategoryError('Category is required')
      setError('Category is required')
      toast.warning('Category selection is required.', 'Missing Category')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const msg = 'Unsupported file type. Allowed types: PDF, DOCX, XLSX, TXT, PNG, JPG, FIG, ZIP'
      setError(msg)
      toast.error(msg, 'Invalid File Type')
      return
    }

    const fileSizeKb = Math.max(1, Math.round(file.size / 1024))
    if (fileSizeKb > 50000) {
      const msg = 'File size must not exceed 50 MB'
      setError(msg)
      toast.warning(msg, 'File Too Large')
      return
    }

    setLoading(true)
    setError(null)

    const storageUrl = 'https://storage.dms.com/files/' + encodeURIComponent(file.name)
    const changeSummary = 'Initial upload'

    try {
      await saveUploadedBlob(docTitle, file)
      
      const response = await api.post<any>('/api/documents/upload', {
        title: docTitle,
        folderId: null,
        fileType: ext,
        fileSizeKb: fileSizeKb,
        storageUrl: storageUrl,
        changeSummary: changeSummary,
        category: category,
        accessLevel: accessLevel,
        retentionPeriodYears: retentionPeriodYears
      })

      if (response.success) {
        toast.success(`"${docTitle}" has been uploaded successfully!`, 'Upload Complete')
        onNavigate('documents')
      } else {
        const msg = response.message || 'Upload failed.'
        setError(msg)
        toast.error(msg, 'Upload Error')
      }
    } catch (err: any) {
      const msg = err.message || 'Error occurred during file upload.'
      setError(msg)
      toast.error(msg, 'Upload Error')
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
      <p className="text-[#64748B] text-sm mb-8">Add a new document to your enterprise workspace.</p>

      {error && (
        <div role="alert" aria-live="polite" className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs leading-relaxed animate-in fade-in space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="font-semibold">{error}</span>
          </div>
          {(error.includes('Server temporarily unavailable') || error.includes('upload') || error.includes('Error')) && (
            <div className="flex justify-end pt-1">
              <button
                onClick={handleUploadSubmit}
                disabled={loading}
                aria-label="Retry uploading file"
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {loading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Upload size={13} aria-hidden="true" />}
                {loading ? 'Retrying...' : 'Retry Upload'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        role="region"
        aria-label="File upload dropzone"
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-6 ${
          dragging ? 'border-[#2563EB] bg-[#EFF6FF]' : file ? 'border-[#22C55E] bg-[#F0FDF4]' : 'border-[#CBD5E1] hover:border-[#2563EB] hover:bg-[#F8FAFC]'
        }`}
      >
        <input
          ref={inputRef}
          id="file-input-field"
          type="file"
          aria-label="Choose document file to upload"
          className="hidden"
          onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center justify-between gap-3 p-2 bg-white/80 rounded-xl border border-[#22C55E]/30 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#22C55E]/10 flex items-center justify-center flex-shrink-0">
                <FileText size={24} className="text-[#22C55E]" aria-hidden="true" />
              </div>
              <div className="text-left">
                <p className="font-bold text-[#1E293B] text-sm">{file.name}</p>
                <p className="text-xs text-[#64748B] flex items-center gap-2">
                  <span className="font-semibold uppercase text-[#2563EB]">{(file.name.split('.').pop() || 'PDF')}</span>
                  <span aria-hidden="true">•</span>
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB ({Math.round(file.size / 1024)} KB)</span>
                </p>
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setFile(null) }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-[#64748B] hover:text-red-600 transition-colors"
              aria-label={`Remove file ${file.name}`}
              title="Remove File"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4">
              <Upload size={24} className="text-[#2563EB]" aria-hidden="true" />
            </div>
            <p className="font-600 text-[#1E293B] mb-1">Drag & Drop File Here</p>
            <p className="text-xs text-[#64748B] mb-4">Supported types: PDF, DOCX, XLSX, TXT, PNG, JPG, FIG, ZIP (Max 50 MB)</p>
            <span className="px-4 py-2 text-xs font-bold text-[#2563EB] border border-[#2563EB] rounded-xl hover:bg-[#EFF6FF] transition-colors">
              Browse PC Files
            </span>
          </>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4 shadow-sm">
        <div>
          <label htmlFor="upload-title" className="block text-xs font-bold text-[#1E293B] mb-1.5 uppercase tracking-wider">
            Document Title <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="upload-title"
            type="text"
            required
            aria-required="true"
            aria-describedby={titleError ? "title-error-msg" : "title-char-hint"}
            maxLength={200}
            value={title}
            onChange={e => { setTitle(e.target.value); if (titleError) setTitleError(null); }}
            placeholder="e.g. Q2 Financial Report 2026"
            className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-all ${
              titleError ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-[#CBD5E1] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]'
            }`}
          />
          {titleError ? (
            <p id="title-error-msg" role="alert" className="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
              <AlertCircle size={12} aria-hidden="true" /> {titleError}
            </p>
          ) : (
            <p id="title-char-hint" className="text-[11px] text-[#64748B] mt-1 text-right">{title.length}/200 characters</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="upload-category" className="block text-xs font-bold text-[#1E293B] mb-1.5 uppercase tracking-wider">
              Category <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="upload-category"
              required
              aria-required="true"
              aria-describedby={categoryError ? "category-error-msg" : undefined}
              value={category}
              onChange={e => { setCategory(e.target.value); if (categoryError) setCategoryError(null); }}
              className={`w-full px-3 py-2.5 text-xs border rounded-xl focus:outline-none transition-all bg-white ${
                categoryError ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-[#CBD5E1] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]'
              }`}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {categoryError && (
              <p id="category-error-msg" role="alert" className="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                <AlertCircle size={12} aria-hidden="true" /> {categoryError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="upload-access-level" className="block text-xs font-bold text-[#1E293B] mb-1.5 uppercase tracking-wider">
              Access Level <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
              <select
                id="upload-access-level"
                required
                aria-required="true"
                value={accessLevel}
                onChange={e => setAccessLevel(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 text-xs border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all bg-white"
              >
                {accessLevels.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="upload-retention" className="block text-xs font-bold text-[#1E293B] mb-1.5 uppercase tracking-wider">
              Retention (Years) <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
              <input
                id="upload-retention"
                type="number"
                required
                aria-required="true"
                min={1}
                max={50}
                value={retentionPeriodYears}
                onChange={e => setRetentionPeriodYears(parseInt(e.target.value) || 1)}
                className="w-full pl-8 pr-3 py-2.5 text-xs border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="upload-description" className="block text-xs font-bold text-[#1E293B] mb-1.5 uppercase tracking-wider">Description</label>
          <textarea
            id="upload-description"
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief optional description of this document..."
            className="w-full px-4 py-2.5 text-xs border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => onNavigate('documents')}
          disabled={loading}
          className="flex-1 py-3 text-xs font-bold text-[#64748B] bg-white border border-[#CBD5E1] rounded-xl hover:bg-[#F8FAFC] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleUploadSubmit}
          disabled={loading}
          className="flex-1 py-3 text-xs font-bold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-75"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? 'Uploading File...' : 'Upload & Register Document'}
        </button>
      </div>
    </div>
  )
}
