'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, Folder, FolderOpen, FileText, Trash2,
  Pencil, Download, ChevronRight, ChevronDown,
  MapPin, User, Calendar
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Map {
  id: string
  locatie_naam: string
  mentor_naam: string
  aangemaakt_op: string
  _aantal?: number
}

interface Formulier {
  id: string
  map_id: string
  kind_naam: string
  datum: string
  overgang_school: string | null
  contact_pedagogisch: string | null
  contact_kinderen: string | null
  speelt_graag_met: string | null
  stimuleren_werken_aan: string | null
  aandachtspunten: string | null
  evaluatie: string | null
  aangemaakt_op: string
  bijgewerkt_op: string
}

// ─── Formulier velden definitie ───────────────────────────────────────────────

const VELDEN: { key: keyof Omit<Formulier, 'id' | 'map_id' | 'kind_naam' | 'datum' | 'aangemaakt_op' | 'bijgewerkt_op'>; label: string; placeholder: string }[] = [
  { key: 'overgang_school', label: 'Overgang van school naar De Theepot', placeholder: 'Hoe verloopt de overgang van school naar De Theepot?' },
  { key: 'contact_pedagogisch', label: 'Contact met Pedagogisch professional', placeholder: 'Hoe is het contact met de pedagogisch professional?' },
  { key: 'contact_kinderen', label: 'Contact met andere kinderen van De Theepot', placeholder: 'Hoe gaat het kind om met andere kinderen?' },
  { key: 'speelt_graag_met', label: 'Speelt graag met… en is goed in…', placeholder: 'Beschrijf wat het kind graag doet en goed in is...' },
  { key: 'stimuleren_werken_aan', label: 'Wij stimuleren, werken aan…', placeholder: 'Waar werken wij samen aan?' },
  { key: 'aandachtspunten', label: 'Aandachtspunten / bijzonderheden', placeholder: 'Bijzonderheden of aandachtspunten...' },
  { key: 'evaluatie', label: 'Evaluatie van het gesprek', placeholder: 'Hoe is het gesprek verlopen?' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDatum(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportFormulierPDF(formulier: Formulier, mentorNaam: string, locatieNaam: string) {
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

  // Header met logo kleur
  doc.setFillColor(...groen)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(...wit)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('De Theepot', marge, 13)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('kinderopvang', marge, 18.5)
  doc.setFontSize(9)
  doc.text(locatieNaam, 210 - marge, 13, { align: 'right' })
  doc.text(new Date().toLocaleDateString('nl-NL'), 210 - marge, 18.5, { align: 'right' })

  // Titel
  y = 32
  doc.setTextColor(...zwart)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('BSO 10-minutengesprek', marge, y)
  y += 8

  // Meta info blok
  doc.setFillColor(...lichtGroen)
  doc.roundedRect(marge, y, breedte, 22, 3, 3, 'F')
  doc.setDrawColor(...groen)
  doc.setLineWidth(0.5)
  doc.roundedRect(marge, y, breedte, 22, 3, 3, 'S')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...donkerGroen)
  doc.text('Kind:', marge + 4, y + 7)
  doc.text('Datum:', marge + 4, y + 14)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...zwart)
  doc.text(formulier.kind_naam, marge + 25, y + 7.5)
  doc.text(fmtDatum(formulier.datum), marge + 25, y + 14.5)

  // Mentor rechts
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...donkerGroen)
  doc.text('Mentor:', marge + breedte / 2 + 4, y + 7)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...zwart)
  doc.text(mentorNaam, marge + breedte / 2 + 22, y + 7.5)

  y += 28

  // Velden
  VELDEN.forEach((veld, i) => {
    const waarde = formulier[veld.key] as string | null

    if (y > 245) {
      doc.addPage()
      y = 20
    }

    // Sectie header
    doc.setFillColor(...lichtGroen)
    doc.rect(marge, y, breedte, 8, 'F')
    doc.setDrawColor(...donkerGroen)
    doc.setLineWidth(0.3)
    doc.rect(marge, y, breedte, 8)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...donkerGroen)
    doc.text(veld.label, marge + 3, y + 5.5)
    y += 8

    // Inhoud
    const tekst = waarde?.trim() || '—'
    const regels = doc.splitTextToSize(tekst, breedte - 6)
    const inhoudHoogte = Math.max(regels.length * 5.5 + 6, 14)

    doc.setFillColor(252, 254, 252)
    doc.rect(marge, y, breedte, inhoudHoogte, 'F')
    doc.setDrawColor(...grijs)
    doc.setLineWidth(0.2)
    doc.rect(marge, y, breedte, inhoudHoogte)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(waarde ? 30 : 160, waarde ? 30 : 160, waarde ? 30 : 160)
    doc.text(regels, marge + 3, y + 5.5)
    y += inhoudHoogte + 4
  })

  // Handtekening sectie
  if (y > 240) { doc.addPage(); y = 20 }
  y += 8
  doc.setDrawColor(...grijs)
  doc.setLineWidth(0.3)
  doc.line(marge, y + 12, marge + 70, y + 12)
  doc.line(210 - marge - 70, y + 12, 210 - marge, y + 12)
  doc.setFontSize(8)
  doc.setTextColor(...grijs)
  doc.text('Handtekening mentor', marge, y + 16)
  doc.text('Handtekening ouder/verzorger', 210 - marge - 70, y + 16)

  // Footer op alle pagina's
  const aantalPaginas = doc.getNumberOfPages()
  for (let p = 1; p <= aantalPaginas; p++) {
    doc.setPage(p)
    doc.setFillColor(245, 247, 245)
    doc.rect(0, 284, 210, 13, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grijs)
    doc.text(`De Theepot — 10-minutengesprek — ${formulier.kind_naam} — ${fmtDatum(formulier.datum)}`, marge, 291)
    doc.text(`${p} / ${aantalPaginas}`, 210 - marge, 291, { align: 'right' })
  }

  doc.save(`10min_${formulier.kind_naam.replace(/\s+/g, '_')}_${formulier.datum}.pdf`)
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function GesprekkenPage() {
  const { profiel, isSuperadmin } = useAuth()

  const [locaties, setLocaties] = useState<string[]>([])
  const [actieveLocatie, setActieveLocatie] = useState<string>('')
  const [mappen, setMappen] = useState<Map[]>([])
  const [actieveMap, setActieveMap] = useState<Map | null>(null)
  const [formulieren, setFormulieren] = useState<Formulier[]>([])
  const [openMappenIds, setOpenMappenIds] = useState<Set<string>>(new Set())
  const [laden, setLaden] = useState(false)

  const [nieuwMapModal, setNieuwMapModal] = useState(false)
  const [formulierModal, setFormulierModal] = useState<{ map: Map; formulier?: Formulier } | null>(null)
  const [detailFormulier, setDetailFormulier] = useState<{ formulier: Formulier; map: Map } | null>(null)

  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  // ── Locaties ophalen ────────────────────────────────────────────────────────
  useEffect(() => {
    getSupabase().from('kasboek_locaties').select('naam').eq('actief', true).order('naam')
      .then(({ data }) => {
        const namen = (data ?? []).map((l: { naam: string }) => l.naam)
        setLocaties(namen)
        if (namen.length > 0) setActieveLocatie(namen[0])
      })
  }, [])

  // ── Mappen ophalen ──────────────────────────────────────────────────────────
  const haalMappenOp = useCallback(async () => {
    if (!actieveLocatie) return
    const { data } = await getSupabase()
      .from('gesprek_mappen')
      .select('*')
      .eq('locatie_naam', actieveLocatie)
      .order('mentor_naam')
    setMappen((data ?? []) as Map[])
  }, [actieveLocatie])

  useEffect(() => { haalMappenOp() }, [haalMappenOp])

  // ── Formulieren ophalen voor actieve map ────────────────────────────────────
  const haalFormulierenOp = useCallback(async () => {
    if (!actieveMap) return
    setLaden(true)
    const { data } = await getSupabase()
      .from('gesprek_formulieren')
      .select('*')
      .eq('map_id', actieveMap.id)
      .order('datum', { ascending: false })
    setFormulieren((data ?? []) as Formulier[])
    setLaden(false)
  }, [actieveMap])

  useEffect(() => { haalFormulierenOp() }, [haalFormulierenOp])

  // ── Map aanmaken ────────────────────────────────────────────────────────────
  async function maakMap(mentorNaam: string) {
    const { error } = await getSupabase().from('gesprek_mappen').insert({
      locatie_naam: actieveLocatie,
      mentor_naam: mentorNaam,
    })
    if (error) { setToast({ bericht: 'Mislukt: ' + error.message, type: 'error' }); return }
    setNieuwMapModal(false)
    setToast({ bericht: `Map "${mentorNaam}" aangemaakt!`, type: 'success' })
    await haalMappenOp()
  }

  // ── Map verwijderen ─────────────────────────────────────────────────────────
  async function verwijderMap(map: Map) {
    if (!confirm(`Map "${map.mentor_naam}" verwijderen? Alle formulieren gaan verloren.`)) return
    await getSupabase().from('gesprek_mappen').delete().eq('id', map.id)
    if (actieveMap?.id === map.id) setActieveMap(null)
    setToast({ bericht: 'Map verwijderd.', type: 'success' })
    await haalMappenOp()
  }

  // ── Formulier opslaan ───────────────────────────────────────────────────────
  async function slaFormulierOp(data: Partial<Formulier> & { kind_naam: string; datum: string; map_id: string }) {
    const supabase = getSupabase()
    if (formulierModal?.formulier) {
      await supabase.from('gesprek_formulieren')
        .update({ ...data, bijgewerkt_op: new Date().toISOString() })
        .eq('id', formulierModal.formulier.id)
      setToast({ bericht: 'Formulier bijgewerkt!', type: 'success' })
    } else {
      await supabase.from('gesprek_formulieren').insert({ ...data, aangemaakt_door: profiel?.id })
      setToast({ bericht: 'Formulier opgeslagen!', type: 'success' })
    }
    setFormulierModal(null)
    setDetailFormulier(null)
    await haalFormulierenOp()
  }

  // ── Formulier verwijderen ───────────────────────────────────────────────────
  async function verwijderFormulier(id: string) {
    if (!confirm('Formulier verwijderen?')) return
    await getSupabase().from('gesprek_formulieren').delete().eq('id', id)
    setDetailFormulier(null)
    setToast({ bericht: 'Formulier verwijderd.', type: 'success' })
    await haalFormulierenOp()
  }

  function toggleMap(id: string) {
    const map = mappen.find(m => m.id === id)
    if (map) {
      setActieveMap(map)
      setOpenMappenIds(prev => {
        const s = new Set(prev)
        s.has(id) ? s.delete(id) : s.add(id)
        return s
      })
    }
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        titel="10-minutengesprekken"
        subtitel={actieveLocatie}
        acties={
          isSuperadmin ? (
            <button className="btn btn-primary" onClick={() => setNieuwMapModal(true)}>
              <Plus size={14} /> Nieuwe map
            </button>
          ) : undefined
        }
      />

      <div className="page-content">

        {/* Locatie tabs */}
        {locaties.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            {locaties.map(loc => (
              <button key={loc} onClick={() => { setActieveLocatie(loc); setActieveMap(null); setFormulieren([]) }} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s', borderColor: actieveLocatie === loc ? 'var(--primary)' : 'var(--border-dark)', background: actieveLocatie === loc ? 'var(--primary)' : 'var(--bg-card)', color: actieveLocatie === loc ? '#fff' : 'var(--text)' }}>
                {loc}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

          {/* Linker paneel: mappen */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Mentormappen</span>
              <span style={{ fontWeight: 400, fontSize: 10 }}>{mappen.length} mappen</span>
            </div>

            {mappen.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                <Folder size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                <div>Geen mappen</div>
                {isSuperadmin && <div style={{ fontSize: 11, marginTop: 4 }}>Maak een map aan via &ldquo;Nieuwe map&rdquo;</div>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {mappen.map(map => {
                  const isOpen = openMappenIds.has(map.id)
                  const isActief = actieveMap?.id === map.id
                  return (
                    <div key={map.id}>
                      <div
                        onClick={() => toggleMap(map.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                          borderRadius: 9, cursor: 'pointer',
                          background: isActief ? 'var(--primary-light)' : 'var(--bg-card)',
                          border: `1px solid ${isActief ? 'var(--border-dark)' : 'var(--border)'}`,
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => !isActief && (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={e => !isActief && (e.currentTarget.style.background = 'var(--bg-card)')}
                      >
                        {isOpen
                          ? <FolderOpen size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                          : <Folder size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        }
                        <span style={{ flex: 1, fontSize: 13, fontWeight: isActief ? 600 : 400, color: isActief ? 'var(--primary-text)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {map.mentor_naam}
                        </span>
                        {isOpen ? <ChevronDown size={13} color="var(--text-muted)" /> : <ChevronRight size={13} color="var(--text-muted)" />}
                        {isSuperadmin && (
                          <button
                            onClick={e => { e.stopPropagation(); verwijderMap(map) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.5, padding: 2, display: 'flex' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Rechter paneel: formulieren */}
          <div>
            {!actieveMap ? (
              <div className="empty-state" style={{ padding: 60 }}>
                <FolderOpen size={36} />
                <h3>Selecteer een map</h3>
                <p>Klik op een mentormap om de formulieren te bekijken.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={16} color="var(--primary)" />
                      {actieveMap.mentor_naam}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{actieveLocatie} · {formulieren.length} formulier{formulieren.length !== 1 ? 'en' : ''}</div>
                  </div>
                  <button className="btn btn-primary" onClick={() => setFormulierModal({ map: actieveMap })}>
                    <Plus size={14} /> Nieuw formulier
                  </button>
                </div>

                {laden ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
                ) : formulieren.length === 0 ? (
                  <div className="empty-state" style={{ padding: 48 }}>
                    <FileText size={32} />
                    <h3>Geen formulieren</h3>
                    <p>Klik op &ldquo;Nieuw formulier&rdquo; om een 10-minutengesprek in te vullen.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {formulieren.map(f => (
                      <div
                        key={f.id}
                        onClick={() => setDetailFormulier({ formulier: f, map: actieveMap })}
                        className="card"
                        style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >
                        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText size={18} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{f.kind_naam}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                              <span>📅 {fmtDatum(f.datum)}</span>
                              <span>👤 {actieveMap.mentor_naam}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={e => { e.stopPropagation(); exportFormulierPDF(f, actieveMap.mentor_naam, actieveLocatie) }}
                              className="btn btn-sm"
                              title="PDF exporteren"
                            >
                              <Download size={13} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setFormulierModal({ map: actieveMap, formulier: f }) }}
                              className="btn btn-sm"
                              title="Bewerken"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); verwijderFormulier(f.id) }}
                              className="btn btn-sm"
                              style={{ color: '#DC2626', borderColor: '#FECACA' }}
                              title="Verwijderen"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────────── */}

      {/* Nieuwe map modal */}
      {nieuwMapModal && (
        <NieuweMapModal
          onSave={maakMap}
          onClose={() => setNieuwMapModal(false)}
        />
      )}

      {/* Formulier invullen modal */}
      {formulierModal && (
        <FormulierModal
          map={formulierModal.map}
          formulier={formulierModal.formulier}
          onSave={slaFormulierOp}
          onClose={() => setFormulierModal(null)}
        />
      )}

      {/* Detail / preview modal */}
      {detailFormulier && (
        <DetailModal
          formulier={detailFormulier.formulier}
          map={detailFormulier.map}
          locatieNaam={actieveLocatie}
          onBewerk={() => { setFormulierModal({ map: detailFormulier.map, formulier: detailFormulier.formulier }); setDetailFormulier(null) }}
          onVerwijder={() => verwijderFormulier(detailFormulier.formulier.id)}
          onExport={() => exportFormulierPDF(detailFormulier.formulier, detailFormulier.map.mentor_naam, actieveLocatie)}
          onClose={() => setDetailFormulier(null)}
        />
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Sub-componenten ──────────────────────────────────────────────────────────

function NieuweMapModal({ onSave, onClose }: { onSave: (naam: string) => void; onClose: () => void }) {
  const [naam, setNaam] = useState('')
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Nieuwe mentormap</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Naam mentor</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Voor- en achternaam mentor" autoFocus onKeyDown={e => e.key === 'Enter' && naam.trim() && onSave(naam.trim())} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => naam.trim() && onSave(naam.trim())} disabled={!naam.trim()}>
              <Folder size={14} /> Map aanmaken
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormulierModal({ map, formulier, onSave, onClose }: {
  map: Map
  formulier?: Formulier
  onSave: (data: Partial<Formulier> & { kind_naam: string; datum: string; map_id: string }) => void
  onClose: () => void
}) {
  const [kindNaam, setKindNaam] = useState(formulier?.kind_naam ?? '')
  const [datum, setDatum] = useState(formulier?.datum ?? new Date().toISOString().split('T')[0])
  const [actieveVeld, setActieveVeld] = useState<number | null>(null)
  const [laden, setLaden] = useState(false)
  const [waarden, setWaarden] = useState<Record<string, string>>({
    overgang_school: formulier?.overgang_school ?? '',
    contact_pedagogisch: formulier?.contact_pedagogisch ?? '',
    contact_kinderen: formulier?.contact_kinderen ?? '',
    speelt_graag_met: formulier?.speelt_graag_met ?? '',
    stimuleren_werken_aan: formulier?.stimuleren_werken_aan ?? '',
    aandachtspunten: formulier?.aandachtspunten ?? '',
    evaluatie: formulier?.evaluatie ?? '',
  })

  function ingevuld() {
    return Object.values(waarden).filter(v => v.trim()).length
  }

  async function handleSave() {
    if (!kindNaam.trim() || !datum) return
    setLaden(true)
    await onSave({
      map_id: map.id,
      kind_naam: kindNaam.trim(),
      datum,
      overgang_school: waarden.overgang_school || null,
      contact_pedagogisch: waarden.contact_pedagogisch || null,
      contact_kinderen: waarden.contact_kinderen || null,
      speelt_graag_met: waarden.speelt_graag_met || null,
      stimuleren_werken_aan: waarden.stimuleren_werken_aan || null,
      aandachtspunten: waarden.aandachtspunten || null,
      evaluatie: waarden.evaluatie || null,
    })
    setLaden(false)
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <div>
            <span className="card-title">{formulier ? 'Formulier bewerken' : '10-minutengesprek invullen'}</span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Map: {map.mentor_naam}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Kind naam + datum */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Naam kind *</label>
              <input className="form-input" value={kindNaam} onChange={e => setKindNaam(e.target.value)} placeholder="Voor- en achternaam" autoFocus />
            </div>
            <div>
              <label className="form-label">Datum gesprek *</label>
              <input type="date" className="form-input" value={datum} onChange={e => setDatum(e.target.value)} />
            </div>
          </div>

          {/* Voortgang */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'var(--primary)', width: `${(ingevuld() / VELDEN.length) * 100}%`, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{ingevuld()} / {VELDEN.length} ingevuld</span>
          </div>

          {/* Accordion velden */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {VELDEN.map((veld, i) => {
              const isOpen = actieveVeld === i
              const heeftWaarde = waarden[veld.key]?.trim()
              return (
                <div key={veld.key} style={{ border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                  {/* Header */}
                  <button
                    onClick={() => setActieveVeld(isOpen ? null : i)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: isOpen ? 'var(--primary-xlight)' : heeftWaarde ? 'var(--bg)' : 'var(--bg-card)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    {/* Status bolletje */}
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: heeftWaarde ? 'var(--primary)' : 'var(--border-dark)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: isOpen ? 600 : 400, color: isOpen ? 'var(--primary-text)' : 'var(--text)' }}>
                      {veld.label}
                    </span>
                    {heeftWaarde && !isOpen && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {waarden[veld.key]}
                      </span>
                    )}
                    {isOpen ? <ChevronDown size={14} color="var(--primary)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                  </button>

                  {/* Textarea */}
                  {isOpen && (
                    <div style={{ padding: '0 14px 14px', background: 'var(--primary-xlight)' }}>
                      <textarea
                        className="form-textarea"
                        style={{ minHeight: 100, marginTop: 10 }}
                        value={waarden[veld.key]}
                        onChange={e => setWaarden(prev => ({ ...prev, [veld.key]: e.target.value }))}
                        placeholder={veld.placeholder}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={laden || !kindNaam.trim() || !datum}>
              {laden ? 'Opslaan...' : (formulier ? 'Opslaan' : 'Formulier opslaan')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ formulier, map, locatieNaam, onBewerk, onVerwijder, onExport, onClose }: {
  formulier: Formulier
  map: Map
  locatieNaam: string
  onBewerk: () => void
  onVerwijder: () => void
  onExport: () => void
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        {/* Gekleurde top */}
        <div style={{ height: 5, background: 'var(--primary)', borderRadius: '14px 14px 0 0' }} />

        <div className="card-header">
          <div>
            <span className="card-title" style={{ fontSize: 16 }}>{formulier.kind_naam}</span>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 12 }}>
              <span>📅 {fmtDatum(formulier.datum)}</span>
              <span>👤 {map.mentor_naam}</span>
              <span>📍 {locatieNaam}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>
          {VELDEN.map(veld => {
            const waarde = formulier[veld.key] as string | null
            return (
              <div key={veld.key}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  {veld.label}
                </div>
                <div style={{ fontSize: 13, color: waarde ? 'var(--text)' : 'var(--text-muted)', fontStyle: waarde ? 'normal' : 'italic', lineHeight: 1.6, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {waarde || 'Niet ingevuld'}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={onVerwijder}>
            <Trash2 size={13} /> Verwijderen
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={onExport}><Download size={13} /> PDF</button>
            <button className="btn btn-primary btn-sm" onClick={onBewerk}><Pencil size={13} /> Bewerken</button>
          </div>
        </div>
      </div>
    </div>
  )
}
