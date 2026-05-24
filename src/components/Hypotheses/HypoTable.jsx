import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Edit, Shield, Trash2 } from 'lucide-react'
import { ResultBadge, StatusBadge } from '../Common/StatusBadge'

const COLUMNS = [
  { key: 'slno', label: 'Sl no' },
  { key: 'hypoName', label: 'Hypothesis Name' },
  { key: 'mitreId', label: 'MITRE ID' },
  { key: 'subTechnique', label: 'Sub Technique' },
  { key: 'tactic', label: 'Tactic' },
  { key: 'month', label: 'Month' },
  { key: 'description', label: 'Description' },
  { key: 'huntingLogic', label: 'Hunting Logic' },
  { key: 'splunkSPL', label: 'Splunk Query' },
  { key: 'qradarAQL', label: 'QRadar Query' },
  { key: 'sentinelKQL', label: 'Sentinel Query' },
  { key: 'status', label: 'Results Or comments' },
  { key: 'socDetectionRule', label: 'SOC/Usecase Rule' },
  { key: 'result', label: 'Results TP/FP/Undetermined' },
]

function HypoTable({ hypotheses = [], onSelect, onEdit, onDelete }) {
  const [sort, setSort] = useState({ key: 'month', direction: 'desc' })
  const [filter, setFilter] = useState('')

  const visibleHypotheses = useMemo(() => {
    const query = filter.trim().toLowerCase()
    const filtered = query
      ? hypotheses.filter(hypothesis =>
          [
            hypothesis.id,
            hypothesis.hypoName,
            hypothesis.mitreId,
            hypothesis.subTechnique,
            hypothesis.month,
            hypothesis.status,
            hypothesis.description,
          ]
            .filter(Boolean)
            .some(value => String(value).toLowerCase().includes(query))
        )
      : hypotheses

    return [...filtered].sort((a, b) => {
      const aValue = String(a[sort.key] || '').toLowerCase()
      const bValue = String(b[sort.key] || '').toLowerCase()

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filter, hypotheses, sort])

  const handleSort = (key) => {
    setSort(current => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleEdit = (event, hypothesis) => {
    event.stopPropagation()
    onEdit?.(hypothesis)
  }

  const handleDelete = (event, id) => {
    event.stopPropagation()
    if (window.confirm('Delete this hypothesis?')) {
      onDelete?.(id)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#2a2d3e] bg-[#1a1d27]">
      <div className="border-b border-[#2a2d3e] bg-[#1a1d27] p-3">
        <input
          className="h-10 w-full max-w-sm rounded-lg border border-[#2a2d3e] bg-[#0f1117] px-3 text-sm text-gray-200 outline-none transition-colors placeholder:text-gray-500 focus:border-indigo-500"
          placeholder="Filter table..."
          value={filter}
          onChange={event => setFilter(event.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[2000px] border-collapse text-left text-sm">
          <thead className="bg-[#0f1117] text-xs uppercase tracking-wide text-gray-400">
            <tr>
              {COLUMNS.map(column => (
                <th
                  key={column.key}
                  className="border-b border-[#2a2d3e] px-4 py-3 font-semibold"
                >
                  <button
                    className="flex items-center gap-1 transition-colors hover:text-gray-200"
                    onClick={() => handleSort(column.key)}
                  >
                    {column.label}
                    <span className="text-[10px] text-gray-500">
                      {sort.key === column.key
                        ? sort.direction === 'asc'
                          ? 'Asc'
                          : 'Desc'
                        : 'Sort'}
                    </span>
                  </button>
                </th>
              ))}
              <th className="border-b border-[#2a2d3e] px-4 py-3 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleHypotheses.map((hypothesis, index) => (
              <tr
                key={hypothesis.id}
                onClick={() => onSelect?.(hypothesis)}
                className={`cursor-pointer border-b border-[#2a2d3e] transition-colors hover:bg-[#252840] ${
                  index % 2 === 0 ? 'bg-[#1a1d27]' : 'bg-[#1e2130]/45'
                }`}
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {index + 1}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="text-left font-bold text-white transition-colors hover:text-indigo-300 max-w-[200px] truncate"
                    onClick={event => {
                      event.stopPropagation()
                      onSelect?.(hypothesis)
                    }}
                    title={hypothesis.hypoName}
                  >
                    {hypothesis.hypoName || 'Untitled Hypothesis'}
                  </button>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-indigo-400 whitespace-nowrap">
                  {hypothesis.mitreId || '--'}
                </td>
                <td className="max-w-[150px] px-4 py-3 text-xs text-gray-400">
                  <span className="line-clamp-2" title={hypothesis.subTechnique}>
                    {hypothesis.subTechnique || '--'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap" title={hypothesis.tactic}>
                  <span className="line-clamp-2 max-w-[150px]">
                    {hypothesis.tactic || '--'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {hypothesis.month || '--'}
                </td>
                <td className="max-w-[200px] px-4 py-3 text-xs text-gray-400">
                  <span className="line-clamp-2" title={hypothesis.description}>
                    {hypothesis.description || '--'}
                  </span>
                </td>
                <td className="max-w-[200px] px-4 py-3 text-xs text-gray-400">
                  <span className="line-clamp-2" title={hypothesis.huntingLogic}>
                    {hypothesis.huntingLogic || '--'}
                  </span>
                </td>
                <td className="max-w-[150px] px-4 py-3 text-xs text-gray-400 font-mono">
                  <span className="line-clamp-2" title={hypothesis.splunkSPL}>
                    {hypothesis.splunkSPL || '--'}
                  </span>
                </td>
                <td className="max-w-[150px] px-4 py-3 text-xs text-gray-400 font-mono">
                  <span className="line-clamp-2" title={hypothesis.qradarAQL}>
                    {hypothesis.qradarAQL || '--'}
                  </span>
                </td>
                <td className="max-w-[150px] px-4 py-3 text-xs text-gray-400 font-mono">
                  <span className="line-clamp-2" title={hypothesis.sentinelKQL}>
                    {hypothesis.sentinelKQL || '--'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {/* Results Or Comments placeholder mapped to Status for now as discussed */}
                  <StatusBadge status={hypothesis.status} />
                </td>
                <td className="max-w-[150px] px-4 py-3 text-xs text-gray-400">
                  <span className="line-clamp-2" title={hypothesis.socDetectionRule}>
                    {hypothesis.socDetectionRule || '--'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {hypothesis.result ? <ResultBadge result={hypothesis.result} /> : <span className="text-gray-600">--</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      aria-label="Edit hypothesis"
                      className="rounded-md p-2 text-gray-400 transition-colors hover:bg-indigo-500/20 hover:text-indigo-300"
                      onClick={event => handleEdit(event, hypothesis)}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      aria-label="Delete hypothesis"
                      className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
                      onClick={event => handleDelete(event, hypothesis.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {visibleHypotheses.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + 1}
                  className="px-4 py-16"
                >
                  <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                    <div className="mb-4 rounded-full border border-indigo-500/30 bg-indigo-500/10 p-4 text-indigo-400">
                      <Shield size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      No hypotheses found
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">
                      Try adjusting filters or add a new hypothesis
                    </p>
                    <Link
                      to="/add"
                      className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      Add Hypothesis
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default HypoTable
