'use client'

import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import {
  Wallet,
  BookOpen,
  Map,
  Users,
  Calendar,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

const stats = [
  {
    label: 'Kasboek saldo',
    waarde: '€ —',
    sub: 'Nog in te stellen',
    icon: <Wallet size={16} />,
    bg: '#EBF5D6',
    kleur: '#3D6B1A',
    href: '/kasboek',
  },
  {
    label: 'Activiteiten',
    waarde: '—',
    sub: 'Bibliotheek',
    icon: <BookOpen size={16} />,
    bg: '#F3FAE8',
    kleur: '#5A9022',
    href: '/activiteiten',
  },
  {
    label: 'Vakantieplanningen',
    waarde: '—',
    sub: 'Actieve programma\'s',
    icon: <Map size={16} />,
    bg: '#FAEEDA',
    kleur: '#BA7517',
    href: '/vakantieplanningen',
  },
  {
    label: 'Medewerkers',
    waarde: '—',
    sub: 'Actieve accounts',
    icon: <Users size={16} />,
    bg: '#FBEAF0',
    kleur: '#993556',
    href: '/rechten',
  },
]

const snelkoppelingen = [
  {
    href: '/kasboek',
    icon: <Wallet size={20} />,
    titel: 'Kasboek',
    sub: 'Financieel overzicht & registraties',
    bg: '#EBF5D6',
    kleur: '#3D6B1A',
  },
  {
    href: '/vakantieplanningen',
    icon: <Map size={20} />,
    titel: 'Vakantieplanningen',
    sub: 'Activiteitenplanning per periode',
    bg: '#FAEEDA',
    kleur: '#BA7517',
  },
  {
    href: '/activiteiten',
    icon: <BookOpen size={20} />,
    titel: 'Activiteitenbeheer',
    sub: 'Bibliotheek met BSO-activiteiten',
    bg: '#F3FAE8',
    kleur: '#5A9022',
  },
  {
    href: '/agenda',
    icon: <Calendar size={20} />,
    titel: 'Agenda',
    sub: 'Persoonlijke & gedeelde agenda',
    bg: '#E6F1FB',
    kleur: '#185FA5',
  },
  {
    href: '/chat',
    icon: <MessageSquare size={20} />,
    titel: 'Chat',
    sub: 'Intern berichtenverkeer',
    bg: '#FBEAF0',
    kleur: '#993556',
  },
]

export default function DashboardPage() {
  const { profiel } = useAuth()

  const voornaam = profiel?.naam?.split(' ')[0] ?? 'daar'

  return (
    <>
      <Topbar
        titel="Dashboard"
        subtitel={`Welkom terug, ${voornaam}`}
      />

      <div className="page-content">
        {/* Stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {stats.map((s) => (
            <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }}>
              <div className="stat-card" style={{ transition: 'border-color 0.15s' }}>
                <div className="stat-icon" style={{ background: s.bg, color: s.kleur }}>
                  {s.icon}
                </div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-val">{s.waarde}</div>
                <div className="stat-change">{s.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Snelkoppelingen */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Snelkoppelingen</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 1,
              background: 'var(--border)',
            }}
          >
            {snelkoppelingen.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    background: 'var(--bg-card)',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--bg)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'var(--bg-card)')
                  }
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: item.bg,
                      color: item.kleur,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: 'Sora, sans-serif',
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 3,
                      }}
                    >
                      {item.titel}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {item.sub}
                    </div>
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Info blok */}
        <div
          style={{
            background: 'var(--primary-light)',
            border: '1px solid var(--border-dark)',
            borderRadius: 12,
            padding: '16px 20px',
            fontSize: 13,
            color: 'var(--primary-text)',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ fontFamily: 'Sora, sans-serif' }}>
            Programma in opbouw
          </strong>
          <br />
          Dit is de startversie van het De Molen beheerprogramma. De dashboard en navigatie staan klaar —
          de individuele pagina&apos;s worden stap voor stap uitgebouwd.
        </div>
      </div>
    </>
  )
}
