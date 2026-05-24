import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import HypoDetail from '../components/Hypotheses/HypoDetail'
import HypoTable from '../components/Hypotheses/HypoTable'
import { useHypotheses } from '../hooks/useHypotheses'
import { addComment, seedTestData, updateHypothesis } from '../services/storage'
import Spinner from '../components/Common/Spinner'
import QuickImport from '../components/Common/QuickImport'

const STATUS_OPTIONS = ['Planned', 'Active', 'Pending', 'Completed', 'Closed']
const RESULT_OPTIONS = ['TP', 'FP', 'Undetermined']

function Hypotheses() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { hypotheses, remove, refresh } = useHypotheses()
  const [loading, setLoading] = useState(true)
  const [selectedHypo, setSelectedHypo] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTactic, setFilterTactic] = useState('')

  useEffect(() => {
    seedTestData()
    refresh()
    setLoading(false)
  }, [refresh])

  useEffect(() => {
    const selectedId = searchParams.get('selected')
    if (selectedId && hypotheses.length > 0) {
      const found = hypotheses.find(h => h.id === selectedId)
      if (found) setSelectedHypo(found)
    }
  }, [searchParams, hypotheses])

  const monthOptions = useMemo(
    () =>
      [...new Set(hypotheses.map(hypothesis => hypothesis.month).filter(Boolean))]
        .sort((a, b) => b.localeCompare(a)),
    [hypotheses],
  )

  const tacticOptions = useMemo(
    () =>
      [...new Set(hypotheses.map(hypothesis => hypothesis.tactic).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b)),
    [hypotheses],
  )

  const filteredHypotheses = useMemo(() => {
    const query = searchText.trim().toLowerCase()

    return hypotheses.filter(hypothesis => {
      const matchesSearch =
        !query ||
        [
          hypothesis.id,
          hypothesis.hypoName,
          hypothesis.mitreId,
          hypothesis.subTechnique,
          hypothesis.tactic,
          hypothesis.month,
          hypothesis.status,
          hypothesis.result,
        ]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query))

      return (
        matchesSearch &&
        (!filterMonth || hypothesis.month === filterMonth) &&
        (!filterStatus || hypothesis.status === filterStatus) &&
        (!filterTactic || hypothesis.tactic === filterTactic)
      )
    })
  }, [
    filterMonth,
    filterStatus,
    filterTactic,
    hypotheses,
    searchText,
  ])

  const handleSelect = (hypothesis) => {
    setSelectedHypo(hypothesis)
    console.log('Selected hypothesis id:', hypothesis.id)
  }

  const handleStatusChange = (newStatus) => {
    if (!selectedHypo) return

    const updated = updateHypothesis(selectedHypo.id, { status: newStatus })
    refresh()
    setSelectedHypo(updated)
  }

  const handleAddComment = (id, text, analyst) => {
    const updated = addComment(id, text, analyst)
    refresh()
    setSelectedHypo(updated)
  }

  const selectClass =
    'h-10 rounded-lg border border-border bg-bg-primary px-3 text-sm text-textprimary outline-none transition-colors focus:border-accent-primary'

  if (loading) {
    return <Spinner size="lg" text="Loading hypotheses data..." />
  }

  return (
    <section className="min-h-full bg-bg-primary text-textprimary">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">Hypotheses</h2>
          <span className="rounded-full border border-accent-primary/30 bg-accent-primary/20 px-3 py-1 text-xs font-semibold text-accent-glow">
            {hypotheses.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <QuickImport mode="hypotheses" onDone={refresh} />
          <Link
            to="/add"
            className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Add New
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className={selectClass}
              value={filterMonth}
              onChange={event => setFilterMonth(event.target.value)}
            >
              <option value="">All Months</option>
              {monthOptions.map(month => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>

            <select
              className={selectClass}
              value={filterStatus}
              onChange={event => setFilterStatus(event.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              className={selectClass}
              value={filterTactic}
              onChange={event => setFilterTactic(event.target.value)}
            >
              <option value="">All Tactics</option>
              {tacticOptions.map(tactic => (
                <option key={tactic} value={tactic}>
                  {tactic}
                </option>
              ))}
            </select>
          </div>

          <input
            className="h-10 w-full rounded-lg border border-border bg-bg-primary px-3 text-sm text-textprimary outline-none transition-colors placeholder:text-textsecondary focus:border-accent-primary xl:max-w-xs"
            placeholder="Search hypotheses..."
            value={searchText}
            onChange={event => setSearchText(event.target.value)}
          />
        </div>
      </div>

      <HypoTable
        hypotheses={filteredHypotheses}
        onSelect={handleSelect}
        onEdit={hypothesis => navigate(`/edit/${hypothesis.id}`)}
        onDelete={id => remove(id)}
      />

      <HypoDetail
        hypothesis={selectedHypo}
        onClose={() => setSelectedHypo(null)}
        onEdit={() => selectedHypo && navigate(`/edit/${selectedHypo.id}`)}
        currentStatus={selectedHypo?.status}
        onStatusChange={handleStatusChange}
        comments={selectedHypo?.comments}
        onAddComment={handleAddComment}
      />
    </section>
  )
}

export default Hypotheses
