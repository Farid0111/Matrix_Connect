import type { Section } from '../types'

interface SidebarProps {
  active: Section
  onChange: (section: Section) => void
  onRefresh: () => void
  loading?: boolean
}

function IconTable() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9.5h18M9 9.5v10.5M15 9.5v10.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconCharts() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 19V5M4 19h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 15v-3M12 15V8M16 15v-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconTrophy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 6H5a2 2 0 0 0 2 4M17 6h2a2 2 0 0 1-2 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconRefresh({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      className={spinning ? 'spin' : undefined}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 12a8 8 0 1 1-2.2-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M20 4v5h-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const ITEMS: {
  id: Section
  label: string
  hint: string
  icon: typeof IconTable
}[] = [
  { id: 'table', label: 'Tableau', hint: 'Inscriptions', icon: IconTable },
  { id: 'charts', label: 'Graphiques', hint: 'Analyse', icon: IconCharts },
  { id: 'ceremony', label: 'Cérémonie', hint: 'Meilleurs clients', icon: IconTrophy },
]

export function Sidebar({ active, onChange, onRefresh, loading }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark" aria-hidden="true">
          M
        </span>
        <div className="sidebar-brand-text">
          <strong>Matrix</strong>
          <span>WiFi Dashboard</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Navigation principale">
        <p className="sidebar-section-label">Navigation</p>
        {ITEMS.map(({ id, label, hint, icon: Icon }) => (
          <button
            key={id}
            className={`menu-item${active === id ? ' active' : ''}`}
            onClick={() => onChange(id)}
            type="button"
            aria-current={active === id ? 'page' : undefined}
          >
            <span className="menu-icon">
              <Icon />
            </span>
            <span className="menu-text">
              <span className="menu-label">{label}</span>
              <span className="menu-hint">{hint}</span>
            </span>
            <span className="menu-indicator" aria-hidden="true" />
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="refresh-btn"
          onClick={onRefresh}
          type="button"
          disabled={loading}
          title="Actualiser les données"
        >
          <IconRefresh spinning={loading} />
          <span>Actualiser</span>
        </button>
      </div>
    </aside>
  )
}
