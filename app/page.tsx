'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import { getSupabase } from '@/lib/supabase'
import {
  BookOpen, Calendar, MessageSquare, Users,
  ArrowRight, Settings, X, Eye, EyeOff, Clock, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface Afspraak {
  id: string
  titel: string
  beschrijving: string | null
  start_tijd: string
  eind_tijd: string
  hele_dag: boolean
  kalender_id: string
  kalender_kleur?: string
  kalender_naam?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startVanWeek(d: Date) {
  const dag = d.getDay()
  const ma = new Date(d)
  ma.setDate(d.getDate() - (dag === 0 ? 6 : dag - 1))
  ma.setHours(0, 0, 0, 0)
  return ma
}

function isSameDag(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function fmtTijd(iso: string) {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function fmtDagKort(d: Date) {
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

const DAGEN_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

// ─── Widget definities ────────────────────────────────────────────────────────

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

// ─── Week Agenda component ────────────────────────────────────────────────────

function WeekAgenda({ profielId }: { profielId: string }) {
  const [afspraken, setAfspraken] = useState<Afspraak[]>([])
  const [laden, setLaden] = useState(true)

  const nu = new Date()
  const maandag = startVanWeek(nu)
  const dagen = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(maandag)
    d.setDate(maandag.getDate() + i)
    return d
  })

  useEffect(() => {
    async function laad() {
      setLaden(true)
      const supabase = getSupabase()

      // Haal kalenders op die zichtbaar zijn voor deze gebruiker
      const { data: persoonlijk } = await supabase
        .from('agenda_kalenders').select('id, kleur, naam').eq('eigenaar_id', profielId)

      const { data: gedeeld } = await supabase
        .from('agenda_gedeeld').select('kalender_id').eq('profiel_id', profielId)

      const gedeeldeIds = (gedeeld ?? []).map((g: { kalender_id: string }) => g.kalender_id)
      const { data: algemeenKals } = gedeeldeIds.length > 0
        ? await supabase.from('agenda_kalenders').select('id, kleur, naam').in('id', gedeeldeIds)
        : { data: [] }

      const kalenders = [...(persoonlijk ?? []), ...(algemeenKals ?? [])]
      const kalenderIds = kalenders.map((k: { id: string }) => k.id)
      if (kalenderIds.length === 0) { setAfspraken([]); setLaden(false); return }

      const weekStart = new Date(maandag); weekStart.setHours(0, 0, 0, 0)
      const weekEind = new Date(maandag); weekEind.setDate(maandag.getDate() + 6); weekEind.setHours(23, 59, 59, 999)

      const { data } = await supabase
        .from('agenda_afspraken')
        .select('*')
        .in('kalender_id', kalenderIds)
        .gte('start_tijd', weekStart.toISOString())
        .lte('start_tijd', weekEind.toISOString())
        .order('start_tijd')

      const kalMap = Object.fromEntries(kalenders.map((k: { id: string; kleur: string; naam: string }) => [k.id, k]))
      const metKleur = (data ?? []).map((a: Afspraak) => ({
        ...a,
        kalender_kleur: kalMap[a.kalender_id]?.kleur ?? 'var(--primary)',
        kalender_naam: kalMap[a.kalender_id]?.naam ?? '',
      }))

      setAfspraken(metKleur)
      setLaden(false)
    }

    laad()
  }, [profielId])

  function afsprakenVanDag(dag: Date) {
    return afspraken.filter(a => isSameDag(new Date(a.start_tijd), dag))
  }

  const vandaagIdx = nu.getDay() === 0 ? 6 : nu.getDay() - 1
  const weekNummer = Math.ceil((((nu.getTime() - new Date(nu.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(nu.getFullYear(), 0, 1).getDay() + 1) / 7)

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={16} color="var(--primary)" />
          <span className="card-title">Week {weekNummer}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {fmtDagKort(maandag)} – {fmtDagKort(dagen[6])}
          </span>
        </div>
        <Link href="/agenda" className="btn btn-sm" style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}>
          Volledige agenda <ChevronRight size={12} />
        </Link>
      </div>

      {laden ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Laden...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minWidth: 560 }}>
            {/* Dag headers */}
            {dagen.map((dag, i) => {
              const isVandaag = isSameDag(dag, nu)
              return (
                <div key={i} style={{
                  padding: '8px 10px 6px',
                  borderBottom: '1px solid var(--border)',
                  borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                  background: isVandaag ? 'var(--primary-xlight)' : 'transparent',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: isVandaag ? 'var(--primary-text)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {DAGEN_LABELS[i]}
                  </div>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', margin: '3px auto 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: isVandaag ? 700 : 400,
                    background: isVandaag ? 'var(--primary)' : 'transparent',
                    color: isVandaag ? '#fff' : 'var(--text)',
                  }}>
                    {dag.getDate()}
                  </div>
                </div>
              )
            })}

            {/* Afspraken per dag */}
            {dagen.map((dag, i) => {
              const dagAfspraken = afsprakenVanDag(dag)
              const isVandaag = isSameDag(dag, nu)
              return (
                <div key={i} style={{
                  padding: '8px 6px',
                  borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                  minHeight: 80,
                  background: isVandaag ? 'var(--primary-xlight)' : 'transparent',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  {dagAfspraken.length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--border-dark)', textAlign: 'center', paddingTop: 12 }}>—</div>
                  )}
                  {dagAfspraken.map(a => (
                    <Link key={a.id} href="/agenda" style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '4px 7px',
                        borderRadius: 6,
                        background: a.kalender_kleur + '20',
                        borderLeft: `3px solid ${a.kalender_kleur}`,
                        fontSize: 11,
                        lineHeight: 1.35,
                        cursor: 'pointer',
                        transition: 'opacity 0.1s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.titel}
                        </div>
                        {!a.hele_dag && (
                          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                            <Clock size={9} />
                            {fmtTijd(a.start_tijd)}
                          </div>
                        )}
                        {a.hele_dag && (
                          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Hele dag</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>

          {afspraken.length === 0 && !laden && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, borderTop: '1px solid var(--border)' }}>
              Geen afspraken deze week.{' '}
              <Link href="/agenda" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Afspraak toevoegen</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Dashboard pagina ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profiel, user } = useAuth()
  const voornaam = profiel?.naam?.split(' ')[0] ?? 'daar'

  const [actiefIds, setActiefIds] = useState<string[]>([])
  const [instellingenOpen, setInstellingenOpen] = useState(false)
  const [opgeslagen, setOpgeslagen] = useState(false)

  useEffect(() => {
    if (!user) return
    const opgeslagenRaw = localStorage.getItem(OPSLAG_KEY(user.id))
    if (opgeslagenRaw) {
      try { setActiefIds(JSON.parse(opgeslagenRaw) as string[]); return } catch {}
    }
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
    slaOp(actiefIds.includes(id) ? actiefIds.filter(i => i !== id) : [...actiefIds, id])
  }

  function verplaats(id: string, richting: 'links' | 'rechts') {
    const idx = actiefIds.indexOf(id)
    if (idx === -1) return
    const nieuweIds = [...actiefIds]
    if (richting === 'links' && idx > 0) [nieuweIds[idx - 1], nieuweIds[idx]] = [nieuweIds[idx], nieuweIds[idx - 1]]
    else if (richting === 'rechts' && idx < nieuweIds.length - 1) [nieuweIds[idx + 1], nieuweIds[idx]] = [nieuweIds[idx], nieuweIds[idx + 1]]
    slaOp(nieuweIds)
  }

  const actiefWidgets = actiefIds.map(id => ALLE_WIDGETS.find(w => w.id === id)).filter(Boolean) as WidgetDef[]
  const inactiefWidgets = ALLE_WIDGETS.filter(w => !actiefIds.includes(w.id))

  return (
    <>
      <Topbar
        titel="Dashboard"
        subtitel={`Welkom terug, ${voornaam}`}
        acties={
          <button className="btn" onClick={() => setInstellingenOpen(true)}>
            <Settings size={14} /> Aanpassen
          </button>
        }
      />

      <div className="page-content">

        {/* Welkom banner */}
        <div style={{ background: 'var(--primary-light)', border: '1px solid var(--border-dark)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Goedendag, {voornaam} 👋</div>
            <div style={{ fontSize: 12, color: 'var(--primary-text)', opacity: 0.85 }}>Welkom op het dashboard van De Theepot.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setInstellingenOpen(true)}>
            <Settings size={13} /> Aanpassen
          </button>
        </div>

        {/* ── Week agenda — altijd zichtbaar ── */}
        {user && (
          <div style={{ marginBottom: 20 }}>
            <WeekAgenda profielId={user.id} />
          </div>
        )}

        {/* ── Snelkoppelingen ── */}
        {actiefWidgets.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Snelkoppelingen</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{actiefWidgets.length} actief</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, background: 'var(--border)' }}>
              {actiefWidgets.map(item => (
                <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                  <div
                    style={{ background: 'var(--bg-card)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, transition: 'background 0.12s', height: '100%' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: item.bg, color: item.kleur, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.beschrijving}</div>
                    </div>
                    <ArrowRight size={14} color="var(--text-muted)" style={{ marginTop: 3, flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {actiefWidgets.length === 0 && (
          <div className="card">
            <div className="empty-state" style={{ padding: 40 }}>
              <Settings size={32} style={{ opacity: 0.2 }} />
              <h3>Geen snelkoppelingen actief</h3>
              <p>Klik op &apos;Aanpassen&apos; om snelkoppelingen toe te voegen.</p>
              <button className="btn btn-primary" onClick={() => setInstellingenOpen(true)}>
                <Settings size={14} /> Aanpassen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Instellingen modal ─────────────────────────────────────────────── */}
      {instellingenOpen && (
        <div className="modal-backdrop" onClick={() => setInstellingenOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <span className="card-title">Dashboard aanpassen</span>
              <button onClick={() => setInstellingenOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Vaste onderdelen */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Altijd zichtbaar
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--border)', opacity: 0.7 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#E6F1FB', color: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={14} />
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>Weekagenda</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Kan niet worden verwijderd</span>
                </div>
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* Actieve snelkoppelingen */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Snelkoppelingen — actief
                </div>
                {actiefIds.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Geen actief.</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {actiefWidgets.map((w, idx) => (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: 'var(--primary-xlight)', border: '1px solid var(--border-dark)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: w.bg, color: w.kleur, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{w.icon}</div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{w.label}</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button onClick={() => verplaats(w.id, 'links')} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, padding: '2px 5px', borderRadius: 5, fontSize: 12, color: 'var(--text-muted)' }}>↑</button>
                        <button onClick={() => verplaats(w.id, 'rechts')} disabled={idx === actiefWidgets.length - 1} style={{ background: 'none', border: 'none', cursor: idx === actiefWidgets.length - 1 ? 'default' : 'pointer', opacity: idx === actiefWidgets.length - 1 ? 0.3 : 1, padding: '2px 5px', borderRadius: 5, fontSize: 12, color: 'var(--text-muted)' }}>↓</button>
                      </div>
                      <button onClick={() => toggleWidget(w.id)} title="Verwijderen" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
                        <EyeOff size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* Inactieve snelkoppelingen */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Snelkoppelingen — niet actief
                </div>
                {inactiefWidgets.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Alle actief.</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {inactiefWidgets.map(w => (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--border)', opacity: 0.7 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: w.bg, color: w.kleur, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{w.icon}</div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{w.label}</span>
                      <button onClick={() => toggleWidget(w.id)} title="Toevoegen" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
                        <Eye size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {opgeslagen && (
                <div style={{ fontSize: 12, color: 'var(--primary-text)', background: 'var(--primary-light)', padding: '8px 12px', borderRadius: 7, textAlign: 'center', fontWeight: 500 }}>
                  ✓ Voorkeur opgeslagen
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setInstellingenOpen(false)}>Klaar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
