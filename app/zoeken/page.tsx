'use client'

import { useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import { Search, FileText, Calendar, Scissors, BookOpen, MessageSquare, Newspaper, Layers, Pin } from 'lucide-react'
import Link from 'next/link'

interface Resultaat {
  id: string
  type: string
  titel: string
  subtitel?: string
  url: string
  datum?: string
}

function fmtDatum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TYPE_CONFIG: Record<string, { label: string; kleur: string; icoon: React.ReactNode }> = {
  activiteit:      { label: 'Activiteit',      kleur: '#8CC63F', icoon: <BookOpen size={14} /> },
  nieuwsbrief:     { label: 'Nieuwsbrief',     kleur: '#3B82F6', icoon: <Newspaper size={14} /> },
  beleid:          { label: 'Beleidsstuk',      kleur: '#6366F1', icoon: <FileText size={14} /> },
  weekplanning:    { label: 'Weekplanning',     kleur: '#8B5CF6', icoon: <Scissors size={14} /> },
  vakantie:        { label: 'Vakantieplanning', kleur: '#F59E0B', icoon: <Layers size={14} /> },
  agenda:          { label: 'Agendaafspraak',   kleur: '#EC4899', icoon: <Calendar size={14} /> },
  prikbord:        { label: 'Prikbord',         kleur: '#EF4444', icoon: <Pin size={14} /> },
  thema_archief:   { label: 'Thema archief',    kleur: '#0EA5E9', icoon: <Layers size={14} /> },
}

export default function ZoekenPage() {
  const { profiel, isSuperadmin } = useAuth()
  const [zoek, setZoek] = useState('')
  const [resultaten, setResultaten] = useState<Resultaat[]>([])
  const [laden, setLaden] = useState(false)
  const [gezocht, setGezocht] = useState(false)

  const zoekAlles = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) return
    setLaden(true)
    setGezocht(true)
    const supabase = getSupabase()
    const q = query.toLowerCase()
    const resultatenLijst: Resultaat[] = []

    // Activiteiten
    const { data: acts } = await supabase.from('activiteiten').select('id,naam,categorie,beschrijving').ilike('naam', `%${q}%`).limit(8)
    for (const a of acts ?? []) resultatenLijst.push({ id: a.id, type: 'activiteit', titel: a.naam, subtitel: a.categorie, url: `/activiteiten?zoek=${encodeURIComponent(a.naam)}`, datum: undefined })

    // Nieuwsbrieven
    const { data: brieven } = await supabase.from('nieuwsbrieven').select('id,titel,datum,format,nummer').ilike('titel', `%${q}%`).limit(6)
    for (const b of brieven ?? []) resultatenLijst.push({ id: b.id, type: 'nieuwsbrief', titel: b.titel || `${b.format} Nr. ${b.nummer}`, subtitel: b.format, url: `/archief`, datum: b.datum })

    // Beleid
    const { data: beleid } = await supabase.from('beleidsstukken').select('id,naam,bestandsnaam,aangemaakt_op').ilike('naam', `%${q}%`).limit(6)
    for (const b of beleid ?? []) resultatenLijst.push({ id: b.id, type: 'beleid', titel: b.naam, subtitel: b.bestandsnaam, url: `/beleid`, datum: b.aangemaakt_op })

    // Weekplanningen
    const { data: wplanningen } = await supabase.from('week_planningen').select('id,thema,locatie_naam,week_start').ilike('thema', `%${q}%`).limit(6)
    for (const w of wplanningen ?? []) resultatenLijst.push({ id: w.id, type: 'weekplanning', titel: w.thema, subtitel: w.locatie_naam, url: `/weekplanningen`, datum: w.week_start })

    // Vakantieplanningen
    const { data: vplanningen } = await supabase.from('vakantie_planningen').select('id,naam,thema,aangemaakt_op').ilike('thema', `%${q}%`).limit(6)
    for (const v of vplanningen ?? []) resultatenLijst.push({ id: v.id, type: 'vakantie', titel: v.naam, subtitel: v.thema, url: `/vakantieplanningen`, datum: v.aangemaakt_op })

    // Prikbord
    const { data: prikbord } = await supabase.from('prikbord_berichten').select('id,titel,inhoud,aangemaakt_op').ilike('titel', `%${q}%`).limit(6)
    for (const p of prikbord ?? []) resultatenLijst.push({ id: p.id, type: 'prikbord', titel: p.titel, subtitel: p.inhoud?.substring(0, 60) + '...', url: `/prikbord`, datum: p.aangemaakt_op })

    // Thema archief
    const { data: archief } = await supabase.from('thema_archief').select('id,naam,seizoen,jaar,aangemaakt_op').ilike('naam', `%${q}%`).limit(6)
    for (const a of archief ?? []) resultatenLijst.push({ id: a.id, type: 'thema_archief', titel: a.naam, subtitel: a.seizoen ? `${a.seizoen} ${a.jaar ?? ''}` : String(a.jaar ?? ''), url: `/archief`, datum: a.aangemaakt_op })

    setResultaten(resultatenLijst)
    setLaden(false)
  }, [])

  return (
    <>
      <Topbar titel="Zoeken" />
      <div className="page-content">
        {/* Grote zoekbalk */}
        <div style={{ maxWidth: 600, margin: '0 auto 28px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 48, paddingRight: 16, fontSize: 16, height: 52, borderRadius: 12 }}
              value={zoek}
              onChange={e => setZoek(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && zoekAlles(zoek)}
              placeholder="Zoek activiteiten, nieuwsbrieven, beleid..."
              autoFocus
            />
            <button className="btn btn-primary"
              style={{ position: 'absolute', right: 6, top: 6, height: 40 }}
              onClick={() => zoekAlles(zoek)}
              disabled={zoek.length < 2}>
              Zoeken
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
            Zoekt in activiteiten, nieuwsbrieven, beleid, planningen, prikbord en thema-archief
          </div>
        </div>

        {/* Resultaten */}
        {laden && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Zoeken...</div>}

        {!laden && gezocht && resultaten.length === 0 && (
          <div className="empty-state" style={{ padding: 40 }}>
            <Search size={32} />
            <h3>Geen resultaten gevonden</h3>
            <p>Probeer een andere zoekterm</p>
          </div>
        )}

        {!laden && resultaten.length > 0 && (
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>{resultaten.length} resultaten gevonden voor &quot;{zoek}&quot;</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resultaten.map((r, i) => {
                const cfg = TYPE_CONFIG[r.type] ?? { label: r.type, kleur: '#888', icoon: <FileText size={14} /> }
                return (
                  <Link key={i} href={r.url} style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ transition: 'border-color 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.kleur)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: cfg.kleur + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.kleur, flexShrink: 0 }}>
                          {cfg.icoon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.titel}</div>
                          {r.subtitel && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.subtitel}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          {r.datum && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDatum(r.datum)}</span>}
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: cfg.kleur + '18', color: cfg.kleur, fontWeight: 600 }}>{cfg.label}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
