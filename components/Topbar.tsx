'use client'

import { Search } from 'lucide-react'

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
  return (
    <div className="topbar">
      <div style={{ flex: 1 }}>
        <div className="topbar-title">{titel}</div>
        {subtitel && <div className="topbar-sub">{subtitel}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
