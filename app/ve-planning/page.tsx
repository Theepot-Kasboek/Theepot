'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, Trash2, Pencil, Download, Upload,
  FileText, MapPin, CheckCircle2, Circle, Clock,
  Settings, FolderOpen, Layers, ChevronDown, ChevronUp
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VeDocument {
  id: string
  naam: string
  bestand_pad: string
  bestand_type: string | null
  aangemaakt_door: string | null
  aangemaakt_op: string
  profiel_naam?: string
}

interface VePlanning {
  id: string
  locatie_naam: string
  thema: string
  week_van: number
  week_tot: number
  jaar: number
  notities: string | null
  aangemaakt_door: string | null
  aangemaakt_op: string
}

interface VeTaakTemplate {
  id: string
  titel: string
  omschrijving: string | null
  volgorde: number
}

interface VeTaakToewijzing {
  id: string
  template_id: string
  planning_id: string
  profiel_id: string | null
  status: 'niet_gestart' | 'bezig' | 'afgerond'
  profiel_naam?: string
}

interface Profiel { id: string; naam: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  niet_gestart: { label: 'Niet gestart', kleur: '#888', bg: 'var(--bg)', icoon: <Circle size={14} color="#888" /> },
  bezig:        { label: 'Bezig',        kleur: '#F59E0B', bg: '#FFFBEB', icoon: <Clock size={14} color="#F59E0B" /> },
  afgerond:     { label: 'Afgerond',     kleur: '#8CC63F', bg: 'var(--primary-xlight)', icoon: <CheckCircle2 size={14} color="#8CC63F" /> },
}

function fmtDatum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function downloadBestand(pad: string, naam: string) {
  const { data } = await getSupabase().storage.from('ve-documenten').download(pad)
  if (!data) return
  const url = URL.createObjectURL(data)
  const a = document.createElement('a'); a.href = url; a.download = naam; a.click()
  URL.revokeObjectURL(url)
}

