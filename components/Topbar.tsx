'use client'

import React from 'react'
import { Search, Menu } from 'lucide-react'
import { useMobiel } from './LayoutShell'

interface TopbarProps {
  titel: string | React.ReactNode
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

      {/* Hoofdrij — altijd zichtbaar */}
      <div className="topbar">
        {/* Hamburger op mobiel */}
        <button className="topbar-hamburger" onClick={toggleSidebar} aria-label="Menu openen">
          <Menu size={22} />
        </button>

        {/* Titel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="topbar-title">{titel}</div>
          {subtitel && <div className="topbar-sub">{subtitel}</div>}
        </div>

        {/* Acties + zoekbalk — op desktop in deze rij, gecentreerd */}
        <div className="topbar-acties-desktop" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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

      {/* Mobiele tweede rij — alleen op kleine schermen */}
      {(acties || zoeken) && (
        <div className="topbar-acties-mobiel">
          {zoeken && (
            <div className="search-bar" style={{ flexShrink: 0, minWidth: 160 }}>
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
