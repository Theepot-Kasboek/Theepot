'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import { getSupabase } from '@/lib/supabase'
import {
  BookOpen, Calendar, MessageSquare, Users, Scissors,
  ChevronRight, Settings, X, GripVertical, Plus,
  Wallet, Cloud, CheckSquare, FileText, Flame, Newspaper,
  UtensilsCrossed, Map, Eye, EyeOff, Edit3,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type WidgetSize = '1x1' | '2x1' | '3x1' | '1x2'

interface DashboardWidget {
  id: string
  size: WidgetSize
  volgorde: number
}

interface Afspraak {
  id: string; titel: string; start_tijd: string
  eind_tijd: string; hele_dag: boolean
  kalender_kleur?: string; kalender_naam?: string
  kalender_id: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startVanWeek(d: Date) {
  const ma = new Date(d)
  ma.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))
  ma.setHours(0, 0, 0, 0)
  return ma
}
function isSameDag(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function fmtTijd(iso: string) { return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) }
function fmtDagKort(d: Date) { return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) }

// ─── Widget Catalogus ─────────────────────────────────────────────────────────

const WIDGET_CATALOGUS = [
  { id: 'welkom',         label: 'Welkomstkaart',     icon: '👋', beschrijving: 'Naam, datum en begroeting' },
  { id: 'weekagenda',     label: 'Weekagenda',         icon: '📅', beschrijving: 'Afspraken van deze week' },
  { id: 'weekplanning',   label: 'Weekplanning',       icon: '✂️', beschrijving: 'Huidige weekplanning per locatie' },
  { id: 'weer',           label: 'Weer',               icon: '🌤️', beschrijving: 'Actueel weer op ingestelde locatie' },
  { id: 'taken',          label: 'Mijn taken',         icon: '✅', beschrijving: 'Openstaande taken van vandaag' },
  { id: 'agenda_vandaag', label: 'Agenda vandaag',     icon: '🗓️', beschrijving: 'Afspraken van vandaag' },
  { id: 'snelkoppelingen', label: 'Snelkoppelingen',  icon: '🔗', beschrijving: 'Links naar pagina\'s' },
  { id: 'kasboek',        label: 'Kasboek',            icon: '💰', beschrijving: 'Snelkoppeling kasboek' },
  { id: 'chat',           label: 'Chat',               icon: '💬', beschrijving: 'Snelkoppeling chat' },
  { id: 'nieuwsbrieven',  label: 'Nieuwsbrieven',      icon: '📰', beschrijving: 'Snelkoppeling nieuwsbrieven' },
]

const OPSLAG_KEY = (uid: string) => `dashboard_v2_${uid}`
const LOCATIE_KEY = (uid: string) => `dashboard_weer_locatie_${uid}`
const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'welkom', size: '2x1', volgorde: 0 },
  { id: 'weekagenda', size: '3x1', volgorde: 1 },
  { id: 'weekplanning', size: '2x1', volgorde: 2 },
  { id: 'weer', size: '1x1', volgorde: 3 },
  { id: 'snelkoppelingen', size: '3x1', volgorde: 4 },
]

