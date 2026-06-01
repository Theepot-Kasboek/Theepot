'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabase, type KasboekEntry } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `€ ${Math.abs(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

type Periode = 'dag' | 'week' | 'maand'

function periodeLabel(periode: Periode, datum: Date): string {
  if (periode === 'dag') return datum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  if (periode === 'week') {
    const dag = datum.getDay()
    const maandag = new Date(datum)
    maandag.setDate(datum.getDate() - (dag === 0 ? 6 : dag - 1))
    const zondag = new Date(maandag)
    zondag.setDate(maandag.getDate() + 6)
    return `Week van ${maandag.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} – ${zondag.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return datum.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
}

function periodeSleutel(periode: Periode, datum: Date): string {
  if (periode === 'dag') return datum.toISOString().split('T')[0]
  if (periode === 'week') {
    const dag = datum.getDay()
    const maandag = new Date(datum)
    maandag.setDate(datum.getDate() - (dag === 0 ? 6 : dag - 1))
    return `week-${maandag.toISOString().split('T')[0]}`
  }
  return `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}`
}

function navigeerPeriode(periode: Periode, datum: Date, richting: number): Date {
  const d = new Date(datum)
  if (periode === 'dag') d.setDate(d.getDate() + richting)
  else if (periode === 'week') d.setDate(d.getDate() + richting * 7)
  else d.setMonth(d.getMonth() + richting)
  return d
}

const CATEGORIEEN = ['Omzet', 'Inkopen', 'Personeelskosten', 'Overige kosten']

// ─── Component ────────────────────────────────────────────────────────────────

export default function KasboekPage() {
  const { profiel } = useAuth()

  const [periode, setPeriode] = useState<Periode>('maand')
  const [huidigeDatum, setHuidigeDatum] = useState(new Date())
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

  const huidigePeriode = periodeSleutel(periode, huidigeDatum)

  const haalOp = useCallback(async () => {
    setLaden(true)
    setFout(null)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('kasboek_entries')
      .select('*')
      .eq('periode', huidigePeriode)
      .order('aangemaakt_op', { ascending: false })

    if (error) setFout(error.message)
    else setEntries((data ?? []) as KasboekEntry[])
    setLaden(false)
  }, [huidigePeriode])

  useEffect(() => { haalOp() }, [haalOp])

  async function handleToevoegen(e: React.FormEvent) {
    e.preventDefault()
    if (!bedrag) return
    setOpslaan(true)
    setFout(null)
    const supabase = getSupabase()

    const { error } = await supabase.from('kasboek_entries').insert({
      periode: huidigePeriode,
      type,
      bedrag: parseFloat(bedrag.replace(',', '.')),
      categorie: categorie || null,
      omschrijving: omschrijving || null,
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

  async function verwijder(id: string) {
    const supabase = getSupabase()
    await supabase.from('kasboek_entries').delete().eq('id', id)
    setToast({ bericht: 'Boeking verwijderd.', type: 'success' })
    await haalOp()
  }

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
        subtitel={periodeLabel(periode, huidigeDatum)}
        acties={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Periode selector */}
            <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {(['dag', 'week', 'maand'] as Periode[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriode(p)}
                  style={{
                    padding: '6px 12px', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    background: periode === p ? 'var(--primary)' : 'transparent',
                    color: periode === p ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.12s', textTransform: 'capitalize',
                  }}
                >{p}</button>
              ))}
            </div>
            {/* Navigatie */}
            <button className="btn" style={{ padding: '6px 8px' }} onClick={() => setHuidigeDatum(d => navigeerPeriode(periode, d, -1))}><ChevronLeft size={16} /></button>
            <button className="btn btn-sm" onClick={() => setHuidigeDatum(new Date())}>Huidig</button>
            <button className="btn" style={{ padding: '6px 8px' }} onClick={() => setHuidigeDatum(d => navigeerPeriode(periode, d, 1))}><ChevronRight size={16} /></button>
          </div>
        }
      />

      <div className="page-content">
        {fout && (
          <div style={{ display: 'flex', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <span style={{ color: '#DC2626' }}>⚠️</span>
            <p style={{ fontSize: 13, color: '#991B1B', flex: 1 }}>{fout}</p>
            <button onClick={() => setFout(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>✕</button>
          </div>
        )}

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
            {/* Formulier */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Nieuwe boeking</span>
              </div>
              <div className="card-body">
                <form onSubmit={handleToevoegen} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Type toggle */}
                  <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 9, padding: 4 }}>
                    {(['inkomst', 'uitgave'] as const).map(t => (
                      <button
                        key={t} type="button" onClick={() => setType(t)}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
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

                  <button
                    type="submit" className="btn btn-primary"
                    disabled={opslaan || !bedrag}
                    style={{ justifyContent: 'center' }}
                  >
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
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{cat}</span>
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
                <p>Nog geen boekingen voor deze periode.</p>
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
                        <span>{new Date(entry.aangemaakt_op).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => verwijder(entry.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', opacity: 0.5, transition: 'opacity 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
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
      </div>

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
