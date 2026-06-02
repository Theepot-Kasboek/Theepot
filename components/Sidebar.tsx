'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Wallet, Map, BookOpen,
  Calendar, MessageSquare, ShieldCheck,
  Users, LogOut, Sun, Moon, UtensilsCrossed, Scissors, MessageCircle,
} from 'lucide-react'
import { useAuth } from './AuthProvider'
import { useTheme } from './ThemeProvider'
import { getSupabase, ROL_LABELS } from '@/lib/supabase'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string | number
  superadminOnly?: boolean
  notificatie?: number
}

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const { profiel, isSuperadmin, loading, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [ongelezen, setOngelezen] = useState(0)

  const initialen = profiel?.naam
    ? profiel.naam.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  // ── Ongelezen berichten ophalen ──────────────────────────────────────────────
  useEffect(() => {
    if (!profiel) return

    async function haalOngelezen() {
      const supabase = getSupabase()

      // Gesprekken waar gebruiker deelnemer van is
      const { data: deelnemerData } = await supabase
        .from('chat_deelnemers')
        .select('gesprek_id')
        .eq('profiel_id', profiel!.id)

      if (!deelnemerData || deelnemerData.length === 0) { setOngelezen(0); return }

      const ids = deelnemerData.map((d: { gesprek_id: string }) => d.gesprek_id)

      // Berichten die niet van henzelf zijn en niet gelezen
      const { data: berichtData } = await supabase
        .from('chat_berichten')
        .select('id, gelezen_door, afzender_id')
        .in('gesprek_id', ids)
        .neq('afzender_id', profiel!.id)

      if (!berichtData) { setOngelezen(0); return }

      const aantal = berichtData.filter(
        (b: { gelezen_door: string[] | null; afzender_id: string }) =>
          !b.gelezen_door?.includes(profiel!.id)
      ).length

      setOngelezen(aantal)
    }

    haalOngelezen()

    // Realtime luisteren
    const supabase = getSupabase()
    const channel = supabase
      .channel('sidebar-chat-notificaties')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_berichten' },
        () => haalOngelezen()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profiel, pathname])

  // Extra: herlaad na 1 seconde als je op de chatpagina bent (geeft chat pagina tijd om te markeren)
  useEffect(() => {
    if (!profiel || !pathname.startsWith('/chat')) return
    const timer = setTimeout(async () => {
      const supabase = getSupabase()
      const { data: deelnemerData } = await supabase
        .from('chat_deelnemers').select('gesprek_id').eq('profiel_id', profiel.id)
      if (!deelnemerData || deelnemerData.length === 0) { setOngelezen(0); return }
      const ids = deelnemerData.map((d: { gesprek_id: string }) => d.gesprek_id)
      const { data: berichtData } = await supabase
        .from('chat_berichten').select('id, gelezen_door, afzender_id')
        .in('gesprek_id', ids).neq('afzender_id', profiel.id)
      if (!berichtData) { setOngelezen(0); return }
      setOngelezen(berichtData.filter((b: { gelezen_door: string[] | null }) => !b.gelezen_door?.includes(profiel.id)).length)
    }, 1500)
    return () => clearTimeout(timer)
  }, [profiel, pathname])

  const navGroepen: { label: string; items: NavItem[] }[] = [
    {
      label: 'Overzicht',
      items: [
        { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
      ],
    },
    {
      label: 'Administratie',
      items: [
        { href: '/kasboek', label: 'Kasboek', icon: <Wallet size={16} /> },
        { href: '/maaltijdlijst', label: 'Maaltijdlijst', icon: <UtensilsCrossed size={16} /> },
      ],
    },
    {
      label: 'Activiteiten',
      items: [
        { href: '/vakantieplanningen', label: 'Vakantieplanningen', icon: <Map size={16} /> },
        { href: '/weekplanningen', label: 'Weekplanningen', icon: <Scissors size={16} /> },
        { href: '/activiteiten', label: 'Activiteitenbeheer', icon: <BookOpen size={16} /> },
      ],
    },
    {
      label: 'Communicatie',
      items: [
        { href: '/agenda', label: 'Agenda', icon: <Calendar size={16} /> },
        { href: '/chat', label: 'Chat', icon: <MessageSquare size={16} />, notificatie: ongelezen },
      ],
    },
    {
      label: 'Kind administratie',
      items: [
        { href: '/gesprekken', label: '10-minutengesprekken', icon: <MessageCircle size={16} /> },
      ],
    },
    {
      label: 'Beheer',
      items: [
        { href: '/medewerkers', label: 'Medewerkers', icon: <Users size={16} />, superadminOnly: true },
        { href: '/rechten', label: 'Rechtenbeheer', icon: <ShieldCheck size={16} />, superadminOnly: true },
      ],
    },
  ]

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      {/* Logo */}
      <Link href="/" className="sidebar-logo">
        <Image
          src="/logo.jpg"
          alt="De Theepot"
          width={40}
          height={40}
          style={{ borderRadius: 8, objectFit: 'contain', flexShrink: 0 }}
        />
        <div>
          <div className="logo-name">De Theepot</div>
          <div className="logo-sub">Dashboard</div>
        </div>
      </Link>

      {/* Navigatie */}
      <nav style={{ flex: 1 }}>
        {navGroepen.map((groep) => {
          const zichtbareItems = groep.items.filter(
            (item) => !item.superadminOnly || isSuperadmin
          )
          if (zichtbareItems.length === 0) return null

          return (
            <div key={groep.label} className="sidebar-section">
              <div className="sidebar-label">{groep.label}</div>
              {zichtbareItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    {/* Icon met notificatiebolletje */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {item.icon}
                      {item.notificatie && item.notificatie > 0 && !isActive && (
                        <div style={{
                          position: 'absolute',
                          top: -5, right: -6,
                          minWidth: 15, height: 15,
                          borderRadius: 10,
                          background: '#DC2626',
                          color: '#fff',
                          fontSize: 9,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 3px',
                          lineHeight: 1,
                          border: '1.5px solid var(--bg-card)',
                        }}>
                          {item.notificatie > 99 ? '99+' : item.notificatie}
                        </div>
                      )}
                    </div>

                    <span style={{ flex: 1 }}>{item.label}</span>

                    {item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer: darkmode toggle + gebruiker */}
      <div className="sidebar-footer">
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            width: '100%', padding: '7px 10px', borderRadius: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 13,
            marginBottom: 4, transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-xlight)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {theme === 'dark' ? <Sun size={15} color="var(--primary)" /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'Lichte modus' : 'Donkere modus'}</span>
          <div style={{
            marginLeft: 'auto', width: 32, height: 18, borderRadius: 9,
            background: theme === 'dark' ? 'var(--primary)' : 'var(--border-dark)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 2,
              left: theme === 'dark' ? 16 : 2,
              width: 14, height: 14, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </div>
        </button>

        <div className="user-card">
          <div className="avatar">{loading ? '…' : initialen}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? 'Laden...' : (profiel?.naam ?? 'Onbekend')}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {loading ? '' : (profiel ? ROL_LABELS[profiel.rol] : '')}
            </div>
          </div>
          <button
            onClick={signOut}
            title="Uitloggen"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
