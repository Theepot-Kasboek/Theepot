'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import { getSupabase } from '@/lib/supabase'
import {
  BookOpen, Calendar, MessageSquare, Users,
  ArrowRight, Settings, X, GripVertical, Eye, EyeOff,
} from 'lucide-react'
import Link from 'next/link'

// ─── Widget definities ────────────────────────────────────────────────────────

interface WidgetDef {
  id: string
  label: string
  beschrijving: string
  icon: React.ReactNode
  bg: string
  kleur: string
  href: string
  defaultAan: boolean
}

const ALLE_WIDGETS: WidgetDef[] = [
  {
    id: 'activiteiten',
    label: 'Activiteitenbeheer',
    beschrijving: 'Bibliotheek met BSO-activiteiten',
    icon: <BookOpen size={20} />,
    bg: '#F3FAE8', kleur: '#5A9022',
    href: '/activiteiten',
    defaultAan: true,
  },
  {
    id: 'agenda',
    label: 'Agenda',
    beschrijving: 'Persoonlijke & gedeelde agenda',
    icon: <Calendar size={20} />,
    bg: '#E6F1FB', kleur: '#185FA5',
    href: '/agenda',
    defaultAan: true,
  },
  {
    id: 'chat',
    label: 'Chat',
    beschrijving: 'Intern berichtenverkeer',
    icon: <MessageSquare size={20} />,
    bg: '#FBEAF0', kleur: '#993556',
    href: '/chat',
    defaultAan: true,
  },
  {
    id: 'medewerkers',
    label: 'Medewerkers',
    beschrijving: 'Accounts en rollen beheren',
    icon: <Users size={20} />,
    bg: '#FBEAF0', kleur: '#993556',
    href: '/medewerkers',
    defaultAan: false,
  },
  {
    id: 'vakantieplanningen',
    label: 'Vakantieplanningen',
    beschrijving: 'Activiteitenplanning per periode',
    icon: <Calendar size={20} />,
    bg: '#FAEEDA', kleur: '#854F0B',
    href: '/vakantieplanningen',
    defaultAan: false,
  },
]

