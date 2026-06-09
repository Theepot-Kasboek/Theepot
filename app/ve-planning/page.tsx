'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, Trash2, Pencil, Download, Upload,
  FileText, ChevronRight, MapPin, CheckCircle2,
  Circle, Clock, Settings, Users, BookOpen
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VePlanning {
  id: string
  naam: string
  thema: string
  seizoen: string | null
  document_pad: string | null
  aangemaakt_op: string
}

interface VeTaakTemplate {
  id: string
  planning_id: string
  titel: string
  omschrijving: string | null
  volgorde: number
}

interface VeTaakToewijzing {
  id: string
  template_id: string
  locatie_naam: string
  profiel_id: string | null
  status: 'niet_gestart' | 'bezig' | 'afgerond'
  profiel_naam?: string
}

interface VeLocatieInvulling {
  id: string
  planning_id: string
  locatie_naam: string
  inhoud: Record<string, string>
  bijgewerkt_op: string
}

interface Profiel { id: string; naam: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  niet_gestart: { label: 'Niet gestart', kleur: '#888', bg: 'var(--bg)', icoon: <Circle size={14} color="#888" /> },
  bezig: { label: 'Bezig', kleur: '#F59E0B', bg: '#FFFBEB', icoon: <Clock size={14} color="#F59E0B" /> },
  afgerond: { label: 'Afgerond', kleur: '#8CC63F', bg: 'var(--primary-xlight)', icoon: <CheckCircle2 size={14} color="#8CC63F" /> },
}

function fmtDatum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── PDF Export locatie invulling ─────────────────────────────────────────────

