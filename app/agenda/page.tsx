'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar,
  Clock, AlignLeft, Users, Pencil, Trash2, Share2, Eye
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kalender {
  id: string
  naam: string
  type: 'persoonlijk' | 'algemeen'
  eigenaar_id: string | null
  kleur: string
}

interface Afspraak {
  id: string
  kalender_id: string
  titel: string
  beschrijving: string | null
  start_tijd: string
  eind_tijd: string
  hele_dag: boolean
  aangemaakt_door: string | null
}

type Weergave = 'maand' | 'week' | 'dag' | 'lijst'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: Date) {
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' })
}

function fmtTijd(iso: string) {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function fmtDatum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function startVanWeek(d: Date) {
  const dag = d.getDay()
  const ma = new Date(d)
  ma.setDate(d.getDate() - (dag === 0 ? 6 : dag - 1))
  ma.setHours(0, 0, 0, 0)
  return ma
}

function startVanMaand(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function isSameDag(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isVandaag(d: Date) { return isSameDag(d, new Date()) }

function navigeer(weergave: Weergave, datum: Date, r: number) {
  const d = new Date(datum)
  if (weergave === 'dag') d.setDate(d.getDate() + r)
  else if (weergave === 'week') d.setDate(d.getDate() + r * 7)
  else if (weergave === 'maand') d.setMonth(d.getMonth() + r)
  else d.setMonth(d.getMonth() + r)
  return d
}

function periodeLabel(weergave: Weergave, datum: Date) {
  if (weergave === 'dag') return fmt(datum)
  if (weergave === 'week') {
    const ma = startVanWeek(datum)
    const zo = new Date(ma); zo.setDate(ma.getDate() + 6)
    return `${ma.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} – ${zo.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return datum.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
}

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localToISO(local: string) {
  return new Date(local).toISOString()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const { profiel, isSuperadmin } = useAuth()

  const [weergave, setWeergave] = useState<Weergave>('maand')
  const [huidigeDatum, setHuidigeDatum] = useState(new Date())

  // Kalenders
  const [alleKalenders, setAlleKalenders] = useState<Kalender[]>([])
  const [zichtbareIds, setZichtbareIds] = useState<Set<string>>(new Set())
  const [kalenderPanelOpen, setKalenderPanelOpen] = useState(false)

  // Afspraken
  const [afspraken, setAfspraken] = useState<Afspraak[]>([])
  const [laden, setLaden] = useState(false)

  // Modals
  const [nieuwModal, setNieuwModal] = useState(false)
  const [bewerkAfspraak, setBewerkAfspraak] = useState<Afspraak | null>(null)
  const [detailAfspraak, setDetailAfspraak] = useState<Afspraak | null>(null)
  const [nieuweKalenderModal, setNieuweKalenderModal] = useState(false)
  const [deelModal, setDeelModal] = useState<Kalender | null>(null)
  const [klikDatum, setKlikDatum] = useState<Date | null>(null)

  // Toast
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  // ── Kalenders ophalen ───────────────────────────────────────────────────────
  const haalKalendersOp = useCallback(async () => {
    if (!profiel) return
    const supabase = getSupabase()

    // Eigen persoonlijke kalender
    const { data: persoonlijk } = await supabase
      .from('agenda_kalenders')
      .select('*')
      .eq('type', 'persoonlijk')
      .eq('eigenaar_id', profiel.id)

    // Algemene kalenders (superadmin ziet alle, anderen alleen gedeelde)
    let algemeen: Kalender[] = []
    if (isSuperadmin) {
      const { data } = await supabase
        .from('agenda_kalenders')
        .select('*')
        .eq('type', 'algemeen')
      algemeen = data ?? []
    } else {
      const { data: gedeeld } = await supabase
        .from('agenda_gedeeld')
        .select('kalender_id')
        .eq('profiel_id', profiel.id)
      if (gedeeld && gedeeld.length > 0) {
        const ids = gedeeld.map((g: { kalender_id: string }) => g.kalender_id)
        const { data } = await supabase
          .from('agenda_kalenders')
          .select('*')
          .in('id', ids)
        algemeen = data ?? []
      }
    }

    // Als superadmin: alle persoonlijke kalenders ook zichtbaar
    let allePersoonlijk: Kalender[] = persoonlijk ?? []
    if (isSuperadmin) {
      const { data } = await supabase
        .from('agenda_kalenders')
        .select('*')
        .eq('type', 'persoonlijk')
      allePersoonlijk = data ?? []
    }

    const alles = [...allePersoonlijk, ...algemeen]
    setAlleKalenders(alles)

    // Zet standaard alle kalenders zichtbaar
    setZichtbareIds(prev => {
      const nieuweIds = new Set(prev)
      alles.forEach(k => nieuweIds.add(k.id))
      return nieuweIds
    })
  }, [profiel, isSuperadmin])

  useEffect(() => { haalKalendersOp() }, [haalKalendersOp])

  // ── Afspraken ophalen ───────────────────────────────────────────────────────
  const haalAfsprakenOp = useCallback(async () => {
    if (alleKalenders.length === 0) return
    setLaden(true)
    const ids = alleKalenders.map(k => k.id)
    const { data } = await getSupabase()
      .from('agenda_afspraken')
      .select('*')
      .in('kalender_id', ids)
      .order('start_tijd')
    setAfspraken((data ?? []) as Afspraak[])
    setLaden(false)
  }, [alleKalenders])

  useEffect(() => { haalAfsprakenOp() }, [haalAfsprakenOp])

  // ── Gefilterde afspraken ────────────────────────────────────────────────────
  const zichtbareAfspraken = useMemo(() =>
    afspraken.filter(a => zichtbareIds.has(a.kalender_id)),
    [afspraken, zichtbareIds]
  )

  function afsprakenVanDag(dag: Date) {
    return zichtbareAfspraken.filter(a => isSameDag(new Date(a.start_tijd), dag))
  }

  function kalenderVanAfspraak(a: Afspraak) {
    return alleKalenders.find(k => k.id === a.kalender_id)
  }

  // ── Afspraak opslaan ────────────────────────────────────────────────────────
  async function slaAfspraakOp(data: Partial<Afspraak> & { kalender_id: string; titel: string; start_tijd: string; eind_tijd: string }) {
    const supabase = getSupabase()
    if (bewerkAfspraak) {
      const { error } = await supabase.from('agenda_afspraken').update(data).eq('id', bewerkAfspraak.id)
      if (error) { setToast({ bericht: 'Opslaan mislukt', type: 'error' }); return }
      setToast({ bericht: 'Afspraak bijgewerkt!', type: 'success' })
      setBewerkAfspraak(null)
    } else {
      const { error } = await supabase.from('agenda_afspraken').insert({ ...data, aangemaakt_door: profiel?.id })
      if (error) { setToast({ bericht: 'Opslaan mislukt: ' + error.message, type: 'error' }); return }
      setToast({ bericht: 'Afspraak toegevoegd!', type: 'success' })
      setNieuwModal(false)
    }
    setKlikDatum(null)
    await haalAfsprakenOp()
  }

  async function verwijderAfspraak(id: string) {
    await getSupabase().from('agenda_afspraken').delete().eq('id', id)
    setDetailAfspraak(null)
    setToast({ bericht: 'Afspraak verwijderd.', type: 'success' })
    await haalAfsprakenOp()
  }

  // ── Nieuwe kalender ─────────────────────────────────────────────────────────
  async function maakKalender(naam: string, kleur: string) {
    const { data, error } = await getSupabase().from('agenda_kalenders').insert({
      naam, type: 'algemeen', eigenaar_id: profiel?.id, kleur
    }).select().single()
    if (error) { setToast({ bericht: 'Mislukt: ' + error.message, type: 'error' }); return }
    setToast({ bericht: `${naam} aangemaakt!`, type: 'success' })
    setNieuweKalenderModal(false)
    await haalKalendersOp()
    setDeelModal(data as Kalender)
  }

  async function verwijderKalender(id: string) {
    await getSupabase().from('agenda_kalenders').delete().eq('id', id)
    setKalenderPanelOpen(false)
    setToast({ bericht: 'Kalender verwijderd.', type: 'success' })
    await haalKalendersOp()
    await haalAfsprakenOp()
  }

  function toggleKalender(id: string) {
    setZichtbareIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function openNieuw(dag?: Date) {
    setKlikDatum(dag ?? null)
    setBewerkAfspraak(null)
    setNieuwModal(true)
  }

  // ─── WEERGAVEN ──────────────────────────────────────────────────────────────

  // MAANDWEERGAVE
  function MaandWeergave() {
    const begin = startVanMaand(huidigeDatum)
    const eersteDag = begin.getDay() === 0 ? 6 : begin.getDay() - 1
    const dagenInMaand = new Date(huidigeDatum.getFullYear(), huidigeDatum.getMonth() + 1, 0).getDate()

    const cellen: (Date | null)[] = [
      ...Array(eersteDag).fill(null),
      ...Array.from({ length: dagenInMaand }, (_, i) => new Date(huidigeDatum.getFullYear(), huidigeDatum.getMonth(), i + 1))
    ]
    while (cellen.length % 7 !== 0) cellen.push(null)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Weekdagen header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(d => (
            <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>
          ))}
        </div>
        {/* Rijen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${cellen.length / 7}, 1fr)`, flex: 1, overflow: 'auto' }}>
          {cellen.map((dag, i) => {
            if (!dag) return <div key={i} style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }} />
            const dagAfspraken = afsprakenVanDag(dag)
            const vandaag = isVandaag(dag)
            return (
              <div
                key={i}
                onClick={() => openNieuw(dag)}
                style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '6px', cursor: 'pointer', minHeight: 90, background: vandaag ? 'var(--primary-xlight)' : 'var(--bg-card)', transition: 'background 0.1s' }}
                onMouseEnter={e => !vandaag && (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => !vandaag && (e.currentTarget.style.background = 'var(--bg-card)')}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: vandaag ? 700 : 400,
                    background: vandaag ? 'var(--primary)' : 'transparent',
                    color: vandaag ? '#fff' : 'var(--text)',
                  }}>{dag.getDate()}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dagAfspraken.slice(0, 3).map(a => {
                    const kal = kalenderVanAfspraak(a)
                    return (
                      <div
                        key={a.id}
                        onClick={e => { e.stopPropagation(); setDetailAfspraak(a) }}
                        style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: kal?.kleur ?? 'var(--primary)', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                      >{a.titel}</div>
                    )
                  })}
                  {dagAfspraken.length > 3 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 6 }}>+{dagAfspraken.length - 3} meer</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // WEEKWEERGAVE
  function WeekWeergave() {
    const ma = startVanWeek(huidigeDatum)
    const dagen = Array.from({ length: 7 }, (_, i) => { const d = new Date(ma); d.setDate(ma.getDate() + i); return d })
    const uren = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div />
          {dagen.map((dag, i) => (
            <div key={i} style={{ padding: '8px 4px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {dag.toLocaleDateString('nl-NL', { weekday: 'short' })}
              </div>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', margin: '2px auto 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: isVandaag(dag) ? 700 : 400,
                background: isVandaag(dag) ? 'var(--primary)' : 'transparent',
                color: isVandaag(dag) ? '#fff' : 'var(--text)',
              }}>{dag.getDate()}</div>
            </div>
          ))}
        </div>
        {/* Uren grid */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', minHeight: '100%' }}>
            {uren.map(uur => (
              <>
                <div key={`t${uur}`} style={{ padding: '0 8px', borderBottom: '1px solid var(--border)', height: 60, display: 'flex', alignItems: 'flex-start', paddingTop: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{String(uur).padStart(2, '0')}:00</span>
                </div>
                {dagen.map((dag, di) => {
                  const urafspraken = zichtbareAfspraken.filter(a => {
                    const s = new Date(a.start_tijd)
                    return isSameDag(s, dag) && s.getHours() === uur
                  })
                  return (
                    <div
                      key={`${uur}-${di}`}
                      style={{ borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', height: 60, padding: '2px', cursor: 'pointer', position: 'relative' }}
                      onClick={() => { const d = new Date(dag); d.setHours(uur); openNieuw(d) }}
                    >
                      {urafspraken.map(a => {
                        const kal = kalenderVanAfspraak(a)
                        return (
                          <div
                            key={a.id}
                            onClick={e => { e.stopPropagation(); setDetailAfspraak(a) }}
                            style={{ fontSize: 11, padding: '2px 5px', borderRadius: 4, background: kal?.kleur ?? 'var(--primary)', color: '#fff', marginBottom: 2, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {fmtTijd(a.start_tijd)} {a.titel}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // DAGWEERGAVE
  function DagWeergave() {
    const uren = Array.from({ length: 24 }, (_, i) => i)
    const dagAfspraken = afsprakenVanDag(huidigeDatum)

    return (
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr' }}>
          {uren.map(uur => {
            const urafspraken = dagAfspraken.filter(a => new Date(a.start_tijd).getHours() === uur)
            return (
              <>
                <div key={`t${uur}`} style={{ padding: '0 10px', borderBottom: '1px solid var(--border)', height: 70, display: 'flex', alignItems: 'flex-start', paddingTop: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{String(uur).padStart(2, '0')}:00</span>
                </div>
                <div
                  key={`c${uur}`}
                  style={{ borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', height: 70, padding: 4, cursor: 'pointer' }}
                  onClick={() => { const d = new Date(huidigeDatum); d.setHours(uur); openNieuw(d) }}
                >
                  {urafspraken.map(a => {
                    const kal = kalenderVanAfspraak(a)
                    return (
                      <div
                        key={a.id}
                        onClick={e => { e.stopPropagation(); setDetailAfspraak(a) }}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, background: kal?.kleur ?? 'var(--primary)', color: '#fff', marginBottom: 4, cursor: 'pointer', display: 'flex', gap: 8 }}
                      >
                        <span>{fmtTijd(a.start_tijd)} – {fmtTijd(a.eind_tijd)}</span>
                        <span style={{ fontWeight: 600 }}>{a.titel}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })}
        </div>
      </div>
    )
  }

  // LIJSTWEERGAVE
  function LijstWeergave() {
    const begin = new Date(); begin.setHours(0, 0, 0, 0)
    const komende = zichtbareAfspraken
      .filter(a => new Date(a.start_tijd) >= begin)
      .slice(0, 50)

    if (komende.length === 0) return (
      <div className="empty-state" style={{ padding: 60 }}>
        <Calendar size={36} />
        <h3>Geen aankomende afspraken</h3>
        <p>Klik op de + knop om een afspraak toe te voegen.</p>
      </div>
    )

    // Groepeer per dag
    const perDag: Record<string, Afspraak[]> = {}
    komende.forEach(a => {
      const key = new Date(a.start_tijd).toISOString().split('T')[0]
      if (!perDag[key]) perDag[key] = []
      perDag[key].push(a)
    })

    return (
      <div style={{ maxWidth: 700 }}>
        {Object.entries(perDag).map(([dag, afspraken]) => (
          <div key={dag} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
              {isVandaag(new Date(dag)) ? 'Vandaag' : fmt(new Date(dag))}
              <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {afspraken.map(a => {
                const kal = kalenderVanAfspraak(a)
                return (
                  <div
                    key={a.id}
                    onClick={() => setDetailAfspraak(a)}
                    style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.12s', alignItems: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = kal?.kleur ?? 'var(--primary)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ width: 4, borderRadius: 4, background: kal?.kleur ?? 'var(--primary)', alignSelf: 'stretch', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{a.titel}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                        <span>🕐 {a.hele_dag ? 'Hele dag' : `${fmtTijd(a.start_tijd)} – ${fmtTijd(a.eind_tijd)}`}</span>
                        {kal && <span>📅 {kal.naam}</span>}
                      </div>
                      {a.beschrijving && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{a.beschrijving}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────────

  const eigneKalender = alleKalenders.find(k => k.type === 'persoonlijk' && k.eigenaar_id === profiel?.id)
  const algemeenKalenders = alleKalenders.filter(k => k.type === 'algemeen')
  const anderePersoneelKalenders = isSuperadmin ? alleKalenders.filter(k => k.type === 'persoonlijk' && k.eigenaar_id !== profiel?.id) : []

  return (
    <>
      <Topbar
        titel="Agenda"
        subtitel={periodeLabel(weergave, huidigeDatum)}
        acties={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Weergave switcher */}
            <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {(['maand', 'week', 'dag', 'lijst'] as Weergave[]).map(w => (
                <button key={w} onClick={() => setWeergave(w)} style={{ padding: '6px 11px', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: weergave === w ? 'var(--primary)' : 'transparent', color: weergave === w ? '#fff' : 'var(--text-muted)', transition: 'all 0.12s', textTransform: 'capitalize' }}>{w}</button>
              ))}
            </div>
            {/* Navigatie */}
            <button className="btn" style={{ padding: '6px 8px' }} onClick={() => setHuidigeDatum(d => navigeer(weergave, d, -1))}><ChevronLeft size={16} /></button>
            <button className="btn btn-sm" onClick={() => setHuidigeDatum(new Date())}>Vandaag</button>
            <button className="btn" style={{ padding: '6px 8px' }} onClick={() => setHuidigeDatum(d => navigeer(weergave, d, 1))}><ChevronRight size={16} /></button>
            {/* Kalenders + Nieuw */}
            <button className="btn" onClick={() => setKalenderPanelOpen(true)}><Calendar size={14} /> Kalenders</button>
            <button className="btn btn-primary" onClick={() => openNieuw()}><Plus size={14} /> Afspraak</button>
          </div>
        }
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>
        {/* Hoofd weergave */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-card)' }}>
          {weergave === 'maand' && <MaandWeergave />}
          {weergave === 'week' && <WeekWeergave />}
          {weergave === 'dag' && <DagWeergave />}
          {weergave === 'lijst' && <div style={{ padding: 20, overflow: 'auto', flex: 1 }}><LijstWeergave /></div>}
        </div>
      </div>

      {/* ─── Kalenders panel ──────────────────────────────────────────────────── */}
      {kalenderPanelOpen && (
        <div className="modal-backdrop" onClick={() => setKalenderPanelOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <span className="card-title">Kalenders</span>
              <button onClick={() => setKalenderPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Mijn agenda */}
              {eigneKalender && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Mijn agenda</div>
                  <KalenderRij kalender={eigneKalender} zichtbaar={zichtbareIds.has(eigneKalender.id)} onToggle={() => toggleKalender(eigneKalender.id)} />
                </div>
              )}

              {/* Personeelsagenda's (superadmin) */}
              {anderePersoneelKalenders.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Personeel</div>
                  {anderePersoneelKalenders.map(k => (
                    <KalenderRij key={k.id} kalender={k} zichtbaar={zichtbareIds.has(k.id)} onToggle={() => toggleKalender(k.id)} />
                  ))}
                </div>
              )}

              {/* Algemene kalenders */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Algemeen</div>
                  {isSuperadmin && (
                    <button className="btn btn-sm" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => { setKalenderPanelOpen(false); setNieuweKalenderModal(true) }}>
                      <Plus size={12} /> Nieuwe kalender
                    </button>
                  )}
                </div>
                {algemeenKalenders.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Geen algemene kalenders.</p>
                )}
                {algemeenKalenders.map(k => (
                  <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1 }}>
                      <KalenderRij kalender={k} zichtbaar={zichtbareIds.has(k.id)} onToggle={() => toggleKalender(k.id)} />
                    </div>
                    {isSuperadmin && (
                      <>
                        <button onClick={() => { setKalenderPanelOpen(false); setDeelModal(k) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }} title="Delen"><Share2 size={14} /></button>
                        <button onClick={() => verwijderKalender(k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 4, display: 'flex' }} title="Verwijderen"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setKalenderPanelOpen(false)}>Klaar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Afspraak detail modal ─────────────────────────────────────────────── */}
      {detailAfspraak && (
        <div className="modal-backdrop" onClick={() => setDetailAfspraak(null)}>
          <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ height: 5, background: kalenderVanAfspraak(detailAfspraak)?.kleur ?? 'var(--primary)', borderRadius: '14px 14px 0 0' }} />
            <div className="card-header">
              <span className="card-title" style={{ fontSize: 16 }}>{detailAfspraak.titel}</span>
              <button onClick={() => setDetailAfspraak(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                <Clock size={15} />
                {detailAfspraak.hele_dag ? 'Hele dag' : `${fmtDatum(detailAfspraak.start_tijd)}, ${fmtTijd(detailAfspraak.start_tijd)} – ${fmtTijd(detailAfspraak.eind_tijd)}`}
              </div>
              {detailAfspraak.beschrijving && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text)' }}>
                  <AlignLeft size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--text-muted)' }} />
                  {detailAfspraak.beschrijving}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                <Calendar size={15} />
                {kalenderVanAfspraak(detailAfspraak)?.naam}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijderAfspraak(detailAfspraak.id)}>
                  <Trash2 size={13} /> Verwijderen
                </button>
                <button className="btn btn-sm" onClick={() => { setBewerkAfspraak(detailAfspraak); setDetailAfspraak(null); setNieuwModal(true) }}>
                  <Pencil size={13} /> Bewerken
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Afspraak form modal ───────────────────────────────────────────────── */}
      {nieuwModal && (
        <AfspraakFormModal
          afspraak={bewerkAfspraak}
          kalenders={alleKalenders.filter(k => k.type === 'algemeen' || k.eigenaar_id === profiel?.id)}
          defaultKalenderId={eigneKalender?.id}
          defaultDatum={klikDatum}
          onSave={slaAfspraakOp}
          onClose={() => { setNieuwModal(false); setBewerkAfspraak(null); setKlikDatum(null) }}
        />
      )}

      {/* ─── Nieuwe kalender modal ─────────────────────────────────────────────── */}
      {nieuweKalenderModal && (
        <NieuweKalenderModal
          onSave={maakKalender}
          onClose={() => setNieuweKalenderModal(false)}
        />
      )}

      {/* ─── Deel modal ────────────────────────────────────────────────────────── */}
      {deelModal && (
        <DeelModal
          kalender={deelModal}
          onClose={() => setDeelModal(null)}
          onToast={setToast}
        />
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Sub-componenten ──────────────────────────────────────────────────────────

function KalenderRij({ kalender, zichtbaar, onToggle }: { kalender: Kalender; zichtbaar: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer' }} onClick={onToggle}>
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        background: zichtbaar ? kalender.kleur : 'transparent',
        border: `2px solid ${kalender.kleur}`,
        transition: 'background 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {zichtbaar && <div style={{ width: 8, height: 8, borderRadius: 2, background: '#fff', opacity: 0.9 }} />}
      </div>
      <span style={{ fontSize: 13, flex: 1, color: zichtbaar ? 'var(--text)' : 'var(--text-muted)' }}>{kalender.naam}</span>
    </div>
  )
}

function AfspraakFormModal({ afspraak, kalenders, defaultKalenderId, defaultDatum, onSave, onClose }: {
  afspraak: Afspraak | null
  kalenders: Kalender[]
  defaultKalenderId?: string
  defaultDatum: Date | null
  onSave: (data: Partial<Afspraak> & { kalender_id: string; titel: string; start_tijd: string; eind_tijd: string }) => void
  onClose: () => void
}) {
  const nu = defaultDatum ?? new Date()
  const eindNu = new Date(nu); eindNu.setHours(nu.getHours() + 1)

  const pad = (n: number) => String(n).padStart(2, '0')
  const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

  const [titel, setTitel] = useState(afspraak?.titel ?? '')
  const [beschrijving, setBeschrijving] = useState(afspraak?.beschrijving ?? '')
  const [kalenderId, setKalenderId] = useState(afspraak?.kalender_id ?? defaultKalenderId ?? kalenders[0]?.id ?? '')
  const [start, setStart] = useState(afspraak ? toLocalInput(afspraak.start_tijd) : toInput(nu))
  const [eind, setEind] = useState(afspraak ? toLocalInput(afspraak.eind_tijd) : toInput(eindNu))
  const [heleDag, setHeleDag] = useState(afspraak?.hele_dag ?? false)
  const [laden, setLaden] = useState(false)

  async function handleSave() {
    if (!titel.trim() || !kalenderId) return
    setLaden(true)
    await onSave({ titel: titel.trim(), beschrijving: beschrijving.trim() || null, kalender_id: kalenderId, start_tijd: localToISO(start), eind_tijd: localToISO(eind), hele_dag: heleDag })
    setLaden(false)
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{afspraak ? 'Afspraak bewerken' : 'Nieuwe afspraak'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Titel *</label>
            <input className="form-input" value={titel} onChange={e => setTitel(e.target.value)} placeholder="Naam van de afspraak" autoFocus />
          </div>
          <div>
            <label className="form-label">Kalender</label>
            <select className="form-select" value={kalenderId} onChange={e => setKalenderId(e.target.value)}>
              {kalenders.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={heleDag} onChange={e => setHeleDag(e.target.checked)} style={{ accentColor: 'var(--primary)', width: 15, height: 15 }} />
            Hele dag
          </label>
          {!heleDag && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label">Begintijd</label>
                <input type="datetime-local" className="form-input" value={start} onChange={e => setStart(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Eindtijd</label>
                <input type="datetime-local" className="form-input" value={eind} onChange={e => setEind(e.target.value)} />
              </div>
            </div>
          )}
          {heleDag && (
            <div>
              <label className="form-label">Datum</label>
              <input type="date" className="form-input" value={start.split('T')[0]} onChange={e => { setStart(e.target.value + 'T00:00'); setEind(e.target.value + 'T23:59') }} />
            </div>
          )}
          <div>
            <label className="form-label">Beschrijving</label>
            <textarea className="form-textarea" value={beschrijving} onChange={e => setBeschrijving(e.target.value)} placeholder="Optionele toelichting" style={{ minHeight: 80 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={laden || !titel.trim()}>
              {laden ? 'Opslaan...' : (afspraak ? 'Opslaan' : 'Toevoegen')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NieuweKalenderModal({ onSave, onClose }: { onSave: (naam: string, kleur: string) => void; onClose: () => void }) {
  const [naam, setNaam] = useState('')
  const [kleur, setKleur] = useState(KALENDER_KLEUREN[1])

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Nieuwe kalender</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Naam</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. Teamactiviteiten" autoFocus />
          </div>
          <div>
            <label className="form-label">Kleur</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {KALENDER_KLEUREN.map(k => (
                <button key={k} onClick={() => setKleur(k)} style={{ width: 32, height: 32, borderRadius: '50%', background: k, border: kleur === k ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer', transition: 'border 0.1s' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => naam.trim() && onSave(naam.trim(), kleur)} disabled={!naam.trim()}>Aanmaken</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeelModal({ kalender, onClose, onToast }: { kalender: Kalender; onClose: () => void; onToast: (t: { bericht: string; type: 'success' | 'error' }) => void }) {
  const { profiel: eigenaar } = useAuth()
  const [profielen, setProfielen] = useState<{ id: string; naam: string; rol: string }[]>([])
  const [gedeeldMet, setGedeeldMet] = useState<string[]>([])

  useEffect(() => {
    const supabase = getSupabase()
    supabase.from('profielen').select('id, naam, rol').then(({ data }) => setProfielen(data ?? []))
    supabase.from('agenda_gedeeld').select('profiel_id').eq('kalender_id', kalender.id).then(({ data }) => {
      setGedeeldMet((data ?? []).map((r: { profiel_id: string }) => r.profiel_id))
    })
  }, [kalender.id])

  async function toggleDelen(profielId: string) {
    const supabase = getSupabase()
    if (gedeeldMet.includes(profielId)) {
      await supabase.from('agenda_gedeeld').delete().eq('kalender_id', kalender.id).eq('profiel_id', profielId)
      setGedeeldMet(prev => prev.filter(id => id !== profielId))
    } else {
      await supabase.from('agenda_gedeeld').insert({ kalender_id: kalender.id, profiel_id: profielId })
      setGedeeldMet(prev => [...prev, profielId])
    }
    onToast({ bericht: 'Gedeeld bijgewerkt!', type: 'success' })
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Delen — {kalender.naam}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Vink aan met wie deze kalender gedeeld wordt:</p>
          {profielen.filter(p => p.id !== eigenaar?.id).map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: gedeeldMet.includes(p.id) ? 'var(--primary-light)' : 'var(--bg)', border: `1px solid ${gedeeldMet.includes(p.id) ? 'var(--border-dark)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.12s' }} onClick={() => toggleDelen(p.id)}>
              <input type="checkbox" checked={gedeeldMet.includes(p.id)} onChange={() => {}} style={{ accentColor: 'var(--primary)', width: 15, height: 15 }} />
              <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                {p.naam.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.naam}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.rol}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-primary" onClick={onClose}>Klaar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const KALENDER_KLEUREN = [
  '#8CC63F', '#185FA5', '#D97706', '#DC2626',
  '#7C3AED', '#0891B2', '#DB2777', '#059669',
]
