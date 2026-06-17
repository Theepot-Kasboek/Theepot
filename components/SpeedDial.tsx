'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'
import {
  Zap, X, LayoutDashboard, Pin, Wallet, UtensilsCrossed,
  FileText, Flame, Gauge, Activity, MessageCircle, Map,
  Scissors, BookOpen, Layers, Calendar, CheckSquare,
  MessageSquare, Newspaper, ClipboardList, Users, ShieldCheck,
  Search,
} from 'lucide-react'

interface SpeedDialItem {
  href: string
  label: string
  icon: React.ReactNode
  vereistRecht?: string
  superadminOnly?: boolean
}

const ALLE_ITEMS: SpeedDialItem[] = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { href: '/prikbord', label: 'Prikbord', icon: <Pin size={15} />, vereistRecht: 'pagina_prikbord' },
  { href: '/zoeken', label: 'Zoeken', icon: <Search size={15} /> },
  { href: '/kasboek', label: 'Kasboek', icon: <Wallet size={15} />, vereistRecht: 'pagina_kasboek' },
  { href: '/maaltijdlijst', label: 'Maaltijdlijst', icon: <UtensilsCrossed size={15} />, vereistRecht: 'pagina_maaltijdlijst' },
  { href: '/beleid', label: 'Beleidsstukken', icon: <FileText size={15} />, vereistRecht: 'pagina_beleid' },
  { href: '/brandoefening', label: 'Brandoefening', icon: <Flame size={15} />, vereistRecht: 'pagina_brandoefening' },
  { href: '/kilometerstanden', label: 'Kilometerstanden', icon: <Gauge size={15} /> },
  { href: '/activiteiten-log', label: 'Activiteitenlog', icon: <Activity size={15} />, vereistRecht: 'pagina_activiteiten_log' },
  { href: '/gesprekken', label: '10-minutengesprekken', icon: <MessageCircle size={15} /> },
  { href: '/vakantieplanningen', label: 'Vakantieplanningen', icon: <Map size={15} /> },
  { href: '/weekplanningen', label: 'Weekplanningen', icon: <Scissors size={15} /> },
  { href: '/activiteiten', label: 'Activiteitenbeheer', icon: <BookOpen size={15} />, vereistRecht: 'pagina_activiteiten' },
  { href: '/ve-planning', label: 'VE Planning', icon: <Layers size={15} />, vereistRecht: 'pagina_ve_planning' },
  { href: '/agenda', label: 'Agenda', icon: <Calendar size={15} />, vereistRecht: 'pagina_agenda' },
  { href: '/taken', label: 'Taken & Notities', icon: <CheckSquare size={15} /> },
  { href: '/chat', label: 'Chat', icon: <MessageSquare size={15} />, vereistRecht: 'pagina_chat' },
  { href: '/nieuwsbrieven', label: 'Nieuwsbrieven', icon: <Newspaper size={15} />, vereistRecht: 'pagina_nieuwsbrieven' },
  { href: '/notulen', label: 'Notulen', icon: <ClipboardList size={15} /> },
  { href: '/medewerkers', label: 'Medewerkers', icon: <Users size={15} />, superadminOnly: true },
  { href: '/rechten', label: 'Rechtenbeheer', icon: <ShieldCheck size={15} />, superadminOnly: true },
]

export default function SpeedDial() {
  const [open, setOpen] = useState(false)
  const [zoek, setZoek] = useState('')
  const { rechten, isSuperadmin } = useAuth()
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)
  const zoekRef = useRef<HTMLInputElement>(null)

  // Sluit bij klik buiten
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sluit bij navigatie
  useEffect(() => { setOpen(false); setZoek('') }, [pathname])

  // Focus zoekbalk bij openen
  useEffect(() => {
    if (open) setTimeout(() => zoekRef.current?.focus(), 100)
  }, [open])

  // Keyboard shortcut: G opent het wieltje
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const zichtbareItems = ALLE_ITEMS.filter(item => {
    if (item.superadminOnly && !isSuperadmin) return false
    if (item.vereistRecht) {
      const recht = (rechten as Record<string, string>)[item.vereistRecht]
      if (recht === 'geen') return false
    }
    if (item.href === pathname) return false
    if (zoek.trim()) {
      return item.label.toLowerCase().includes(zoek.toLowerCase())
    }
    return true
  })

  return (
    <div ref={ref} style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 500 }}>
      {/* Popup */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 60, right: 0,
          width: 280, background: 'var(--bg-card)',
          borderRadius: 16, border: '1px solid var(--border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          animation: 'fadeInUp 0.15s ease',
        }}>
          {/* Zoekbalk */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <input
              ref={zoekRef}
              value={zoek}
              onChange={e => setZoek(e.target.value)}
              placeholder="Zoek pagina..."
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 8,
                border: '1px solid var(--border-dark)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 12, outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>

          {/* Items */}
          <div style={{ maxHeight: 340, overflowY: 'auto', padding: '6px 0' }}>
            {zichtbareItems.length === 0 ? (
              <div style={{ padding: '16px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Geen pagina's gevonden
              </div>
            ) : zichtbareItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', textDecoration: 'none',
                  color: 'var(--text)', fontSize: 13,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-xlight)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: 'var(--primary)', flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div style={{ padding: '6px 14px 8px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)' }}>
            Cmd+G om te openen · Esc om te sluiten
          </div>
        </div>
      )}

      {/* Trigger knop */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Snelle navigatie (Cmd+G)"
        style={{
          width: 48, height: 48, borderRadius: '50%',
          background: open ? 'var(--primary-text)' : 'var(--primary)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          transition: 'transform 0.2s, background 0.2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          color: '#fff',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = open ? 'rotate(45deg) scale(1.08)' : 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = open ? 'rotate(45deg)' : 'rotate(0deg)')}
      >
        {open ? <X size={20} /> : <Zap size={20} />}
      </button>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
