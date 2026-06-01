'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabase, type KasboekEntry } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  ChevronLeft, ChevronRight, Plus, Trash2,
  MapPin, Settings, X, Building2
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Locatie {
  id: string
  naam: string
  actief: boolean
  aangemaakt_op: string
}

type Periode = 'maand'  // Alleen maand, zoals gevraagd

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `€ ${Math.abs(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function periodeLabel(datum: Date): string {
  return datum.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
}

function periodeSleutel(datum: Date): string {
  return `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}`
}

function navigeerMaand(datum: Date, richting: number): Date {
  const d = new Date(datum)
  d.setMonth(d.getMonth() + richting)
  return d
}

const CATEGORIEEN = ['Omzet', 'Inkopen', 'Personeelskosten', 'Overige kosten', 'Materialen', 'Huisvestingskosten']

// ─── Component ────────────────────────────────────────────────────────────────

export default function KasboekPage() {
  const { profiel, isSuperadmin } = useAuth()

  // Navigatie
  const [huidigeDatum, setHuidigeDatum] = useState(new Date())
  const huidigePeriode = periodeSleutel(huidigeDatum)

  // Locaties
  const [locaties, setLocaties] = useState<Locatie[]>([])
  const [actieveLocatie, setActieveLocatie] = useState<Locatie | null>(null)
  const [locatieBeheerOpen, setLocatieBeheerOpen] = useState(false)
  const [nieuweLocatieNaam, setNieuweLocatieNaam] = useState('')
  const [locatieLaden, setLocatieLaden] = useState(false)

  // Boekingen
  const [entries, setEntries] = useState<KasboekEntry[]>([])
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  // Formulier
  const [type, setType] = useState<'inkomst' | 'uitgave'>('inkomst')
  const [bedrag, setBedrag] = useState('')
  const [categorie, setCategorie] = useState(CATEGORIEEN[0])
  const [omschrijving, setOmschrijving] = useState('')
  const [opslaan, setOpslaan] = useState(false)

  // ── Locaties ophalen ────────────────────────────────────────────────────────
  const haalLocatiesOp = useCallback(async () => {
    const { data } = await getSupabase()
      .from('kasboek_locaties')
      .select('*')
      .eq('actief', true)
      .order('naam')
    if (data) {
      setLocaties(data as Locatie[])
      // Zet eerste locatie actief als nog niet geselecteerd
      if (data.length > 0 && !actieveLocatie) {
        setActieveLocatie(data[0] as Locatie)
      }
    }
  }, [actieveLocatie])

  useEffect(() => { haalLocatiesOp() }, [])

  // ── Boekingen ophalen ───────────────────────────────────────────────────────
  const haalOp = useCallback(async () => {
    if (!actieveLocatie) return
    setLaden(true)
    setFout(null)
    const { data, error } = await getSupabase()
      .from('kasboek_entries')
      .select('*')
      .eq('periode', huidigePeriode)
      .eq('locatie', actieveLocatie.naam)
      .order('aangemaakt_op', { ascending: false })

    if (error) setFout(error.message)
    else setEntries((data ?? []) as KasboekEntry[])
    setLaden(false)
  }, [huidigePeriode, actieveLocatie])

  useEffect(() => { haalOp() }, [haalOp])

  // ── Boeking toevoegen ───────────────────────────────────────────────────────
  async function handleToevoegen(e: React.FormEvent) {
    e.preventDefault()
    if (!bedrag || !actieveLocatie) return
    setOpslaan(true)
    setFout(null)

    const { error } = await getSupabase().from('kasboek_entries').insert({
      periode: huidigePeriode,
      type,
      bedrag: parseFloat(bedrag.replace(',', '.')),
      categorie: categorie || null,
      omschrijving: omschrijving || null,
      locatie: actieveLocatie.naam,
      aangemaakt_door: profiel?.id ?? null,
    })

    if (error) {
      setFout('Opslaan mislukt: ' + error.message)
    } else {
      setBedrag('')
      setOmschrijving('')
      setToast({ bericht: 'Boeking toegevoegd!', type: 'success' })
      await haalOp()
    }
    setOpslaan(false)
  }

  // ── Boeking verwijderen ─────────────────────────────────────────────────────
  async function verwijder(id: string) {
    await getSupabase().from('kasboek_entries').delete().eq('id', id)
    setToast({ bericht: 'Boeking verwijderd.', type: 'success' })
    await haalOp()
  }

  // ── Locatie aanmaken ────────────────────────────────────────────────────────
  async function voegLocatieToe() {
    if (!nieuweLocatieNaam.trim()) return
    setLocatieLaden(true)
    const { error } = await getSupabase().from('kasboek_locaties').insert({
      naam: nieuweLocatieNaam.trim(),
    })
    if (error) {
      setToast({ bericht: 'Locatie toevoegen mislukt: ' + error.message, type: 'error' })
    } else {
      setNieuweLocatieNaam('')
      setToast({ bericht: 'Locatie toegevoegd!', type: 'success' })
      await haalLocatiesOp()
    }
    setLocatieLaden(false)
  }

  // ── Locatie verwijderen ─────────────────────────────────────────────────────
  async function verwijderLocatie(locatie: Locatie) {
    if (!confirm(`Locatie "${locatie.naam}" verwijderen? Boekingen blijven bewaard.`)) return
    await getSupabase().from('kasboek_locaties').update({ actief: false }).eq('id', locatie.id)
    if (actieveLocatie?.id === locatie.id) setActieveLocatie(null)
    await haalLocatiesOp()
    setToast({ bericht: `${locatie.naam} verwijderd.`, type: 'success' })
  }

  // ── Berekeningen ────────────────────────────────────────────────────────────
  const inkomsten = entries.filter(e => e.type === 'inkomst').reduce((s, e) => s + e.bedrag, 0)
  const uitgaven  = entries.filter(e => e.type === 'uitgave').reduce((s, e) => s + e.bedrag, 0)
  const saldo     = inkomsten - uitgaven

  const perCategorie: Record<string, { inkomst: number; uitgave: number }> = {}
  entries.forEach(e => {
    const cat = e.categorie || 'Overig'
    if (!perCategorie[cat]) perCategorie[cat] = { inkomst: 0, uitgave: 0 }
    perCategorie[cat][e.type] += e.bedrag
  })

  return (
    <>
      <Topbar
        titel="Kasboek"
        subtitel={actieveLocatie ? `${actieveLocatie.naam} — ${periodeLabel(huidigeDatum)}` : periodeLabel(huidigeDatum)}
        acties={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Maand navigatie */}
            <button className="btn" style={{ padding: '6px 8px' }} onClick={() => setHuidigeDatum(d => navigeerMaand(d, -1))}>
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setHuidigeDatum(new Date())}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '5px 16px', borderRadius: 8, border: '1.5px solid var(--border-dark)',
                background: 'var(--bg-card)', cursor: 'pointer', minWidth: 110,
                transition: 'border-color 0.12s',
              }}
              title="Terug naar huidige maand"
            >
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, textTransform: 'capitalize' }}>
                {huidigeDatum.toLocaleDateString('nl-NL', { month: 'long' })}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.2 }}>
                {huidigeDatum.getFullYear()}
              </span>
            </button>
            <button className="btn" style={{ padding: '6px 8px' }} onClick={() => setHuidigeDatum(d => navigeerMaand(d, 1))}>
              <ChevronRight size={16} />
            </button>
            {/* Locatiebeheer knop (alleen superadmin) */}
            {isSuperadmin && (
              <button className="btn" onClick={() => setLocatieBeheerOpen(true)}>
                <Settings size={14} /> Locaties
              </button>
            )}
          </div>
        }
      />

      <div className="page-content">

        {/* Geen locaties */}
        {locaties.length === 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="empty-state" style={{ padding: 40 }}>
              <Building2 size={36} />
              <h3>Geen locaties</h3>
              <p>Voeg eerst een locatie toe om boekingen bij te houden.</p>
              {isSuperadmin && (
                <button className="btn btn-primary" onClick={() => setLocatieBeheerOpen(true)}>
                  <Plus size={14} /> Locatie toevoegen
                </button>
              )}
            </div>
          </div>
        )}

        {/* Locatie tabs */}
        {locaties.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            {locaties.map(loc => (
              <button
                key={loc.id}
                onClick={() => setActieveLocatie(loc)}
                style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s',
                  borderColor: actieveLocatie?.id === loc.id ? 'var(--primary)' : 'var(--border-dark)',
                  background: actieveLocatie?.id === loc.id ? 'var(--primary)' : 'var(--bg-card)',
                  color: actieveLocatie?.id === loc.id ? '#fff' : 'var(--text)',
                }}
              >
                {loc.naam}
              </button>
            ))}
          </div>
        )}

        {/* Fout melding */}
        {fout && (
          <div style={{ display: 'flex', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <span>⚠️</span>
            <p style={{ fontSize: 13, color: '#991B1B', flex: 1 }}>{fout}</p>
            <button onClick={() => setFout(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>✕</button>
          </div>
        )}

        {actieveLocatie && (
          <>
            {/* Saldo kaarten */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Inkomsten', bedrag: inkomsten, kleur: '#16A34A', bg: '#F0FDF4', icoon: '↑' },
                { label: 'Uitgaven',  bedrag: uitgaven,  kleur: '#DC2626', bg: '#FEF2F2', icoon: '↓' },
                { label: 'Saldo',     bedrag: saldo,     kleur: saldo >= 0 ? '#3D6B1A' : '#DC2626', bg: saldo >= 0 ? 'var(--primary-light)' : '#FEF2F2', icoon: '=' },
              ].map(k => (
                <div key={k.label} className="stat-card" style={{ background: k.bg, borderColor: k.bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: k.kleur }}>{k.icoon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: k.kleur, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>{k.label}</span>
                  </div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, color: k.kleur }}>{fmt(k.bedrag)}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
              {/* Links: formulier + per categorie */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Nieuwe boeking</span>
                    <span className="tag tag-green" style={{ fontSize: 11 }}>{actieveLocatie.naam}</span>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleToevoegen} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Type toggle */}
                      <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 9, padding: 4 }}>
                        {(['inkomst', 'uitgave'] as const).map(t => (
                          <button
                            key={t} type="button" onClick={() => setType(t)}
                            style={{
                              flex: 1, padding: '7px 0', borderRadius: 7, border: 'none',
                              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
                              background: type === t ? (t === 'inkomst' ? '#16A34A' : '#DC2626') : 'transparent',
                              color: type === t ? '#fff' : 'var(--text-muted)',
                            }}
                          >{t === 'inkomst' ? '↑ Inkomst' : '↓ Uitgave'}</button>
                        ))}
                      </div>

                      <div>
                        <label className="form-label">Bedrag *</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 500 }}>€</span>
                          <input
                            type="number" step="0.01" min="0"
                            className="form-input" style={{ paddingLeft: 28 }}
                            value={bedrag} onChange={e => setBedrag(e.target.value)}
                            placeholder="0,00" required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Categorie</label>
                        <select className="form-select" value={categorie} onChange={e => setCategorie(e.target.value)}>
                          <option value="">— Geen categorie —</option>
                          {CATEGORIEEN.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="form-label">Omschrijving</label>
                        <input
                          type="text" className="form-input"
                          value={omschrijving} onChange={e => setOmschrijving(e.target.value)}
                          placeholder="Optionele toelichting"
                        />
                      </div>

                      <button type="submit" className="btn btn-primary" disabled={opslaan || !bedrag} style={{ justifyContent: 'center' }}>
                        <Plus size={15} />
                        {opslaan ? 'Opslaan...' : 'Boeking toevoegen'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Per categorie */}
                {Object.keys(perCategorie).length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Per categorie</span>
                    </div>
                    <div>
                      {Object.entries(perCategorie).map(([cat, bedragen]) => (
                        <div key={cat} style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 13 }}>{cat}</span>
                          <div style={{ textAlign: 'right' }}>
                            {bedragen.inkomst > 0 && <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>+{fmt(bedragen.inkomst)}</div>}
                            {bedragen.uitgave > 0 && <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>−{fmt(bedragen.uitgave)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rechts: boekingen lijst */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">
                    Boekingen {laden && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>— laden...</span>}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entries.length} {entries.length === 1 ? 'boeking' : 'boekingen'}</span>
                </div>

                {entries.length === 0 && !laden ? (
                  <div className="empty-state" style={{ padding: 48 }}>
                    <span style={{ fontSize: 36, opacity: 0.4 }}>💰</span>
                    <h3>Geen boekingen</h3>
                    <p>Nog geen boekingen voor {actieveLocatie.naam} in {periodeLabel(huidigeDatum)}.</p>
                  </div>
                ) : (
                  <div>
                    {entries.map(entry => (
                      <div
                        key={entry.id}
                        style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: entry.type === 'inkomst' ? '#16A34A' : '#DC2626',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 15, fontWeight: 700,
                        }}>
                          {entry.type === 'inkomst' ? '↑' : '↓'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>
                              {entry.type === 'inkomst' ? '+' : '−'}{fmt(entry.bedrag)}
                            </span>
                            {entry.categorie && (
                              <span className="tag tag-green" style={{ fontSize: 11 }}>{entry.categorie}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                            {entry.omschrijving && <span>{entry.omschrijving}</span>}
                            <span>{new Date(entry.aangemaakt_op).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => verwijder(entry.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', opacity: 0.4, transition: 'opacity 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                          title="Verwijderen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Locatiebeheer modal ───────────────────────────────────────────────── */}
      {locatieBeheerOpen && (
        <div className="modal-backdrop" onClick={() => setLocatieBeheerOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <span className="card-title">Locaties beheren</span>
              <button onClick={() => setLocatieBeheerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Locatie toevoegen */}
              <div>
                <label className="form-label">Nieuwe locatie</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    placeholder="Bijv. De Theepot Noord"
                    value={nieuweLocatieNaam}
                    onChange={e => setNieuweLocatieNaam(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); voegLocatieToe() } }}
                  />
                  <button className="btn btn-primary" onClick={voegLocatieToe} disabled={locatieLaden || !nieuweLocatieNaam.trim()}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* Bestaande locaties */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Actieve locaties
                </div>
                {locaties.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nog geen locaties.</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {locaties.map(loc => (
                    <div key={loc.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 9,
                      background: actieveLocatie?.id === loc.id ? 'var(--primary-light)' : 'var(--bg)',
                      border: `1px solid ${actieveLocatie?.id === loc.id ? 'var(--border-dark)' : 'var(--border)'}`,
                    }}>
                      <MapPin size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{loc.naam}</span>
                      <button
                        onClick={() => { setActieveLocatie(loc); setLocatieBeheerOpen(false) }}
                        className="btn btn-sm"
                        style={{ fontSize: 11, padding: '3px 10px' }}
                      >Selecteer</button>
                      <button
                        onClick={() => verwijderLocatie(loc)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
                        title="Verwijderen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setLocatieBeheerOpen(false)}>Klaar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
