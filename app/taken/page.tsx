'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import {
  Plus, X, Trash2, Circle, CheckCircle2,
  ChevronRight, Calendar, Flag, Star,
  MoreHorizontal, Inbox, FileText, StickyNote,
  List, Bold, Italic, AlignLeft
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lijst {
  id: string
  naam: string
  kleur: string
  eigenaar_id: string
  volgorde: number
  type: 'taken' | 'notities'
}

interface Taak {
  id: string
  lijst_id: string
  titel: string
  notitie: string | null
  voltooid: boolean
  prioriteit: number
  vervaldatum: string | null
  volgorde: number
  voltooid_op: string | null
}

interface Notitie {
  id: string
  lijst_id: string
  titel: string
  inhoud: string
  kleur: string
  volgorde: number
  bijgewerkt_op: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const KLEUREN = ['#8CC63F','#EF4444','#3B82F6','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#10B981','#F97316','#6366F1']
const NOTITIE_KLEUREN = ['#ffffff','#FEF3C7','#DBEAFE','#D1FAE5','#FCE7F3','#EDE9FE','#FEE2E2','#CCFBF1']

const PRIORITEIT_CONFIG = {
  0: { label: 'Geen', kleur: 'var(--text-muted)' },
  1: { label: 'Laag', kleur: '#3B82F6' },
  2: { label: 'Medium', kleur: '#F59E0B' },
  3: { label: 'Hoog', kleur: '#EF4444' },
}

function fmtDatum(d: string | null) {
  if (!d) return ''
  const datum = new Date(d)
  const nu = new Date()
  const morgen = new Date(nu); morgen.setDate(nu.getDate() + 1)
  if (datum.toDateString() === nu.toDateString()) return 'Vandaag'
  if (datum.toDateString() === morgen.toDateString()) return 'Morgen'
  return datum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function isVerlopen(d: string | null) {
  if (!d) return false
  return new Date(d) < new Date(new Date().toDateString())
}

function fmtBijgewerkt(iso: string) {
  const d = new Date(iso)
  const nu = new Date()
  const diff = nu.getTime() - d.getTime()
  if (diff < 60000) return 'Zojuist'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min geleden`
  if (d.toDateString() === nu.toDateString()) return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function TakenPage() {
  const { user, profiel } = useAuth()

  const [lijsten, setLijsten] = useState<Lijst[]>([])
  const [taken, setTaken] = useState<Taak[]>([])
  const [notities, setNotities] = useState<Notitie[]>([])
  const [activeLijst, setActiveLijst] = useState<string | 'inbox' | 'vandaag' | 'gepland'>('inbox')
  const [geselecteerdeTaak, setGeselecteerdeTaak] = useState<Taak | null>(null)
  const [actieveNotitie, setActieveNotitie] = useState<Notitie | null>(null)
  const [toonVoltooid, setToonVoltooid] = useState(false)
  const [nieuweLijstModal, setNieuweLijstModal] = useState(false)
  const [nieuweLijstType, setNieuweLijstType] = useState<'taken' | 'notities'>('taken')
  const [bewerkLijst, setBewerkLijst] = useState<Lijst | null>(null)
  const [nieuweTaakTitel, setNieuweTaakTitel] = useState('')

  // ── Data ────────────────────────────────────────────────────────────────────

  const haalLijstenOp = useCallback(async () => {
    if (!user) return
    const { data } = await getSupabase().from('todo_lijsten').select('*').eq('eigenaar_id', user.id).order('volgorde')
    setLijsten((data ?? []) as Lijst[])
  }, [user])

  const haalTakenOp = useCallback(async () => {
    if (!user) return
    const ids = lijsten.filter(l => l.type === 'taken').map(l => l.id)
    if (ids.length === 0) { setTaken([]); return }
    const { data } = await getSupabase().from('todo_taken').select('*').in('lijst_id', ids).order('volgorde')
    setTaken((data ?? []) as Taak[])
  }, [user, lijsten])

  const haalNotitiesOp = useCallback(async () => {
    if (!user) return
    const ids = lijsten.filter(l => l.type === 'notities').map(l => l.id)
    if (ids.length === 0) { setNotities([]); return }
    const { data } = await getSupabase().from('notities').select('*').in('lijst_id', ids).order('bijgewerkt_op', { ascending: false })
    setNotities((data ?? []) as Notitie[])
  }, [user, lijsten])

  useEffect(() => { haalLijstenOp() }, [haalLijstenOp])
  useEffect(() => { haalTakenOp(); haalNotitiesOp() }, [haalTakenOp, haalNotitiesOp])

  // ── Lijsten ─────────────────────────────────────────────────────────────────

  async function maakLijst(naam: string, kleur: string, type: 'taken' | 'notities') {
    if (!user) return
    await getSupabase().from('todo_lijsten').insert({ naam, kleur, type, eigenaar_id: user.id, volgorde: lijsten.length })
    setNieuweLijstModal(false)
    await haalLijstenOp()
  }

  async function verwijderLijst(id: string) {
    if (!confirm('Lijst verwijderen? Alle inhoud gaat verloren.')) return
    await getSupabase().from('todo_lijsten').delete().eq('id', id)
    if (activeLijst === id) setActiveLijst('inbox')
    setBewerkLijst(null)
    await haalLijstenOp()
  }

  async function updateLijst(id: string, data: Partial<Lijst>) {
    await getSupabase().from('todo_lijsten').update(data).eq('id', id)
    await haalLijstenOp()
    setBewerkLijst(null)
  }

  // ── Taken ────────────────────────────────────────────────────────────────────

  async function voegTaakToe() {
    if (!nieuweTaakTitel.trim()) return
    const lijst = lijsten.find(l => l.id === activeLijst && l.type === 'taken') ?? lijsten.find(l => l.type === 'taken')
    if (!lijst) return
    const { data } = await getSupabase().from('todo_taken').insert({ lijst_id: lijst.id, titel: nieuweTaakTitel.trim(), volgorde: taken.filter(t => t.lijst_id === lijst.id).length }).select().single()
    setNieuweTaakTitel('')
    await haalTakenOp()
    if (data) setGeselecteerdeTaak(data as Taak)
  }

  async function toggleVoltooid(taak: Taak) {
    const nu = new Date().toISOString()
    await getSupabase().from('todo_taken').update({ voltooid: !taak.voltooid, voltooid_op: !taak.voltooid ? nu : null }).eq('id', taak.id)
    setTaken(prev => prev.map(t => t.id === taak.id ? { ...t, voltooid: !t.voltooid, voltooid_op: !t.voltooid ? nu : null } : t))
    if (geselecteerdeTaak?.id === taak.id) setGeselecteerdeTaak(t => t ? { ...t, voltooid: !t.voltooid } : null)
  }

  async function updateTaak(id: string, data: Partial<Taak>) {
    await getSupabase().from('todo_taken').update(data).eq('id', id)
    setTaken(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
    if (geselecteerdeTaak?.id === id) setGeselecteerdeTaak(t => t ? { ...t, ...data } : null)
  }

  async function verwijderTaak(id: string) {
    await getSupabase().from('todo_taken').delete().eq('id', id)
    setTaken(prev => prev.filter(t => t.id !== id))
    if (geselecteerdeTaak?.id === id) setGeselecteerdeTaak(null)
  }

  // ── Notities ─────────────────────────────────────────────────────────────────

  async function maakNotitie(lijstId: string) {
    const { data } = await getSupabase().from('notities').insert({
      lijst_id: lijstId, titel: 'Nieuwe notitie', inhoud: '', kleur: '#ffffff',
      volgorde: notities.filter(n => n.lijst_id === lijstId).length,
      bijgewerkt_op: new Date().toISOString()
    }).select().single()
    if (data) {
      await haalNotitiesOp()
      setActieveNotitie(data as Notitie)
    }
  }

  async function updateNotitie(id: string, data: Partial<Notitie>) {
    const bijgewerkt = { ...data, bijgewerkt_op: new Date().toISOString() }
    await getSupabase().from('notities').update(bijgewerkt).eq('id', id)
    setNotities(prev => prev.map(n => n.id === id ? { ...n, ...bijgewerkt } : n))
    if (actieveNotitie?.id === id) setActieveNotitie(n => n ? { ...n, ...bijgewerkt } : null)
  }

  async function verwijderNotitie(id: string) {
    await getSupabase().from('notities').delete().eq('id', id)
    setNotities(prev => prev.filter(n => n.id !== id))
    if (actieveNotitie?.id === id) setActieveNotitie(null)
  }

  // ── Gefilterde taken ────────────────────────────────────────────────────────

  function gefilterdeTaken(): Taak[] {
    let res = taken
    if (activeLijst === 'vandaag') res = taken.filter(t => t.vervaldatum && new Date(t.vervaldatum).toDateString() === new Date().toDateString())
    else if (activeLijst === 'gepland') res = taken.filter(t => t.vervaldatum)
    else if (activeLijst !== 'inbox') res = taken.filter(t => t.lijst_id === activeLijst)
    res = res.sort((a, b) => {
      if (a.voltooid !== b.voltooid) return a.voltooid ? 1 : -1
      return (b.prioriteit - a.prioriteit) || (a.volgorde - b.volgorde)
    })
    return toonVoltooid ? res : res.filter(t => !t.voltooid)
  }

  const actiefLijstObj = lijsten.find(l => l.id === activeLijst)
  const isNotitieLijst = actiefLijstObj?.type === 'notities'
  const actiefKleur = actiefLijstObj?.kleur ?? 'var(--primary)'
  const actieveNotities = notities.filter(n => n.lijst_id === activeLijst)
  const voltooideCount = taken.filter(t => t.voltooid && (activeLijst === 'inbox' || t.lijst_id === activeLijst)).length

  const takenLijsten = lijsten.filter(l => l.type === 'taken')
  const notitieLijsten = lijsten.filter(l => l.type === 'notities')

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Linker paneel ── */}
      <div style={{ width: 240, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700 }}>Taken & Notities</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{profiel?.naam}</div>
        </div>

        {/* Slimme views */}
        <div style={{ padding: '8px 6px 4px' }}>
          {[
            { id: 'inbox', icon: <Inbox size={15} />, label: 'Alle taken', count: taken.filter(t => !t.voltooid).length },
            { id: 'vandaag', icon: <Star size={15} />, label: 'Vandaag', count: taken.filter(t => !t.voltooid && t.vervaldatum && new Date(t.vervaldatum).toDateString() === new Date().toDateString()).length },
            { id: 'gepland', icon: <Calendar size={15} />, label: 'Gepland', count: taken.filter(t => !t.voltooid && t.vervaldatum).length },
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveLijst(item.id as any); setGeselecteerdeTaak(null); setActieveNotitie(null) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: activeLijst === item.id ? 'var(--primary-xlight)' : 'transparent', color: 'var(--text)', textAlign: 'left' }}>
              <span style={{ color: activeLijst === item.id ? 'var(--primary)' : 'var(--text-muted)' }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: activeLijst === item.id ? 600 : 400 }}>{item.label}</span>
              {item.count > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)', padding: '1px 7px', borderRadius: 20 }}>{item.count}</span>}
            </button>
          ))}
        </div>

        <div style={{ margin: '4px 14px', height: 1, background: 'var(--border)' }} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>

          {/* Takenlijsten */}
          {takenLijsten.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '6px 10px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Lijsten</span>
              </div>
              {takenLijsten.map(lijst => (
                <LijstRij key={lijst.id} lijst={lijst} actief={activeLijst === lijst.id} count={taken.filter(t => t.lijst_id === lijst.id && !t.voltooid).length}
                  onClick={() => { setActiveLijst(lijst.id); setGeselecteerdeTaak(null); setActieveNotitie(null) }}
                  onBewerk={() => setBewerkLijst(lijst)} />
              ))}
            </>
          )}

          {/* Notitiemappen */}
          {notitieLijsten.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '6px 10px 4px', marginTop: 4 }}>
                Notities
              </div>
              {notitieLijsten.map(lijst => (
                <LijstRij key={lijst.id} lijst={lijst} actief={activeLijst === lijst.id} count={notities.filter(n => n.lijst_id === lijst.id).length}
                  onClick={() => { setActiveLijst(lijst.id); setGeselecteerdeTaak(null); setActieveNotitie(null) }}
                  onBewerk={() => setBewerkLijst(lijst)} />
              ))}
            </>
          )}

          {/* Nieuwe lijst knoppen */}
          <div style={{ padding: '8px 6px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button onClick={() => { setNieuweLijstType('taken'); setNieuweLijstModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, width: '100%', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Plus size={13} /> <List size={13} /> Nieuwe takenlijst
            </button>
            <button onClick={() => { setNieuweLijstType('notities'); setNieuweLijstModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, width: '100%', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Plus size={13} /> <StickyNote size={13} /> Nieuwe notitiemap
            </button>
          </div>
        </div>
      </div>

      {/* ── Midden paneel ── */}
      <div style={{ flex: isNotitieLijst && actieveNotitie ? '0 0 320px' : 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: isNotitieLijst && actieveNotitie ? '1px solid var(--border)' : 'none' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 12 }}>
          {actiefLijstObj && <div style={{ width: 14, height: 14, borderRadius: actiefLijstObj.type === 'notities' ? 3 : '50%', background: actiefKleur, flexShrink: 0 }} />}
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, flex: 1 }}>
            {activeLijst === 'inbox' ? 'Alle taken' : activeLijst === 'vandaag' ? 'Vandaag' : activeLijst === 'gepland' ? 'Gepland' : actiefLijstObj?.naam}
          </div>
          {!isNotitieLijst && voltooideCount > 0 && (
            <button onClick={() => setToonVoltooid(!toonVoltooid)} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
              {toonVoltooid ? 'Verberg voltooid' : `${voltooideCount} voltooid`}
            </button>
          )}
          {isNotitieLijst && (
            <button onClick={() => maakNotitie(activeLijst as string)} className="btn btn-primary btn-sm">
              <Plus size={13} /> Notitie
            </button>
          )}
        </div>

        {/* Inhoud */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isNotitieLijst ? '12px' : '8px 0' }}>
          {isNotitieLijst ? (
            // Notities grid
            actieveNotities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                <StickyNote size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
                <div style={{ fontSize: 14 }}>Geen notities</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Klik op &quot;+ Notitie&quot; om te beginnen</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {actieveNotities.map(n => (
                  <div key={n.id} onClick={() => setActieveNotitie(n)}
                    style={{ padding: '14px', borderRadius: 10, background: n.kleur === '#ffffff' ? 'var(--bg-card)' : n.kleur, border: `2px solid ${actieveNotitie?.id === n.id ? actiefKleur : n.kleur === '#ffffff' ? 'var(--border)' : 'transparent'}`, cursor: 'pointer', minHeight: 110, transition: 'all 0.15s', position: 'relative' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14, marginBottom: 8, color: n.kleur === '#ffffff' ? 'var(--text)' : '#1a1a1a', lineHeight: 1.3 }}>{n.titel}</div>
                    <div style={{ fontSize: 12.5, color: n.kleur === '#ffffff' ? 'var(--text-muted)' : '#333', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {n.inhoud || <span style={{ fontStyle: 'italic', opacity: 0.4 }}>Leeg</span>}
                    </div>
                    <div style={{ fontSize: 10, color: n.kleur === '#ffffff' ? 'var(--text-muted)' : '#666', marginTop: 10, borderTop: `1px solid ${n.kleur === '#ffffff' ? 'var(--border)' : 'rgba(0,0,0,0.1)'}`, paddingTop: 6 }}>{fmtBijgewerkt(n.bijgewerkt_op)}</div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Taken lijst
            <>
              {gefilterdeTaken().map(taak => (
                <div key={taak.id} onClick={() => setGeselecteerdeTaak(geselecteerdeTaak?.id === taak.id ? null : taak)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 20px', cursor: 'pointer', transition: 'background 0.1s', background: geselecteerdeTaak?.id === taak.id ? 'var(--primary-xlight)' : 'transparent', borderLeft: geselecteerdeTaak?.id === taak.id ? '3px solid var(--primary)' : '3px solid transparent' }}
                  onMouseEnter={e => { if (geselecteerdeTaak?.id !== taak.id) e.currentTarget.style.background = 'var(--bg)' }}
                  onMouseLeave={e => { if (geselecteerdeTaak?.id !== taak.id) e.currentTarget.style.background = 'transparent' }}>
                  <button onClick={e => { e.stopPropagation(); toggleVoltooid(taak) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1, flexShrink: 0, color: taak.voltooid ? actiefKleur : 'var(--border-dark)' }}>
                    {taak.voltooid ? <CheckCircle2 size={20} color={actiefLijstObj?.kleur ?? 'var(--primary)'} fill={actiefLijstObj?.kleur ?? 'var(--primary)'} /> : <Circle size={20} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: taak.voltooid ? 'var(--text-muted)' : 'var(--text)', textDecoration: taak.voltooid ? 'line-through' : 'none' }}>{taak.titel}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                      {taak.prioriteit > 0 && <span style={{ fontSize: 11, color: PRIORITEIT_CONFIG[taak.prioriteit as keyof typeof PRIORITEIT_CONFIG].kleur }}><Flag size={10} /> {PRIORITEIT_CONFIG[taak.prioriteit as keyof typeof PRIORITEIT_CONFIG].label}</span>}
                      {taak.vervaldatum && <span style={{ fontSize: 11, color: isVerlopen(taak.vervaldatum) && !taak.voltooid ? '#EF4444' : 'var(--text-muted)' }}><Calendar size={10} /> {fmtDatum(taak.vervaldatum)}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {gefilterdeTaken().length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
                  <div style={{ fontSize: 14 }}>Geen taken</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Nieuwe taak invoer */}
        {!isNotitieLijst && (activeLijst === 'inbox' || lijsten.find(l => l.id === activeLijst && l.type === 'taken')) && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border-dark)', background: 'var(--bg)' }}>
              <Circle size={18} color="var(--border-dark)" style={{ flexShrink: 0 }} />
              <input value={nieuweTaakTitel} onChange={e => setNieuweTaakTitel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && nieuweTaakTitel.trim() && voegTaakToe()}
                onFocus={e => (e.currentTarget.parentElement!.style.borderColor = actiefKleur)}
                onBlur={e => (e.currentTarget.parentElement!.style.borderColor = 'var(--border-dark)')}
                placeholder="Taak toevoegen..." style={{ flex: 1, border: 'none', background: 'none', fontSize: 14, color: 'var(--text)', outline: 'none' }} />
              {nieuweTaakTitel && <button onClick={voegTaakToe} style={{ background: 'var(--primary)', border: 'none', color: '#fff', borderRadius: 7, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Voeg toe</button>}
            </div>
          </div>
        )}
      </div>

      {/* ── Rechter paneel: taak detail of notitie editor ── */}
      {geselecteerdeTaak && !isNotitieLijst && (
        <TaakDetail taak={geselecteerdeTaak} lijst={lijsten.find(l => l.id === geselecteerdeTaak.lijst_id)} lijsten={lijsten.filter(l => l.type === 'taken')}
          onUpdate={updateTaak} onVerwijder={verwijderTaak} onToggle={toggleVoltooid} onClose={() => setGeselecteerdeTaak(null)} />
      )}
      {actieveNotitie && isNotitieLijst && (
        <NotitieEditor notitie={actieveNotitie} onUpdate={updateNotitie} onVerwijder={verwijderNotitie} onClose={() => setActieveNotitie(null)} />
      )}

      {nieuweLijstModal && <NieuweLijstModal type={nieuweLijstType} onSave={maakLijst} onClose={() => setNieuweLijstModal(false)} />}
      {bewerkLijst && <BewerkLijstModal lijst={bewerkLijst} onSave={d => updateLijst(bewerkLijst.id, d)} onVerwijder={() => verwijderLijst(bewerkLijst.id)} onClose={() => setBewerkLijst(null)} />}
    </div>
  )
}

// ─── LijstRij ─────────────────────────────────────────────────────────────────

function LijstRij({ lijst, actief, count, onClick, onBewerk }: { lijst: Lijst; actief: boolean; count: number; onClick: () => void; onBewerk: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <button onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: actief ? 'var(--primary-xlight)' : 'transparent', color: 'var(--text)', textAlign: 'left' }}>
        <div style={{ width: 10, height: 10, borderRadius: lijst.type === 'notities' ? 2 : '50%', background: lijst.kleur, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: actief ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lijst.naam}</span>
        {count > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{count}</span>}
      </button>
      <button onClick={onBewerk} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 5px', borderRadius: 6, display: 'flex', opacity: 0.5 }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
        <MoreHorizontal size={13} />
      </button>
    </div>
  )
}

// ─── Notitie Editor ───────────────────────────────────────────────────────────

function NotitieEditor({ notitie, onUpdate, onVerwijder, onClose }: {
  notitie: Notitie; onUpdate: (id: string, data: Partial<Notitie>) => void
  onVerwijder: (id: string) => void; onClose: () => void
}) {
  const [titel, setTitel] = useState(notitie.titel)
  const [inhoud, setInhoud] = useState(notitie.inhoud)
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { setTitel(notitie.titel); setInhoud(notitie.inhoud) }, [notitie.id])

  function autoSave(newTitel: string, newInhoud: string) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      onUpdate(notitie.id, { titel: newTitel || 'Nieuwe notitie', inhoud: newInhoud })
    }, 600)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: notitie.kleur === '#ffffff' ? 'var(--bg)' : notitie.kleur + '40' }}>
      {/* Toolbar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {NOTITIE_KLEUREN.map(k => (
            <button key={k} onClick={() => onUpdate(notitie.id, { kleur: k })}
              style={{ width: 20, height: 20, borderRadius: 4, background: k, border: notitie.kleur === k ? '2.5px solid var(--text)' : '1.5px solid var(--border-dark)', cursor: 'pointer' }} />
          ))}
        </div>
        <button onClick={() => { if (confirm('Notitie verwijderen?')) onVerwijder(notitie.id) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.5, display: 'flex', padding: 4 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#EF4444' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)' }}>
          <Trash2 size={15} />
        </button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={16} /></button>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input value={titel} onChange={e => { setTitel(e.target.value); autoSave(e.target.value, inhoud) }}
          style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', width: '100%' }}
          placeholder="Titel..." />
        <textarea value={inhoud} onChange={e => { setInhoud(e.target.value); autoSave(titel, e.target.value) }}
          style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', fontSize: 14, lineHeight: 1.8, resize: 'none', minHeight: 400, fontFamily: 'DM Sans, sans-serif' }}
          placeholder="Begin met schrijven..." />
      </div>

      <div style={{ padding: '8px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        Automatisch opgeslagen · {inhoud.length} tekens
      </div>
    </div>
  )
}

// ─── Taak Detail ──────────────────────────────────────────────────────────────

function TaakDetail({ taak, lijst, lijsten, onUpdate, onVerwijder, onToggle, onClose }: {
  taak: Taak; lijst?: Lijst; lijsten: Lijst[]
  onUpdate: (id: string, data: Partial<Taak>) => void
  onVerwijder: (id: string) => void; onToggle: (taak: Taak) => void; onClose: () => void
}) {
  const [titel, setTitel] = useState(taak.titel)
  const [notitie, setNotitie] = useState(taak.notitie ?? '')
  const kleur = lijst?.kleur ?? 'var(--primary)'

  useEffect(() => { setTitel(taak.titel); setNotitie(taak.notitie ?? '') }, [taak.id])

  function slaOp() { onUpdate(taak.id, { titel: titel.trim() || taak.titel, notitie: notitie.trim() || null }) }

  return (
    <div style={{ width: 300, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onToggle(taak)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          {taak.voltooid ? <CheckCircle2 size={22} color={kleur} fill={kleur} /> : <Circle size={22} />}
        </button>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>{lijst?.naam}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={16} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <textarea value={titel} onChange={e => setTitel(e.target.value)} onBlur={slaOp}
          style={{ fontSize: 16, fontWeight: 600, border: 'none', background: 'none', color: 'var(--text)', resize: 'none', outline: 'none', fontFamily: 'Sora, sans-serif', lineHeight: 1.4, width: '100%', textDecoration: taak.voltooid ? 'line-through' : 'none' }} rows={2} />

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Vervaldatum</label>
          <input type="date" className="form-input" style={{ fontSize: 13 }} value={taak.vervaldatum ?? ''} onChange={e => onUpdate(taak.id, { vervaldatum: e.target.value || null })} />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Prioriteit</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {([0, 1, 2, 3] as const).map(p => (
              <button key={p} onClick={() => onUpdate(taak.id, { prioriteit: p })}
                style={{ flex: 1, padding: '6px 4px', borderRadius: 7, border: `1.5px solid ${taak.prioriteit === p ? PRIORITEIT_CONFIG[p].kleur : 'var(--border)'}`, background: taak.prioriteit === p ? PRIORITEIT_CONFIG[p].kleur + '20' : 'var(--bg)', cursor: 'pointer', fontSize: 11, color: PRIORITEIT_CONFIG[p].kleur, fontWeight: taak.prioriteit === p ? 600 : 400 }}>
                {p === 0 ? '—' : PRIORITEIT_CONFIG[p].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Lijst</label>
          <select className="form-select" style={{ fontSize: 13 }} value={taak.lijst_id} onChange={e => onUpdate(taak.id, { lijst_id: e.target.value })}>
            {lijsten.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Notitie</label>
          <textarea className="form-textarea" style={{ minHeight: 100, fontSize: 13 }} value={notitie} onChange={e => setNotitie(e.target.value)} onBlur={slaOp} placeholder="Voeg een notitie toe..." />
        </div>
      </div>

      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => onVerwijder(taak.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', opacity: 0.5 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#EF4444' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)' }}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function NieuweLijstModal({ type, onSave, onClose }: { type: 'taken' | 'notities'; onSave: (naam: string, kleur: string, type: 'taken' | 'notities') => void; onClose: () => void }) {
  const [naam, setNaam] = useState('')
  const [kleur, setKleur] = useState(KLEUREN[0])

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{type === 'notities' ? '📁 Nieuwe notitiemap' : '📋 Nieuwe takenlijst'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Naam</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} autoFocus placeholder={type === 'notities' ? 'Bijv. Werk notities' : 'Bijv. Boodschappen'} onKeyDown={e => e.key === 'Enter' && naam.trim() && onSave(naam.trim(), kleur, type)} />
          </div>
          <div>
            <label className="form-label">Kleur</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {KLEUREN.map(k => <button key={k} onClick={() => setKleur(k)} style={{ width: 28, height: 28, borderRadius: '50%', background: k, border: kleur === k ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer', transform: kleur === k ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s' }} />)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => naam.trim() && onSave(naam.trim(), kleur, type)} disabled={!naam.trim()}>Aanmaken</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BewerkLijstModal({ lijst, onSave, onVerwijder, onClose }: { lijst: Lijst; onSave: (data: Partial<Lijst>) => void; onVerwijder: () => void; onClose: () => void }) {
  const [naam, setNaam] = useState(lijst.naam)
  const [kleur, setKleur] = useState(lijst.kleur)

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{lijst.type === 'notities' ? 'Map bewerken' : 'Lijst bewerken'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Naam</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="form-label">Kleur</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {KLEUREN.map(k => <button key={k} onClick={() => setKleur(k)} style={{ width: 28, height: 28, borderRadius: '50%', background: k, border: kleur === k ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer', transform: kleur === k ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s' }} />)}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-sm" style={{ color: '#EF4444', borderColor: '#FECACA' }} onClick={onVerwijder}><Trash2 size={13} /> Verwijderen</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={onClose}>Annuleren</button>
              <button className="btn btn-primary" onClick={() => naam.trim() && onSave({ naam: naam.trim(), kleur })} disabled={!naam.trim()}>Opslaan</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
