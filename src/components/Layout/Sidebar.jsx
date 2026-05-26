import { X } from 'lucide-react'

const navItems = [
  { to: '/', label: '🏠 Dashboard', end: true },
  { to: '/hypotheses', label: '📋 Hypotheses' },
  { to: '/coverage', label: '🛡️ MITRE Coverage' },
  { to: '/campaigns', label: '📅 Monthly' },
  { to: '/ai-hub', label: '🧠 AI Hub' },
  { to: '/import', label: '📥 Import / Export' },
]

function Sidebar({ isOpen, onClose }) {
  const navClassName = ({ isActive }) =>
    [
      'block rounded-md px-4 py-3 text-sm font-medium transition-colors',
      isActive
        ? 'bg-accent-primary text-white'
        : 'text-textsecondary hover:bg-bg-hover hover:text-textprimary',
    ].join(' ')

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-50 flex h-screen w-[240px] flex-col border-r border-border bg-bg-secondary transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-5 text-xl font-bold text-accent-primary">
          🛡️ ThreatHunt
          <button className="text-gray-400 hover:text-white md:hidden" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-3">
          {navItems.map((item) => {
            const isActive = item.to === '/' ? window.location.pathname === '/' : window.location.pathname.startsWith(item.to);
            return (
              <a
                key={item.to}
                href={item.to}
                className={navClassName({ isActive })}
                onClick={onClose}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 hidden md:block">
          <a
            href="/add"
            onClick={onClose}
            className={
              [
                'block rounded-md px-4 py-3 text-center text-sm font-semibold text-white transition-colors',
                window.location.pathname.startsWith('/add')
                  ? 'bg-accent-hover'
                  : 'bg-accent-primary hover:bg-accent-hover',
              ].join(' ')
            }
          >
            ➕ Add Hypothesis
          </a>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
