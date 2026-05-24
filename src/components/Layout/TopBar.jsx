import { useMemo, useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Menu, Search } from 'lucide-react'
import { useHypotheses } from '../../hooks/useHypotheses'
import { StatusBadge } from '../Common/StatusBadge'
import { goToPath } from '../../utils/goTo'

const pageNames = [
  { match: (pathname) => pathname === '/', name: 'Dashboard' },
  { match: (pathname) => pathname === '/hypotheses', name: 'Hypotheses' },
  { match: (pathname) => pathname === '/coverage', name: 'MITRE Coverage' },
  { match: (pathname) => pathname === '/campaigns', name: 'Campaigns' },
  { match: (pathname) => pathname === '/import', name: 'Import / Export' },
  { match: (pathname) => pathname === '/add', name: 'Add Hypothesis' },
  { match: (pathname) => pathname.startsWith('/edit/'), name: 'Edit Hypothesis' },
]

function TopBar({ toggleSidebar }) {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { hypotheses } = useHypotheses()

  const isFormPage = pathname === '/add' || pathname.startsWith('/edit/')
  const formBackPath =
    searchParams.get('from') === 'campaigns' ? '/campaigns' : '/hypotheses'

  const handleFormBack = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    goToPath(formBackPath)
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  
  const searchRef = useRef(null)
  const inputRef = useRef(null)

  const pageName =
    pageNames.find((item) => item.match(pathname))?.name ?? 'Threat Hunt Manager'

  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    [],
  )

  // Filter hypotheses
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return []
    const lowerQuery = searchQuery.toLowerCase()
    
    return hypotheses.filter((h) => 
      (h.hypoName || '').toLowerCase().includes(lowerQuery) ||
      (h.mitreId || '').toLowerCase().includes(lowerQuery) ||
      (h.subTechnique || '').toLowerCase().includes(lowerQuery) ||
      (h.tactic || '').toLowerCase().includes(lowerQuery)
    ).slice(0, 6)
  }, [searchQuery, hypotheses])

  // Keyboard Shortcuts (Ctrl+K and Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleResultClick = (id) => {
    navigate(`/hypotheses?selected=${id}`)
    setIsSearchOpen(false)
    setSearchQuery('')
  }

  return (
    <header className="fixed left-0 md:left-[240px] right-0 top-0 z-10 flex h-[60px] items-center justify-between border-b border-border bg-bg-secondary px-4 md:px-6 gap-4">
      
      {/* Left side: Hamburger + Back (form pages) + Page Name */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <button
          type="button"
          className="md:hidden text-gray-400 hover:text-white shrink-0"
          onClick={toggleSidebar}
        >
          <Menu size={24} />
        </button>
        {isFormPage && (
          <a
            href={formBackPath}
            onClick={handleFormBack}
            className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-[#2a2d3e] bg-[#1a1d27] px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:border-indigo-500/50 hover:bg-[#252840] transition-colors no-underline"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </a>
        )}
        <h1 className="text-lg font-semibold text-textprimary hidden md:block shrink-0 whitespace-nowrap truncate">
          {pageName}
        </h1>
      </div>

      {/* Center: Global Search */}
      <div ref={searchRef} className="relative flex-1 max-w-[400px]">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search hypotheses, MITRE IDs..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full bg-[#0f1117] border border-[#2a2d3e] focus:border-indigo-500 rounded-lg py-2 pl-10 pr-14 text-sm text-gray-200 outline-none transition-colors placeholder:text-gray-500"
          />
          <div className="absolute right-2 flex items-center">
            <span className="text-[10px] font-medium text-gray-500 border border-[#2a2d3e] rounded px-1.5 py-0.5 bg-[#1a1d27] hidden sm:block">
              Ctrl+K
            </span>
          </div>
        </div>
        
        {/* Search Results Dropdown */}
        {isSearchOpen && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e2130] border border-[#2a2d3e] rounded-xl shadow-2xl overflow-hidden z-50">
            {searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result.id)}
                    className="w-full text-left flex items-center justify-between px-4 py-3 hover:bg-indigo-500/10 transition-colors gap-3 border-b border-[#2a2d3e] last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] rounded font-bold shrink-0">
                        {result.mitreId || '--'}
                      </span>
                      <span className="text-sm font-medium text-white truncate">
                        {result.hypoName || 'Untitled'}
                      </span>
                    </div>
                    <div className="shrink-0 scale-90 origin-right">
                      <StatusBadge status={result.status} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                No results found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: Date */}
      <time className="text-sm text-textsecondary hidden lg:block shrink-0">{currentDate}</time>
    </header>
  )
}

export default TopBar
