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
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/prikbord', label: 'Prikbord', icon: <Pin size={18} />, vereistRecht: 'pagina_prikbord' },
  { href: '/zoeken', label: 'Zoeken', icon: <Search size={18} /> },
  { href: '/kasboek', label: 'Kasboek', icon: <Wallet size={18} />, vereistRecht: 'pagina_kasboek' },
  { href: '/maaltijdlijst', label: 'Maaltijdlijst', icon: <UtensilsCrossed size={18} />, vereistRecht: 'pagina_maaltijdlijst' },
  { href: '/beleid', label: 'Beleidsstukken', icon: <FileText size={18} />, vereistRecht: 'pagina_beleid' },
  { href: '/brandoefening', label: 'Brandoefening', icon: <Flame size={18} />, vereistRecht: 'pagina_brandoefening' },
  { href: '/kilometerstanden', label: 'Kilometerstanden', icon: <Gauge size={18} /> },
  { href: '/activiteiten-log', label: 'Activiteitenlog', icon: <Activity size={18} />, vereistRecht: 'pagina_activiteiten_log' },
  { href: '/gesprekken', label: '10-minutengesprekken', icon: <MessageCircle size={18} /> },
  { href: '/vakantieplanningen', label: 'Vakantieplanningen', icon: <Map size={18} /> },
  { href: '/weekplanningen', label: 'Weekplanningen', icon: <Scissors size={18} /> },
  { href: '/activiteiten', label: 'Activiteitenbeheer', icon: <BookOpen size={18} />, vereistRecht: 'pagina_activiteiten' },
  { href: '/ve-planning', label: 'VE Planning', icon: <Layers size={18} />, vereistRecht: 'pagina_ve_planning' },
  { href: '/agenda', label: 'Agenda', icon: <Calendar size={18} />, vereistRecht: 'pagina_agenda' },
  { href: '/taken', label: 'Taken & Notities', icon: <CheckSquare size={18} /> },
  { href: '/chat', label: 'Chat', icon: <MessageSquare size={18} />, vereistRecht: 'pagina_chat' },
  { href: '/nieuwsbrieven', label: 'Nieuwsbrieven', icon: <Newspaper size={18} />, vereistRecht: 'pagina_nieuwsbrieven' },
  { href: '/notulen', label: 'Notulen', icon: <ClipboardList size={18} /> },
  { href: '/medewerkers', label: 'Medewerkers', icon: <Users size={18} />, superadminOnly: true },
  { href: '/rechten', label: 'Rechtenbeheer', icon: <ShieldCheck size={18} />, superadminOnly: true },
]

const ITEM_SIZE = 48
const WIEL_RADIUS = 130

export default function SpeedDial() {
  const [open, setOpen] = useState(false)
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)
  const { rechten, isSuperadmin } = useAuth()
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const zichtbareItems = ALLE_ITEMS.filter(item => {
    if (item.superadminOnly && !isSuperadmin) return false
    if (item.vereistRecht) {
      const recht = (rechten as unknown as Record<string, string>)[item.vereistRecht]
      if (recht === 'geen') return false
    }
    if (item.href === pathname) return false
    return true
  })

  const n = zichtbareItems.length
  const hoveredItem = zichtbareItems.find(i => i.href === hoveredHref)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 498, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Wiel — verschijnt in midden van scherm bij open */}
      {open && (
        <div
          ref={ref}
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 500,
            width: 0,
            height: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Cirkelvormige items */}
          {zichtbareItems.map((item, idx) => {
            const angle = (idx / n) * 360 - 90
            const rad = (angle * Math.PI) / 180
            const x = Math.cos(rad) * WIEL_RADIUS
            const y = Math.sin(rad) * WIEL_RADIUS
            const isHovered = hoveredHref === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                onMouseEnter={() => setHoveredHref(item.href)}
                onMouseLeave={() => setHoveredHref(null)}
                style={{
                  position: 'absolute',
                  width: ITEM_SIZE,
                  height: ITEM_SIZE,
                  borderRadius: '50%',
                  background: isHovered ? 'var(--primary)' : 'var(--bg-card)',
                  border: `2px solid ${isHovered ? 'var(--primary)' : 'var(--border)'}`,
                  boxShadow: isHovered ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isHovered ? '#fff' : 'var(--text)',
                  textDecoration: 'none',
                  left: `calc(${x}px - ${ITEM_SIZE / 2}px)`,
                  top: `calc(${y}px - ${ITEM_SIZE / 2}px)`,
                  transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                  animation: `wieldItem 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 20}ms both`,
                }}
              >
                {item.icon}
              </Link>
            )
          })}

          {/* Label midden */}
          <div style={{
            position: 'absolute',
            textAlign: 'center',
            pointerEvents: 'none',
            width: 120,
            left: -60,
            top: -12,
          }}>
            {hoveredItem ? (
              <span style={{
                fontSize: 12, fontWeight: 700, color: 'var(--text)',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '3px 10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'inline-block',
              }}>
                {hoveredItem.label}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Kies een pagina</span>
            )}
          </div>

          {/* Sluit knop in midden */}
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              width: 44, height: 44,
              borderRadius: '50%',
              background: '#DC2626',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(220,38,38,0.4)',
              left: -22, top: -22,
              zIndex: 1,
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Trigger knopje — altijd zichtbaar aan rechterkant, half verborgen */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Snelle navigatie (Cmd+G)"
          style={{
            position: 'fixed',
            right: -16,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 499,
            width: 44, height: 44,
            borderRadius: '50%',
            background: 'var(--primary)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '-2px 0 16px rgba(0,0,0,0.2)',
            color: '#fff',
            transition: 'right 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.right = '0px')}
          onMouseLeave={e => (e.currentTarget.style.right = '-16px')}
        >
          <Zap size={20} />
        </button>
      )}

      <style>{`
        @keyframes wieldItem {
          from { opacity: 0; transform: scale(0.3); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
