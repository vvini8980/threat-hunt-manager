import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMitre } from '../hooks/useMitre'
import { useHypotheses } from '../hooks/useHypotheses'
import { QueryTabs } from '../components/Common/QueryTabs'
import { useToastContext } from '../context/ToastContext'
import Spinner from '../components/Common/Spinner'
import {
  getHypothesisById,
  getAssignmentForHypothesisMonth,
} from '../services/storage'
import { EMPTY_HYPOTHESIS_FORM, recordToForm } from '../utils/hypothesisForm'

export default function AddEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { add, update } = useHypotheses()
  const { mitreData, search } = useMitre()
  const { showToast } = useToastContext()

  const monthParam = searchParams.get('month')
  const fromCampaigns = searchParams.get('from') === 'campaigns'
  const isCampaignForm = fromCampaigns || Boolean(monthParam)

  const [form, setForm] = useState(EMPTY_HYPOTHESIS_FORM)
  const [loadingRecord, setLoadingRecord] = useState(Boolean(id))
  const [mitreSearch, setMitreSearch] = useState('')
  const [mitreResults, setMitreResults] = useState([])
  const [subTechOptions, setSubTechOptions] = useState([])

  useEffect(() => {
    if (!id) {
      const mitreIdParam = searchParams.get('mitreId')
      const typeParam = searchParams.get('type')
      const isGeneralVal = typeParam === 'general'

      setForm(recordToForm(null, {
        isGeneral: isGeneralVal,
        month: monthParam || EMPTY_HYPOTHESIS_FORM.month,
        ...(mitreIdParam ? { mitreId: mitreIdParam } : {}),
      }))
      setLoadingRecord(false)
      return
    }

    let cancelled = false

    const loadRecord = async () => {
      setLoadingRecord(true)
      try {
        const hypo = await getHypothesisById(id)
        if (cancelled || !hypo) {
          if (!cancelled) showToast('Hypothesis not found', 'error')
          return
        }

        let merged = hypo
        if (monthParam) {
          const assignment = await getAssignmentForHypothesisMonth(id, monthParam)
          if (assignment) {
            merged = { ...hypo, ...assignment, id: hypo.id }
          }
        }

        if (!cancelled) {
          setForm(recordToForm(merged, {
            month: monthParam || merged.month,
          }))
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) showToast('Failed to load hypothesis', 'error')
      } finally {
        if (!cancelled) setLoadingRecord(false)
      }
    }

    loadRecord()
    return () => { cancelled = true }
  }, [id, monthParam, searchParams, showToast])

  useEffect(() => {
    if (!id || !mitreData || !form.mitreId) return

    const mitreIdParam = searchParams.get('mitreId')
    if (mitreIdParam) return

    const technique = mitreData.techniques?.find(t => t.id === form.mitreId)
      || mitreData.subTechniques?.find(t => t.id === form.mitreId)

    if (!technique) return

    const isSubTech = technique.id.includes('.')
    const tacticShort = technique.tactics?.[0] || ''
    const tacticObj = mitreData.tactics?.find(t => t.shortName === tacticShort)

    setForm(f => ({
      ...f,
      subTechnique: f.subTechnique || (isSubTech ? `${technique.id} - ${technique.name}` : ''),
      tactic: f.tactic || tacticObj?.name || tacticShort,
    }))
  }, [id, mitreData, form.mitreId, searchParams])

  useEffect(() => {
    if (mitreSearch.length > 1) {
      setMitreResults(search(mitreSearch))
    } else {
      setMitreResults([])
    }
  }, [mitreSearch, search])

  const selectMitre = (technique) => {
    const isSubTech = technique.id.includes('.')
    const parentId = isSubTech ? technique.id.split('.')[0] : technique.id
    const subs = mitreData?.subTechniques?.filter(s => s.parentId === parentId) || []
    setSubTechOptions(subs)

    const tacticShort = technique.tactics?.[0] || ''
    const tacticObj = mitreData?.tactics?.find(t => t.shortName === tacticShort)

    setForm(f => ({
      ...f,
      mitreId: technique.id,
      subTechnique: isSubTech ? `${technique.id} - ${technique.name}` : '',
      tactic: tacticObj?.name || tacticShort,
    }))

    setMitreSearch('')
    setMitreResults([])
  }

  const handleField = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!form.hypoName || !form.mitreId) {
      showToast('Please fill required fields', 'error')
      return
    }

    try {
      if (id) {
        await update(id, form)
        showToast('Hypothesis updated', 'success')
      } else {
        await add(form, { campaign: isCampaignForm })
        showToast('Hypothesis saved successfully', 'success')
      }

      const redirect = fromCampaigns ? '/campaigns' : '/hypotheses'
      setTimeout(() => navigate(redirect), 600)
    } catch (err) {
      showToast(err.message || 'Save failed', 'error')
    }
  }

  const sectionClass = 'bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6 mb-6'
  const labelClass = 'block text-sm font-medium text-gray-400 mb-1'
  const inputClass = `w-full bg-[#0f1117] border border-[#2a2d3e] 
    rounded-lg px-3 py-2 text-gray-200 text-sm outline-none
    focus:border-indigo-500 transition-colors`

  if (loadingRecord) {
    return <Spinner size="lg" text="Loading hypothesis details..." />
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {id ? '✏️ Edit Hypothesis' : '➕ Add Hypothesis'}
          </h1>
          {isCampaignForm && (
            <p className="text-sm text-indigo-300 mt-1">
              Monthly campaign assignment — changes apply to this hunt month
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(fromCampaigns ? '/campaigns' : '/hypotheses')}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Back
        </button>
      </div>

      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-indigo-400 mb-4">
          📌 Section 1 — Identity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Hypothesis Name *</label>
            <input
              className={inputClass}
              placeholder="e.g. Detect Encoded PowerShell Execution"
              value={form.hypoName}
              onChange={e => handleField('hypoName', e.target.value)}
            />
          </div>

          <div className="relative">
            <label className={labelClass}>MITRE ATT&CK ID *</label>
            <input
              className={inputClass}
              placeholder="Search T1059 or PowerShell..."
              value={mitreResults.length > 0 ? mitreSearch : (form.mitreId || '')}
              onChange={e => {
                setMitreSearch(e.target.value)
                handleField('mitreId', e.target.value)
              }}
            />
            {mitreResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-[#1e2130] border border-[#2a2d3e] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {mitreResults.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectMitre(t)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-600/20 border-b border-[#2a2d3e] last:border-0"
                  >
                    <span className="text-indigo-400 font-mono">{t.id}</span>
                    <span className="text-gray-300 ml-2">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Sub-technique</label>
            {subTechOptions.length > 0 ? (
              <select
                className={inputClass}
                value={form.subTechnique}
                onChange={e => handleField('subTechnique', e.target.value)}
              >
                <option value="">-- Select sub-technique --</option>
                {subTechOptions.map(s => (
                  <option key={s.id} value={`${s.id} - ${s.name}`}>
                    {s.id} - {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={inputClass}
                placeholder="e.g. T1059.001 - PowerShell"
                value={form.subTechnique}
                onChange={e => handleField('subTechnique', e.target.value)}
              />
            )}
          </div>

          <div>
            <label className={labelClass}>Tactic</label>
            <input
              className={`${inputClass} text-indigo-300`}
              placeholder="Auto-filled from MITRE ID"
              value={form.tactic}
              onChange={e => handleField('tactic', e.target.value)}
            />
          </div>
        </div>
      </div>

      {isCampaignForm && (
        <div className={sectionClass}>
          <h2 className="text-lg font-semibold text-indigo-400 mb-4">
            📅 Section — Monthly Assignment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Hunt Month</label>
              <input
                type="month"
                className={inputClass}
                value={form.month}
                onChange={e => handleField('month', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={e => handleField('status', e.target.value)}
              >
                {['Planned', 'Active', 'Pending', 'Completed', 'Closed', 'Shared', 'ETA']
                  .map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Client Name</label>
              <input
                className={inputClass}
                value={form.clientName}
                onChange={e => handleField('clientName', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Assigned Analyst</label>
              <input
                className={inputClass}
                value={form.assignedAnalyst}
                onChange={e => handleField('assignedAnalyst', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Planned / ETA Date</label>
              <input
                type="date"
                className={inputClass}
                value={form.planned}
                onChange={e => handleField('planned', e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isGeneral}
                  onChange={e => handleField('isGeneral', e.target.checked)}
                  className="rounded border-[#2a2d3e]"
                />
                General pool hunt (mandatory for all analysts)
              </label>
            </div>
          </div>
        </div>
      )}

      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-indigo-400 mb-4">
          🔍 Section 2 — Hunt Content
        </h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              placeholder="What are we hunting for and why?"
              value={form.description}
              onChange={e => handleField('description', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Hunting Logic</label>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              placeholder="How do we detect it? What signals do we look for?"
              value={form.huntingLogic}
              onChange={e => handleField('huntingLogic', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>SOC Detection Rule</label>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y font-mono text-xs`}
              placeholder="Detection rule logic or Sigma rule..."
              value={form.socDetectionRule}
              onChange={e => handleField('socDetectionRule', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-indigo-400 mb-4">
          💻 Section 3 — SIEM Queries
        </h2>
        <QueryTabs
          values={{
            splunkSPL: form.splunkSPL,
            qradarAQL: form.qradarAQL,
            sentinelKQL: form.sentinelKQL,
          }}
          onChange={(key, val) => handleField(key, val)}
        />
      </div>

      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-indigo-400 mb-4">
          🎯 Section 4 — Outcome
        </h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Result</label>
            <div className="flex gap-3 flex-wrap">
              {['TP', 'FP', 'Undetermined', ''].map(r => (
                <button
                  key={r || 'none'}
                  type="button"
                  onClick={() => handleField('result', r)}
                  className={`px-6 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.result === r
                      ? r === 'TP'
                        ? 'bg-green-500/30 border-green-500 text-green-400'
                        : r === 'FP'
                        ? 'bg-red-500/30 border-red-500 text-red-400'
                        : r === 'Undetermined'
                        ? 'bg-yellow-500/30 border-yellow-500 text-yellow-400'
                        : 'bg-gray-500/30 border-gray-500 text-gray-300'
                      : 'bg-transparent border-[#2a2d3e] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {r || 'None'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => navigate(fromCampaigns ? '/campaigns' : '/hypotheses')}
          className="px-6 py-2 rounded-lg border border-[#2a2d3e] text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-8 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
        >
          {id ? 'Update Hypothesis' : 'Save Hypothesis'}
        </button>
      </div>
    </div>
  )
}