// ─── Hoofd Dashboard ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, profiel, isSuperadmin, rechten } = useAuth()
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [bewerkmodus, setBewerkmodus] = useState(false)
  const [catalogusOpen, setCatalogusOpen] = useState(false)
  const [weerLocatie, setWeerLocatie] = useState('Lisse')
  const [weerLocatieInput, setWeerLocatieInput] = useState('')

  // Laad opgeslagen lay-out
  useEffect(() => {
    if (!user) return
    const opgeslagen = localStorage.getItem(OPSLAG_KEY(user.id))
    setWidgets(opgeslagen ? JSON.parse(opgeslagen) : DEFAULT_WIDGETS)
    const loc = localStorage.getItem(LOCATIE_KEY(user.id))
    if (loc) setWeerLocatie(loc)
  }, [user?.id])

  function slaOpslaan(w: DashboardWidget[]) {
    if (!user) return
    localStorage.setItem(OPSLAG_KEY(user.id), JSON.stringify(w))
    setWidgets(w)
  }

  function verwijderWidget(id: string) {
    slaOpslaan(widgets.filter(w => w.id !== id))
  }

  function voegToe(id: string) {
    if (widgets.find(w => w.id === id)) return
    slaOpslaan([...widgets, { id, size: '2x1', volgorde: widgets.length }])
    setCatalogusOpen(false)
  }

  function verplaats(id: string, richting: 'links' | 'rechts') {
    const idx = widgets.findIndex(w => w.id === id)
    if (idx === -1) return
    const nieuw = [...widgets]
    const swap = richting === 'links' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= nieuw.length) return
    ;[nieuw[idx], nieuw[swap]] = [nieuw[swap], nieuw[idx]]
    slaOpslaan(nieuw)
  }

  function zetGrootte(id: string, size: WidgetSize) {
    slaOpslaan(widgets.map(w => w.id === id ? { ...w, size } : w))
  }

  function slaWeerLocatieOp() {
    if (!user || !weerLocatieInput.trim()) return
    setWeerLocatie(weerLocatieInput.trim())
    localStorage.setItem(LOCATIE_KEY(user.id), weerLocatieInput.trim())
    setWeerLocatieInput('')
  }

  function reset() {
    if (!confirm('Dashboard terugzetten naar standaard?')) return
    slaOpslaan(DEFAULT_WIDGETS)
  }

  const gesorteerd = [...widgets].sort((a, b) => a.volgorde - b.volgorde)
  const beschikbaar = WIDGET_CATALOGUS.filter(c => !widgets.find(w => w.id === c.id))

  return (
    <>
      <Topbar
        titel="Dashboard"
        acties={
          <div style={{ display: 'flex', gap: 8 }}>
            {bewerkmodus && (
              <>
                <button className="btn btn-sm" onClick={() => setCatalogusOpen(true)}>
                  <Plus size={13} /> Widget toevoegen
                </button>
                <button className="btn btn-sm" onClick={reset} style={{ color: 'var(--text-muted)' }}>
                  Herstel standaard
                </button>
              </>
            )}
            <button className={`btn btn-sm ${bewerkmodus ? 'btn-primary' : ''}`} onClick={() => setBewerkmodus(!bewerkmodus)}>
              <Edit3 size={13} /> {bewerkmodus ? 'Klaar' : 'Aanpassen'}
            </button>
          </div>
        }
      />

      <div className="page-content">

        {/* Widget grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, alignItems: 'start' }}>
          {gesorteerd.map((w, idx) => {
            const kolommen = w.size === '1x1' ? 1 : w.size === '3x1' ? 3 : 2
            return (
              <div key={w.id} style={{ gridColumn: `span ${kolommen}`, position: 'relative' }}>
                {/* Bewerkoverlay */}
                {bewerkmodus && (
                  <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 10, display: 'flex', gap: 4 }}>
                    {/* Grootte knoppen */}
                    {(['1x1','2x1','3x1'] as WidgetSize[]).map(s => (
                      <button key={s} onClick={() => zetGrootte(w.id, s)}
                        style={{ fontSize: 9, padding: '2px 6px', borderRadius: 5, border: '1px solid', cursor: 'pointer', background: w.size === s ? 'var(--primary)' : 'var(--bg)', color: w.size === s ? '#fff' : 'var(--text-muted)', borderColor: w.size === s ? 'var(--primary)' : 'var(--border)' }}>
                        {s}
                      </button>
                    ))}
                    <button onClick={() => verplaats(w.id, 'links')} disabled={idx === 0}
                      style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)', cursor: idx === 0 ? 'default' : 'pointer', color: 'var(--text-muted)', opacity: idx === 0 ? 0.3 : 1 }}>←</button>
                    <button onClick={() => verplaats(w.id, 'rechts')} disabled={idx === gesorteerd.length - 1}
                      style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)', cursor: idx === gesorteerd.length - 1 ? 'default' : 'pointer', color: 'var(--text-muted)', opacity: idx === gesorteerd.length - 1 ? 0.3 : 1 }}>→</button>
                    <button onClick={() => verwijderWidget(w.id)}
                      style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, border: '1px solid #FECACA', background: 'var(--bg)', cursor: 'pointer', color: '#DC2626' }}>✕</button>
                  </div>
                )}

                {/* Widget inhoud */}
                <div style={{ outline: bewerkmodus ? '2px dashed var(--border-dark)' : 'none', borderRadius: 14, overflow: 'hidden' }}>
                  {w.id === 'welkom' && user && profiel && <WelkomWidget profiel={profiel} />}
                  {w.id === 'weekagenda' && user && <WeekAgendaWidget profielId={user.id} />}
                  {w.id === 'weekplanning' && user && <WeekplanningWidget profielId={user.id} isSuperadmin={isSuperadmin} profiel={profiel} />}
                  {w.id === 'weer' && <WeerWidget locatie={weerLocatie} bewerkmodus={bewerkmodus} locatieInput={weerLocatieInput} onLocatieInput={setWeerLocatieInput} onLocatieOpslaan={slaWeerLocatieOp} />}
                  {w.id === 'taken' && user && <TakenWidget profielId={user.id} />}
                  {w.id === 'agenda_vandaag' && user && <AgendaVandaagWidget profielId={user.id} />}
                  {w.id === 'snelkoppelingen' && <SnelkoppelingenWidget rechten={rechten as unknown as Record<string, string>} isSuperadmin={isSuperadmin} />}
                  {w.id === 'kasboek' && <LinkWidget href="/kasboek" label="Kasboek" icon={<Wallet size={24} />} kleur="#8CC63F" />}
                  {w.id === 'chat' && <LinkWidget href="/chat" label="Chat" icon={<MessageSquare size={24} />} kleur="#EC4899" />}
                  {w.id === 'nieuwsbrieven' && <LinkWidget href="/nieuwsbrieven" label="Nieuwsbrieven" icon={<Newspaper size={24} />} kleur="#3B82F6" />}
                </div>
              </div>
            )
          })}
        </div>

        {/* Catalogus modal */}
        {catalogusOpen && (
          <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setCatalogusOpen(false) }}>
            <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
              <div className="card-header">
                <span className="card-title">Widget toevoegen</span>
                <button onClick={() => setCatalogusOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
              </div>
              <div className="card-body">
                {beschikbaar.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 13 }}>Alle widgets staan al op je dashboard.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {beschikbaar.map(c => (
                      <div key={c.id} onClick={() => voegToe(c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-xlight)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}>
                        <span style={{ fontSize: 22 }}>{c.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.beschrijving}</div>
                        </div>
                        <Plus size={16} style={{ marginLeft: 'auto', color: 'var(--primary)', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Welkom Widget ────────────────────────────────────────────────────────────

function WelkomWidget({ profiel }: { profiel: { naam: string; rol: string } }) {
  const nu = new Date()
  const uur = nu.getHours()
  const groet = uur < 6 ? 'Goedenacht' : uur < 12 ? 'Goedemorgen' : uur < 18 ? 'Goedemiddag' : 'Goedenavond'
  const dag = nu.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #3D7010 100%)', border: 'none' }}>
      <div style={{ padding: '20px 20px' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, textTransform: 'capitalize' }}>{dag}</div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          {groet}, {profiel.naam.split(' ')[0]}!
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{profiel.rol}</div>
      </div>
    </div>
  )
}

// ─── Weer Widget ──────────────────────────────────────────────────────────────

interface WeerData {
  temp: number; beschrijving: string; icoon: string
  neerslag: number; wind: number; stad: string
  min: number; max: number
}

function WeerWidget({ locatie, bewerkmodus, locatieInput, onLocatieInput, onLocatieOpslaan }: {
  locatie: string; bewerkmodus: boolean
  locatieInput: string; onLocatieInput: (v: string) => void; onLocatieOpslaan: () => void
}) {
  const [weer, setWeer] = useState<WeerData | null>(null)
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState(false)

  useEffect(() => {
    async function laad() {
      setLaden(true); setFout(false)
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=auto&longitude=auto&current=temperature_2m,precipitation,windspeed_10m,weathercode&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FAmsterdam&forecast_days=1&geocoding=true`
        )
        // Open-meteo heeft geen geocoding, gebruik geocoding API
        const geoR = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locatie)}&count=1&language=nl&format=json`)
        const geoData = await geoR.json()
        if (!geoData.results || geoData.results.length === 0) { setFout(true); setLaden(false); return }

        const { latitude, longitude, name } = geoData.results[0]
        const weerR = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,windspeed_10m,weathercode&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FAmsterdam&forecast_days=1`
        )
        const weerData = await weerR.json()
        const code = weerData.current.weathercode
        const iconen: Record<string, string> = {
          '0': '☀️', '1': '🌤️', '2': '⛅', '3': '☁️',
          '45': '🌫️', '48': '🌫️', '51': '🌦️', '61': '🌧️',
          '71': '❄️', '80': '🌦️', '95': '⛈️',
        }
        const beschrijvingen: Record<string, string> = {
          '0': 'Helder', '1': 'Licht bewolkt', '2': 'Bewolkt', '3': 'Zwaar bewolkt',
          '45': 'Mist', '51': 'Motregen', '61': 'Regen', '71': 'Sneeuw',
          '80': 'Regenbuien', '95': 'Onweer',
        }
        const icoonKey = Object.keys(iconen).find(k => code <= parseInt(k)) ?? '3'
        setWeer({
          temp: Math.round(weerData.current.temperature_2m),
          neerslag: weerData.current.precipitation,
          wind: Math.round(weerData.current.windspeed_10m),
          icoon: iconen[icoonKey] ?? '🌡️',
          beschrijving: beschrijvingen[icoonKey] ?? 'Onbekend',
          stad: name,
          min: Math.round(weerData.daily.temperature_2m_min[0]),
          max: Math.round(weerData.daily.temperature_2m_max[0]),
        })
      } catch {
        setFout(true)
      }
      setLaden(false)
    }
    laad()
  }, [locatie])

  return (
    <div className="card">
      <div style={{ padding: '16px' }}>
        {/* Locatie invoer in bewerkmodus */}
        {bewerkmodus && (
          <div style={{ marginBottom: 10, display: 'flex', gap: 6 }}>
            <input className="form-input" style={{ flex: 1, fontSize: 12, padding: '5px 9px' }}
              value={locatieInput} onChange={e => onLocatieInput(e.target.value)}
              placeholder={`Locatie: ${locatie}`}
              onKeyDown={e => e.key === 'Enter' && onLocatieOpslaan()} />
            <button className="btn btn-sm" onClick={onLocatieOpslaan} disabled={!locatieInput.trim()}>Opslaan</button>
          </div>
        )}

        {laden ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>Laden...</div>
        ) : fout ? (
          <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--text-muted)', fontSize: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>🌡️</div>
            Locatie niet gevonden:<br />&quot;{locatie}&quot;
          </div>
        ) : weer ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 42, lineHeight: 1 }}>{weer.icoon}</div>
              <div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{weer.temp}°</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{weer.beschrijving}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{weer.stad}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>↑{weer.max}° ↓{weer.min}°</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>💨 {weer.wind} km/u</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🌧 {weer.neerslag} mm</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

// ─── Week Agenda Widget ───────────────────────────────────────────────────────

function WeekAgendaWidget({ profielId }: { profielId: string }) {
  const [afspraken, setAfspraken] = useState<Afspraak[]>([])
  const [laden, setLaden] = useState(true)
  const nu = new Date()
  const maandag = startVanWeek(nu)
  const dagen = Array.from({ length: 7 }, (_, i) => { const d = new Date(maandag); d.setDate(maandag.getDate() + i); return d })
  const vandaagIdx = nu.getDay() === 0 ? 6 : nu.getDay() - 1

  useEffect(() => {
    async function laad() {
      setLaden(true)
      const supabase = getSupabase()
      const { data: persoonlijk } = await supabase.from('agenda_kalenders').select('id,kleur,naam').eq('eigenaar_id', profielId)
      const { data: gedeeld } = await supabase.from('agenda_gedeeld').select('kalender_id').eq('profiel_id', profielId)
      const gedeeldeIds = (gedeeld ?? []).map((g: { kalender_id: string }) => g.kalender_id)
      const { data: gedeeldeKals } = gedeeldeIds.length > 0 ? await supabase.from('agenda_kalenders').select('id,kleur,naam').in('id', gedeeldeIds) : { data: [] }
      const kalenders = [...(persoonlijk ?? []), ...(gedeeldeKals ?? [])]
      const kalMap = Object.fromEntries(kalenders.map((k: { id: string; kleur: string; naam: string }) => [k.id, k]))
      const ids = kalenders.map((k: { id: string }) => k.id)
      if (ids.length === 0) { setAfspraken([]); setLaden(false); return }
      const weekEind = new Date(maandag); weekEind.setDate(maandag.getDate() + 6); weekEind.setHours(23, 59, 59)
      const { data } = await supabase.from('agenda_afspraken').select('*').in('kalender_id', ids).gte('start_tijd', maandag.toISOString()).lte('start_tijd', weekEind.toISOString()).order('start_tijd')
      setAfspraken((data ?? []).map((a: Afspraak) => ({ ...a, kalender_kleur: kalMap[a.kalender_id]?.kleur ?? 'var(--primary)', kalender_naam: kalMap[a.kalender_id]?.naam ?? '' })))
      setLaden(false)
    }
    laad()
  }, [profielId])

  const weekNr = Math.ceil((((nu.getTime() - new Date(nu.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(nu.getFullYear(), 0, 1).getDay() + 1) / 7)

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={15} color="var(--primary)" />
          <span className="card-title">Week {weekNr}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDagKort(maandag)} – {fmtDagKort(dagen[6])}</span>
        </div>
        <Link href="/agenda" className="btn btn-sm" style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}>Agenda <ChevronRight size={12} /></Link>
      </div>
      {laden ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Laden...</div> : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minWidth: 560 }}>
            {dagen.map((dag, i) => {
              const isVandaag = isSameDag(dag, nu)
              const afs = afspraken.filter(a => isSameDag(new Date(a.start_tijd), dag))
              return (
                <div key={i} style={{ padding: '10px 8px', borderRight: i < 6 ? '1px solid var(--border)' : 'none', minHeight: 80 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: isVandaag ? 'var(--primary)' : 'var(--text-muted)', marginBottom: 6, textAlign: 'center' }}>
                    {['Ma','Di','Wo','Do','Vr','Za','Zo'][i]}
                    <div style={{ fontSize: 14, fontWeight: isVandaag ? 800 : 400, color: isVandaag ? 'var(--primary)' : 'var(--text)', width: 24, height: 24, borderRadius: '50%', background: isVandaag ? 'var(--primary-light)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px auto 0' }}>
                      {dag.getDate()}
                    </div>
                  </div>
                  {afs.map(a => (
                    <div key={a.id} style={{ padding: '2px 5px', borderRadius: 4, marginBottom: 3, background: (a.kalender_kleur ?? 'var(--primary)') + '22', borderLeft: `2px solid ${a.kalender_kleur ?? 'var(--primary)'}` }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.titel}</div>
                      {!a.hele_dag && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{fmtTijd(a.start_tijd)}</div>}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Agenda Vandaag Widget ────────────────────────────────────────────────────

function AgendaVandaagWidget({ profielId }: { profielId: string }) {
  const [afspraken, setAfspraken] = useState<Afspraak[]>([])
  const [laden, setLaden] = useState(true)
  const nu = new Date()

  useEffect(() => {
    async function laad() {
      const supabase = getSupabase()
      const { data: persoonlijk } = await supabase.from('agenda_kalenders').select('id,kleur').eq('eigenaar_id', profielId)
      const ids = (persoonlijk ?? []).map((k: { id: string }) => k.id)
      if (ids.length === 0) { setAfspraken([]); setLaden(false); return }
      const start = new Date(nu); start.setHours(0,0,0,0)
      const eind = new Date(nu); eind.setHours(23,59,59)
      const { data } = await supabase.from('agenda_afspraken').select('*').in('kalender_id', ids).gte('start_tijd', start.toISOString()).lte('start_tijd', eind.toISOString()).order('start_tijd')
      const kalMap = Object.fromEntries((persoonlijk ?? []).map((k: { id: string; kleur: string }) => [k.id, k.kleur]))
      setAfspraken((data ?? []).map((a: Afspraak) => ({ ...a, kalender_kleur: kalMap[a.kalender_id] ?? 'var(--primary)' })))
      setLaden(false)
    }
    laad()
  }, [profielId])

  const dagNaam = nu.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={15} color="var(--primary)" />
          <span className="card-title" style={{ textTransform: 'capitalize' }}>{dagNaam}</span>
        </div>
        <Link href="/agenda" className="btn btn-sm" style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}>Agenda <ChevronRight size={12} /></Link>
      </div>
      <div style={{ padding: '10px 14px' }}>
        {laden ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Laden...</div>
          : afspraken.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>Geen afspraken vandaag 🎉</div>
          : afspraken.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 3, height: 36, borderRadius: 2, background: a.kalender_kleur ?? 'var(--primary)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.titel}</div>
                {!a.hele_dag && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTijd(a.start_tijd)}{a.eind_tijd ? ` – ${fmtTijd(a.eind_tijd)}` : ''}</div>}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── Weekplanning Widget ──────────────────────────────────────────────────────

function WeekplanningWidget({ profielId, isSuperadmin, profiel }: { profielId: string; isSuperadmin: boolean; profiel: { rol?: string } | null }) {
  const [locaties, setLocaties] = useState<string[]>([])
  const [actieveLocatie, setActieveLocatie] = useState('')
  const [planning, setPlanning] = useState<{ thema: string | null; knutsel?: string; kook_bak?: string; groepsspel?: string } | null>(null)
  const [laden, setLaden] = useState(true)
  const maandag = startVanWeek(new Date())
  const weekStart = maandag.toISOString().split('T')[0]

  useEffect(() => {
    if (!profiel) return
    async function laad() {
      const supabase = getSupabase()
      const { data: locs } = await supabase.from('kasboek_locaties').select('naam').eq('actief', true).order('naam')
      const allen = (locs ?? []).map((l: { naam: string }) => l.naam)
      const magAllesZien = isSuperadmin || profiel?.rol === 'directie' || profiel?.rol === 'leidinggevende'
      let namen = allen
      if (!magAllesZien) {
        const { data: toegang } = await supabase.from('locatie_toegang').select('locatie_naam').eq('profiel_id', profielId).eq('locatie_type', 'weekplanningen').neq('toegang', 'geen')
        const toegankelijk = (toegang ?? []).map((t: { locatie_naam: string }) => t.locatie_naam)
        namen = allen.filter((l: string) => toegankelijk.includes(l))
      }
      setLocaties(namen)
      if (namen.length > 0) { setActieveLocatie(namen[0]); laadPlanning(namen[0]) }
      else setLaden(false)
    }
    laad()
  }, [profielId, profiel?.rol])

  async function laadPlanning(locatie: string) {
    setLaden(true)
    const supabase = getSupabase()
    const { data: planningData } = await supabase.from('week_planningen').select('id,thema').eq('locatie_naam', locatie).eq('week_start', weekStart).eq('gepubliceerd', true).maybeSingle()
    if (!planningData) { setPlanning(null); setLaden(false); return }
    const { data: acts } = await supabase.from('week_activiteiten').select('naam,type').eq('planning_id', planningData.id)
    const actMap: Record<string, string> = {}
    for (const a of acts ?? []) actMap[a.type] = a.naam
    setPlanning({ thema: planningData.thema, ...actMap })
    setLaden(false)
  }

  const SLOTS = [
    { key: 'knutsel', label: 'Knutsel', kleur: '#8CC63F', bg: 'var(--primary-xlight)' },
    { key: 'kook_bak', label: 'Koken/Bakken', kleur: '#F97316', bg: '#FFF3E8' },
    { key: 'groepsspel', label: 'Groepsspel', kleur: '#06B6D4', bg: '#E6FAFA' },
  ]

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Scissors size={15} color="var(--primary)" />
          <span className="card-title">Weekplanning</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{maandag.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} – {new Date(maandag.getTime() + 4*86400000).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}</span>
        </div>
        <Link href="/weekplanningen" className="btn btn-sm" style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}>Openen <ChevronRight size={12} /></Link>
      </div>

      {locaties.length > 1 && (
        <div style={{ padding: '8px 14px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {locaties.map(loc => (
            <button key={loc} onClick={() => { setActieveLocatie(loc); laadPlanning(loc) }}
              style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, border: '1.5px solid', cursor: 'pointer', borderColor: actieveLocatie === loc ? 'var(--primary)' : 'var(--border-dark)', background: actieveLocatie === loc ? 'var(--primary)' : 'transparent', color: actieveLocatie === loc ? '#fff' : 'var(--text)' }}>
              {loc}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '12px 14px' }}>
        {laden ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Laden...</div>
          : !planning ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Geen gepubliceerde planning voor deze week.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {planning.thema && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Thema: <strong style={{ color: 'var(--text)' }}>{planning.thema}</strong></div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                {SLOTS.map(s => {
                  const naam = (planning as Record<string, string | null>)[s.key]
                  return (
                    <div key={s.key} style={{ padding: '10px 12px', borderRadius: 10, background: s.bg, borderLeft: `3px solid ${s.kleur}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: s.kleur, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 13, fontWeight: naam ? 700 : 400, color: naam ? '#1a1a1a' : '#888', fontStyle: naam ? 'normal' : 'italic', fontFamily: naam ? 'Sora, sans-serif' : 'inherit' }}>
                        {naam ?? 'Niet ingevuld'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}

// ─── Taken Widget ─────────────────────────────────────────────────────────────

function TakenWidget({ profielId }: { profielId: string }) {
  const [taken, setTaken] = useState<{ id: string; titel: string; prioriteit: number; vervaldatum: string | null }[]>([])
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    async function laad() {
      const supabase = getSupabase()
      const { data: lijsten } = await supabase.from('todo_lijsten').select('id').eq('eigenaar_id', profielId).eq('type', 'taken')
      const ids = (lijsten ?? []).map((l: { id: string }) => l.id)
      if (ids.length === 0) { setTaken([]); setLaden(false); return }
      const { data } = await supabase.from('todo_taken').select('id,titel,prioriteit,vervaldatum').in('lijst_id', ids).eq('voltooid', false).order('prioriteit', { ascending: false }).limit(5)
      setTaken(data ?? [])
      setLaden(false)
    }
    laad()
  }, [profielId])

  const prKleur = (p: number) => p === 3 ? '#EF4444' : p === 2 ? '#F59E0B' : p === 1 ? '#3B82F6' : 'var(--border-dark)'

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckSquare size={15} color="#8B5CF6" />
          <span className="card-title">Mijn taken</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{taken.length} openstaand</span>
        </div>
        <Link href="/taken" className="btn btn-sm" style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}>Alle taken <ChevronRight size={12} /></Link>
      </div>
      <div style={{ padding: '10px 14px' }}>
        {laden ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Laden...</div>
          : taken.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>Geen openstaande taken 🎉</div>
          : taken.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: prKleur(t.prioriteit), flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{t.titel}</span>
              {t.vervaldatum && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(t.vervaldatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>}
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── Snelkoppelingen Widget ───────────────────────────────────────────────────

function SnelkoppelingenWidget({ rechten, isSuperadmin }: { rechten: Record<string, string>; isSuperadmin: boolean }) {
  const links = [
    { href: '/kasboek', label: 'Kasboek', icon: <Wallet size={18} />, recht: 'pagina_kasboek', kleur: '#8CC63F' },
    { href: '/maaltijdlijst', label: 'Maaltijdlijst', icon: <UtensilsCrossed size={18} />, recht: 'pagina_maaltijdlijst', kleur: '#F97316' },
    { href: '/vakantieplanningen', label: 'Vakantieplan', icon: <Map size={18} />, recht: 'pagina_vakantieplanningen', kleur: '#3B82F6' },
    { href: '/weekplanningen', label: 'Weekplanning', icon: <Scissors size={18} />, recht: 'pagina_weekplanningen', kleur: '#8B5CF6' },
    { href: '/activiteiten', label: 'Activiteiten', icon: <BookOpen size={18} />, recht: 'pagina_activiteiten', kleur: '#EC4899' },
    { href: '/gesprekken', label: 'Gesprekken', icon: <MessageSquare size={18} />, recht: 'pagina_gesprekken', kleur: '#06B6D4' },
    { href: '/beleid', label: 'Beleid', icon: <FileText size={18} />, recht: 'pagina_beleid', kleur: '#6366F1' },
    { href: '/brandoefening', label: 'Brandoefening', icon: <Flame size={18} />, recht: 'pagina_brandoefening', kleur: '#EF4444' },
    { href: '/nieuwsbrieven', label: 'Nieuwsbrieven', icon: <Newspaper size={18} />, recht: 'pagina_nieuwsbrieven', kleur: '#F59E0B' },
    { href: '/chat', label: 'Chat', icon: <MessageSquare size={18} />, recht: 'pagina_chat', kleur: '#10B981' },
  ].filter(l => isSuperadmin || rechten[l.recht] !== 'geen')

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Snelkoppelingen</span></div>
      <div style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 500, transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = l.kleur; e.currentTarget.style.background = l.kleur + '15' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}>
            <span style={{ color: l.kleur }}>{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Link Widget ──────────────────────────────────────────────────────────────

function LinkWidget({ href, label, icon, kleur }: { href: string; label: string; icon: React.ReactNode; kleur: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="card" style={{ padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = kleur)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
        <div style={{ color: kleur, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{icon}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
      </div>
    </Link>
  )
}
