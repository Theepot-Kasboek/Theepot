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

const WIEL_RADIUS = 110  // px afstand van centrum tot items
const ITEM_SIZE = 48     // px diameter van elk item

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

  // Verdeel items over een halve cirkel links van het knopje (van boven naar beneden)
  // Hoek: van -90deg (boven) naar +90deg (onder), gespiegeld naar links
  function getPos(idx: number) {
    const startAngle = -80
    const endAngle = 80
    const angle = n === 1 ? 0 : startAngle + (idx / (n - 1)) * (endAngle - startAngle)
    const rad = (angle * Math.PI) / 180
    // Items waaieren naar links: x negatief
    const x = -Math.cos(rad) * WIEL_RADIUS
    const y = Math.sin(rad) * WIEL_RADIUS
    return { x, y }
  }

  const hoveredItem = zichtbareItems.find(i => i.href === hoveredHref)

  return (
    <>
      {/* Backdrop bij open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 498, background: 'rgba(0,0,0,0.25)' }}
        />
      )}

      <div
        ref={ref}
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 499,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Wiel items */}
        {open && zichtbareItems.map((item, idx) => {
          const { x, y } = getPos(idx)
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
                boxShadow: isHovered ? '0 4px 16px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isHovered ? '#fff' : 'var(--text)',
                textDecoration: 'none',
                transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
                transition: 'all 0.15s ease',
                animation: `wieldItem 0.2s ease ${idx * 15}ms both`,
              }}
            >
              {item.icon}
            </Link>
          )
        })}

        {/* Label van hovered item */}
        {open && hoveredItem && (
          <div style={{
            position: 'absolute',
            right: 64,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
          }}>
            {hoveredItem.label}
          </div>
        )}

        {/* Centraal knopje */}
        <button
          onClick={() => setOpen(o => !o)}
          title="Snelle navigatie (Cmd+G)"
          style={{
            position: 'relative',
            zIndex: 1,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: open ? '#DC2626' : 'var(--primary)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            transition: 'background 0.2s, transform 0.2s',
            color: '#fff',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          {open ? <X size={20} /> : <Zap size={20} />}
        </button>
      </div>

      <style>{`
        @keyframes wieldItem {
          from { opacity: 0; transform: translate(calc(var(--tx, 0px) - 50%), calc(var(--ty, 0px) - 50%)) scale(0.6); }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  )
}
