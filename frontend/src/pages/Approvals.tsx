import { useState, useEffect } from 'react'
import { 
  CheckCircle2, XCircle, Eye, Clock, Loader2, AlertCircle, 
  RefreshCw, MessageSquare, ShieldCheck, AlertTriangle
} from 'lucide-react'
import type { Page } from '../App'
import { api } from '../utils/api'
import { toast } from '../components/Toast'

interface Props { onNavigate: (p: Page) => void }

interface WorkflowDto {
  id: number
  documentId: number
  documentTitle: string
  initiatedByUsername: string
  initiatedByName?: string
  assignedApproverId?: number
  assignedApproverUsername?: string
  assignedApproverName?: string
  comment?: string
  signature?: string
  currentStep: number
  status: string
  dueDate: string | null
  approvedByUsername: string | null
  approvedByName?: string
  decisionNote: string | null
  slaStatus?: 'ON_TRACK' | 'SLA_WARNING' | 'SLA_BREACH'
  createdAt: string
  decidedAt: string | null
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-[#FFFBEB] text-[#D97706] border-amber-200',
  APPROVED: 'bg-[#F0FDF4] text-[#16A34A] border-green-200',
  REJECTED: 'bg-[#FFF1F2] text-[#E11D48] border-red-200',
}

export default function Approvals({ onNavigate }: Props) {
  const [workflows, setWorkflows] = useState<WorkflowDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'All' | 'PENDING' | 'APPROVED' | 'REJECTED'>('All')
  
  // Decision Modal State
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDto | null>(null)
  const [decisionType, setDecisionType] = useState<'approve' | 'reject' | null>(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const savedUser = localStorage.getItem('user')
  const user = savedUser ? JSON.parse(savedUser) : null
  const currentRole = user?.roles && user.roles.length > 0 ? user.roles[0].replace('ROLE_', '') : 'VIEWER'
  const canDecide = currentRole === 'ADMIN' || currentRole === 'APPROVER'

  const loadWorkflows = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get<any>('/api/workflows')
      if (response.success && response.data) {
        setWorkflows(Array.isArray(response.data) ? response.data : [])
      } else {
        const pendingRes = await api.get<any>('/api/workflows/pending')
        if (pendingRes.success && pendingRes.data) {
          setWorkflows(Array.isArray(pendingRes.data) ? pendingRes.data : [])
        }
      }
    } catch (err: any) {
      try {
        const pendingRes = await api.get<any>('/api/workflows/pending')
        if (pendingRes.success && pendingRes.data) {
          setWorkflows(Array.isArray(pendingRes.data) ? pendingRes.data : [])
          return
        }
      } catch (e) {}
      setError(err.message || 'Failed to load approval workflows.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkflows()
  }, [])

  const openDecisionModal = (wf: WorkflowDto, type: 'approve' | 'reject') => {
    setSelectedWorkflow(wf)
    setDecisionType(type)
    setDecisionNote(type === 'approve' ? 'Approved. Complies with Q2 standards.' : '')
    setSignature(user?.name || user?.username || 'David Approver')
  }

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWorkflow || !decisionType) return

    if (decisionType === 'reject' && !decisionNote.trim()) {
      toast.warning('Reason for rejection is required.', 'Rejection Reason Required')
      return
    }

    if (!signature.trim()) {
      toast.warning('Digital signature is required to authorize workflow decisions.', 'Signature Required')
      return
    }