const OPSLAG_KEY = (userId: string) => `dashboard_widgets_${userId}`

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profiel, user } = useAuth()
  const voornaam = profiel?.naam?.split(' ')[0] ?? 'daar'

  // Actieve widget IDs (volgorde = volgorde op scherm)
  const [actiefIds, setActiefIds] = useState<string[]>([])
  const [instellingenOpen, setInstellingenOpen] = useState(false)
  const [opgeslagen, setOpgeslagen] = useState(false)

  // Laad opgeslagen voorkeur uit localStorage
  useEffect(() => {
    if (!user) return
    const opgeslagenRaw = localStorage.getItem(OPSLAG_KEY(user.id))
    if (opgeslagenRaw) {
      try {
        const parsed = JSON.parse(opgeslagenRaw) as string[]
        setActiefIds(parsed)
        return
      } catch {}
    }
    // Standaard: alle widgets met defaultAan = true
    setActiefIds(ALLE_WIDGETS.filter((w) => w.defaultAan).map((w) => w.id))
  }, [user])

  const slaOp = useCallback((ids: string[]) => {
    if (!user) return
    localStorage.setItem(OPSLAG_KEY(user.id), JSON.stringify(ids))
    setActiefIds(ids)
    setOpgeslagen(true)
    setTimeout(() => setOpgeslagen(false), 2000)
  }, [user])

  function toggleWidget(id: string) {
    const nieuweIds = actiefIds.includes(id)
      ? actiefIds.filter((i) => i !== id)
      : [...actiefIds, id]
    slaOp(nieuweIds)
  }

  function verplaats(id: string, richting: 'links' | 'rechts') {
    const idx = actiefIds.indexOf(id)
    if (idx === -1) return
    const nieuweIds = [...actiefIds]
    if (richting === 'links' && idx > 0) {
      [nieuweIds[idx - 1], nieuweIds[idx]] = [nieuweIds[idx], nieuweIds[idx - 1]]
    } else if (richting === 'rechts' && idx < nieuweIds.length - 1) {
      [nieuweIds[idx + 1], nieuweIds[idx]] = [nieuweIds[idx], nieuweIds[idx + 1]]
    }
    slaOp(nieuweIds)
  }

  const actiefWidgets = actiefIds
    .map((id) => ALLE_WIDGETS.find((w) => w.id === id))
    .filter(Boolean) as WidgetDef[]

  const inactiefWidgets = ALLE_WIDGETS.filter((w) => !actiefIds.includes(w.id))

  return (
    <>
      <Topbar
        titel="Dashboard"
        subtitel={`Welkom terug, ${voornaam}`}
        acties={
          <button
            className="btn"
            onClick={() => setInstellingenOpen(true)}
            title="Dashboard instellen"
          >
            <Settings size={14} />
            Aanpassen
          </button>
        }
      />

      <div className="page-content">

        {/* Welkom banner */}
        <div style={{
          background: 'var(--primary-light)',
          border: '1px solid var(--border-dark)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
              Goedendag, {voornaam} 👋
            </div>
            <div style={{ fontSize: 12, color: 'var(--primary-text)', opacity: 0.85 }}>
              Welkom op het dashboard van De Theepot. Klik op &apos;Aanpassen&apos; om je dashboard in te stellen.
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setInstellingenOpen(true)}
          >
            <Settings size={13} />
            Aanpassen
          </button>
        </div>

        {/* Snelkoppelingen */}
        {actiefWidgets.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: 48 }}>
              <Settings size={36} style={{ opacity: 0.2 }} />
              <h3>Geen widgets actief</h3>
              <p>Klik op &apos;Aanpassen&apos; om onderdelen toe te voegen aan je dashboard.</p>
              <button className="btn btn-primary" onClick={() => setInstellingenOpen(true)}>
                <Settings size={14} /> Dashboard aanpassen
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Snelkoppelingen</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{actiefWidgets.length} actief</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 1,
              background: 'var(--border)',
            }}>
              {actiefWidgets.map((item) => (
                <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      transition: 'background 0.12s',
                      height: '100%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: item.bg, color: item.kleur,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {item.beschrijving}
                      </div>
                    </div>
                    <ArrowRight size={14} color="var(--text-muted)" style={{ marginTop: 3, flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Instellingen modal ─────────────────────────────────────────────── */}
      {instellingenOpen && (
        <div className="modal-backdrop" onClick={() => setInstellingenOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="card-header">
              <span className="card-title">Dashboard aanpassen</span>
              <button
                onClick={() => setInstellingenOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Actief */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Actief op dashboard
                </div>
                {actiefIds.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Geen widgets actief.</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {actiefWidgets.map((w, idx) => (
                    <div key={w.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 9,
                      background: 'var(--primary-xlight)',
                      border: '1px solid var(--border-dark)',
                    }}>
                      <div style={{ color: 'var(--text-muted)', cursor: 'grab', display: 'flex' }}>
                        <GripVertical size={15} />
                      </div>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: w.bg, color: w.kleur, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {w.icon}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{w.label}</span>
                      {/* Volgorde knoppen */}
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          onClick={() => verplaats(w.id, 'links')}
                          disabled={idx === 0}
                          style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, padding: '2px 5px', borderRadius: 5, fontSize: 12, color: 'var(--text-muted)' }}
                          title="Naar links"
                        >↑</button>
                        <button
                          onClick={() => verplaats(w.id, 'rechts')}
                          disabled={idx === actiefWidgets.length - 1}
                          style={{ background: 'none', border: 'none', cursor: idx === actiefWidgets.length - 1 ? 'default' : 'pointer', opacity: idx === actiefWidgets.length - 1 ? 0.3 : 1, padding: '2px 5px', borderRadius: 5, fontSize: 12, color: 'var(--text-muted)' }}
                          title="Naar rechts"
                        >↓</button>
                      </div>
                      <button
                        onClick={() => toggleWidget(w.id)}
                        title="Verwijderen van dashboard"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
                      >
                        <EyeOff size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="divider" style={{ margin: 0 }} />

              {/* Inactief */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Niet actief
                </div>
                {inactiefWidgets.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Alle widgets zijn actief.</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {inactiefWidgets.map((w) => (
                    <div key={w.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 9,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      opacity: 0.7,
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: w.bg, color: w.kleur, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {w.icon}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{w.label}</span>
                      <button
                        onClick={() => toggleWidget(w.id)}
                        title="Toevoegen aan dashboard"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opgeslagen feedback */}
              {opgeslagen && (
                <div style={{ fontSize: 12, color: 'var(--primary-text)', background: 'var(--primary-light)', padding: '8px 12px', borderRadius: 7, textAlign: 'center', fontWeight: 500 }}>
                  ✓ Voorkeur opgeslagen
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setInstellingenOpen(false)}>
                  Klaar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
