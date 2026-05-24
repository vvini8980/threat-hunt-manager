import { normalizeMonth } from '../services/storage'

export const EMPTY_HYPOTHESIS_FORM = {
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
  clientName: '',
  assignedAnalyst: '',
  isGeneral: false,
}

const toDateInput = (value) => {
  if (!value) return ''
  const str = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return ''
}

const toMonthInput = (value) => {
  if (!value) return new Date().toISOString().slice(0, 7)
  if (/^\d{4}-\d{2}$/.test(String(value))) return String(value)
  return normalizeMonth(value)
}

/** Map DB / assignment record → Add/Edit form state */
export const recordToForm = (record, overrides = {}) => {
  if (!record) return { ...EMPTY_HYPOTHESIS_FORM, ...overrides }

  return {
    ...EMPTY_HYPOTHESIS_FORM,
    hypoName: record.hypoName || '',
    mitreId: record.mitreId || '',
    subTechnique: record.subTechnique || '',
    tactic: record.tactic || '',
    month: toMonthInput(record.month),
    status: record.status || 'Planned',
    planned: toDateInput(record.planned),
    description: record.description || '',
    huntingLogic: record.huntingLogic || '',
    socDetectionRule: record.socDetectionRule || '',
    splunkSPL: record.splunkSPL || '',
    qradarAQL: record.qradarAQL || '',
    sentinelKQL: record.sentinelKQL || '',
    result: record.result || '',
    comments: Array.isArray(record.comments) ? record.comments : [],
    clientName: record.clientName || '',
    assignedAnalyst: record.assignedAnalyst || '',
    isGeneral: Boolean(record.isGeneral),
    ...overrides,
  }
}
