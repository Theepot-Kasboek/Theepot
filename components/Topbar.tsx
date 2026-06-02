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
    <div className="topbar">
      {/* Hamburger op mobiel */}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {zoeken && (
          <div className="search-bar">
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder={zoeken.placeholder ?? 'Zoeken...'}
              value={zoeken.waarde}
              onChange={(e) => zoeken.onChange(e.target.value)}
            />
          </div>
        )}
        {acties}
      </div>
    </div>
  )
}
