'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, Trash2, Download, Pencil,
  ChevronUp, ChevronDown, Eye, ArrowLeft,
  GripVertical, FileText, Send
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sectie {
  id: string
  titel: string
  inhoud: string
}

interface Nieuwsbrief {
  id: string
  titel: string
  nummer: string | null
  locatie_naam: string | null
  datum: string
  secties: Sectie[]
  gepubliceerd: boolean
  aangemaakt_op: string
}

// ─── Standaard secties ────────────────────────────────────────────────────────

const STANDAARD_SECTIES: Omit<Sectie, 'id'>[] = [
  { titel: 'Persoonlijk woordje', inhoud: '' },
  { titel: 'Vanuit de Directie', inhoud: '' },
  { titel: 'PP-er en stage info', inhoud: '' },
  { titel: 'Locatie info', inhoud: '' },
  { titel: 'Beleid info', inhoud: '' },
  { titel: 'Ouder en/of Kind info', inhoud: '' },
  { titel: 'Pedagogische info', inhoud: '' },
  { titel: 'Rooster info', inhoud: '' },
  { titel: 'Agenda Leidinggevende', inhoud: '' },
]

function nieuwId() { return Math.random().toString(36).slice(2) }

function maakStandaardSecties(): Sectie[] {
  return STANDAARD_SECTIES.map(s => ({ ...s, id: nieuwId() }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDatum(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportPDF(brief: Nieuwsbrief) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const groen: [number, number, number] = [140, 198, 63]
  const donkerGroen: [number, number, number] = [61, 107, 26]
  const wit: [number, number, number] = [255, 255, 255]
  const zwart: [number, number, number] = [30, 30, 30]
  const grijs: [number, number, number] = [150, 150, 150]
  const lichtGroen: [number, number, number] = [235, 245, 214]
  const marge = 16
  const breedte = 210 - marge * 2
  let y = 0

  function nieuwePaginaAlsNodig(benodigdHoogte: number) {
    if (y + benodigdHoogte > 272) {
      doc.addPage()
      y = 20
    }
  }

  // Header balk
  doc.setFillColor(...groen)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(...wit)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Theepraatje', marge, 17)
  if (brief.nummer) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nr. ${brief.nummer}`, 210 - marge, 12, { align: 'right' })
  }
  doc.setFontSize(9)
  doc.text(fmtDatum(brief.datum), 210 - marge, 18.5, { align: 'right' })
  if (brief.locatie_naam) {
    doc.text(`Locatie: ${brief.locatie_naam}`, 210 - marge, 24.5, { align: 'right' })
  }

  // Theepot logo tekst rechtsonder header
  doc.setFillColor(255, 255, 255, 0.2)
  doc.setTextColor(255, 255, 255, 0.6)

  y = 38

  // Titel
  doc.setTextColor(...zwart)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(brief.titel, marge, y)
  y += 10

  // Lijn
  doc.setDrawColor(...groen)
  doc.setLineWidth(0.8)
  doc.line(marge, y, 210 - marge, y)
  y += 8

  // Secties
  const gevuld = brief.secties.filter(s => s.inhoud.trim())

  for (const sectie of gevuld) {
    nieuwePaginaAlsNodig(20)

    // Sectie header
    doc.setFillColor(...lichtGroen)
    doc.rect(marge, y, breedte, 8, 'F')
    doc.setDrawColor(...donkerGroen)
    doc.setLineWidth(0.3)
    doc.rect(marge, y, breedte, 8)

    // Groene linkerbalk
    doc.setFillColor(...groen)
    doc.rect(marge, y, 3, 8, 'F')

    doc.setTextColor(...donkerGroen)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(sectie.titel, marge + 6, y + 5.5)
    y += 12

    // Inhoud
    const regels = doc.splitTextToSize(sectie.inhoud.trim(), breedte - 4)
    const inhoudHoogte = regels.length * 5.5 + 6

    nieuwePaginaAlsNodig(inhoudHoogte)

    doc.setFillColor(252, 254, 252)
    doc.rect(marge, y, breedte, inhoudHoogte, 'F')
    doc.setDrawColor(...grijs)
    doc.setLineWidth(0.2)
    doc.rect(marge, y, breedte, inhoudHoogte)

    doc.setTextColor(...zwart)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    doc.text(regels, marge + 3, y + 5)
    y += inhoudHoogte + 6
  }

  // Footer op alle pagina's
  const aantalPaginas = doc.getNumberOfPages()
  for (let p = 1; p <= aantalPaginas; p++) {
    doc.setPage(p)
    doc.setFillColor(245, 247, 245)
    doc.rect(0, 284, 210, 13, 'F')
    doc.setDrawColor(...grijs)
    doc.setLineWidth(0.2)
    doc.line(0, 284, 210, 284)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grijs)
    doc.text('De Theepot — Kinderopvang', marge, 291)
    if (brief.locatie_naam) doc.text(brief.locatie_naam, 210 / 2, 291, { align: 'center' })
    doc.text(`${p} / ${aantalPaginas}`, 210 - marge, 291, { align: 'right' })
  }

  doc.save(`Nieuwsbrief_${brief.titel.replace(/\s+/g, '_')}_${brief.datum}.pdf`)
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function NieuwsbrievenPage() {
  const { profiel, isSuperadmin, rechten } = useAuth()
  const magZien = isSuperadmin || rechten.pagina_nieuwsbrieven !== 'geen'
  const magBewerken = isSuperadmin || rechten.pagina_nieuwsbrieven === 'bewerken'

  const [nieuwsbrieven, setNieuwsbrieven] = useState<Nieuwsbrief[]>([])
  const [actieve, setActieve] = useState<Nieuwsbrief | null>(null)
  const [bewerkModus, setBewerkModus] = useState(false)
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  // Editor state
  const [editorTitel, setEditorTitel] = useState('')
  const [editorNummer, setEditorNummer] = useState('')
  const [editorLocatie, setEditorLocatie] = useState('')
  const [editorDatum, setEditorDatum] = useState('')
  const [editorSecties, setEditorSecties] = useState<Sectie[]>([])
  const [actieveSectie, setActieveSectie] = useState<string | null>(null)
  const [nieuwSectieNaam, setNieuwSectieNaam] = useState('')

  // ── Data ophalen ────────────────────────────────────────────────────────────
  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data } = await getSupabase()
      .from('nieuwsbrieven')
      .select('*')
      .order('aangemaakt_op', { ascending: false })
    setNieuwsbrieven((data ?? []) as Nieuwsbrief[])
    setLaden(false)
  }, [])

  useEffect(() => { haalOp() }, [haalOp])

  // ── Nieuw aanmaken ──────────────────────────────────────────────────────────
  function nieuwAanmaken() {
    setEditorTitel('Theepraatje')
    setEditorNummer('')
    setEditorLocatie('')
    setEditorDatum(new Date().toISOString().split('T')[0])
    setEditorSecties(maakStandaardSecties())
    setActieve(null)
    setActieveSectie(null)
    setBewerkModus(true)
  }

  // ── Bewerken ────────────────────────────────────────────────────────────────
  function openBewerken(brief: Nieuwsbrief) {
    setEditorTitel(brief.titel)
    setEditorNummer(brief.nummer ?? '')
    setEditorLocatie(brief.locatie_naam ?? '')
    setEditorDatum(brief.datum)
    setEditorSecties(brief.secties)
    setActieve(brief)
    setActieveSectie(null)
    setBewerkModus(true)
  }

  // ── Opslaan ─────────────────────────────────────────────────────────────────
  async function slaOp() {
    if (!editorTitel.trim()) return
    setOpslaan(true)
    const supabase = getSupabase()
    const data = {
      titel: editorTitel.trim(),
      nummer: editorNummer.trim() || null,
      locatie_naam: editorLocatie.trim() || null,
      datum: editorDatum,
      secties: editorSecties,
      aangemaakt_door: profiel?.id,
      bijgewerkt_op: new Date().toISOString(),
    }

    if (actieve) {
      await supabase.from('nieuwsbrieven').update(data).eq('id', actieve.id)
      setToast({ bericht: 'Opgeslagen!', type: 'success' })
    } else {
      const { data: nieuw } = await supabase.from('nieuwsbrieven').insert(data).select().single()
      if (nieuw) setActieve(nieuw as Nieuwsbrief)
      setToast({ bericht: 'Nieuwsbrief aangemaakt!', type: 'success' })
    }
    setOpslaan(false)
    await haalOp()
  }

  // ── Verwijderen ─────────────────────────────────────────────────────────────
  async function verwijder(id: string) {
    if (!confirm('Nieuwsbrief verwijderen?')) return
    await getSupabase().from('nieuwsbrieven').delete().eq('id', id)
    setBewerkModus(false)
    setActieve(null)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    await haalOp()
  }

  // ── Sectie acties ────────────────────────────────────────────────────────────
  function verwijderSectie(id: string) {
    setEditorSecties(prev => prev.filter(s => s.id !== id))
    if (actieveSectie === id) setActieveSectie(null)
  }

  function verplaatsSectie(id: string, richting: 'up' | 'down') {
    setEditorSecties(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx === -1) return prev
      const nieuw = [...prev]
      const swapIdx = richting === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= nieuw.length) return prev
      ;[nieuw[idx], nieuw[swapIdx]] = [nieuw[swapIdx], nieuw[idx]]
      return nieuw
    })
  }

  function updateSectie(id: string, veld: 'titel' | 'inhoud', waarde: string) {
    setEditorSecties(prev => prev.map(s => s.id === id ? { ...s, [veld]: waarde } : s))
  }

  function voegSectieToe() {
    if (!nieuwSectieNaam.trim()) return
    setEditorSecties(prev => [...prev, { id: nieuwId(), titel: nieuwSectieNaam.trim(), inhoud: '' }])
    setNieuwSectieNaam('')
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  if (!magZien) return (
    <>
      <Topbar titel="Nieuwsbrieven" subtitel="Geen toegang" />
      <div className="page-content"><div className="empty-state"><FileText size={36} /><h3>Geen toegang</h3><p>Je hebt geen toegang tot de nieuwsbrieven.</p></div></div>
    </>
  )

  // Editor weergave
  if (bewerkModus) {
    return (
      <>
        <Topbar
          titel={actieve ? 'Bewerken' : 'Nieuwe nieuwsbrief'}
          acties={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => {
                if (actieve) {
                  exportPDF({ ...actieve, titel: editorTitel, nummer: editorNummer || null, locatie_naam: editorLocatie || null, datum: editorDatum, secties: editorSecties })
                }
              }} disabled={!actieve}>
                <Download size={14} /> PDF
              </button>
              <button className="btn btn-primary" onClick={slaOp} disabled={opslaan || !editorTitel.trim()}>
                {opslaan ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button className="btn" onClick={() => { setBewerkModus(false); setActieve(null) }}>
                <ArrowLeft size={14} /> Terug
              </button>
            </div>
          }
        />

        <div className="page-content" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>

          {/* Linker paneel: metadata + secties */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Meta */}
            <div className="card">
              <div className="card-header"><span className="card-title">Instellingen</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label className="form-label">Titel *</label>
                  <input className="form-input" value={editorTitel} onChange={e => setEditorTitel(e.target.value)} placeholder="Bijv. Theepraatje" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="form-label">Nummer</label>
                    <input className="form-input" value={editorNummer} onChange={e => setEditorNummer(e.target.value)} placeholder="119" />
                  </div>
                  <div>
                    <label className="form-label">Datum</label>
                    <input type="date" className="form-input" value={editorDatum} onChange={e => setEditorDatum(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Locatie (optioneel)</label>
                  <input className="form-input" value={editorLocatie} onChange={e => setEditorLocatie(e.target.value)} placeholder="Bijv. Lisse" />
                </div>
              </div>
            </div>

            {/* Secties beheren */}
            <div className="card">
              <div className="card-header"><span className="card-title">Secties</span></div>
              <div style={{ padding: '6px 0' }}>
                {editorSecties.map((s, idx) => (
                  <div
                    key={s.id}
                    onClick={() => setActieveSectie(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                      cursor: 'pointer', transition: 'background 0.1s',
                      background: actieveSectie === s.id ? 'var(--primary-xlight)' : 'transparent',
                      borderLeft: actieveSectie === s.id ? '3px solid var(--primary)' : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (actieveSectie !== s.id) e.currentTarget.style.background = 'var(--bg)' }}
                    onMouseLeave={e => { if (actieveSectie !== s.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <GripVertical size={13} color="var(--border-dark)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: actieveSectie === s.id ? 600 : 400, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.titel}
                    </span>
                    {s.inhoud.trim() && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); verplaatsSectie(s.id, 'up') }} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: 'var(--text-muted)', opacity: idx === 0 ? 0.3 : 1, padding: '2px 3px', display: 'flex' }}>
                        <ChevronUp size={12} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); verplaatsSectie(s.id, 'down') }} disabled={idx === editorSecties.length - 1} style={{ background: 'none', border: 'none', cursor: idx === editorSecties.length - 1 ? 'default' : 'pointer', color: 'var(--text-muted)', opacity: idx === editorSecties.length - 1 ? 0.3 : 1, padding: '2px 3px', display: 'flex' }}>
                        <ChevronDown size={12} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); verwijderSectie(s.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.5, padding: '2px 3px', display: 'flex' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Nieuwe sectie */}
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, fontSize: 12, padding: '5px 9px' }}
                    value={nieuwSectieNaam}
                    onChange={e => setNieuwSectieNaam(e.target.value)}
                    placeholder="Nieuwe sectie..."
                    onKeyDown={e => e.key === 'Enter' && voegSectieToe()}
                  />
                  <button className="btn btn-sm" onClick={voegSectieToe} disabled={!nieuwSectieNaam.trim()}>
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Verwijder knop */}
            {actieve && (
              <button className="btn" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(actieve.id)}>
                <Trash2 size={14} /> Nieuwsbrief verwijderen
              </button>
            )}
          </div>

          {/* Rechter paneel: editor */}
          <div>
            {!actieveSectie ? (
              <div className="empty-state" style={{ padding: 60 }}>
                <FileText size={32} />
                <h3>Kies een sectie</h3>
                <p>Klik op een sectie links om de inhoud te bewerken.</p>
              </div>
            ) : (() => {
              const sectie = editorSecties.find(s => s.id === actieveSectie)
              if (!sectie) return null
              return (
                <div className="card">
                  <div className="card-header">
                    <input
                      className="form-input"
                      value={sectie.titel}
                      onChange={e => updateSectie(sectie.id, 'titel', e.target.value)}
                      style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14, border: 'none', background: 'none', padding: '4px 0', flex: 1 }}
                    />
                  </div>
                  <div className="card-body">
                    <textarea
                      value={sectie.inhoud}
                      onChange={e => updateSectie(sectie.id, 'inhoud', e.target.value)}
                      placeholder={`Schrijf hier de inhoud voor "${sectie.titel}"...`}
                      style={{
                        width: '100%', minHeight: 360, border: '1px solid var(--border-dark)',
                        borderRadius: 9, padding: '12px 14px', fontSize: 13,
                        fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7,
                        background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-dark)')}
                      autoFocus
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      {sectie.inhoud.trim().split('\n').filter(Boolean).length} regels · {sectie.inhoud.length} tekens
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Preview onderaan */}
            {actieveSectie && editorSecties.find(s => s.id === actieveSectie)?.inhoud && (
              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-header"><span className="card-title" style={{ fontSize: 12 }}>Preview</span></div>
                <div style={{ padding: '12px 18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary-text)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', background: 'var(--primary-light)', display: 'inline-block', borderRadius: 4, marginBottom: 8 }}>
                    {editorSecties.find(s => s.id === actieveSectie)?.titel}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                    {editorSecties.find(s => s.id === actieveSectie)?.inhoud}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
      </>
    )
  }

  // Overzicht
  return (
    <>
      <Topbar
        titel="Nieuwsbrieven"
        subtitel={`${nieuwsbrieven.length} brieven`}
        acties={
          magBewerken ? <button className="btn btn-primary" onClick={nieuwAanmaken}>
            <Plus size={14} /> Nieuwe nieuwsbrief
          </button> : undefined
        }
      />

      <div className="page-content">
        {laden ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
        ) : nieuwsbrieven.length === 0 ? (
          <div className="empty-state">
            <FileText size={36} />
            <h3>Geen nieuwsbrieven</h3>
            <p>Maak de eerste nieuwsbrief aan.</p>
            <button className="btn btn-primary" onClick={nieuwAanmaken}><Plus size={14} /> Nieuwe nieuwsbrief</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nieuwsbrieven.map(brief => (
              <div key={brief.id} className="card" style={{ transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14 }}>{brief.titel}</span>
                      {brief.nummer && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nr. {brief.nummer}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                      <span>📅 {fmtDatum(brief.datum)}</span>
                      {brief.locatie_naam && <span>📍 {brief.locatie_naam}</span>}
                      <span>📝 {brief.secties.filter(s => s.inhoud.trim()).length} / {brief.secties.length} secties ingevuld</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => exportPDF(brief)}>
                      <Download size={13} /> PDF
                    </button>
                    {magBewerken && <button className="btn btn-sm" onClick={() => openBewerken(brief)}>
                      <Pencil size={13} /> Bewerken
                    </button>}
                    {magBewerken && (
                      <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(brief.id)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
