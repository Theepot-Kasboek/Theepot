'use client'

import { Search, Menu } from 'lucide-react'
import { useMobiel } from './LayoutShell'

interface TopbarProps {
  titel: string
  subtitel?: string
  acties?: React.ReactNode
  zoeken?: {
    placeholder?: string
    waarde: string
    onChange: (v: string) => void
  }
}

export default function Topbar({ titel, subtitel, acties, zoeken }: TopbarProps) {
  const { toggleSidebar } = useMobiel()

  return (
    <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      {/* Eerste rij: hamburger + titel */}
      <div className="topbar">
        <button
          className="topbar-hamburger"
          onClick={toggleSidebar}
          aria-label="Menu openen"
        >
          <Menu size={22} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="topbar-title">{titel}</div>
          {subtitel && <div className="topbar-sub">{subtitel}</div>}
        </div>

        {/* Zoekbalk alleen op desktop */}
        {zoeken && (
          <div className="search-bar topbar-zoek-desktop">
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder={zoeken.placeholder ?? 'Zoeken...'}
              value={zoeken.waarde}
              onChange={(e) => zoeken.onChange(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Tweede rij: acties (scrollbaar op mobiel) */}
      {(acties || zoeken) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px 10px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
          className="topbar-acties-rij"
        >
          {/* Zoekbalk op mobiel in tweede rij */}
          {zoeken && (
            <div className="search-bar topbar-zoek-mobiel" style={{ flexShrink: 0, minWidth: 160 }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                placeholder={zoeken.placeholder ?? 'Zoeken...'}
                value={zoeken.waarde}
                onChange={(e) => zoeken.onChange(e.target.value)}
                style={{ width: 120 }}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {acties}
          </div>
        </div>
      )}
    </div>
  )
}
