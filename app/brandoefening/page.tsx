'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, Download, Pencil, Trash2,
  Flame, MapPin, ChevronRight, CheckSquare, Square
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandoefeningWeek {
  id: string
  week_nummer: number
  jaar: number
  locatie_naam: string
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
  aangemaakt_op: string
}

// ─── Opties ───────────────────────────────────────────────────────────────────

const AARD_OPTIES = ['Brand', 'Explosie', 'Incident met gevaarlijke stoffen']
const ALARM_OPTIES = ['BHV-er(s)', 'Collega\'s', 'Werkgever', 'Anders']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDatum(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportPDF(week: BrandoefeningWeek) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const groen: [number, number, number] = [140, 198, 63]
  const donkerGroen: [number, number, number] = [61, 107, 26]
  const rood: [number, number, number] = [220, 38, 38]
  const wit: [number, number, number] = [255, 255, 255]
  const zwart: [number, number, number] = [30, 30, 30]
  const grijs: [number, number, number] = [150, 150, 150]
  const lichtGroen: [number, number, number] = [235, 245, 214]
  const lichtRood: [number, number, number] = [254, 242, 242]
  const marge = 16
  const breedte = 210 - marge * 2
  let y = 0

  // Header
  doc.setFillColor(...rood)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(...wit)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Evaluatieformulier Brandoefening', marge, 13)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('De Theepot — Kinderopvang', 210 - marge, 9, { align: 'right' })
  doc.text(week.locatie_naam, 210 - marge, 15, { align: 'right' })

  y = 32

  // Titel sectie
  doc.setTextColor(...zwart)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Week ${week.week_nummer} — ${week.jaar}`, marge, y)
  y += 12

  function sectieHeader(titel: string) {
    doc.setFillColor(...lichtGroen)
    doc.rect(marge, y, breedte, 8, 'F')
    doc.setFillColor(...groen)
    doc.rect(marge, y, 3, 8, 'F')
    doc.setDrawColor(...donkerGroen)
    doc.setLineWidth(0.3)
    doc.rect(marge, y, breedte, 8)
    doc.setTextColor(...donkerGroen)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(titel, marge + 6, y + 5.5)
    y += 11
  }

  function veldRij(label: string, waarde: string | null, hoogte = 10) {
    doc.setFillColor(252, 254, 252)
    doc.rect(marge, y, breedte, hoogte, 'F')
    doc.setDrawColor(...grijs)
    doc.setLineWidth(0.2)
    doc.rect(marge, y, breedte, hoogte)
    doc.setTextColor(...grijs)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(label, marge + 3, y + 4.5)
    doc.setTextColor(...zwart)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (waarde) {
      const regels = doc.splitTextToSize(waarde, breedte - 45)
      doc.text(regels, marge + 42, y + 4.5)
    }
    y += hoogte + 2
  }

  function checkboxRij(label: string, opties: string[], geselecteerd: string[]) {
    doc.setFillColor(252, 254, 252)
    doc.rect(marge, y, breedte, 8, 'F')
    doc.setDrawColor(...grijs)
    doc.setLineWidth(0.2)
    doc.rect(marge, y, breedte, 8)
    doc.setTextColor(...grijs)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(label, marge + 3, y + 5)
    let x = marge + 42
    opties.forEach(opt => {
      const aan = geselecteerd.includes(opt)
      // kleur wordt hieronder gezet
      if (aan) {
        doc.setFillColor(...groen)
        doc.rect(x, y + 1.5, 5, 5, 'F')
      } else {
        doc.setDrawColor(...grijs)
        doc.rect(x, y + 1.5, 5, 5)
      }
      doc.setTextColor(...zwart)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(opt, x + 7, y + 5.5)
      x += opt.length * 2.5 + 14
    })
    y += 10
  }

  // ── Gegevens oefening ──
  sectieHeader('Gegevens oefening')
  veldRij('Datum:', fmtDatum(week.datum))
  veldRij('Tijd:', week.tijd ?? '—')
  veldRij('Locatie:', week.locatie_naam)
  const pmerRegels = week.aanwezige_pmers ? doc.splitTextToSize(week.aanwezige_pmers, breedte - 45).length * 5 + 8 : 10
  veldRij('Aanwezige PM-ers:', week.aanwezige_pmers, Math.max(10, pmerRegels))
  y += 4

  // ── Aard incident ──
  sectieHeader('Aard incident')
  checkboxRij('Type:', AARD_OPTIES, week.aard_incident ?? [])
  y += 2
  veldRij('Plek van incident:', week.plek_incident)
  y += 4

  // ── Alarmeren ──
  sectieHeader('Alarmeren')
  checkboxRij('Gealarmeerden:', ALARM_OPTIES, week.gealarmeerden ?? [])
  y += 2
  veldRij('Manier van alarmeren:', week.manier_alarmeren)
  y += 4

  // ── Bijzonderheden ──
  sectieHeader('Bijzonderheden')
  if (week.bijzonderheden) {
    const regels = doc.splitTextToSize(week.bijzonderheden, breedte - 6)
    const hoogte = regels.length * 5.5 + 8
    doc.setFillColor(252, 254, 252)
    doc.rect(marge, y, breedte, hoogte, 'F')
    doc.setDrawColor(...grijs)
    doc.setLineWidth(0.2)
    doc.rect(marge, y, breedte, hoogte)
    doc.setTextColor(...zwart)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(regels, marge + 3, y + 5.5)
    y += hoogte + 4
  } else {
    y += 12
  }

  // ── Evaluatie ──
  if (y > 220) { doc.addPage(); y = 20 }
  sectieHeader('Evaluatie')
  if (week.evaluatie) {
    const regels = doc.splitTextToSize(week.evaluatie, breedte - 6)
    const hoogte = regels.length * 5.5 + 8
    doc.setFillColor(252, 254, 252)
    doc.rect(marge, y, breedte, hoogte, 'F')
    doc.setDrawColor(...grijs)
    doc.setLineWidth(0.2)
    doc.rect(marge, y, breedte, hoogte)
    doc.setTextColor(...zwart)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(regels, marge + 3, y + 5.5)
    y += hoogte + 4
  } else {
    y += 12
  }

  // ── Handtekening ──
  if (y > 255) { doc.addPage(); y = 20 }
  y += 10
  doc.setDrawColor(...grijs)
  doc.setLineWidth(0.4)
  doc.line(marge, y + 10, marge + 70, y + 10)
  doc.line(marge + 90, y + 10, marge + 160, y + 10)
  doc.setFontSize(8)
  doc.setTextColor(...grijs)
  doc.text('Ingevuld door', marge, y + 14)
  doc.text(week.ingevuld_door ?? '', marge + 2, y + 8)
  doc.text('Handtekening', marge + 90, y + 14)

  // Footer
  doc.setFillColor(245, 247, 245)
  doc.rect(0, 284, 210, 13, 'F')
  doc.setFontSize(7)
  doc.setTextColor(...grijs)
  doc.text(`De Theepot — Brandoefening evaluatie — Week ${week.week_nummer}, ${week.jaar}`, marge, 291)
  doc.text(new Date().toLocaleDateString('nl-NL'), 210 - marge, 291, { align: 'right' })

  doc.save(`Brandoefening_Week${week.week_nummer}_${week.jaar}_${week.locatie_naam}.pdf`)
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function BrandoefeningPage() {
  const { profiel, isSuperadmin } = useAuth()

  const [locaties, setLocaties] = useState<string[]>([])
  const [actieveLocatie, setActieveLocatie] = useState<string>('')
  const [weken, setWeken] = useState<BrandoefeningWeek[]>([])
  const [actieveWeek, setActieveWeek] = useState<BrandoefeningWeek | null>(null)
  const [laden, setLaden] = useState(true)
  const [nieuwWeekModal, setNieuwWeekModal] = useState(false)
  const [bewerkModal, setBewerkModal] = useState<BrandoefeningWeek | null>(null)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  // ── Locaties ────────────────────────────────────────────────────────────────
  useEffect(() => {
    getSupabase().from('kasboek_locaties').select('naam').eq('actief', true).order('naam')
      .then(({ data }) => {
        const namen = (data ?? []).map((l: { naam: string }) => l.naam)
        setLocaties(namen)
        if (namen.length > 0) setActieveLocatie(namen[0])
      })
  }, [])

  // ── Weken ophalen ────────────────────────────────────────────────────────────
  const haalWekenOp = useCallback(async () => {
    if (!actieveLocatie) return
    setLaden(true)
    const { data } = await getSupabase()
      .from('brandoefening_weken')
      .select('*')
      .eq('locatie_naam', actieveLocatie)
      .order('jaar', { ascending: false })
      .order('week_nummer', { ascending: false })
    setWeken((data ?? []) as BrandoefeningWeek[])
    setLaden(false)
  }, [actieveLocatie])

  useEffect(() => { haalWekenOp() }, [haalWekenOp])

  // ── Nieuwe week aanmaken ──────────────────────────────────────────────────────
  async function maakWeek(weekNummer: number, jaar: number) {
    const { data, error } = await getSupabase().from('brandoefening_weken').insert({
      week_nummer: weekNummer,
      jaar,
      locatie_naam: actieveLocatie,
      aangemaakt_door: profiel?.id,
      aard_incident: [],
      gealarmeerden: [],
    }).select().single()
    if (error) { setToast({ bericht: 'Mislukt: ' + error.message, type: 'error' }); return }
    setNieuwWeekModal(false)
    setToast({ bericht: `Week ${weekNummer} aangemaakt!`, type: 'success' })
    await haalWekenOp()
    setBewerkModal(data as BrandoefeningWeek)
  }

  // ── Verwijderen ─────────────────────────────────────────────────────────────
  async function verwijder(id: string) {
    if (!confirm('Week verwijderen?')) return
    await getSupabase().from('brandoefening_weken').delete().eq('id', id)
    setActieveWeek(null)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    await haalWekenOp()
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        titel="Brandoefening"
        subtitel={actieveLocatie}
        acties={
          <div style={{ display: 'flex', gap: 8 }}>
            {actieveWeek && (
              <button className="btn" onClick={() => exportPDF(actieveWeek)}>
                <Download size={14} /> PDF
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setNieuwWeekModal(true)}>
              <Plus size={14} /> Week toevoegen
            </button>
          </div>
        }
      />

      <div className="page-content">

        {/* Locatie tabs */}
        {locaties.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            {locaties.map(loc => (
              <button key={loc} onClick={() => { setActieveLocatie(loc); setActieveWeek(null) }}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s', borderColor: actieveLocatie === loc ? 'var(--primary)' : 'var(--border-dark)', background: actieveLocatie === loc ? 'var(--primary)' : 'var(--bg-card)', color: actieveLocatie === loc ? '#fff' : 'var(--text)' }}>
                {loc}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>

          {/* Linker paneel: weken lijst */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Oefenweken
            </div>
            {laden ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Laden...</div>
            ) : weken.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                <Flame size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
                <div>Nog geen weken</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Voeg week 18 en 36 toe</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {weken.map(w => {
                  const isActief = actieveWeek?.id === w.id
                  const isIngevuld = !!(w.datum && w.evaluatie)
                  return (
                    <div
                      key={w.id}
                      onClick={() => setActieveWeek(w)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderRadius: 10, cursor: 'pointer', transition: 'all 0.12s',
                        background: isActief ? 'var(--primary-light)' : 'var(--bg-card)',
                        border: `1px solid ${isActief ? 'var(--border-dark)' : 'var(--border)'}`,
                        borderLeft: `4px solid ${isActief ? 'var(--primary)' : isIngevuld ? 'var(--success)' : 'var(--border-dark)'}`,
                      }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 9, background: isActief ? 'var(--primary)' : 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: isActief ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>WEEK</div>
                        <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Sora, sans-serif', color: isActief ? '#fff' : 'var(--text)', lineHeight: 1 }}>{w.week_nummer}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{w.jaar}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {w.datum ? fmtDatum(w.datum) : 'Datum nog in te vullen'}
                        </div>
                      </div>
                      {isIngevuld && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} title="Volledig ingevuld" />}
                      <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Rechter paneel: formulier detail */}
          <div>
            {!actieveWeek ? (
              <div className="empty-state" style={{ padding: 60 }}>
                <Flame size={36} />
                <h3>Selecteer een week</h3>
                <p>Klik op een oefenweek om het formulier te bekijken en in te vullen.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>
                      Brandoefening — Week {actieveWeek.week_nummer}, {actieveWeek.jaar}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{actieveWeek.locatie_naam}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => setBewerkModal(actieveWeek)}>
                      <Pencil size={14} /> Invullen / Bewerken
                    </button>
                    <button className="btn" onClick={() => exportPDF(actieveWeek)}>
                      <Download size={14} /> PDF
                    </button>
                    <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(actieveWeek.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Formulier weergave */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Gegevens */}
                  <div className="card">
                    <div style={{ padding: '10px 16px', background: 'var(--primary-light)', borderRadius: '12px 12px 0 0', fontWeight: 700, fontSize: 13, color: 'var(--primary-text)', borderBottom: '1px solid var(--border-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Flame size={14} /> Gegevens oefening
                    </div>
                    <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Datum', waarde: fmtDatum(actieveWeek.datum) },
                        { label: 'Tijd', waarde: actieveWeek.tijd ?? '—' },
                        { label: 'Locatie', waarde: actieveWeek.locatie_naam },
                        { label: 'Ingevuld door', waarde: actieveWeek.ingevuld_door ?? '—' },
                      ].map(v => (
                        <div key={v.label}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{v.label}</div>
                          <div style={{ fontSize: 13, color: 'var(--text)' }}>{v.waarde}</div>
                        </div>
                      ))}
                      <div style={{ gridColumn: '1/-1' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Aanwezige PM-ers</div>
                        <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{actieveWeek.aanwezige_pmers ?? '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Aard incident */}
                  <div className="card">
                    <div style={{ padding: '10px 16px', background: 'var(--primary-light)', fontWeight: 700, fontSize: 13, color: 'var(--primary-text)', borderBottom: '1px solid var(--border-dark)' }}>
                      Aard incident
                    </div>
                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {AARD_OPTIES.map(opt => (
                          <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid', borderColor: (actieveWeek.aard_incident ?? []).includes(opt) ? 'var(--primary)' : 'var(--border-dark)', background: (actieveWeek.aard_incident ?? []).includes(opt) ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {(actieveWeek.aard_incident ?? []).includes(opt) && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                            </div>
                            {opt}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Plek van incident</div>
                        <div style={{ fontSize: 13, color: 'var(--text)' }}>{actieveWeek.plek_incident ?? '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Alarmeren */}
                  <div className="card">
                    <div style={{ padding: '10px 16px', background: 'var(--primary-light)', fontWeight: 700, fontSize: 13, color: 'var(--primary-text)', borderBottom: '1px solid var(--border-dark)' }}>
                      Alarmeren
                    </div>
                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {ALARM_OPTIES.map(opt => (
                          <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid', borderColor: (actieveWeek.gealarmeerden ?? []).includes(opt) ? 'var(--primary)' : 'var(--border-dark)', background: (actieveWeek.gealarmeerden ?? []).includes(opt) ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {(actieveWeek.gealarmeerden ?? []).includes(opt) && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                            </div>
                            {opt}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Manier van alarmeren</div>
                        <div style={{ fontSize: 13, color: 'var(--text)' }}>{actieveWeek.manier_alarmeren ?? '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bijzonderheden & Evaluatie */}
                  {[
                    { label: 'Bijzonderheden', waarde: actieveWeek.bijzonderheden },
                    { label: 'Evaluatie', waarde: actieveWeek.evaluatie },
                  ].map(v => (
                    <div key={v.label} className="card">
                      <div style={{ padding: '10px 16px', background: 'var(--primary-light)', fontWeight: 700, fontSize: 13, color: 'var(--primary-text)', borderBottom: '1px solid var(--border-dark)' }}>
                        {v.label}
                      </div>
                      <div style={{ padding: '14px 18px', fontSize: 13, color: v.waarde ? 'var(--text)' : 'var(--text-muted)', fontStyle: v.waarde ? 'normal' : 'italic', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {v.waarde ?? 'Nog niet ingevuld'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Nieuw week modal */}
      {nieuwWeekModal && (
        <NieuwWeekModal
          onSave={maakWeek}
          onClose={() => setNieuwWeekModal(false)}
          bestaandeWeken={weken.map(w => ({ week: w.week_nummer, jaar: w.jaar }))}
        />
      )}

      {/* Bewerk / invul modal */}
      {bewerkModal && (
        <InvulModal
          week={bewerkModal}
          onSave={async (data) => {
            await getSupabase().from('brandoefening_weken').update(data).eq('id', bewerkModal.id)
            setBewerkModal(null)
            setToast({ bericht: 'Opgeslagen!', type: 'success' })
            await haalWekenOp()
            // Update actieve week
            const { data: vers } = await getSupabase().from('brandoefening_weken').select('*').eq('id', bewerkModal.id).single()
            if (vers) setActieveWeek(vers as BrandoefeningWeek)
          }}
          onClose={() => setBewerkModal(null)}
        />
      )}

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
            <div>
              <label className="form-label">Weeknummer</label>
              <input className="form-input" type="number" min="1" max="52" value={weekNummer} onChange={e => setWeekNummer(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Jaar</label>
              <input className="form-input" type="number" value={jaar} onChange={e => setJaar(e.target.value)} />
            </div>
          </div>
          {bestaat && (
            <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 7 }}>
              Week {weekNummer} van {jaar} bestaat al voor deze locatie.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => onSave(parseInt(weekNummer), parseInt(jaar))} disabled={bestaat || !weekNummer || !jaar}>
              Aanmaken
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Invul Modal ──────────────────────────────────────────────────────────────

function InvulModal({ week, onSave, onClose }: {
  week: BrandoefeningWeek
  onSave: (data: Partial<BrandoefeningWeek>) => void
  onClose: () => void
}) {
  const [datum, setDatum] = useState(week.datum ?? '')
  const [tijd, setTijd] = useState(week.tijd ?? '')
  const [pmers, setPmers] = useState(week.aanwezige_pmers ?? '')
  const [aardIncident, setAardIncident] = useState<string[]>(week.aard_incident ?? [])
  const [plekIncident, setPlekIncident] = useState(week.plek_incident ?? '')
  const [gealarmeerden, setGealarmeerden] = useState<string[]>(week.gealarmeerden ?? [])
  const [manierAlarmeren, setManierAlarmeren] = useState(week.manier_alarmeren ?? '')
  const [bijzonderheden, setBijzonderheden] = useState(week.bijzonderheden ?? '')
  const [evaluatie, setEvaluatie] = useState(week.evaluatie ?? '')
  const [ingevuldDoor, setIngevuldDoor] = useState(week.ingevuld_door ?? '')

  function toggleArray(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, padding: '6px 0' }}>
        <div onClick={onChange} style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? 'var(--primary)' : 'var(--border-dark)'}`, background: checked ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.12s' }}>
          {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
        </div>
        {label}
      </label>
    )
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Invullen — Week {week.week_nummer}, {week.jaar}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '75vh', overflowY: 'auto' }}>

          {/* Gegevens */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-text)', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 8, marginBottom: 10 }}>🔥 Gegevens oefening</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="form-label">Datum</label><input type="date" className="form-input" value={datum} onChange={e => setDatum(e.target.value)} /></div>
              <div><label className="form-label">Tijd</label><input className="form-input" value={tijd} onChange={e => setTijd(e.target.value)} placeholder="Bijv. 14:30" /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="form-label">Aanwezige PM-ers</label>
              <textarea className="form-textarea" style={{ minHeight: 70 }} value={pmers} onChange={e => setPmers(e.target.value)} placeholder="Namen van aanwezige PM-ers..." />
            </div>
          </div>

          {/* Aard incident */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-text)', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 8, marginBottom: 10 }}>🚨 Aard incident</div>
            {AARD_OPTIES.map(opt => (
              <Checkbox key={opt} label={opt} checked={aardIncident.includes(opt)} onChange={() => toggleArray(aardIncident, setAardIncident, opt)} />
            ))}
            <div style={{ marginTop: 10 }}>
              <label className="form-label">Plek van incident</label>
              <input className="form-input" value={plekIncident} onChange={e => setPlekIncident(e.target.value)} placeholder="Bijv. De Blauwe keuken" />
            </div>
          </div>

          {/* Alarmeren */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-text)', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 8, marginBottom: 10 }}>📢 Alarmeren</div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Wie is/zijn er in eerste instantie gewaarschuwd?</div>
              {ALARM_OPTIES.map(opt => (
                <Checkbox key={opt} label={opt} checked={gealarmeerden.includes(opt)} onChange={() => toggleArray(gealarmeerden, setGealarmeerden, opt)} />
              ))}
            </div>
            <div>
              <label className="form-label">Manier van alarmeren</label>
              <input className="form-input" value={manierAlarmeren} onChange={e => setManierAlarmeren(e.target.value)} placeholder="Hoe werd er gealarmeerd?" />
            </div>
          </div>

          {/* Bijzonderheden */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-text)', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 8, marginBottom: 10 }}>📝 Bijzonderheden</div>
            <textarea className="form-textarea" style={{ minHeight: 80 }} value={bijzonderheden} onChange={e => setBijzonderheden(e.target.value)} placeholder="Bijzonderheden tijdens de oefening..." />
          </div>

          {/* Evaluatie */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-text)', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 8, marginBottom: 10 }}>📊 Evaluatie</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Vermeld welke zaken verbetering behoeven, wie dat gaat doen en wanneer dit moet zijn uitgevoerd.</div>
            <textarea className="form-textarea" style={{ minHeight: 100 }} value={evaluatie} onChange={e => setEvaluatie(e.target.value)} placeholder="Evaluatie van de oefening..." />
          </div>

          {/* Ingevuld door */}
          <div>
            <label className="form-label">Ingevuld door</label>
            <input className="form-input" value={ingevuldDoor} onChange={e => setIngevuldDoor(e.target.value)} placeholder="Naam invuller" />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => onSave({
              datum: datum || null, tijd: tijd || null, aanwezige_pmers: pmers || null,
              aard_incident: aardIncident, plek_incident: plekIncident || null,
              gealarmeerden, manier_alarmeren: manierAlarmeren || null,
              bijzonderheden: bijzonderheden || null, evaluatie: evaluatie || null,
              ingevuld_door: ingevuldDoor || null,
            })}>
              Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