async function exportLocatiePDF(planning: VePlanning, locatie: string, invulling: VeLocatieInvulling | null, taken: VeTaakTemplate[], toewijzingen: VeTaakToewijzing[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const groen: [number, number, number] = [140, 198, 63]
  const donkerGroen: [number, number, number] = [61, 107, 26]
  const wit: [number, number, number] = [255, 255, 255]
  const zwart: [number, number, number] = [30, 30, 30]
  const grijs: [number, number, number] = [150, 150, 150]
  const marge = 16
  const breedte = 210 - marge * 2
  let y = 0

  // Header
  doc.setFillColor(...groen)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(...wit)
  doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('VE Planning', marge, 12)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(`${planning.naam} — ${locatie}`, marge, 20)
  doc.text(fmtDatum(new Date().toISOString()), 210 - marge, 12, { align: 'right' })
  if (planning.thema) doc.text(`Thema: ${planning.thema}`, 210 - marge, 20, { align: 'right' })
  y = 36

  // Invulvelden
  if (invulling && Object.keys(invulling.inhoud).length > 0) {
    doc.setTextColor(...donkerGroen); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('Planning invulling', marge, y); y += 8

    for (const [veld, waarde] of Object.entries(invulling.inhoud)) {
      if (!waarde) continue
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setFillColor(235, 245, 214)
      doc.rect(marge, y, breedte, 7, 'F')
      doc.setFillColor(...groen)
      doc.rect(marge, y, 3, 7, 'F')
      doc.setTextColor(...donkerGroen); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text(veld, marge + 5, y + 5); y += 9
      const regels = doc.splitTextToSize(waarde, breedte - 4)
      const hoogte = regels.length * 5.5 + 5
      doc.setFillColor(252, 254, 252)
      doc.rect(marge, y, breedte, hoogte, 'F')
      doc.setTextColor(...zwart); doc.setFontSize(9); doc.setFont('helvetica', 'normal')
      doc.text(regels, marge + 3, y + 4.5)
      y += hoogte + 5
    }
    y += 4
  }

  // Taken
  if (taken.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }
    doc.setTextColor(...donkerGroen); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('Taakverdeling', marge, y); y += 8

    for (const taak of taken) {
      if (y > 260) { doc.addPage(); y = 20 }
      const tw = toewijzingen.filter(t => t.template_id === taak.id && t.locatie_naam === locatie)

      doc.setFillColor(235, 245, 214)
      doc.rect(marge, y, breedte, 7, 'F')
      doc.setFillColor(...groen)
      doc.rect(marge, y, 3, 7, 'F')
      doc.setTextColor(...donkerGroen); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text(taak.titel, marge + 5, y + 5); y += 9

      if (tw.length === 0) {
        doc.setTextColor(...grijs); doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5)
        doc.text('Nog niemand toegewezen', marge + 4, y + 4); y += 8
      } else {
        for (const t of tw) {
          const statusLabel = STATUS_CONFIG[t.status].label
          doc.setTextColor(...zwart); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
          doc.text(`• ${t.profiel_naam ?? '—'}`, marge + 4, y + 4)
          doc.setTextColor(...grijs)
          doc.text(statusLabel, 210 - marge - 40, y + 4)
          y += 7
        }
      }
      y += 3
    }
  }

  // Footer
  const n = doc.getNumberOfPages()
  for (let p = 1; p <= n; p++) {
    doc.setPage(p)
    doc.setFillColor(245, 247, 245)
    doc.rect(0, 284, 210, 13, 'F')
    doc.setFontSize(7); doc.setTextColor(...grijs)
    doc.text(`De Theepot — VE Planning — ${planning.naam} — ${locatie}`, marge, 291)
    doc.text(`${p} / ${n}`, 210 - marge, 291, { align: 'right' })
  }

  doc.save(`VE_Planning_${planning.naam}_${locatie}.pdf`)
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function VePlanningPage() {
  const { profiel, isSuperadmin, rechten } = useAuth()
  const magBewerken = isSuperadmin || rechten.pagina_ve_planning === 'bewerken'

  const [planningen, setPlanningen] = useState<VePlanning[]>([])
  const [actief, setActief] = useState<VePlanning | null>(null)
  const [actieveTab, setActieveTab] = useState<'document' | 'invulling' | 'taken'>('document')
  const [actieveLocatie, setActieveLocatie] = useState<string>('')
  const [locaties, setLocaties] = useState<string[]>([])
  const [medewerkers, setMedewerkers] = useState<Profiel[]>([])
  const [taken, setTaken] = useState<VeTaakTemplate[]>([])
  const [toewijzingen, setToewijzingen] = useState<VeTaakToewijzing[]>([])
  const [invulling, setInvulling] = useState<VeLocatieInvulling | null>(null)
  const [laden, setLaden] = useState(true)
  const [planningModal, setPlanningModal] = useState<VePlanning | 'nieuw' | null>(null)
  const [taakTemplateModal, setTaakTemplateModal] = useState(false)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  // Invulveld namen (aanpasbaar per planning)
  const INVUL_VELDEN = [
    'Beschrijving thema',
    'Doelstelling',
    'Activiteiten',
    'Benodigdheden',
    'Aandachtspunten',
    'Evaluatie',
  ]

  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data } = await getSupabase().from('ve_planningen').select('*').order('aangemaakt_op', { ascending: false })
    setPlanningen((data ?? []) as VePlanning[])
    setLaden(false)
  }, [])

  useEffect(() => {
    haalOp()
    getSupabase().from('kasboek_locaties').select('naam').eq('actief', true).order('naam')
      .then(({ data }) => {
        const namen = (data ?? []).map((l: { naam: string }) => l.naam)
        setLocaties(namen)
        if (namen.length > 0) setActieveLocatie(namen[0])
      })
    getSupabase().from('profielen').select('id,naam').eq('actief', true).order('naam')
      .then(({ data }) => setMedewerkers((data ?? []) as Profiel[]))
  }, [haalOp])

  const haalDetailOp = useCallback(async () => {
    if (!actief || !actieveLocatie) return

    // Taken templates
    const { data: taakData } = await getSupabase().from('ve_taken_template').select('*').eq('planning_id', actief.id).order('volgorde')
    setTaken((taakData ?? []) as VeTaakTemplate[])

    // Toewijzingen met namen
    const { data: twData } = await getSupabase()
      .from('ve_taak_toewijzingen')
      .select('*, profielen(naam)')
      .in('template_id', (taakData ?? []).map((t: VeTaakTemplate) => t.id))
    setToewijzingen((twData ?? []).map((t: VeTaakToewijzing & { profielen?: { naam: string } }) => ({ ...t, profiel_naam: t.profielen?.naam })))

    // Locatie invulling
    const { data: invData } = await getSupabase().from('ve_locatie_invulling').select('*').eq('planning_id', actief.id).eq('locatie_naam', actieveLocatie).maybeSingle()
    setInvulling(invData as VeLocatieInvulling | null)
  }, [actief, actieveLocatie])

  useEffect(() => { haalDetailOp() }, [haalDetailOp])

  async function slaInvullingOp(veld: string, waarde: string) {
    if (!actief || !actieveLocatie) return
    const nieuweInhoud = { ...(invulling?.inhoud ?? {}), [veld]: waarde }
    if (invulling) {
      await getSupabase().from('ve_locatie_invulling').update({ inhoud: nieuweInhoud, bijgewerkt_op: new Date().toISOString() }).eq('id', invulling.id)
    } else {
      await getSupabase().from('ve_locatie_invulling').insert({ planning_id: actief.id, locatie_naam: actieveLocatie, inhoud: nieuweInhoud })
    }
    await haalDetailOp()
  }

  async function updateStatus(templateId: string, profielId: string, status: 'niet_gestart' | 'bezig' | 'afgerond') {
    await getSupabase().from('ve_taak_toewijzingen').upsert({
      template_id: templateId, locatie_naam: actieveLocatie, profiel_id: profielId, status, bijgewerkt_op: new Date().toISOString()
    }, { onConflict: 'template_id,locatie_naam,profiel_id' })
    await haalDetailOp()
  }

  async function verwijderPlanning(id: string) {
    if (!confirm('Planning verwijderen? Alle data gaat verloren.')) return
    await getSupabase().from('ve_planningen').delete().eq('id', id)
    if (actief?.id === id) setActief(null)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    await haalOp()
  }

  async function uploadDocument(bestand: File) {
    if (!actief) return
    const ext = bestand.name.split('.').pop()
    const pad = `${actief.id}.${ext}`
    const { error } = await getSupabase().storage.from('ve-documenten').upload(pad, bestand, { upsert: true })
    if (error) { setToast({ bericht: 'Upload mislukt: ' + error.message, type: 'error' }); return }
    await getSupabase().from('ve_planningen').update({ document_pad: pad }).eq('id', actief.id)
    setActief({ ...actief, document_pad: pad })
    setToast({ bericht: 'Document geüpload!', type: 'success' })
    await haalOp()
  }

  async function downloadDocument() {
    if (!actief?.document_pad) return
    const { data } = await getSupabase().storage.from('ve-documenten').download(actief.document_pad)
    if (!data) return
    const url = URL.createObjectURL(data)
    const a = document.createElement('a'); a.href = url; a.download = actief.document_pad; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Topbar
        titel="VE Planning"
        acties={
          magBewerken ? (
            <button className="btn btn-primary" onClick={() => setPlanningModal('nieuw')}>
              <Plus size={14} /> Nieuwe planning
            </button>
          ) : undefined
        }
      />

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>

          {/* Planningen lijst */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Planningen</div>
            {laden ? <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>Laden...</div>
              : planningen.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                  <BookOpen size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
                  <div style={{ fontSize: 13 }}>Nog geen planningen</div>
                  {magBewerken && <button className="btn btn-sm btn-primary" style={{ marginTop: 10 }} onClick={() => setPlanningModal('nieuw')}><Plus size={12} /> Toevoegen</button>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {planningen.map(p => (
                    <div key={p.id} onClick={() => { setActief(p); setActieveTab('document') }}
                      style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', background: actief?.id === p.id ? 'var(--primary-xlight)' : 'var(--bg-card)', border: `1px solid ${actief?.id === p.id ? 'var(--border-dark)' : 'var(--border)'}`, borderLeft: `4px solid ${actief?.id === p.id ? 'var(--primary)' : 'var(--border-dark)'}`, transition: 'all 0.12s' }}>
                      <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 13 }}>{p.naam}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.thema}{p.seizoen ? ` · ${p.seizoen}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Rechter paneel */}
          {!actief ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <BookOpen size={36} />
              <h3>Selecteer een planning</h3>
              <p>Klik op een planning links om de details te bekijken.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Planning header */}
              <div className="card">
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>{actief.naam}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Thema: {actief.thema}{actief.seizoen ? ` · ${actief.seizoen}` : ''}
                    </div>
                  </div>
                  {magBewerken && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => setPlanningModal(actief)}><Pencil size={13} /></button>
                      <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijderPlanning(actief.id)}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderTop: '1px solid var(--border)', padding: '0 20px' }}>
                  {[
                    { id: 'document', label: '📄 Document', icon: null },
                    { id: 'invulling', label: '✏️ Invulling per locatie', icon: null },
                    { id: 'taken', label: '✅ Taakverdeling', icon: null },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActieveTab(tab.id as 'document' | 'invulling' | 'taken')}
                      style={{ padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: actieveTab === tab.id ? 600 : 400, color: actieveTab === tab.id ? 'var(--primary)' : 'var(--text-muted)', borderBottom: actieveTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.12s' }}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab: Document */}
              {actieveTab === 'document' && (
                <div className="card">
                  <div className="card-header"><span className="card-title">📄 Gedeeld document</span></div>
                  <div style={{ padding: '20px' }}>
                    {actief.document_pad ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                          <FileText size={24} color="var(--primary)" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{actief.document_pad}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Geüpload document</div>
                          </div>
                          <button className="btn btn-primary" onClick={downloadDocument}><Download size={14} /> Downloaden</button>
                        </div>
                        {magBewerken && (
                          <label style={{ cursor: 'pointer' }}>
                            <div className="btn btn-sm" style={{ display: 'inline-flex' }}><Upload size={13} /> Ander document uploaden</div>
                            <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadDocument(e.target.files[0])} />
                          </label>
                        )}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <FileText size={40} style={{ opacity: 0.15, marginBottom: 12 }} />
                        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Nog geen document geüpload</div>
                        {magBewerken && (
                          <label style={{ cursor: 'pointer' }}>
                            <div className="btn btn-primary" style={{ display: 'inline-flex' }}><Upload size={14} /> Document uploaden</div>
                            <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadDocument(e.target.files[0])} />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Invulling per locatie */}
              {actieveTab === 'invulling' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Locatie tabs */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <MapPin size={14} color="var(--text-muted)" />
                    {locaties.map(loc => (
                      <button key={loc} onClick={() => setActieveLocatie(loc)}
                        style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s', borderColor: actieveLocatie === loc ? 'var(--primary)' : 'var(--border-dark)', background: actieveLocatie === loc ? 'var(--primary)' : 'var(--bg-card)', color: actieveLocatie === loc ? '#fff' : 'var(--text)' }}>
                        {loc}
                      </button>
                    ))}
                    <button className="btn btn-sm" onClick={() => exportLocatiePDF(actief, actieveLocatie, invulling, taken, toewijzingen)}>
                      <Download size={13} /> PDF
                    </button>
                  </div>

                  {/* Invulvelden */}
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Invulling — {actieveLocatie}</span>
                      {invulling?.bijgewerkt_op && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bijgewerkt {fmtDatum(invulling.bijgewerkt_op)}</span>
                      )}
                    </div>
                    <div style={{ padding: '16px' , display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {INVUL_VELDEN.map(veld => (
                        <div key={veld}>
                          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-text)', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: 6, display: 'inline-block', marginBottom: 6 }}>{veld}</label>
                          <AutoSaveTextarea
                            waarde={invulling?.inhoud?.[veld] ?? ''}
                            placeholder={`${veld} invullen voor ${actieveLocatie}...`}
                            onSave={(val) => slaInvullingOp(veld, val)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Taakverdeling */}
              {actieveTab === 'taken' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Locatie tabs */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <MapPin size={14} color="var(--text-muted)" />
                    {locaties.map(loc => (
                      <button key={loc} onClick={() => setActieveLocatie(loc)}
                        style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s', borderColor: actieveLocatie === loc ? 'var(--primary)' : 'var(--border-dark)', background: actieveLocatie === loc ? 'var(--primary)' : 'var(--bg-card)', color: actieveLocatie === loc ? '#fff' : 'var(--text)' }}>
                        {loc}
                      </button>
                    ))}
                  </div>

                  {/* Taken beheer knop — alleen superadmin */}
                  {isSuperadmin && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" onClick={() => setTaakTemplateModal(true)}>
                        <Settings size={13} /> Takenlijst beheren
                      </button>
                    </div>
                  )}

                  {taken.length === 0 ? (
                    <div className="empty-state" style={{ padding: 32 }}>
                      <CheckCircle2 size={28} style={{ opacity: 0.2 }} />
                      <p style={{ fontSize: 13 }}>Nog geen taken ingesteld</p>
                      {isSuperadmin && <button className="btn btn-sm btn-primary" onClick={() => setTaakTemplateModal(true)}><Plus size={13} /> Taken toevoegen</button>}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {taken.map(taak => {
                        const tw = toewijzingen.filter(t => t.template_id === taak.id && t.locatie_naam === actieveLocatie)
                        const afgerond = tw.filter(t => t.status === 'afgerond').length

                        return (
                          <div key={taak.id} className="card">
                            <div style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14, flex: 1 }}>{taak.titel}</div>
                                {tw.length > 0 && (
                                  <span style={{ fontSize: 11, color: afgerond === tw.length ? 'var(--primary-text)' : 'var(--text-muted)', background: afgerond === tw.length ? 'var(--primary-xlight)' : 'var(--bg)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>
                                    {afgerond}/{tw.length} afgerond
                                  </span>
                                )}
                              </div>
                              {taak.omschrijving && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>{taak.omschrijving}</p>}

                              {/* Toewijzingen */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {tw.map(t => {
                                  const cfg = STATUS_CONFIG[t.status]
                                  return (
                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: cfg.bg, borderRadius: 8, border: '1px solid var(--border)' }}>
                                      {cfg.icoon}
                                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.profiel_naam ?? '—'}</span>
                                      <select value={t.status} onChange={e => updateStatus(taak.id, t.profiel_id!, e.target.value as 'niet_gestart' | 'bezig' | 'afgerond')}
                                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: cfg.kleur, fontWeight: 600, cursor: 'pointer' }}>
                                        <option value="niet_gestart">Niet gestart</option>
                                        <option value="bezig">Bezig</option>
                                        <option value="afgerond">Afgerond</option>
                                      </select>
                                    </div>
                                  )
                                })}

                                {/* Medewerker toevoegen */}
                                {magBewerken && (
                                  <ToewijzingToevoegen
                                    taakId={taak.id}
                                    locatie={actieveLocatie}
                                    medewerkers={medewerkers}
                                    bestaand={tw.map(t => t.profiel_id!)}
                                    onToevoegen={async (profielId) => {
                                      await getSupabase().from('ve_taak_toewijzingen').insert({
                                        template_id: taak.id, locatie_naam: actieveLocatie, profiel_id: profielId, status: 'niet_gestart'
                                      })
                                      await haalDetailOp()
                                    }}
                                    onVerwijderen={async (profielId) => {
                                      await getSupabase().from('ve_taak_toewijzingen').delete()
                                        .eq('template_id', taak.id).eq('locatie_naam', actieveLocatie).eq('profiel_id', profielId)
                                      await haalDetailOp()
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {planningModal && (
        <PlanningModal
          planning={planningModal === 'nieuw' ? null : planningModal}
          onSave={async (data) => {
            if (planningModal === 'nieuw') {
              const { data: nieuw } = await getSupabase().from('ve_planningen').insert({ ...data, aangemaakt_door: profiel?.id }).select().single()
              if (nieuw) setActief(nieuw as VePlanning)
              setToast({ bericht: 'Planning aangemaakt!', type: 'success' })
            } else {
              await getSupabase().from('ve_planningen').update(data).eq('id', (planningModal as VePlanning).id)
              setActief({ ...(planningModal as VePlanning), ...data })
              setToast({ bericht: 'Opgeslagen!', type: 'success' })
            }
            setPlanningModal(null)
            await haalOp()
          }}
          onClose={() => setPlanningModal(null)}
        />
      )}

      {taakTemplateModal && actief && (
        <TaakTemplateModal
          planningId={actief.id}
          taken={taken}
          onClose={() => setTaakTemplateModal(false)}
          onBijgewerkt={haalDetailOp}
        />
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Auto-save Textarea ───────────────────────────────────────────────────────

function AutoSaveTextarea({ waarde, placeholder, onSave }: { waarde: string; placeholder: string; onSave: (val: string) => void }) {
  const [lokaal, setLokaal] = useState(waarde)
  const [opgeslagen, setOpgeslagen] = useState(true)
  const timerRef = { current: null as ReturnType<typeof setTimeout> | null }

  useEffect(() => { setLokaal(waarde); setOpgeslagen(true) }, [waarde])

  function onChange(val: string) {
    setLokaal(val); setOpgeslagen(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { onSave(val); setOpgeslagen(true) }, 800)
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea value={lokaal} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', minHeight: 100, border: '1px solid var(--border-dark)', borderRadius: 9, padding: '10px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7, background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none' }}
        onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
        onBlur={e => { e.target.style.borderColor = 'var(--border-dark)'; onSave(lokaal); setOpgeslagen(true) }}
      />
      <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 10, color: opgeslagen ? 'var(--primary)' : 'var(--text-muted)' }}>
        {opgeslagen ? '✓ Opgeslagen' : 'Opslaan...'}
      </div>
    </div>
  )
}

// ─── Toewijzing Toevoegen ─────────────────────────────────────────────────────

function ToewijzingToevoegen({ taakId, locatie, medewerkers, bestaand, onToevoegen, onVerwijderen }: {
  taakId: string; locatie: string; medewerkers: Profiel[]; bestaand: string[]
  onToevoegen: (profielId: string) => void
  onVerwijderen: (profielId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const beschikbaar = medewerkers.filter(m => !bestaand.includes(m.id))

  return (
    <div>
      <button className="btn btn-sm" onClick={() => setOpen(!open)} style={{ fontSize: 11 }}>
        <Plus size={11} /> Medewerker toevoegen
      </button>
      {open && (
        <div style={{ marginTop: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {beschikbaar.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>Alle medewerkers zijn al toegewezen</div>
          ) : (
            beschikbaar.map(m => (
              <div key={m.id} onClick={() => { onToevoegen(m.id); setOpen(false) }}
                style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {m.naam}
              </div>
            ))
          )}
          <div style={{ borderTop: '1px solid var(--border)', padding: '6px 10px' }}>
            {bestaand.map(id => {
              const m = medewerkers.find(p => p.id === id)
              if (!m) return null
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ flex: 1 }}>✓ {m.naam}</span>
                  <button onClick={() => onVerwijderen(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 11, padding: '1px 4px' }}>Verwijderen</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Planning Modal ───────────────────────────────────────────────────────────

function PlanningModal({ planning, onSave, onClose }: {
  planning: VePlanning | null
  onSave: (data: Omit<VePlanning, 'id' | 'aangemaakt_op' | 'aangemaakt_door' | 'document_pad'>) => void
  onClose: () => void
}) {
  const [naam, setNaam] = useState(planning?.naam ?? '')
  const [thema, setThema] = useState(planning?.thema ?? '')
  const [seizoen, setSeiZoen] = useState(planning?.seizoen ?? '')

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{planning ? 'Planning bewerken' : 'Nieuwe VE Planning'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label className="form-label">Naam *</label><input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. VE Herfst 2026" autoFocus /></div>
          <div><label className="form-label">Thema *</label><input className="form-input" value={thema} onChange={e => setThema(e.target.value)} placeholder="Bijv. Natuur, Ruimte, Middeleeuwen" /></div>
          <div><label className="form-label">Seizoen (optioneel)</label><input className="form-input" value={seizoen} onChange={e => setSeiZoen(e.target.value)} placeholder="Bijv. Herfst 2026, Q3" /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" disabled={!naam.trim() || !thema.trim()} onClick={() => onSave({ naam: naam.trim(), thema: thema.trim(), seizoen: seizoen.trim() || null })}>
              {planning ? 'Opslaan' : 'Aanmaken'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Taak Template Modal (alleen superadmin) ──────────────────────────────────

function TaakTemplateModal({ planningId, taken, onClose, onBijgewerkt }: {
  planningId: string; taken: VeTaakTemplate[]
  onClose: () => void; onBijgewerkt: () => void
}) {
  const [lokaalTaken, setLokaalTaken] = useState<VeTaakTemplate[]>(taken)
  const [nieuwTitel, setNieuwTitel] = useState('')
  const [nieuwOmschrijving, setNieuwOmschrijving] = useState('')
  const [opslaan, setOpslaan] = useState(false)

  async function voegToe() {
    if (!nieuwTitel.trim()) return
    const { data } = await getSupabase().from('ve_taken_template').insert({
      planning_id: planningId, titel: nieuwTitel.trim(),
      omschrijving: nieuwOmschrijving.trim() || null, volgorde: lokaalTaken.length
    }).select().single()
    if (data) setLokaalTaken([...lokaalTaken, data as VeTaakTemplate])
    setNieuwTitel(''); setNieuwOmschrijving('')
    onBijgewerkt()
  }

  async function verwijder(id: string) {
    if (!confirm('Taak verwijderen? Alle toewijzingen gaan ook verloren.')) return
    await getSupabase().from('ve_taken_template').delete().eq('id', id)
    setLokaalTaken(lokaalTaken.filter(t => t.id !== id))
    onBijgewerkt()
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">⚙️ Takenlijst beheren</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--primary-xlight)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-dark)' }}>
            💡 Alleen de superadmin kan taken toevoegen of verwijderen. Medewerkers kunnen de status bijwerken.
          </div>

          {/* Bestaande taken */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lokaalTaken.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.titel}</div>
                  {t.omschrijving && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.omschrijving}</div>}
                </div>
                <button onClick={() => verwijder(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.5, display: 'flex', padding: 3 }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#DC2626' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {lokaalTaken.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>Nog geen taken. Voeg er hieronder een toe.</div>}
          </div>

          {/* Nieuwe taak */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Nieuwe taak toevoegen</div>
            <input className="form-input" value={nieuwTitel} onChange={e => setNieuwTitel(e.target.value)} placeholder="Taaknaam *" onKeyDown={e => e.key === 'Enter' && voegToe()} />
            <input className="form-input" value={nieuwOmschrijving} onChange={e => setNieuwOmschrijving(e.target.value)} placeholder="Omschrijving (optioneel)" />
            <button className="btn btn-primary btn-sm" onClick={voegToe} disabled={!nieuwTitel.trim()}><Plus size={13} /> Taak toevoegen</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <button className="btn" onClick={onClose}>Sluiten</button>
          </div>
        </div>
      </div>
    </div>
  )
}
