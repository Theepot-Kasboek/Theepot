'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import {
  Plus, X, Trash2, Circle, CheckCircle2,
  ChevronRight, Calendar, Flag, Star,
  MoreHorizontal, Pencil, List, Inbox
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lijst {
  id: string
  naam: string
  kleur: string
  eigenaar_id: string
  volgorde: number
}

interface Taak {
  id: string
  lijst_id: string
  titel: string
  notitie: string | null
  voltooid: boolean
  prioriteit: number // 0=geen, 1=laag, 2=medium, 3=hoog
  vervaldatum: string | null
  volgorde: number
  voltooid_op: string | null
}

// ─── Config ───────────────────────────────────────────────────────────────────

const KLEUREN = ['#8CC63F','#EF4444','#3B82F6','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#10B981','#F97316','#6366F1']

const PRIORITEIT_CONFIG = {
  0: { label: 'Geen', kleur: 'var(--text-muted)', icon: <Flag size={14} /> },
  1: { label: 'Laag', kleur: '#3B82F6', icon: <Flag size={14} color="#3B82F6" /> },
  2: { label: 'Medium', kleur: '#F59E0B', icon: <Flag size={14} color="#F59E0B" /> },
  3: { label: 'Hoog', kleur: '#EF4444', icon: <Flag size={14} color="#EF4444" /> },
}

