import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMitre } from '../hooks/useMitre'
import { useHypotheses } from '../hooks/useHypotheses'
import { QueryTabs } from '../components/Common/QueryTabs'
import { useToastContext } from '../context/ToastContext'

const EMPTY_FORM = {
  hypoName: '',
  mitreId: '',
  subTechnique: '',
  tactic: '',
  month: new Date().toISOString().slice(0, 7),
  status: 'Planned',
  planned: new Date().toISOString().slice(0, 10),
  description: '',
  huntingLogic: '',
  socDetectionRule: '',
  splunkSPL: '',
  qradarAQL: '',
  sentinelKQL: '',
  result: '',
  comments: [],
}

export default function AddEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { add, update, hypotheses } = useHypotheses()
  const { mitreData, search } = useMitre()
  const { showToast } = useToastContext()

  const [form, setForm] = useState(EMPTY_FORM)
  const [mitreSearch, setMitreSearch] = useState('')
  const [mitreResults, setMitreResults] = useState([])
  const [subTechOptions, setSubTechOptions] = useState([])
  const [saved, setSaved] = useState(false)

  // Load existing hypothesis if editing, or check search params
  useEffect(() => {
    if (id) {
      const existing = hypotheses.find(h => h.id === id)
      if (existing) setForm(existing)
    } else {
      const mitreIdParam = searchParams.get('mitreId')
      if (mitreIdParam && mitreData) {
        const technique = mitreData.techniques?.find(t => t.id === mitreIdParam) || 
                          mitreData.subTechniques?.find(t => t.id === mitreIdParam)
        
        if (technique) {
          const isSubTech = technique.id.includes('.')
          const tacticShort = technique.tactics?.[0] || ''
          const tacticObj = mitreData.tactics?.find(t => t.shortName === tacticShort)
          setForm(f => ({
            ...f,
            mitreId: technique.id,
            subTechnique: isSubTech ? `${technique.id} - ${technique.name}` : '',
            tactic: tacticObj?.name || tacticShort,
          }))
        } else {
          setForm(f => ({ ...f, mitreId: mitreIdParam }))
        }
      }
    }
  }, [id, hypotheses, searchParams, mitreData])

  // MITRE search
  useEffect(() => {
    if (mitreSearch.length > 1) {
      setMitreResults(search(mitreSearch))
    } else {
      setMitreResults([])
    }
  }, [mitreSearch])

  const selectMitre = (technique) => {
    const isSubTech = technique.id.includes('.')
    const parentId = isSubTech ? technique.id.split('.')[0] : technique.id

    // Get sub-techniques for parent
    const subs = mitreData?.subTechniques?.filter(
      s => s.parentId === parentId
    ) || []
    setSubTechOptions(subs)

    // Get tactic name
    const tacticShort = technique.tactics?.[0] || ''
    const tacticObj = mitreData?.tactics?.find(
      t => t.shortName === tacticShort
    )

    setForm(f => ({
      ...f,
      mitreId: technique.id,
      subTechnique: isSubTech
        ? `${technique.id} - ${technique.name}`
        : '',
      tactic: tacticObj?.name || tacticShort,
    }))

    setMitreSearch('')
    setMitreResults([])
  }

  const handleField = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
  }

  const handleSubmit = () => {
    if (!form.hypoName || !form.mitreId) {
      showToast('Please fill required fields', 'error')
      return
    }
    if (id) {
      update(id, form)
      showToast('Hypothesis updated', 'success')
    } else {
      add(form)
      showToast('Hypothesis saved successfully', 'success')
    }
    setSaved(true)
    setTimeout(() => navigate('/hypotheses'), 1000)
  }

  // ── Section style helpers ──
  const sectionClass = "bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6 mb-6"
  const labelClass = "block text-sm font-medium text-gray-400 mb-1"
  const inputClass = `w-full bg-[#0f1117] border border-[#2a2d3e] 
    rounded-lg px-3 py-2 text-gray-200 text-sm outline-none
    focus:border-indigo-500 transition-colors`

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">
          {id ? '✏️ Edit Hypothesis' : '➕ Add Hypothesis'}
        </h1>
        <button
          onClick={() => navigate('/hypotheses')}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Back
        </button>
      </div>

      {/* SECTION 1: Identity */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-indigo-400 mb-4">
          📌 Section 1 — Identity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Hypo Name */}
          <div className="md:col-span-2">
            <label className={labelClass}>Hypothesis Name *</label>
            <input
              className={inputClass}
              placeholder="e.g. Detect Encoded PowerShell Execution"
              value={form.hypoName}
              onChange={e => handleField('hypoName', e.target.value)}
            />
          </div>

          {/* MITRE ID with autocomplete */}
          <div className="relative">
            <label className={labelClass}>MITRE ATT&CK ID *</label>
            <input
              className={inputClass}
              placeholder="Search T1059 or PowerShell..."
              value={form.mitreId || mitreSearch}
              onChange={e => {
                setMitreSearch(e.target.value)
                handleField('mitreId', e.target.value)
              }}
            />
            {mitreResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-[#1e2130]
                border border-[#2a2d3e] rounded-lg shadow-xl max-h-48
                overflow-y-auto">
                {mitreResults.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectMitre(t)}
                    className="w-full text-left px-3 py-2 text-sm
                      hover:bg-indigo-600/20 border-b border-[#2a2d3e]
                      last:border-0"
                  >
                    <span className="text-indigo-400 font-mono">{t.id}</span>
                    <span className="text-gray-300 ml-2">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sub-technique */}
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

          {/* Tactic (auto-filled) */}
          <div>
            <label className={labelClass}>Tactic (auto-filled)</label>
            <input
              className={`${inputClass} text-indigo-300`}
              placeholder="Auto-filled from MITRE ID"
              value={form.tactic}
              onChange={e => handleField('tactic', e.target.value)}
            />
          </div>

          {/* Month */}
          <div>
            <label className={labelClass}>Hunt Month</label>
            <input
              type="month"
              className={inputClass}
              value={form.month}
              onChange={e => handleField('month', e.target.value)}
            />
          </div>

          {/* Status */}
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={e => handleField('status', e.target.value)}
            >
              {['Planned','Active','Pending','Completed','Closed']
                .map(s => (
                  <option key={s} value={s}>{s}</option>
                ))
              }
            </select>
          </div>

          {/* Planned Date */}
          <div>
            <label className={labelClass}>Planned Date</label>
            <input
              type="date"
              className={inputClass}
              value={form.planned}
              onChange={e => handleField('planned', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Hunt Content */}
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

      {/* SECTION 3: SIEM Queries */}
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

      {/* SECTION 4: Outcome */}
      <div className={sectionClass}>
        <h2 className="text-lg font-semibold text-indigo-400 mb-4">
          🎯 Section 4 — Outcome
        </h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Result</label>
            <div className="flex gap-3">
              {['TP', 'FP', 'Undetermined'].map(r => (
                <button
                  key={r}
                  onClick={() => handleField('result', r)}
                  className={`px-6 py-2 rounded-lg border text-sm font-medium
                    transition-colors ${form.result === r
                      ? r === 'TP'
                        ? 'bg-green-500/30 border-green-500 text-green-400'
                        : r === 'FP'
                        ? 'bg-red-500/30 border-red-500 text-red-400'
                        : 'bg-yellow-500/30 border-yellow-500 text-yellow-400'
                      : 'bg-transparent border-[#2a2d3e] text-gray-400 hover:border-gray-500'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Comments</label>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              placeholder="Add analyst notes, observations, or findings..."
              value={
                Array.isArray(form.comments)
                  ? ''
                  : form.comments
              }
              onChange={e => handleField('comments', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => navigate('/hypotheses')}
          className="px-6 py-2 rounded-lg border border-[#2a2d3e]
            text-gray-400 hover:text-white hover:border-gray-500
            transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-8 py-2 rounded-lg bg-indigo-600
            hover:bg-indigo-700 text-white font-medium
            transition-colors"
        >
          {id ? 'Update Hypothesis' : 'Save Hypothesis'}
        </button>
      </div>
    </div>
  )
}
