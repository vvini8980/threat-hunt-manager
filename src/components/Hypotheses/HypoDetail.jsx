import { useState } from 'react'
import { Edit, X, Trash2 } from 'lucide-react'
import { QueryTabs } from '../Common/QueryTabs'
import { ResultCell, StatusBadge } from '../Common/StatusBadge'
import { useToastContext } from '../../context/ToastContext'
import { useHypotheses } from '../../hooks/useHypotheses'
import { useNavigate } from 'react-router-dom'

const STATUS_STEPS = ['Planned', 'Active', 'Pending', 'Completed', 'Closed']

function HypoDetail({
  hypothesis,
  onClose,
  onEdit,
  currentStatus,
  onStatusChange,
  comments,
  onAddComment,
}) {
  const [commentText, setCommentText] = useState('')
  const [analyst, setAnalyst] = useState('Analyst')
  const { showToast } = useToastContext()
  const { remove } = useHypotheses()
  const navigate = useNavigate()

  if (!hypothesis) return null

  const displayComments = comments || hypothesis.comments || []
  const activeStatus = currentStatus || hypothesis.status || 'Planned'
  const currentIndex = Math.max(STATUS_STEPS.indexOf(activeStatus), 0)
  const createdDate = hypothesis.createdAt
    ? new Date(hypothesis.createdAt).toLocaleDateString()
    : '--'
  const sectionClass = 'rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-4'
  const labelClass = 'mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500'

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '--'
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(new Date(timestamp))
      .replace(',', '')
  }

  const handleAddComment = () => {
    const text = commentText.trim()
    const analystName = analyst.trim() || 'Analyst'

    if (!text) return

    onAddComment?.(hypothesis.id, text, analystName)
    setCommentText('')
    showToast('Comment added', 'success')
  }

  const handleStatusChange = (status) => {
    onStatusChange?.(status)
    showToast('Status updated to ' + status, 'success')
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this hypothesis?')) {
      remove(hypothesis.id)
      showToast('Hypothesis deleted', 'error')
      onClose()
      navigate('/hypotheses')
    }
  }

  return (
    <>
      {/* Backdrop Overlay */}
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
        aria-label="Close details overlay"
      />
      <aside className="fixed right-0 top-0 z-50 h-screen w-[520px] max-w-full animate-[slideInRight_180ms_ease-out] border-l border-[#2a2d3e] bg-[#1a1d27] shadow-[-24px_0_60px_rgba(0,0,0,0.45)]">
        <div className="flex h-16 items-center justify-between border-b border-[#2a2d3e] px-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Hypothesis Detail
            </p>
            <h2 className="text-lg font-semibold text-white">
              {hypothesis.hypoName || 'Untitled Hypothesis'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Edit hypothesis"
              onClick={() => onEdit?.(hypothesis)}
              className="rounded-lg border border-[#2a2d3e] p-2 text-gray-400 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/15 hover:text-indigo-300"
            >
              <Edit size={18} />
            </button>
            <button
              aria-label="Delete hypothesis"
              onClick={handleDelete}
              className="rounded-lg border border-[#2a2d3e] p-2 text-gray-400 transition-colors hover:border-red-500/50 hover:bg-red-500/15 hover:text-red-300"
            >
              <Trash2 size={18} />
            </button>
            <button
              aria-label="Close details"
              onClick={onClose}
              className="rounded-lg border border-[#2a2d3e] p-2 text-gray-400 transition-colors hover:border-gray-500 hover:bg-[#252840] hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="h-[calc(100vh-4rem)] overflow-y-auto p-5">
          <div className="border-b border-[#2a2d3e] pb-5">
            <h3 className="text-2xl font-bold leading-tight text-white">
              {hypothesis.hypoName || 'Untitled Hypothesis'}
            </h3>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/15 px-3 py-1.5 font-mono text-lg font-bold text-indigo-300">
                {hypothesis.mitreId || '--'}
              </span>

              {hypothesis.tactic && (
                <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-3 py-1 text-sm font-medium text-purple-300">
                  {hypothesis.tactic}
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-gray-400">
              {hypothesis.subTechnique || 'No sub-technique selected'}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">
                  Month
                </p>
                <p className="mt-1 text-sm font-medium text-gray-200">
                  {hypothesis.month || '--'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">
                  Planned
                </p>
                <p className="mt-1 text-sm font-medium text-gray-200">
                  {hypothesis.planned || '--'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">
                  Created
                </p>
                <p className="mt-1 text-sm font-medium text-gray-200">
                  {createdDate}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={hypothesis.status} />
              <ResultCell result={hypothesis.result} />
            </div>
          </div>

          <div className="space-y-4 pt-5">
            <section className={sectionClass}>
              <p className={labelClass}>Description</p>
              <p className="text-sm leading-6 text-gray-200">
                {hypothesis.description || 'Not provided'}
              </p>
            </section>

            <section className={sectionClass}>
              <p className={labelClass}>Hunting Logic</p>
              <p className="text-sm leading-6 text-gray-200">
                {hypothesis.huntingLogic || 'Not provided'}
              </p>
            </section>

            <section className={`${sectionClass} relative`}>
              <p className={labelClass}>SOC Detection Rule</p>
              <pre className="min-h-[96px] overflow-auto whitespace-pre-wrap pr-16 font-mono text-sm leading-6 text-gray-200">
                {hypothesis.socDetectionRule || 'Not provided'}
              </pre>
              {hypothesis.socDetectionRule && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hypothesis.socDetectionRule)
                    showToast('Query copied to clipboard', 'info')
                  }}
                  className="absolute right-3 top-3 rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  Copy
                </button>
              )}
            </section>

            <section className={sectionClass}>
              <p className={labelClass}>SIEM Queries</p>
              <QueryTabs
                readOnly
                values={{
                  splunkSPL: hypothesis.splunkSPL,
                  qradarAQL: hypothesis.qradarAQL,
                  sentinelKQL: hypothesis.sentinelKQL,
                }}
              />
            </section>

            <section className={sectionClass}>
              <p className={labelClass}>Comments</p>

              <div className="mb-4">
                {displayComments.length > 0 ? (
                  displayComments.map(comment => {
                    const analystName = comment.analyst || 'Analyst'

                    return (
                      <div
                        key={comment.id || `${analystName}-${comment.timestamp}`}
                        className="flex gap-3 border-b border-[#2a2d3e] py-4 first:pt-0 last:border-b-0"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                          {analystName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-6 text-gray-200">
                            {comment.text}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span className="font-medium text-gray-400">
                              {analystName}
                            </span>
                            <span>{formatTimestamp(comment.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="py-3 text-sm text-gray-500">No comments yet.</p>
                )}
              </div>

              <div className="space-y-3 border-t border-[#2a2d3e] pt-4">
                <textarea
                  className="min-h-[90px] w-full resize-y rounded-lg border border-[#2a2d3e] bg-[#1a1d27] px-3 py-2 text-sm text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-indigo-500"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={event => setCommentText(event.target.value)}
                />
                <div className="flex gap-3">
                  <input
                    className="h-10 min-w-0 flex-1 rounded-lg border border-[#2a2d3e] bg-[#1a1d27] px-3 text-sm text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-indigo-500"
                    placeholder="Analyst name"
                    value={analyst}
                    onChange={event => setAnalyst(event.target.value)}
                  />
                  <button
                    onClick={handleAddComment}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                  >
                    Add Comment
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </aside>
    </>
  )
}

export default HypoDetail