async function exportPlanningPDF(planning: VePlanning, taken: VeTaakTemplate[], toewijzingen: VeTaakToewijzing[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const groen: [number,number,number] = [140,198,63]
  const donkerGroen: [number,number,number] = [61,107,26]
  const wit: [number,number,number] = [255,255,255]
  const zwart: [number,number,number] = [30,30,30]
  const grijs: [number,number,number] = [150,150,150]
  const marge = 16; const breedte = 210 - marge * 2; let y = 0

  doc.setFillColor(...groen); doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(...wit); doc.setFontSize(15); doc.setFont('helvetica', 'bold')
  doc.text('VE Planning', marge, 12)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(`${planning.locatie_naam} · Week ${planning.week_van}–${planning.week_tot} ${planning.jaar}`, marge, 20)
  doc.text(`Thema: ${planning.thema}`, 210 - marge, 20, { align: 'right' })
  y = 36

  if (planning.notities) {
    doc.setTextColor(...donkerGroen); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Notities', marge, y); y += 7
    const r = doc.splitTextToSize(planning.notities, breedte)
    doc.setTextColor(...zwart); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
    doc.text(r, marge, y); y += r.length * 5.5 + 8
  }

  if (taken.length > 0) {
    doc.setTextColor(...donkerGroen); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Taakverdeling', marge, y); y += 7
    for (const taak of taken) {
      if (y > 255) { doc.addPage(); y = 20 }
      doc.setFillColor(235,245,214); doc.rect(marge, y, breedte, 7, 'F')
      doc.setFillColor(...groen); doc.rect(marge, y, 3, 7, 'F')
      doc.setTextColor(...donkerGroen); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text(taak.titel, marge + 5, y + 5); y += 9
      const tw = toewijzingen.filter(t => t.template_id === taak.id)
      if (tw.length === 0) {
        doc.setTextColor(...grijs); doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5)
        doc.text('Nog niemand toegewezen', marge + 4, y + 4); y += 8
      } else {
        for (const t of tw) {
          doc.setTextColor(...zwart); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
          doc.text(`• ${t.profiel_naam ?? '—'}`, marge + 4, y + 4)
          doc.setTextColor(...grijs); doc.text(STATUS_CONFIG[t.status].label, 210 - marge - 35, y + 4)
          y += 7
        }
      }
      y += 3
    }
  }

  const n = doc.getNumberOfPages()
  for (let p = 1; p <= n; p++) {
    doc.setPage(p); doc.setFillColor(245,247,245); doc.rect(0,284,210,13,'F')
    doc.setFontSize(7); doc.setTextColor(...grijs)
    doc.text(`De Theepot · VE Planning · ${planning.locatie_naam} · Week ${planning.week_van}–${planning.week_tot}`, marge, 291)
    doc.text(`${p}/${n}`, 210-marge, 291, { align: 'right' })
  }
  doc.save(`VE_${planning.locatie_naam}_W${planning.week_van}-${planning.week_tot}_${planning.jaar}.pdf`)
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function VePlanningPage() {
  const { profiel, isSuperadmin, rechten } = useAuth()
  const magBewerken = isSuperadmin || rechten.pagina_ve_planning === 'bewerken'

  const [actieveTab, setActieveTab] = useState<'documenten' | 'planningen'>('documenten')
  const [locaties, setLocaties] = useState<string[]>([])
  const [medewerkers, setMedewerkers] = useState<Profiel[]>([])
  const [taken, setTaken] = useState<VeTaakTemplate[]>([])
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function laadLocaties() {
      const supabase = getSupabase()
      const { data: alleData } = await supabase.from('kasboek_locaties').select('naam').eq('actief', true).order('naam')
      const alle = (alleData ?? []).map((l: { naam: string }) => l.naam)
      
      // Filter op ve_planning locatietoegang (tenzij superadmin/directie/leidinggevende)
      const magAlles = isSuperadmin || profiel?.rol === 'directie' || profiel?.rol === 'leidinggevende'
      if (magAlles) { setLocaties(alle); return }
      
      const { data: toegang } = await supabase.from('locatie_toegang')
        .select('locatie_naam').eq('profiel_id', profiel?.id ?? '').eq('locatie_type', 've_planning').neq('toegang', 'geen')
      const toegankelijk = (toegang ?? []).map((t: { locatie_naam: string }) => t.locatie_naam)
      setLocaties(alle.filter(l => toegankelijk.includes(l)))
    }
    laadLocaties()
    getSupabase().from('profielen').select('id,naam').eq('actief', true).order('naam')
      .then(({ data }) => setMedewerkers((data ?? []) as Profiel[]))
    getSupabase().from('ve_taken_template').select('*').order('volgorde')
      .then(({ data }) => setTaken((data ?? []) as VeTaakTemplate[]))
  }, [])

  return (
    <>
      <Topbar titel="VE Planning" />
      <div className="page-content">

        {/* Hoofd tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
          {[
            { id: 'documenten', label: '📁 Documenten', },
            { id: 'planningen', label: '📋 Planningen per locatie' },
          ].map(t => (
            <button key={t.id} onClick={() => setActieveTab(t.id as 'documenten' | 'planningen')}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.12s',
                background: actieveTab === t.id ? 'var(--primary)' : 'transparent',
                color: actieveTab === t.id ? '#fff' : 'var(--text-muted)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {actieveTab === 'documenten' && (
          <DocumentenTab magBewerken={magBewerken} profiel={profiel} setToast={setToast} />
        )}

        {actieveTab === 'planningen' && (
          <PlanningenTab
            locaties={locaties} medewerkers={medewerkers} taken={taken}
            magBewerken={magBewerken} isSuperadmin={isSuperadmin}
            profiel={profiel} setToast={setToast}
            onTakenBijgewerkt={() => getSupabase().from('ve_taken_template').select('*').order('volgorde').then(({ data }) => setTaken((data ?? []) as VeTaakTemplate[]))}
          />
        )}
      </div>

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Documenten Tab ───────────────────────────────────────────────────────────

function DocumentenTab({ magBewerken, profiel, setToast }: {
  magBewerken: boolean; profiel: { id: string } | null
  setToast: (t: { bericht: string; type: 'success' | 'error' }) => void
}) {
  const [documenten, setDocumenten] = useState<VeDocument[]>([])
  const [laden, setLaden] = useState(true)
  const [uploaden, setUploaden] = useState(false)

  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data } = await getSupabase().from('ve_documenten').select('*, profielen(naam)').order('aangemaakt_op', { ascending: false })
    setDocumenten((data ?? []).map((d: VeDocument & { profielen?: { naam: string } }) => ({ ...d, profiel_naam: d.profielen?.naam })))
    setLaden(false)
  }, [])

  useEffect(() => { haalOp() }, [haalOp])

  async function upload(bestand: File) {
    setUploaden(true)
    const pad = `${Date.now()}_${bestand.name.replace(/\s+/g, '_')}`
    const { error: upErr } = await getSupabase().storage.from('ve-documenten').upload(pad, bestand)
    if (upErr) { setToast({ bericht: 'Upload mislukt: ' + upErr.message, type: 'error' }); setUploaden(false); return }
    await getSupabase().from('ve_documenten').insert({ naam: bestand.name, bestand_pad: pad, bestand_type: bestand.type || null, aangemaakt_door: profiel?.id })
    setToast({ bericht: 'Document geüpload!', type: 'success' })
    setUploaden(false)
    await haalOp()
  }

  async function verwijder(doc: VeDocument) {
    if (!confirm(`"${doc.naam}" verwijderen?`)) return
    await getSupabase().storage.from('ve-documenten').remove([doc.bestand_pad])
    await getSupabase().from('ve_documenten').delete().eq('id', doc.id)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    await haalOp()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>📁 Gedeelde documenten</div>
        {magBewerken && (
          <label style={{ cursor: uploaden ? 'wait' : 'pointer' }}>
            <div className="btn btn-primary" style={{ display: 'inline-flex', opacity: uploaden ? 0.6 : 1 }}>
              <Upload size={14} /> {uploaden ? 'Uploaden...' : 'Document uploaden'}
            </div>
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" style={{ display: 'none' }} disabled={uploaden} onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        )}
      </div>

      {laden ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Laden...</div>
        : documenten.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <FolderOpen size={36} />
            <h3>Geen documenten</h3>
            <p>Upload hier gedeelde VE planningsdocumenten.</p>
            {magBewerken && (
              <label style={{ cursor: 'pointer' }}>
                <div className="btn btn-primary" style={{ display: 'inline-flex' }}><Upload size={14} /> Uploaden</div>
                <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {documenten.map(doc => (
              <div key={doc.id} className="card">
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-xlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={20} color="var(--primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{doc.naam}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10 }}>
                      {doc.profiel_naam && <span>👤 {doc.profiel_naam}</span>}
                      <span>📅 {fmtDatum(doc.aangemaakt_op)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => downloadBestand(doc.bestand_pad, doc.naam)}><Download size={13} /> Download</button>
                    {magBewerken && <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(doc)}><Trash2 size={13} /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

// ─── Planningen Tab ───────────────────────────────────────────────────────────

function PlanningenTab({ locaties, medewerkers, taken, magBewerken, isSuperadmin, profiel, setToast, onTakenBijgewerkt }: {
  locaties: string[]; medewerkers: Profiel[]; taken: VeTaakTemplate[]
  magBewerken: boolean; isSuperadmin: boolean; profiel: { id: string } | null
  setToast: (t: { bericht: string; type: 'success' | 'error' }) => void
  onTakenBijgewerkt: () => void
}) {
  const [planningen, setPlanningen] = useState<VePlanning[]>([])
  const [toewijzingen, setToewijzingen] = useState<VeTaakToewijzing[]>([])
  const [actieveLocatie, setActieveLocatie] = useState(locaties[0] ?? '')
  const [planningModal, setPlanningModal] = useState<VePlanning | 'nieuw' | null>(null)
  const [taakModal, setTaakModal] = useState(false)
  const [openPlanning, setOpenPlanning] = useState<string | null>(null)
  const [laden, setLaden] = useState(true)

  useEffect(() => { if (locaties.length > 0 && !actieveLocatie) setActieveLocatie(locaties[0]) }, [locaties])

  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data: pData } = await getSupabase().from('ve_planningen').select('*').order('jaar', { ascending: false }).order('week_van', { ascending: false })
    setPlanningen((pData ?? []) as VePlanning[])
    const ids = (pData ?? []).map((p: VePlanning) => p.id)
    if (ids.length > 0 && taken.length > 0) {
      const tIds = taken.map(t => t.id)
      const { data: twData } = await getSupabase().from('ve_taak_toewijzingen').select('*, profielen(naam)').in('template_id', tIds).in('planning_id', ids)
      setToewijzingen((twData ?? []).map((t: VeTaakToewijzing & { profielen?: { naam: string } }) => ({ ...t, profiel_naam: t.profielen?.naam })))
    }
    setLaden(false)
  }, [taken])

  useEffect(() => { haalOp() }, [haalOp])

  const locatiePlanningen = planningen.filter(p => p.locatie_naam === actieveLocatie)

  async function verwijder(id: string) {
    if (!confirm('Planning verwijderen?')) return
    await getSupabase().from('ve_planningen').delete().eq('id', id)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    await haalOp()
  }

  async function updateStatus(templateId: string, planningId: string, profielId: string, status: 'niet_gestart' | 'bezig' | 'afgerond') {
    await getSupabase().from('ve_taak_toewijzingen').upsert(
      { template_id: templateId, planning_id: planningId, profiel_id: profielId, status, bijgewerkt_op: new Date().toISOString() },
      { onConflict: 'template_id,planning_id,profiel_id' }
    )
    await haalOp()
  }

  async function voegToewijzingToe(templateId: string, planningId: string, profielId: string) {
    await getSupabase().from('ve_taak_toewijzingen').upsert(
      { template_id: templateId, planning_id: planningId, profiel_id: profielId, status: 'niet_gestart' },
      { onConflict: 'template_id,planning_id,profiel_id' }
    )
    await haalOp()
  }

  async function verwijderToewijzing(templateId: string, planningId: string, profielId: string) {
    await getSupabase().from('ve_taak_toewijzingen').delete()
      .eq('template_id', templateId).eq('planning_id', planningId).eq('profiel_id', profielId)
    await haalOp()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Locatie tabs + acties */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <MapPin size={14} color="var(--text-muted)" />
        {locaties.map(loc => (
          <button key={loc} onClick={() => setActieveLocatie(loc)}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s',
              borderColor: actieveLocatie === loc ? 'var(--primary)' : 'var(--border-dark)',
              background: actieveLocatie === loc ? 'var(--primary)' : 'var(--bg-card)',
              color: actieveLocatie === loc ? '#fff' : 'var(--text)' }}>
            {loc}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {isSuperadmin && <button className="btn btn-sm" onClick={() => setTaakModal(true)}><Settings size={13} /> Standaard taken</button>}
          {magBewerken && <button className="btn btn-primary btn-sm" onClick={() => setPlanningModal('nieuw')}><Plus size={13} /> Nieuwe planning</button>}
        </div>
      </div>

      {/* Planningen lijst */}
      {laden ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Laden...</div>
        : locatiePlanningen.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <Layers size={32} />
            <h3>Geen planningen voor {actieveLocatie}</h3>
            {magBewerken && <button className="btn btn-primary" onClick={() => setPlanningModal('nieuw')}><Plus size={14} /> Nieuwe planning</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {locatiePlanningen.map(p => {
              const isOpen = openPlanning === p.id
              const planToewijzingen = toewijzingen.filter(t => t.planning_id === p.id)
              const totaalTaken = taken.length * 1
              const afgerond = planToewijzingen.filter(t => t.status === 'afgerond').length

              return (
                <div key={p.id} className="card">
                  {/* Planning header */}
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setOpenPlanning(isOpen ? null : p.id)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15 }}>{p.thema}</div>
                        <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'var(--primary-xlight)', color: 'var(--primary-text)', fontWeight: 500 }}>
                          Week {p.week_van}–{p.week_tot} · {p.jaar}
                        </span>
                      </div>
                      {planToewijzingen.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <div style={{ height: 4, borderRadius: 2, background: 'var(--border-dark)', flex: 1, maxWidth: 120 }}>
                            <div style={{ height: '100%', borderRadius: 2, background: 'var(--primary)', width: `${Math.round(afgerond / planToewijzingen.length * 100)}%`, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{afgerond}/{planToewijzingen.length} taken afgerond</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm" onClick={() => exportPlanningPDF(p, taken, planToewijzingen)}><Download size={13} /> PDF</button>
                      {magBewerken && <button className="btn btn-sm" onClick={() => setPlanningModal(p)}><Pencil size={13} /></button>}
                      {magBewerken && <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(p.id)}><Trash2 size={13} /></button>}
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                  </div>

                  {/* Uitklap: notities + taken */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {p.notities && (
                        <div style={{ background: 'var(--bg)', borderRadius: 9, padding: '12px 14px', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Notities</div>
                          <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{p.notities}</div>
                        </div>
                      )}

                      {/* Taakverdeling */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Taakverdeling</div>
                        {taken.length === 0 ? (
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Geen standaard taken ingesteld. {isSuperadmin && <button className="btn btn-sm" onClick={() => setTaakModal(true)} style={{ marginLeft: 8 }}><Settings size={11} /> Taken instellen</button>}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {taken.map(taak => {
                              const tw = planToewijzingen.filter(t => t.template_id === taak.id)
                              return (
                                <div key={taak.id} style={{ background: 'var(--bg)', borderRadius: 9, padding: '12px 14px', border: '1px solid var(--border)' }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: taak.omschrijving ? 4 : 8 }}>{taak.titel}</div>
                                  {taak.omschrijving && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{taak.omschrijving}</div>}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {tw.map(t => {
                                      const cfg = STATUS_CONFIG[t.status]
                                      return (
                                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: cfg.bg, borderRadius: 8, border: '1px solid var(--border)' }}>
                                          {cfg.icoon}
                                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.profiel_naam ?? '—'}</span>
                                          <select value={t.status} onChange={e => updateStatus(taak.id, p.id, t.profiel_id!, e.target.value as 'niet_gestart' | 'bezig' | 'afgerond')}
                                            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: cfg.kleur, fontWeight: 600, cursor: 'pointer' }}>
                                            <option value="niet_gestart">Niet gestart</option>
                                            <option value="bezig">Bezig</option>
                                            <option value="afgerond">Afgerond</option>
                                          </select>
                                          {magBewerken && <button onClick={() => verwijderToewijzing(taak.id, p.id, t.profiel_id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', opacity: 0.5, display: 'flex' }} onMouseEnter={e => (e.currentTarget.style.opacity='1')} onMouseLeave={e => (e.currentTarget.style.opacity='0.5')}><X size={13} /></button>}
                                        </div>
                                      )
                                    })}
                                    {magBewerken && (
                                      <MedewerkerDropdown
                                        medewerkers={medewerkers}
                                        bestaand={tw.map(t => t.profiel_id!)}
                                        onToevoegen={id => voegToewijzingToe(taak.id, p.id, id)}
                                      />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      }

      {planningModal && (
        <PlanningModal
          planning={planningModal === 'nieuw' ? null : planningModal}
          locatie={actieveLocatie}
          onSave={async (data) => {
            if (planningModal === 'nieuw') {
              await getSupabase().from('ve_planningen').insert({ ...data, locatie_naam: actieveLocatie, aangemaakt_door: profiel?.id })
              setToast({ bericht: 'Planning aangemaakt!', type: 'success' })
            } else {
              await getSupabase().from('ve_planningen').update(data).eq('id', (planningModal as VePlanning).id)
              setToast({ bericht: 'Opgeslagen!', type: 'success' })
            }
            setPlanningModal(null)
            await haalOp()
          }}
          onClose={() => setPlanningModal(null)}
        />
      )}

      {taakModal && (
        <TaakTemplateModal taken={taken} onClose={() => setTaakModal(false)} onBijgewerkt={() => { onTakenBijgewerkt(); haalOp() }} />
      )}
    </div>
  )
}

// ─── Medewerker Dropdown ──────────────────────────────────────────────────────

function MedewerkerDropdown({ medewerkers, bestaand, onToevoegen }: { medewerkers: Profiel[]; bestaand: string[]; onToevoegen: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const beschikbaar = medewerkers.filter(m => !bestaand.includes(m.id))
  if (beschikbaar.length === 0) return null
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-sm" onClick={() => setOpen(!open)} style={{ fontSize: 11 }}><Plus size={11} /> Medewerker toevoegen</button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden', minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          {beschikbaar.map(m => (
            <div key={m.id} onClick={() => { onToevoegen(m.id); setOpen(false) }}
              style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {m.naam}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Planning Modal ───────────────────────────────────────────────────────────

function PlanningModal({ planning, locatie, onSave, onClose }: {
  planning: VePlanning | null; locatie: string
  onSave: (data: Omit<VePlanning, 'id' | 'aangemaakt_op' | 'aangemaakt_door' | 'locatie_naam'>) => void
  onClose: () => void
}) {
  const huidigJaar = new Date().getFullYear()
  const [thema, setThema] = useState(planning?.thema ?? '')
  const [weekVan, setWeekVan] = useState(String(planning?.week_van ?? ''))
  const [weekTot, setWeekTot] = useState(String(planning?.week_tot ?? ''))
  const [jaar, setJaar] = useState(String(planning?.jaar ?? huidigJaar))
  const [notities, setNotities] = useState(planning?.notities ?? '')

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{planning ? 'Planning bewerken' : `Nieuwe planning — ${locatie}`}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label className="form-label">Thema *</label><input className="form-input" value={thema} onChange={e => setThema(e.target.value)} placeholder="Bijv. Middeleeuwen, Ruimtevaart" autoFocus /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div><label className="form-label">Week van *</label><input type="number" className="form-input" value={weekVan} onChange={e => setWeekVan(e.target.value)} placeholder="1" min="1" max="52" /></div>
            <div><label className="form-label">Week tot *</label><input type="number" className="form-input" value={weekTot} onChange={e => setWeekTot(e.target.value)} placeholder="4" min="1" max="52" /></div>
            <div><label className="form-label">Jaar *</label><input type="number" className="form-input" value={jaar} onChange={e => setJaar(e.target.value)} /></div>
          </div>
          {weekVan && weekTot && <div style={{ fontSize: 12, color: 'var(--primary-text)', background: 'var(--primary-xlight)', padding: '6px 12px', borderRadius: 7 }}>📅 Week {weekVan}–{weekTot}, {jaar}</div>}
          <div><label className="form-label">Notities (optioneel)</label><textarea className="form-textarea" style={{ minHeight: 90 }} value={notities} onChange={e => setNotities(e.target.value)} placeholder="Extra informatie, aandachtspunten..." /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" disabled={!thema.trim() || !weekVan || !weekTot || !jaar}
              onClick={() => onSave({ thema: thema.trim(), week_van: parseInt(weekVan), week_tot: parseInt(weekTot), jaar: parseInt(jaar), notities: notities.trim() || null })}>
              {planning ? 'Opslaan' : 'Aanmaken'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Taak Template Modal ──────────────────────────────────────────────────────

function TaakTemplateModal({ taken, onClose, onBijgewerkt }: { taken: VeTaakTemplate[]; onClose: () => void; onBijgewerkt: () => void }) {
  const [lokaal, setLokaal] = useState<VeTaakTemplate[]>(taken)
  const [nieuwTitel, setNieuwTitel] = useState('')
  const [nieuwOmschrijving, setNieuwOmschrijving] = useState('')

  async function voegToe() {
    if (!nieuwTitel.trim()) return
    const { data } = await getSupabase().from('ve_taken_template').insert({ titel: nieuwTitel.trim(), omschrijving: nieuwOmschrijving.trim() || null, volgorde: lokaal.length }).select().single()
    if (data) setLokaal([...lokaal, data as VeTaakTemplate])
    setNieuwTitel(''); setNieuwOmschrijving('')
    onBijgewerkt()
  }

  async function verwijder(id: string) {
    if (!confirm('Taak verwijderen? Alle toewijzingen gaan verloren.')) return
    await getSupabase().from('ve_taken_template').delete().eq('id', id)
    setLokaal(lokaal.filter(t => t.id !== id))
    onBijgewerkt()
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">⚙️ Standaard taken beheren</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--primary-text)', background: 'var(--primary-xlight)', padding: '8px 12px', borderRadius: 8 }}>
            💡 Deze taken gelden voor alle planningen. Alleen de superadmin kan taken toevoegen of verwijderen.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lokaal.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--primary-xlight)', color: 'var(--primary-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.titel}</div>
                  {t.omschrijving && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.omschrijving}</div>}
                </div>
                <button onClick={() => verwijder(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.4, display: 'flex', padding: 2 }} onMouseEnter={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.color='#DC2626' }} onMouseLeave={e => { e.currentTarget.style.opacity='0.4'; e.currentTarget.style.color='var(--text-muted)' }}><Trash2 size={14} /></button>
              </div>
            ))}
            {lokaal.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Nog geen taken.</div>}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="form-input" value={nieuwTitel} onChange={e => setNieuwTitel(e.target.value)} placeholder="Taaknaam *" onKeyDown={e => e.key === 'Enter' && voegToe()} />
            <input className="form-input" value={nieuwOmschrijving} onChange={e => setNieuwOmschrijving(e.target.value)} placeholder="Omschrijving (optioneel)" />
            <button className="btn btn-primary btn-sm" onClick={voegToe} disabled={!nieuwTitel.trim()}><Plus size={13} /> Toevoegen</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn" onClick={onClose}>Sluiten</button></div>
        </div>
      </div>
    </div>
  )
}