function fmtDatum(d: string | null): string {
  if (!d) return ''
  const datum = new Date(d)
  const nu = new Date()
  const morgen = new Date(nu); morgen.setDate(nu.getDate() + 1)
  if (datum.toDateString() === nu.toDateString()) return 'Vandaag'
  if (datum.toDateString() === morgen.toDateString()) return 'Morgen'
  return datum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function isVerlopen(d: string | null): boolean {
  if (!d) return false
  return new Date(d) < new Date(new Date().toDateString())
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function TakenPage() {
  const { user, profiel } = useAuth()

  const [lijsten, setLijsten] = useState<Lijst[]>([])
  const [taken, setTaken] = useState<Taak[]>([])
  const [activeLijst, setActiveLijst] = useState<string | 'inbox' | 'vandaag' | 'gepland'>('inbox')
  const [geselecteerdeTaak, setGeselecteerdeTaak] = useState<Taak | null>(null)
  const [toonVoltooid, setToonVoltooid] = useState(false)
  const [nieuweLijstNaam, setNieuweLijstNaam] = useState('')
  const [toonNieuweLijst, setToonNieuweLijst] = useState(false)
  const [gekozenKleur, setGekozenKleur] = useState(KLEUREN[0])
  const [nieuweTaakTitel, setNieuweTaakTitel] = useState('')
  const [toonNieuweTaak, setToonNieuweTaak] = useState(false)
  const [bewerkLijst, setBewerkLijst] = useState<Lijst | null>(null)
  const nieuweInputRef = useRef<HTMLInputElement>(null)

  // ── Data ophalen ────────────────────────────────────────────────────────────
  const haalLijstenOp = useCallback(async () => {
    if (!user) return
    const { data } = await getSupabase().from('todo_lijsten').select('*').eq('eigenaar_id', user.id).order('volgorde')
    setLijsten((data ?? []) as Lijst[])
  }, [user])

  const haalTakenOp = useCallback(async () => {
    if (!user) return
    const lijstIds = lijsten.map(l => l.id)
    if (lijstIds.length === 0) { setTaken([]); return }
    const { data } = await getSupabase().from('todo_taken').select('*').in('lijst_id', lijstIds).order('volgorde')
    setTaken((data ?? []) as Taak[])
  }, [user, lijsten])

  useEffect(() => { haalLijstenOp() }, [haalLijstenOp])
  useEffect(() => { haalTakenOp() }, [haalTakenOp])

  // ── Lijsten beheer ──────────────────────────────────────────────────────────
  async function maakLijst() {
    if (!nieuweLijstNaam.trim() || !user) return
    await getSupabase().from('todo_lijsten').insert({ naam: nieuweLijstNaam.trim(), kleur: gekozenKleur, eigenaar_id: user.id, volgorde: lijsten.length })
    setNieuweLijstNaam(''); setToonNieuweLijst(false); setGekozenKleur(KLEUREN[0])
    await haalLijstenOp()
  }

  async function verwijderLijst(id: string) {
    if (!confirm('Lijst verwijderen? Alle taken gaan verloren.')) return
    await getSupabase().from('todo_lijsten').delete().eq('id', id)
    if (activeLijst === id) setActiveLijst('inbox')
    await haalLijstenOp()
    setBewerkLijst(null)
  }

  async function updateLijst(id: string, data: Partial<Lijst>) {
    await getSupabase().from('todo_lijsten').update(data).eq('id', id)
    await haalLijstenOp()
    setBewerkLijst(null)
  }

  // ── Taken beheer ────────────────────────────────────────────────────────────
  async function voegTaakToe() {
    if (!nieuweTaakTitel.trim()) return
    const lijstId = typeof activeLijst === 'string' && lijsten.find(l => l.id === activeLijst) ? activeLijst : lijsten[0]?.id
    if (!lijstId) return
    const huidigeVolgorde = taken.filter(t => t.lijst_id === lijstId).length
    const { data } = await getSupabase().from('todo_taken').insert({ lijst_id: lijstId, titel: nieuweTaakTitel.trim(), volgorde: huidigeVolgorde }).select().single()
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

  // ── Gefilterde taken ────────────────────────────────────────────────────────
  function gefilterdeTaken(): Taak[] {
    let resultaat: Taak[] = []
    const nu = new Date().toDateString()
    const morgen = new Date(); morgen.setDate(morgen.getDate() + 1)

    if (activeLijst === 'inbox') {
      resultaat = taken
    } else if (activeLijst === 'vandaag') {
      resultaat = taken.filter(t => t.vervaldatum && new Date(t.vervaldatum).toDateString() === nu)
    } else if (activeLijst === 'gepland') {
      resultaat = taken.filter(t => t.vervaldatum)
    } else {
      resultaat = taken.filter(t => t.lijst_id === activeLijst)
    }

    // Sorteer: prioriteit desc, dan volgorde
    resultaat = resultaat.sort((a, b) => {
      if (a.voltooid !== b.voltooid) return a.voltooid ? 1 : -1
      if (b.prioriteit !== a.prioriteit) return b.prioriteit - a.prioriteit
      return a.volgorde - b.volgorde
    })

    if (!toonVoltooid) return resultaat.filter(t => !t.voltooid)
    return resultaat
  }

  const actiefLijstObj = lijsten.find(l => l.id === activeLijst)
  const actiefKleur = actiefLijstObj?.kleur ?? 'var(--primary)'
  const voltooideCount = taken.filter(t => {
    if (activeLijst === 'inbox') return t.voltooid
    if (activeLijst === 'vandaag') return t.voltooid && t.vervaldatum && new Date(t.vervaldatum).toDateString() === new Date().toDateString()
    if (activeLijst === 'gepland') return t.voltooid && t.vervaldatum
    return t.voltooid && t.lijst_id === activeLijst
  }).length

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Linker paneel: lijsten ── */}
      <div style={{ width: 240, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700 }}>Taken</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{profiel?.naam}</div>
        </div>

        {/* Slimme lijsten */}
        <div style={{ padding: '8px 6px 4px' }}>
          {[
            { id: 'inbox', icon: <Inbox size={15} />, label: 'Alle taken', count: taken.filter(t => !t.voltooid).length },
            { id: 'vandaag', icon: <Star size={15} />, label: 'Vandaag', count: taken.filter(t => !t.voltooid && t.vervaldatum && new Date(t.vervaldatum).toDateString() === new Date().toDateString()).length },
            { id: 'gepland', icon: <Calendar size={15} />, label: 'Gepland', count: taken.filter(t => !t.voltooid && t.vervaldatum).length },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveLijst(item.id as any); setGeselecteerdeTaak(null) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: activeLijst === item.id ? 'var(--primary-xlight)' : 'transparent', color: activeLijst === item.id ? 'var(--primary-text)' : 'var(--text)', transition: 'background 0.1s', textAlign: 'left' }}
            >
              <span style={{ color: activeLijst === item.id ? 'var(--primary)' : 'var(--text-muted)' }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: activeLijst === item.id ? 600 : 400 }}>{item.label}</span>
              {item.count > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)', padding: '1px 7px', borderRadius: 20 }}>{item.count}</span>}
            </button>
          ))}
        </div>

        <div style={{ margin: '4px 14px', height: 1, background: 'var(--border)' }} />

        {/* Mijn lijsten */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '6px 10px 4px' }}>Mijn lijsten</div>
          {lijsten.map(lijst => (
            <div key={lijst.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                onClick={() => { setActiveLijst(lijst.id); setGeselecteerdeTaak(null) }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: activeLijst === lijst.id ? 'var(--primary-xlight)' : 'transparent', color: 'var(--text)', transition: 'background 0.1s', textAlign: 'left' }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: lijst.kleur, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: activeLijst === lijst.id ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lijst.naam}</span>
                {taken.filter(t => t.lijst_id === lijst.id && !t.voltooid).length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{taken.filter(t => t.lijst_id === lijst.id && !t.voltooid).length}</span>
                )}
              </button>
              <button onClick={() => setBewerkLijst(lijst)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 5px', borderRadius: 6, display: 'flex', opacity: 0.5 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
              >
                <MoreHorizontal size={13} />
              </button>
            </div>
          ))}

          {/* Nieuwe lijst */}
          {toonNieuweLijst ? (
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                className="form-input"
                style={{ fontSize: 13, padding: '6px 10px' }}
                value={nieuweLijstNaam}
                onChange={e => setNieuweLijstNaam(e.target.value)}
                placeholder="Naam lijst"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') maakLijst(); if (e.key === 'Escape') setToonNieuweLijst(false) }}
              />
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {KLEUREN.map(k => (
                  <button key={k} onClick={() => setGekozenKleur(k)} style={{ width: 20, height: 20, borderRadius: '50%', background: k, border: gekozenKleur === k ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={maakLijst} disabled={!nieuweLijstNaam.trim()}>Aanmaken</button>
                <button className="btn btn-sm" onClick={() => setToonNieuweLijst(false)}>Annuleren</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setToonNieuweLijst(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontSize: 13 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus size={14} /> Nieuwe lijst
            </button>
          )}
        </div>
      </div>

      {/* ── Midden paneel: taken lijst ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 12 }}>
          {actiefLijstObj && <div style={{ width: 14, height: 14, borderRadius: '50%', background: actiefKleur, flexShrink: 0 }} />}
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, flex: 1 }}>
            {activeLijst === 'inbox' ? 'Alle taken' : activeLijst === 'vandaag' ? 'Vandaag' : activeLijst === 'gepland' ? 'Gepland' : actiefLijstObj?.naam}
          </div>
          {voltooideCount > 0 && (
            <button onClick={() => setToonVoltooid(!toonVoltooid)} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
              {toonVoltooid ? 'Verberg voltooid' : `${voltooideCount} voltooid`}
            </button>
          )}
        </div>

        {/* Taken */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {gefilterdeTaken().map(taak => (
            <div
              key={taak.id}
              onClick={() => setGeselecteerdeTaak(geselecteerdeTaak?.id === taak.id ? null : taak)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 20px',
                cursor: 'pointer', transition: 'background 0.1s',
                background: geselecteerdeTaak?.id === taak.id ? 'var(--primary-xlight)' : 'transparent',
                borderLeft: geselecteerdeTaak?.id === taak.id ? '3px solid var(--primary)' : '3px solid transparent',
              }}
              onMouseEnter={e => { if (geselecteerdeTaak?.id !== taak.id) e.currentTarget.style.background = 'var(--bg)' }}
              onMouseLeave={e => { if (geselecteerdeTaak?.id !== taak.id) e.currentTarget.style.background = 'transparent' }}
            >
              {/* Checkbox */}
              <button
                onClick={e => { e.stopPropagation(); toggleVoltooid(taak) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1, flexShrink: 0, color: taak.voltooid ? actiefKleur : 'var(--border-dark)', transition: 'color 0.15s' }}
              >
                {taak.voltooid
                  ? <CheckCircle2 size={20} color={actiefLijstObj?.kleur ?? 'var(--primary)'} fill={actiefLijstObj?.kleur ?? 'var(--primary)'} />
                  : <Circle size={20} />
                }
              </button>

              {/* Inhoud */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: taak.voltooid ? 'var(--text-muted)' : 'var(--text)', textDecoration: taak.voltooid ? 'line-through' : 'none', lineHeight: 1.4 }}>
                  {taak.titel}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                  {taak.prioriteit > 0 && (
                    <span style={{ fontSize: 11, color: PRIORITEIT_CONFIG[taak.prioriteit as keyof typeof PRIORITEIT_CONFIG].kleur, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Flag size={10} /> {PRIORITEIT_CONFIG[taak.prioriteit as keyof typeof PRIORITEIT_CONFIG].label}
                    </span>
                  )}
                  {taak.vervaldatum && (
                    <span style={{ fontSize: 11, color: isVerlopen(taak.vervaldatum) && !taak.voltooid ? '#EF4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Calendar size={10} /> {fmtDatum(taak.vervaldatum)}
                    </span>
                  )}
                  {taak.notitie && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📝</span>}
                </div>
              </div>
            </div>
          ))}

          {gefilterdeTaken().length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
              <div style={{ fontSize: 14 }}>Geen taken</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Voeg hieronder een taak toe</div>
            </div>
          )}
        </div>

        {/* Nieuwe taak invoer */}
        {(typeof activeLijst === 'string' && (activeLijst === 'inbox' || lijsten.find(l => l.id === activeLijst))) && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border-dark)', background: 'var(--bg)', transition: 'border-color 0.15s' }}
              onFocus={() => {}} >
              <Circle size={18} color="var(--border-dark)" style={{ flexShrink: 0 }} />
              <input
                ref={nieuweInputRef}
                value={nieuweTaakTitel}
                onChange={e => setNieuweTaakTitel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && nieuweTaakTitel.trim()) voegTaakToe() }}
                onFocus={e => (e.currentTarget.parentElement!.style.borderColor = actiefKleur)}
                onBlur={e => (e.currentTarget.parentElement!.style.borderColor = 'var(--border-dark)')}
                placeholder="Taak toevoegen..."
                style={{ flex: 1, border: 'none', background: 'none', fontSize: 14, color: 'var(--text)', outline: 'none' }}
              />
              {nieuweTaakTitel && (
                <button onClick={voegTaakToe} style={{ background: 'var(--primary)', border: 'none', color: '#fff', borderRadius: 7, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                  Voeg toe
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Rechter paneel: taak detail ── */}
      {geselecteerdeTaak && (
        <TaakDetail
          taak={geselecteerdeTaak}
          lijst={lijsten.find(l => l.id === geselecteerdeTaak.lijst_id)}
          lijsten={lijsten}
          onUpdate={updateTaak}
          onVerwijder={verwijderTaak}
          onToggle={toggleVoltooid}
          onClose={() => setGeselecteerdeTaak(null)}
        />
      )}

      {/* Bewerk lijst modal */}
      {bewerkLijst && (
        <BewerkLijstModal
          lijst={bewerkLijst}
          onSave={(data) => updateLijst(bewerkLijst.id, data)}
          onVerwijder={() => verwijderLijst(bewerkLijst.id)}
          onClose={() => setBewerkLijst(null)}
        />
      )}
    </div>
  )
}

// ─── Taak Detail Paneel ───────────────────────────────────────────────────────

function TaakDetail({ taak, lijst, lijsten, onUpdate, onVerwijder, onToggle, onClose }: {
  taak: Taak
  lijst?: Lijst
  lijsten: Lijst[]
  onUpdate: (id: string, data: Partial<Taak>) => void
  onVerwijder: (id: string) => void
  onToggle: (taak: Taak) => void
  onClose: () => void
}) {
  const [titel, setTitel] = useState(taak.titel)
  const [notitie, setNotitie] = useState(taak.notitie ?? '')
  const kleur = lijst?.kleur ?? 'var(--primary)'

  useEffect(() => { setTitel(taak.titel); setNotitie(taak.notitie ?? '') }, [taak.id])

  function slaOp() {
    onUpdate(taak.id, { titel: titel.trim() || taak.titel, notitie: notitie.trim() || null })
  }

  return (
    <div style={{ width: 300, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onToggle(taak)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: taak.voltooid ? kleur : 'var(--border-dark)', flexShrink: 0 }}>
          {taak.voltooid
            ? <CheckCircle2 size={22} color={kleur} fill={kleur} />
            : <Circle size={22} />
          }
        </button>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>{lijst?.naam ?? 'Alle taken'}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={16} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Titel */}
        <textarea
          value={titel}
          onChange={e => setTitel(e.target.value)}
          onBlur={slaOp}
          style={{ fontSize: 16, fontWeight: 600, border: 'none', background: 'none', color: 'var(--text)', resize: 'none', outline: 'none', fontFamily: 'Sora, sans-serif', lineHeight: 1.4, textDecoration: taak.voltooid ? 'line-through' : 'none', width: '100%' }}
          rows={2}
        />

        {/* Vervaldatum */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Vervaldatum</label>
          <input
            type="date"
            className="form-input"
            style={{ fontSize: 13 }}
            value={taak.vervaldatum ?? ''}
            onChange={e => onUpdate(taak.id, { vervaldatum: e.target.value || null })}
          />
        </div>

        {/* Prioriteit */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Prioriteit</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {([0, 1, 2, 3] as const).map(p => (
              <button
                key={p}
                onClick={() => onUpdate(taak.id, { prioriteit: p })}
                style={{ flex: 1, padding: '6px 4px', borderRadius: 7, border: `1.5px solid ${taak.prioriteit === p ? PRIORITEIT_CONFIG[p].kleur : 'var(--border)'}`, background: taak.prioriteit === p ? PRIORITEIT_CONFIG[p].kleur + '20' : 'var(--bg)', cursor: 'pointer', fontSize: 11, color: PRIORITEIT_CONFIG[p].kleur === 'var(--text-muted)' ? 'var(--text-muted)' : PRIORITEIT_CONFIG[p].kleur, fontWeight: taak.prioriteit === p ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}
              >
                <Flag size={11} /> {p === 0 ? '—' : PRIORITEIT_CONFIG[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Lijst */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Lijst</label>
          <select className="form-select" style={{ fontSize: 13 }} value={taak.lijst_id} onChange={e => onUpdate(taak.id, { lijst_id: e.target.value })}>
            {lijsten.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
          </select>
        </div>

        {/* Notitie */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Notitie</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: 100, fontSize: 13 }}
            value={notitie}
            onChange={e => setNotitie(e.target.value)}
            onBlur={slaOp}
            placeholder="Voeg een notitie toe..."
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {taak.voltooid_op ? `Voltooid ${new Date(taak.voltooid_op).toLocaleDateString('nl-NL')}` : ''}
        </span>
        <button onClick={() => onVerwijder(taak.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', opacity: 0.5 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#EF4444' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── Bewerk Lijst Modal ───────────────────────────────────────────────────────

function BewerkLijstModal({ lijst, onSave, onVerwijder, onClose }: {
  lijst: Lijst
  onSave: (data: Partial<Lijst>) => void
  onVerwijder: () => void
  onClose: () => void
}) {
  const [naam, setNaam] = useState(lijst.naam)
  const [kleur, setKleur] = useState(lijst.kleur)

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Lijst bewerken</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Naam</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && naam.trim() && onSave({ naam: naam.trim(), kleur })} />
          </div>
          <div>
            <label className="form-label">Kleur</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {KLEUREN.map(k => (
                <button key={k} onClick={() => setKleur(k)} style={{ width: 28, height: 28, borderRadius: '50%', background: k, border: kleur === k ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.1s', transform: kleur === k ? 'scale(1.15)' : 'scale(1)' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
            <button className="btn btn-sm" style={{ color: '#EF4444', borderColor: '#FECACA' }} onClick={onVerwijder}>
              <Trash2 size={13} /> Verwijderen
            </button>
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
