import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import HypoDetail from '../components/Hypotheses/HypoDetail'
import HypoTable from '../components/Hypotheses/HypoTable'
import { useHypotheses } from '../hooks/useHypotheses'
import { addComment, updateHypothesis } from '../services/storage'
import { exportToExcel } from '../utils/excel'
import Spinner from '../components/Common/Spinner'
import QuickImport from '../components/Common/QuickImport'
import { FileSpreadsheet } from 'lucide-react'

function Hypotheses() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { hypotheses, loading, remove, refresh } = useHypotheses()
  const [selectedHypo, setSelectedHypo] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [filterTactic, setFilterTactic] = useState('')

  useEffect(() => {
    const selectedId = searchParams.get('selected')
    if (selectedId && hypotheses.length > 0) {
      const found = hypotheses.find(h => h.id === selectedId)
      if (found) setSelectedHypo(found)
    }
  }, [searchParams, hypotheses])

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
          hypothesis.hypoName,
          hypothesis.mitreId,
          hypothesis.subTechnique,
          hypothesis.tactic,
          hypothesis.description,
        ]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query))

      return (
        matchesSearch &&
        (!filterTactic || hypothesis.tactic === filterTactic)
      )
    })
  }, [filterTactic, hypotheses, searchText])

  const handleSelect = (hypothesis) => {
    setSelectedHypo(hypothesis)
  }

  const handleAddComment = async (id, text, analyst) => {
    await addComment(id, text, analyst)
    await refresh()
    const updated = hypotheses.find(h => h.id === id)
    if (updated) setSelectedHypo(updated)
  }

  const selectClass =
    'h-10 rounded-lg border border-border bg-bg-primary px-3 text-sm text-textprimary outline-none transition-colors focus:border-accent-primary'

  if (loading && hypotheses.length === 0) {
    return <Spinner size="lg" text="Loading hunt library..." />
  }

  return (
    <section className="min-h-full bg-bg-primary text-textprimary">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Hypothesis Library</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Master catalog of all hunt definitions across every month. Monthly assignments and lead uploads are managed on the Campaigns page.
          </p>
          <span className="inline-block mt-2 rounded-full border border-accent-primary/30 bg-accent-primary/20 px-3 py-1 text-xs font-semibold text-accent-glow">
            {hypotheses.length} hunts in library
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              exportToExcel(filteredHypotheses, 'Hypothesis_Library', 'hypotheses')
            }}
            disabled={filteredHypotheses.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-500/50 text-green-400 hover:bg-green-500/10 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <div className="w-px h-6 bg-[#2a2d3e]" />
          <QuickImport mode="hypotheses" onDone={refresh} />
          <Link
            to="/add"
            className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover shadow-lg"
          >
            Add to Library
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-bg-secondary p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <select
            className={`${selectClass} max-w-xs`}
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

          <input
            className="h-10 w-full rounded-lg border border-border bg-bg-primary px-3 text-sm text-textprimary outline-none transition-colors placeholder:text-textsecondary focus:border-accent-primary xl:max-w-md"
            placeholder="Search by name, MITRE ID, tactic..."
            value={searchText}
            onChange={event => setSearchText(event.target.value)}
          />
        </div>
      </div>

      <HypoTable
        variant="library"
        hypotheses={filteredHypotheses}
        onSelect={handleSelect}
        onEdit={hypothesis => navigate(`/edit/${hypothesis.id}`)}
        onDelete={id => remove(id)}
      />

      <HypoDetail
        hypothesis={selectedHypo}
        onClose={() => setSelectedHypo(null)}
        onEdit={(hypo) => navigate(`/edit/${hypo.id}`)}
        onSaveSuccess={refresh}
        comments={selectedHypo?.comments}
        onAddComment={handleAddComment}
      />
    </section>
  )
}

export default Hypotheses
