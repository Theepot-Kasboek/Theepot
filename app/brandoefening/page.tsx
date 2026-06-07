'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, Download, Pencil, Trash2,
  Flame, MapPin, ChevronRight, Check
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandoefeningWeek {
  id: string
  week_nummer: number
  jaar: number
  locatie_naam: string
  aangemaakt_op: string
}

interface BrandoefeningDag {
  id: string
  week_id: string
  dag: string
  datum: string | null
  tijd: string | null
  aanwezige_pmers: string | null
  aard_incident: string[]
  plek_incident: string | null
  gealarmeerden: string[]
  manier_alarmeren: string | null
  bijzonderheden: string | null
  evaluatie: string | null
  ingevuld_door: string | null
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DAGEN = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag']
const AARD_OPTIES = ['Brand', 'Explosie', 'Incident met gevaarlijke stoffen']
const ALARM_OPTIES = ['BHV-er(s)', 'Collega\'s', 'Werkgever', 'Anders']

function fmtDatum(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportWeekPDF(week: BrandoefeningWeek, dagen: BrandoefeningDag[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const rood: [number, number, number] = [220, 38, 38]
  const groen: [number, number, number] = [140, 198, 63]
  const donkerGroen: [number, number, number] = [61, 107, 26]
  const wit: [number, number, number] = [255, 255, 255]
  const zwart: [number, number, number] = [30, 30, 30]
  const grijs: [number, number, number] = [150, 150, 150]
  const lichtGroen: [number, number, number] = [235, 245, 214]
  const marge = 16
  const breedte = 210 - marge * 2
  let y = 0

  doc.setFillColor(...rood)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(...wit)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Evaluatieformulier Brandoefening', marge, 13)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Week ${week.week_nummer} — ${week.jaar} — ${week.locatie_naam}`, 210 - marge, 13, { align: 'right' })
  doc.text(new Date().toLocaleDateString('nl-NL'), 210 - marge, 19, { align: 'right' })

  y = 30

  for (const dagNaam of DAGEN) {
    const dag = dagen.find(d => d.dag === dagNaam)

    if (y > 230) { doc.addPage(); y = 20 }

    // Dag header
    doc.setFillColor(...rood)
    doc.rect(marge, y, breedte, 9, 'F')
    doc.setTextColor(...wit)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(dagNaam, marge + 4, y + 6)
    if (dag?.datum) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(fmtDatum(dag.datum), 210 - marge - 4, y + 6, { align: 'right' })
    }
    y += 12

    if (!dag || (!dag.datum && !dag.evaluatie)) {
      doc.setFillColor(250, 250, 250)
      doc.rect(marge, y, breedte, 8, 'F')
      doc.setTextColor(...grijs)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.text('Geen oefening ingevuld', marge + 4, y + 5.5)
      y += 12
      continue
    }

    // Gegevens rij
    const gegevensHoogte = 10
    doc.setFillColor(...lichtGroen)
    doc.rect(marge, y, breedte, gegevensHoogte, 'F')
    doc.setTextColor(...donkerGroen)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Tijd:', marge + 3, y + 4)
    doc.text('PM-ers:', marge + 25, y + 4)
    doc.text('Ingevuld door:', marge + 90, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...zwart)
    doc.text(dag.tijd ?? '—', marge + 13, y + 4)
    const pmers = doc.splitTextToSize(dag.aanwezige_pmers ?? '—', 60)
    doc.text(pmers[0], marge + 41, y + 4)
    doc.text(dag.ingevuld_door ?? '—', marge + 115, y + 4)
    y += gegevensHoogte + 2

    // Aard incident
    if (dag.aard_incident?.length > 0 || dag.plek_incident) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...donkerGroen)
      doc.text('Aard:', marge + 3, y + 4)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...zwart)
      doc.text((dag.aard_incident ?? []).join(', ') || '—', marge + 18, y + 4)
      if (dag.plek_incident) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...donkerGroen)
        doc.text('Plek:', marge + 90, y + 4)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...zwart)
        doc.text(dag.plek_incident, marge + 103, y + 4)
      }
      y += 8
    }

    // Bijzonderheden
    if (dag.bijzonderheden) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...donkerGroen)
      doc.text('Bijzonderheden:', marge + 3, y + 4)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...zwart)
      const bijzRegels = doc.splitTextToSize(dag.bijzonderheden, breedte - 40)
      doc.text(bijzRegels, marge + 40, y + 4)
      y += bijzRegels.length * 5 + 4
    }

    // Evaluatie
    if (dag.evaluatie) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...donkerGroen)
      doc.text('Evaluatie:', marge + 3, y + 4)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...zwart)
      const evalRegels = doc.splitTextToSize(dag.evaluatie, breedte - 30)
      doc.text(evalRegels, marge + 28, y + 4)
      y += evalRegels.length * 5 + 4
    }

    // Handtekening
    doc.setDrawColor(...grijs)
    doc.setLineWidth(0.3)
    doc.line(marge, y + 8, marge + 60, y + 8)
    doc.setFontSize(7)
    doc.setTextColor(...grijs)
    doc.text('Handtekening', marge, y + 12)
    y += 18
  }

  // Footer
  const aantalPaginas = doc.getNumberOfPages()
  for (let p = 1; p <= aantalPaginas; p++) {
    doc.setPage(p)
    doc.setFillColor(245, 247, 245)
    doc.rect(0, 284, 210, 13, 'F')
    doc.setFontSize(7)
    doc.setTextColor(...grijs)
    doc.text(`De Theepot — Brandoefening Week ${week.week_nummer} ${week.jaar} — ${week.locatie_naam}`, marge, 291)
    doc.text(`${p} / ${aantalPaginas}`, 210 - marge, 291, { align: 'right' })
  }

  doc.save(`Brandoefening_Week${week.week_nummer}_${week.jaar}_${week.locatie_naam}.pdf`)
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function BrandoefeningPage() {
  const { profiel, isSuperadmin, rechten } = useAuth()
  const magZien = isSuperadmin || rechten.pagina_brandoefening !== 'geen'
  const magBewerken = isSuperadmin || rechten.pagina_brandoefening === 'bewerken'

  const [locaties, setLocaties] = useState<string[]>([])
  const [actieveLocatie, setActieveLocatie] = useState<string>('')
  const [weken, setWeken] = useState<BrandoefeningWeek[]>([])
  const [actieveWeek, setActieveWeek] = useState<BrandoefeningWeek | null>(null)
  const [dagen, setDagen] = useState<BrandoefeningDag[]>([])
  const [activeDag, setActiveDag] = useState<string>('Maandag')
  const [laden, setLaden] = useState(true)
  const [nieuwWeekModal, setNieuwWeekModal] = useState(false)
  const [invulModal, setInvulModal] = useState<BrandoefeningDag | null>(null)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  async function getToegankelijkeLocaties(alleLocaties: string[]): Promise<string[]> {
    const magAllesZien = isSuperadmin || profiel?.rol === 'directie' || profiel?.rol === 'leidinggevende'
    if (magAllesZien) return alleLocaties
    const { data } = await getSupabase()
      .from('locatie_toegang').select('locatie_naam, toegang')
      .eq('profiel_id', profiel?.id ?? '').eq('locatie_type', 'brandoefening')
    const toegankelijk = (data ?? []).filter((t: { toegang: string }) => t.toegang !== 'geen').map((t: { locatie_naam: string }) => t.locatie_naam)
    return alleLocaties.filter(l => toegankelijk.includes(l))
  }

  useEffect(() => {
    if (!profiel) return
    getSupabase().from('kasboek_locaties').select('naam').eq('actief', true).order('naam')
      .then(async ({ data }) => {
        const allen = (data ?? []).map((l: { naam: string }) => l.naam)
        const namen = await getToegankelijkeLocaties(allen)
        setLocaties(namen)
        if (namen.length > 0) setActieveLocatie(namen[0])
      })
  }, [profiel?.id])

  const haalWekenOp = useCallback(async () => {
    if (!actieveLocatie) return
    setLaden(true)
    const { data } = await getSupabase().from('brandoefening_weken').select('*')
      .eq('locatie_naam', actieveLocatie).order('jaar', { ascending: false }).order('week_nummer', { ascending: false })
    setWeken((data ?? []) as BrandoefeningWeek[])
    setLaden(false)
  }, [actieveLocatie])

  useEffect(() => { haalWekenOp() }, [haalWekenOp])

  const haalDagenOp = useCallback(async () => {
    if (!actieveWeek) return
    const { data } = await getSupabase().from('brandoefening_dagen').select('*').eq('week_id', actieveWeek.id)
    // Zorg dat alle 5 dagen er zijn
    const bestaand = (data ?? []) as BrandoefeningDag[]
    const volledig: BrandoefeningDag[] = DAGEN.map(dag => {
      const gevonden = bestaand.find(d => d.dag === dag)
      return gevonden ?? { id: '', week_id: actieveWeek.id, dag, datum: null, tijd: null, aanwezige_pmers: null, aard_incident: [], plek_incident: null, gealarmeerden: [], manier_alarmeren: null, bijzonderheden: null, evaluatie: null, ingevuld_door: null }
    })
    setDagen(volledig)
  }, [actieveWeek])

  useEffect(() => { haalDagenOp() }, [haalDagenOp])

  async function maakWeek(weekNummer: number, jaar: number) {
    const { data, error } = await getSupabase().from('brandoefening_weken').insert({
      week_nummer: weekNummer, jaar, locatie_naam: actieveLocatie, aangemaakt_door: profiel?.id
    }).select().single()
    if (error) { setToast({ bericht: 'Mislukt: ' + error.message, type: 'error' }); return }
    setNieuwWeekModal(false)
    setToast({ bericht: `Week ${weekNummer} aangemaakt!`, type: 'success' })
    await haalWekenOp()
    const nieuweWeek = data as BrandoefeningWeek
    setActieveWeek(nieuweWeek)
    // Direct leege dagen alvast zetten zodat tabs meteen zichtbaar zijn
    setDagen(DAGEN.map(dag => ({ id: '', week_id: nieuweWeek.id, dag, datum: null, tijd: null, aanwezige_pmers: null, aard_incident: [], plek_incident: null, gealarmeerden: [], manier_alarmeren: null, bijzonderheden: null, evaluatie: null, ingevuld_door: null })))
  }

  async function verwijderWeek(id: string) {
    if (!confirm('Week verwijderen? Alle dagformulieren gaan verloren.')) return
    await getSupabase().from('brandoefening_weken').delete().eq('id', id)
    setActieveWeek(null); setDagen([])
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    await haalWekenOp()
  }

  async function slaagDagOp(dagNaam: string, data: Partial<BrandoefeningDag>) {
    const supabase = getSupabase()
    const bestaand = dagen.find(d => d.dag === dagNaam && d.id)
    if (bestaand?.id) {
      await supabase.from('brandoefening_dagen').update(data).eq('id', bestaand.id)
    } else {
      await supabase.from('brandoefening_dagen').insert({ ...data, week_id: actieveWeek!.id, dag: dagNaam })
    }
    setInvulModal(null)
    setToast({ bericht: `${dagNaam} opgeslagen!`, type: 'success' })
    await haalDagenOp()
  }

  if (!magZien) return (
    <>
      <Topbar titel="Brandoefening" subtitel="Geen toegang" />
      <div className="page-content"><div className="empty-state"><Flame size={36} /><h3>Geen toegang</h3><p>Je hebt geen toegang tot de brandoefening evaluaties.</p></div></div>
    </>
  )

  const actieveDagObj = dagen.find(d => d.dag === activeDag)

  return (
    <>
      <Topbar
        titel="Brandoefening"
        subtitel={actieveLocatie}
        acties={
          <div style={{ display: 'flex', gap: 8 }}>
            {actieveWeek && (
              <button className="btn" onClick={() => exportWeekPDF(actieveWeek, dagen)}>
                <Download size={14} /> PDF week
              </button>
            )}
            {magBewerken && (
              <button className="btn btn-primary" onClick={() => setNieuwWeekModal(true)}>
                <Plus size={14} /> Week toevoegen
              </button>
            )}
          </div>
        }
      />

      <div className="page-content">
        {/* Locatie tabs */}
        {locaties.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            {locaties.map(loc => (
              <button key={loc} onClick={() => { setActieveLocatie(loc); setActieveWeek(null); setDagen([]) }}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s', borderColor: actieveLocatie === loc ? 'var(--primary)' : 'var(--border-dark)', background: actieveLocatie === loc ? 'var(--primary)' : 'var(--bg-card)', color: actieveLocatie === loc ? '#fff' : 'var(--text)' }}>
                {loc}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
          {/* Weken lijst */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Oefenweken</div>
            {laden ? <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>Laden...</div>
              : weken.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                  <Flame size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
                  <div>Nog geen weken</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {weken.map(w => {
                    const isActief = actieveWeek?.id === w.id
                    return (
                      <div key={w.id} onClick={() => { setActieveWeek(w); setActiveDag('Maandag'); setDagen(DAGEN.map(dag => ({ id: '', week_id: w.id, dag, datum: null, tijd: null, aanwezige_pmers: null, aard_incident: [], plek_incident: null, gealarmeerden: [], manier_alarmeren: null, bijzonderheden: null, evaluatie: null, ingevuld_door: null }))) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.12s', background: isActief ? 'var(--primary-light)' : 'var(--bg-card)', border: `1px solid ${isActief ? 'var(--border-dark)' : 'var(--border)'}`, borderLeft: `4px solid ${isActief ? 'var(--primary)' : 'var(--border-dark)'}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>Week {w.week_nummer}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.jaar}</div>
                        </div>
                        {magBewerken && (
                          <button onClick={e => { e.stopPropagation(); verwijderWeek(w.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.4, display: 'flex', padding: 2 }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#DC2626' }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
          </div>

          {/* Rechter paneel */}
          <div>
            {!actieveWeek ? (
              <div className="empty-state" style={{ padding: 60 }}><Flame size={36} /><h3>Selecteer een week</h3><p>Klik op een oefenweek om de dagformulieren te bekijken.</p></div>
            ) : (
              <>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
                  Week {actieveWeek.week_nummer}, {actieveWeek.jaar} — {actieveWeek.locatie_naam}
                </div>

                {/* Dag tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                  {DAGEN.map(dag => {
                    const dagData = dagen.find(d => d.dag === dag)
                    const ingevuld = !!(dagData?.id && (dagData.datum || dagData.evaluatie))
                    const isActief = activeDag === dag
                    return (
                      <button key={dag} onClick={() => setActiveDag(dag)} style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        border: '1.5px solid', transition: 'all 0.12s',
                        borderColor: isActief ? '#DC2626' : ingevuld ? 'var(--primary)' : 'var(--border-dark)',
                        background: isActief ? '#DC2626' : ingevuld ? 'var(--primary-xlight)' : 'var(--bg-card)',
                        color: isActief ? '#fff' : ingevuld ? 'var(--primary-text)' : 'var(--text)',
                        display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        {ingevuld && !isActief && <Check size={12} color="var(--primary)" />}
                        {dag.slice(0, 2)}
                      </button>
                    )
                  })}
                </div>

                {/* Dag formulier weergave */}
                {actieveDagObj && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 600 }}>{activeDag}</div>
                      {magBewerken && (
                        <button className="btn btn-primary" onClick={() => setInvulModal(actieveDagObj)}>
                          <Pencil size={14} /> {actieveDagObj.id ? 'Bewerken' : 'Invullen'}
                        </button>
                      )}
                    </div>

                    {!actieveDagObj.id ? (
                      <div className="empty-state" style={{ padding: 32 }}>
                        <Flame size={28} style={{ opacity: 0.2 }} />
                        <p style={{ fontSize: 13 }}>Nog niet ingevuld voor {activeDag}</p>
                        {magBewerken && <button className="btn btn-primary btn-sm" onClick={() => setInvulModal(actieveDagObj)}><Plus size={13} /> Invullen</button>}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                          { label: 'Datum', waarde: fmtDatum(actieveDagObj.datum) },
                          { label: 'Tijd', waarde: actieveDagObj.tijd ?? '—' },
                          { label: 'Ingevuld door', waarde: actieveDagObj.ingevuld_door ?? '—' },
                          { label: 'Plek incident', waarde: actieveDagObj.plek_incident ?? '—' },
                        ].map(v => (
                          <div key={v.label} className="card" style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{v.label}</div>
                            <div style={{ fontSize: 13, color: 'var(--text)' }}>{v.waarde}</div>
                          </div>
                        ))}

                        <div className="card" style={{ padding: '12px 16px', gridColumn: '1/-1' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Aanwezige PM-ers</div>
                          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{actieveDagObj.aanwezige_pmers ?? '—'}</div>
                        </div>

                        <div className="card" style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Aard incident</div>
                          {(actieveDagObj.aard_incident ?? []).length > 0
                            ? (actieveDagObj.aard_incident ?? []).map((a, i) => <div key={i} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Check size={12} color="var(--primary)" /> {a}</div>)
                            : <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</div>}
                        </div>

                        <div className="card" style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Gealarmeerden</div>
                          {(actieveDagObj.gealarmeerden ?? []).length > 0
                            ? (actieveDagObj.gealarmeerden ?? []).map((a, i) => <div key={i} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Check size={12} color="var(--primary)" /> {a}</div>)
                            : <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</div>}
                        </div>

                        {[
                          { label: 'Manier van alarmeren', waarde: actieveDagObj.manier_alarmeren },
                          { label: 'Bijzonderheden', waarde: actieveDagObj.bijzonderheden },
                          { label: 'Evaluatie', waarde: actieveDagObj.evaluatie },
                        ].map(v => v.waarde ? (
                          <div key={v.label} className="card" style={{ padding: '12px 16px', gridColumn: '1/-1' }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{v.label}</div>
                            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{v.waarde}</div>
                          </div>
                        ) : null)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {nieuwWeekModal && <NieuwWeekModal onSave={maakWeek} onClose={() => setNieuwWeekModal(false)} bestaandeWeken={weken.map(w => ({ week: w.week_nummer, jaar: w.jaar }))} />}
      {invulModal && <InvulModal dag={invulModal} onSave={slaagDagOp} onClose={() => setInvulModal(null)} />}
      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Nieuw week modal ─────────────────────────────────────────────────────────

function NieuwWeekModal({ onSave, onClose, bestaandeWeken }: {
  onSave: (weekNummer: number, jaar: number) => void
  onClose: () => void
  bestaandeWeken: { week: number; jaar: number }[]
}) {
  const [weekNummer, setWeekNummer] = useState('18')
  const [jaar, setJaar] = useState(new Date().getFullYear().toString())
  const bestaat = bestaandeWeken.some(w => w.week === parseInt(weekNummer) && w.jaar === parseInt(jaar))

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Week toevoegen</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--primary-xlight)', border: '1px solid var(--border-dark)', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: 'var(--primary-text)' }}>
            💡 Brandoefeningen worden standaard in week 18 en week 36 gedaan.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">Weeknummer</label><input className="form-input" type="number" min="1" max="52" value={weekNummer} onChange={e => setWeekNummer(e.target.value)} /></div>
            <div><label className="form-label">Jaar</label><input className="form-input" type="number" value={jaar} onChange={e => setJaar(e.target.value)} /></div>
          </div>
          {bestaat && <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 7 }}>Week {weekNummer} van {jaar} bestaat al.</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => onSave(parseInt(weekNummer), parseInt(jaar))} disabled={bestaat || !weekNummer || !jaar}>Aanmaken</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Invul Modal ──────────────────────────────────────────────────────────────

function InvulModal({ dag, onSave, onClose }: {
  dag: BrandoefeningDag
  onSave: (dagNaam: string, data: Partial<BrandoefeningDag>) => void
  onClose: () => void
}) {
  const [datum, setDatum] = useState(dag.datum ?? '')
  const [tijd, setTijd] = useState(dag.tijd ?? '')
  const [pmers, setPmers] = useState(dag.aanwezige_pmers ?? '')
  const [aardIncident, setAardIncident] = useState<string[]>(dag.aard_incident ?? [])
  const [plekIncident, setPlekIncident] = useState(dag.plek_incident ?? '')
  const [gealarmeerden, setGealarmeerden] = useState<string[]>(dag.gealarmeerden ?? [])
  const [manierAlarmeren, setManierAlarmeren] = useState(dag.manier_alarmeren ?? '')
  const [bijzonderheden, setBijzonderheden] = useState(dag.bijzonderheden ?? '')
  const [evaluatie, setEvaluatie] = useState(dag.evaluatie ?? '')
  const [ingevuldDoor, setIngevuldDoor] = useState(dag.ingevuld_door ?? '')

  function toggle(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  function CB({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, padding: '5px 0' }}>
        <div onClick={onChange} style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? 'var(--primary)' : 'var(--border-dark)'}`, background: checked ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.12s' }}>
          {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
        </div>
        {label}
      </label>
    )
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Invullen — {dag.dag}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '75vh', overflowY: 'auto' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="form-label">Datum</label><input type="date" className="form-input" value={datum} onChange={e => setDatum(e.target.value)} /></div>
            <div><label className="form-label">Tijd</label><input className="form-input" value={tijd} onChange={e => setTijd(e.target.value)} placeholder="14:30" /></div>
          </div>

          <div><label className="form-label">Aanwezige PM-ers</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={pmers} onChange={e => setPmers(e.target.value)} placeholder="Namen van aanwezige PM-ers..." /></div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-text)', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 8, marginBottom: 8 }}>🚨 Aard incident</div>
            {AARD_OPTIES.map(opt => <CB key={opt} label={opt} checked={aardIncident.includes(opt)} onChange={() => toggle(aardIncident, setAardIncident, opt)} />)}
            <div style={{ marginTop: 8 }}><label className="form-label">Plek van incident</label><input className="form-input" value={plekIncident} onChange={e => setPlekIncident(e.target.value)} placeholder="Bijv. De Blauwe keuken" /></div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-text)', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 8, marginBottom: 8 }}>📢 Alarmeren</div>
            {ALARM_OPTIES.map(opt => <CB key={opt} label={opt} checked={gealarmeerden.includes(opt)} onChange={() => toggle(gealarmeerden, setGealarmeerden, opt)} />)}
            <div style={{ marginTop: 8 }}><label className="form-label">Manier van alarmeren</label><input className="form-input" value={manierAlarmeren} onChange={e => setManierAlarmeren(e.target.value)} /></div>
          </div>

          <div><label className="form-label">Bijzonderheden</label><textarea className="form-textarea" style={{ minHeight: 70 }} value={bijzonderheden} onChange={e => setBijzonderheden(e.target.value)} /></div>
          <div>
            <label className="form-label">Evaluatie</label>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Vermeld welke zaken verbetering behoeven, wie dat gaat doen en wanneer.</div>
            <textarea className="form-textarea" style={{ minHeight: 90 }} value={evaluatie} onChange={e => setEvaluatie(e.target.value)} />
          </div>
          <div><label className="form-label">Ingevuld door</label><input className="form-input" value={ingevuldDoor} onChange={e => setIngevuldDoor(e.target.value)} /></div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => onSave(dag.dag, { datum: datum || null, tijd: tijd || null, aanwezige_pmers: pmers || null, aard_incident: aardIncident, plek_incident: plekIncident || null, gealarmeerden, manier_alarmeren: manierAlarmeren || null, bijzonderheden: bijzonderheden || null, evaluatie: evaluatie || null, ingevuld_door: ingevuldDoor || null })}>
              Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