    try {
      setSubmitting(true)
      const response = await api.post<any>(`/api/workflows/${selectedWorkflow.id}/${decisionType}`, {
        decisionNote: decisionNote.trim(),
        signature: signature.trim()
      })
      if (response.success) {
        toast.success(
          `Document workflow successfully ${decisionType === 'approve' ? 'approved' : 'rejected'}.`,
          `Workflow ${decisionType === 'approve' ? 'Approved' : 'Rejected'}`
        )
        setSelectedWorkflow(null)
        setDecisionType(null)
        setDecisionNote('')
        setSignature('')
        await loadWorkflows()
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to ${decisionType} workflow.`, 'Workflow Action Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const isAdmin = user?.roles?.some((r: string) => r.includes('ADMIN'))
  const userWorkflows = isAdmin
    ? workflows
    : workflows.filter(w =>
        w.initiatedByUsername?.toLowerCase() === user?.username?.toLowerCase() ||
        w.initiatedByUsername?.toLowerCase() === user?.email?.toLowerCase() ||
        w.assignedApproverUsername?.toLowerCase() === user?.username?.toLowerCase() ||
        w.assignedApproverUsername?.toLowerCase() === user?.email?.toLowerCase() ||
        w.approvedByUsername?.toLowerCase() === user?.username?.toLowerCase() ||
        w.approvedByUsername?.toLowerCase() === user?.email?.toLowerCase() ||
        canDecide
      )

  const shown = userWorkflows.filter(w => filter === 'All' || w.status === filter)
  const pendingCount = userWorkflows.filter(w => w.status === 'PENDING').length
  const approvedCount = userWorkflows.filter(w => w.status === 'APPROVED').length
  const rejectedCount = userWorkflows.filter(w => w.status === 'REJECTED').length

  const getSlaBadge = (w: WorkflowDto) => {
    if (w.status !== 'PENDING' || !w.dueDate) return null
    
    // Check SLA status from backend or compute locally
    let slaState = w.slaStatus
    if (!slaState) {
      const today = new Date()
      today.setHours(0,0,0,0)
      const due = new Date(w.dueDate)
      due.setHours(0,0,0,0)
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24))
      if (diffDays < 0) slaState = 'SLA_BREACH'
      else if (diffDays <= 2) slaState = 'SLA_WARNING'
      else slaState = 'ON_TRACK'
    }

    if (slaState === 'SLA_BREACH') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
          <AlertCircle size={12} className="text-red-600" /> SLA Breach (Overdue)
        </span>
      )
    } else if (slaState === 'SLA_WARNING') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
          <AlertTriangle size={12} className="text-amber-600" /> SLA Warning (Due Soon)
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Clock size={12} className="text-emerald-600" /> SLA On Track
      </span>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-700 text-[#0F172A]">Approvals Workflows</h1>
          <p className="text-[#64748B] text-sm mt-1">Review pending verification requests and manage document authorization workflows</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadWorkflows}
            className="flex items-center gap-2 px-3.5 py-2 text-sm text-[#64748B] bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:text-[#2563EB] transition-all shadow-sm"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards matching SRS Prompt 6.2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'ALL TASKS', value: userWorkflows.length, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'PENDING REVIEW', value: pendingCount, color: '#D97706', bg: '#FFFBEB' },
          { label: 'APPROVED', value: approvedCount, color: '#16A34A', bg: '#F0FDF4' },
          { label: 'REJECTED', value: rejectedCount, color: '#E11D48', bg: '#FFF1F2' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">{s.label}</span>
              <span style={{ background: s.bg, color: s.color }} className="w-2.5 h-2.5 rounded-full" />
            </div>
            <div className="font-display text-2xl font-700 text-[#0F172A]">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 bg-[#F1F5F9] p-1.5 rounded-xl w-fit mb-6">
        {(['All', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              filter === tab ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {tab === 'All' ? 'All Tasks' : tab}
          </button>
        ))}
      </div>

      {/* Workflow items */}
      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white rounded-2xl border border-[#E2E8F0]">
          <Loader2 className="animate-spin text-[#2563EB]" size={32} />
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
          <Clock size={40} className="text-[#CBD5E1] mx-auto mb-3" />
          <h3 className="font-display font-600 text-[#0F172A] text-base mb-1">No approval workflows found</h3>
          <p className="text-[#64748B] text-xs">There are no workflows matching the selected filter state.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map(w => {
            const dateStr = w.createdAt ? new Date(w.createdAt).toLocaleDateString() : 'N/A'
            const dueStr = w.dueDate || 'No expiration set'
            return (
              <div
                key={w.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-lg border border-blue-100">
                      WF #{w.id}
                    </span>
                    <h3 className="font-display font-700 text-[#0F172A] text-base truncate">
                      {w.documentTitle || `Document #${w.documentId}`}
                    </h3>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusStyles[w.status] || 'bg-slate-100 text-slate-700'}`}>
                      {w.status}
                    </span>
                    {getSlaBadge(w)}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#64748B] flex-wrap">
                    <span>Document: <strong className="text-[#0F172A] font-semibold">{w.documentTitle}</strong></span>
                    <span>•</span>
                    <span>Initiated by: <strong className="text-[#1E293B]">{w.initiatedByUsername}</strong></span>
                    <span>•</span>
                    <span>Created: <strong>{dateStr}</strong></span>
                    <span>•</span>
                    <span>Due: <strong className="text-[#0F172A]">{dueStr}</strong></span>
                    <span>•</span>
                    <span>Step: <strong>{w.currentStep || 1}</strong></span>
                  </div>

                  {w.assignedApproverName && (
                    <div className="text-xs text-[#475569]">
                      Assigned Approver: <strong className="text-[#1E293B]">{w.assignedApproverName} ({w.assignedApproverUsername})</strong>
                    </div>
                  )}

                  {w.decisionNote && (
                    <div className="flex items-start gap-1.5 text-xs text-[#475569] bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0] mt-2">
                      <MessageSquare size={14} className="text-[#64748B] flex-shrink-0 mt-0.5" />
                      <div>
                        <div><strong>Decision Note:</strong> {w.decisionNote}</div>
                        {w.signature && (
                          <div className="text-[11px] text-[#64748B] mt-1 font-mono">
                            Digital Signature: <span className="font-semibold text-[#0F172A]">{w.signature}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons matching SRS Prompt 6.2 */}
                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  <button
                    onClick={() => {
                      localStorage.setItem('selectedDocumentId', String(w.documentId))
                      onNavigate('document-details')
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1E293B] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl transition-colors shadow-sm"
                  >
                    <Eye size={14} /> View Doc
                  </button>

                  {w.status === 'PENDING' && canDecide && (
                    <>
                      <button
                        onClick={() => openDecisionModal(w, 'approve')}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl transition-colors shadow-sm"
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button
                        onClick={() => openDecisionModal(w, 'reject')}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#E11D48] hover:bg-[#BE123C] rounded-xl transition-colors shadow-sm"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </>
                  )}

                  {w.status === 'PENDING' && !canDecide && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                      Awaiting Approver Review
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Decision Modal with Digital Signature Capture */}
      {selectedWorkflow && decisionType && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 space-y-4">
            <div>
              <h3 className="font-display font-700 text-[#0F172A] text-lg mb-1">
                {decisionType === 'approve' ? 'Approve Document Workflow' : 'Reject Document Workflow'}
              </h3>
              <p className="text-xs text-[#64748B]">
                Document: <strong className="text-[#0F172A]">{selectedWorkflow.documentTitle}</strong> (WF #{selectedWorkflow.id})
              </p>
            </div>

            <form onSubmit={handleDecisionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1.5">
                  {decisionType === 'approve' ? 'Approval Comment (Optional)' : 'Reason for rejection (required)'}
                </label>
                <textarea
                  required={decisionType === 'reject'}
                  rows={3}
                  value={decisionNote}
                  onChange={e => setDecisionNote(e.target.value)}
                  placeholder={decisionType === 'approve' ? 'E.g., Approved. Complies with Q2 standards.' : 'Missing financial footnotes. Requires revision.'}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#CBD5E1] rounded-xl focus:border-[#2563EB] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1.5 flex items-center justify-between">
                  <span>Digital Signature (Required)</span>
                  <span className="text-[10px] text-[#2563EB] font-normal flex items-center gap-1">
                    <ShieldCheck size={12} /> Verification Active
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  placeholder="Enter full legal name (e.g. David Approver)"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#CBD5E1] rounded-xl focus:border-[#2563EB] outline-none font-mono bg-[#F8FAFC]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWorkflow(null)
                    setDecisionType(null)
                  }}
                  className="flex-1 py-2.5 text-xs font-bold border border-[#E2E8F0] text-[#64748B] rounded-xl hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm disabled:opacity-50 ${
                    decisionType === 'approve' ? 'bg-[#16A34A] hover:bg-[#15803D]' : 'bg-[#E11D48] hover:bg-[#BE123C]'
                  }`}
                >
                  {submitting ? 'Submitting...' : decisionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
