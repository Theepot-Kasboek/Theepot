'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, Trash2, Download, Pencil,
  ChevronUp, ChevronDown, ArrowLeft,
  GripVertical, FileText, Newspaper
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Format = 'weekmemo' | 'theepraatje'

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
  format: Format
  secties: Sectie[]
  aangemaakt_op: string
}

// ─── Secties per format ───────────────────────────────────────────────────────

const WEEKMEMO_SECTIES = [
  'Persoonlijk woordje',
  'Vanuit de Directie',
  'PP-er en stage info',
  'Locatie info',
  'Beleid info',
  'Ouder en/of Kind info',
  'Pedagogische info',
  'Rooster info',
  'Agenda Leidinggevende',
]

const THEEPRAATJE_SECTIES = [
  'Redactioneel',
  'Organisatie nieuws',
  'Activiteiten & programma',
  'Ouderinformatie',
  'Medewerkers',
  'Agenda & data',
]

function nieuwId() { return Math.random().toString(36).slice(2) }
function maakSecties(format: Format): Sectie[] {
  const titels = format === 'weekmemo' ? WEEKMEMO_SECTIES : THEEPRAATJE_SECTIES
  return titels.map(t => ({ id: nieuwId(), titel: t, inhoud: '' }))
}
function fmtDatum(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}


// ─── Logo (ingebakken) ────────────────────────────────────────────────────────
const LOGO_B64 = "data:image/jpeg;base64,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"

// ─── PDF Export Weekmemo ──────────────────────────────────────────────────────

async function exportWeekmemoPDF(brief: Nieuwsbrief) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const groen: [number, number, number] = [140, 198, 63]
  const donkerGroen: [number, number, number] = [61, 107, 26]
  const wit: [number, number, number] = [255, 255, 255]
  const zwart: [number, number, number] = [30, 30, 30]
  const grijs: [number, number, number] = [150, 150, 150]
  const marge = 15
  const breedte = 210 - marge * 2
  const regelHoogte = 5.4
  let y = 0

  // Helper: bullet-aware tekstverwerking
  function verwerkTekst(tekst: string, maxBreedte: number): { regel: string; isBullet: boolean }[] {
    const resultaat: { regel: string; isBullet: boolean }[] = []
    for (const invoer of tekst.split('\n')) {
      const getrimd = invoer.trim()
      const isBullet = /^[●•\*\-–]\s/.test(getrimd)
      const schoon = isBullet ? getrimd.replace(/^[●•\*\-–]\s*/, '') : getrimd
      if (!schoon) { resultaat.push({ regel: '', isBullet: false }); continue }
      const gesplitst = doc.splitTextToSize(schoon, isBullet ? maxBreedte - 6 : maxBreedte)
      gesplitst.forEach((r: string, i: number) => resultaat.push({ regel: r, isBullet: isBullet && i === 0 }))
    }
    return resultaat
  }

  function berekenHoogte(tekst: string, maxBreedte: number): number {
    return verwerkTekst(tekst, maxBreedte).reduce((h, { regel }) => h + (regel ? regelHoogte : regelHoogte * 0.5), 0)
  }

  function tekenInhoud(tekst: string, x: number, startY: number, maxBreedte: number): number {
    let curY = startY
    for (const { regel, isBullet } of verwerkTekst(tekst, maxBreedte)) {
      if (!regel) { curY += regelHoogte * 0.5; continue }
      if (isBullet) {
        doc.setFillColor(...groen)
        doc.circle(x + 2, curY - 1.2, 1.2, 'F')
        doc.text(regel, x + 6, curY, { align: 'left' })
      } else {
        doc.text(regel, x, curY, { align: 'left' })
      }
      curY += regelHoogte
    }
    return curY
  }

  // Header
  doc.setFillColor(...groen)
  doc.rect(0, 0, 210, 32, 'F')
  try { doc.addImage(LOGO_B64, 'JPEG', 210 - marge - 24, 4, 24, 24) } catch {}
  doc.setTextColor(...wit)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('WEEKMEMO', marge, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const meta = [brief.locatie_naam, brief.nummer ? `Week ${brief.nummer}` : null, fmtDatum(brief.datum)].filter(Boolean).join('  •  ')
  doc.text(meta, marge, 22)
  doc.setFillColor(...donkerGroen)
  doc.rect(0, 32, 210, 2.5, 'F')
  y = 41

  // Secties
  for (const sectie of brief.secties.filter(s => s.inhoud.trim())) {
    const inhoudhoogte = berekenHoogte(sectie.inhoud.trim(), breedte - 8)
    if (y + inhoudhoogte + 18 > 272) { doc.addPage(); y = 16 }

    // Sectietitel
    doc.setFillColor(...groen)
    doc.rect(marge, y, breedte, 8.5, 'F')
    doc.setTextColor(...wit)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(sectie.titel, marge + 4, y + 5.8)
    y += 11

    // Inhoud
    doc.setTextColor(...zwart)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    const eindY = tekenInhoud(sectie.inhoud.trim(), marge + 4, y + 4.5, breedte - 8)
    y = eindY + 8
  }

  // Footer
  const n = doc.getNumberOfPages()
  for (let p = 1; p <= n; p++) {
    doc.setPage(p)
    doc.setFillColor(245, 247, 245)
    doc.rect(0, 284, 210, 13, 'F')
    doc.setFontSize(7.5)
    doc.setTextColor(...grijs)
    doc.text(`De Theepot — Weekmemo${brief.locatie_naam ? ' ' + brief.locatie_naam : ''}`, marge, 291)
    doc.text(`${p} / ${n}`, 210 - marge, 291, { align: 'right' })
  }

  doc.save(`Weekmemo_${brief.locatie_naam ?? ''}_${brief.datum}.pdf`)
}

// ─── PDF Export Theepraatje ───────────────────────────────────────────────────

async function exportTheepraatjePDF(brief: Nieuwsbrief) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Kleuren
  const GROEN:    [number,number,number] = [140, 198,  63]
  const DK_GROEN: [number,number,number] = [ 61, 107,  26]
  const WIT:      [number,number,number] = [255, 255, 255]
  const ZWART:    [number,number,number] = [ 30,  30,  30]
  const ORANJE:   [number,number,number] = [255, 140,   0]
  const PAARS:    [number,number,number] = [138,  43, 226]
  const ROZE:     [number,number,number] = [220,  53,  69]
  const TEAL:     [number,number,number] = [  0, 150, 136]

  const ACCENTEN: [number,number,number][] = [GROEN, ORANJE, PAARS, ROZE, DK_GROEN, TEAL]

  const PW = 210
  const PH = 297
  const M  = 12          // pagina marge
  const GAP = 5          // gap tussen kolommen
  const KW = (PW - M * 2 - GAP) / 2   // kolombreedte ~86.5mm
  const FOOTER_H = 14
  const HEADER_H = 52    // hoogte van de header op pagina 1
  const RH = 5.0         // regelHoogte in mm
  const FS = 9           // fontsize inhoud
  const TITEL_H = 10     // hoogte titelblok per sectie
  const PADDING = 5      // interne padding sectie

  // Bereken hoe breed de tekst in een sectie mag zijn
  const TEKST_W = KW - PADDING * 2 - 4  // ruimte voor bullet offset

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // Splits tekst in regels, bullet-bewust
  function splitRegel(tekst: string, breedte: number): { t: string; bullet: boolean }[] {
    const uit: { t: string; bullet: boolean }[] = []
    for (const rij of tekst.split('\n')) {
      const r = rij.trim()
      const isBullet = /^[●•*\-–]\s/.test(r)
      const schoon = isBullet ? r.replace(/^[●•*\-–]\s*/, '').trim() : r
      if (!schoon) { uit.push({ t: '', bullet: false }); continue }
      const w = isBullet ? breedte - 5 : breedte
      const gesplitst: string[] = doc.splitTextToSize(schoon, w)
      gesplitst.forEach((s: string, i: number) => uit.push({ t: s, bullet: isBullet && i === 0 }))
    }
    return uit
  }

  // Bereken benodigde hoogte voor tekst
  function tekstHoogte(tekst: string): number {
    return splitRegel(tekst, TEKST_W).reduce((h, r) => h + (r.t ? RH : RH * 0.35), 0)
  }

  // Teken tekst, return eindY
  function tekenTekst(tekst: string, x: number, y: number, kleur: [number,number,number]): number {
    doc.setTextColor(...ZWART)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(FS)
    for (const { t, bullet } of splitRegel(tekst, TEKST_W)) {
      if (!t) { y += RH * 0.35; continue }
      if (bullet) {
        doc.setFillColor(...kleur)
        doc.circle(x + 1.5, y - 1.0, 1.0, 'F')
        doc.text(t, x + 4.5, y, { align: 'left' })
      } else {
        doc.text(t, x, y, { align: 'left' })
      }
      y += RH
    }
    return y
  }

  // Teken één sectiekaart — hoogte is exact berekend
  function tekenSectie(s: Sectie, x: number, y: number, kleur: [number,number,number]): number {
    const inh = s.inhoud.trim()
    const inhH = tekstHoogte(inh)
    const totH = TITEL_H + PADDING + inhH + PADDING

    // Kaart achtergrond
    doc.setFillColor(251, 253, 251)
    doc.roundedRect(x, y, KW, totH, 2.5, 2.5, 'F')

    // Linkerbalk accent
    doc.setFillColor(...kleur)
    doc.roundedRect(x, y, 3, totH, 1.5, 1.5, 'F')

    // Rand
    doc.setDrawColor(218, 232, 208)
    doc.setLineWidth(0.25)
    doc.roundedRect(x, y, KW, totH, 2.5, 2.5, 'S')

    // Titelblok
    doc.setFillColor(...kleur)
    doc.roundedRect(x + 4, y + 2, KW - 8, TITEL_H - 2, 2, 2, 'F')
    doc.setTextColor(...WIT)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(s.titel.toUpperCase(), x + 7, y + TITEL_H - 2.5, { align: 'left' })

    // Inhoud tekst
    tekenTekst(inh, x + PADDING + 2, y + TITEL_H + PADDING, kleur)

    return totH  // return hoogte, niet eindY
  }

  // ── Header pagina 1 ───────────────────────────────────────────────────────────
  doc.setFillColor(...GROEN)
  doc.rect(0, 0, PW, HEADER_H - 4, 'F')
  doc.setFillColor(...DK_GROEN)
  doc.rect(0, HEADER_H - 4, PW, 4, 'F')

  try { doc.addImage(LOGO_B64, 'JPEG', M, 8, 28, 28) } catch {}

  doc.setTextColor(...WIT)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('Theepraatje', M + 34, 25)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const sub = [
    brief.nummer ? `Nr. ${brief.nummer}` : null,
    fmtDatum(brief.datum),
    brief.locatie_naam,
  ].filter(Boolean).join('  •  ')
  doc.text(sub, M + 34, 35)

  // ── Twee-koloms layout — vul pagina vol voor nieuwe pagina ────────────────────
  const secties = brief.secties.filter(s => s.inhoud.trim())
  const xL = M
  const xR = M + KW + GAP

  let yL = HEADER_H + 4   // linker kolomhoogte
  let yR = HEADER_H + 4   // rechter kolomhoogte
  let huidigePagina = 1

  const BESCHIKBAAR_P1 = PH - HEADER_H - 4 - FOOTER_H - 6
  const BESCHIKBAAR    = PH - 16 - FOOTER_H - 6  // pagina 2+

  for (let i = 0; i < secties.length; i++) {
    const s = secties[i]
    const kleur = ACCENTEN[i % ACCENTEN.length]
    const inh = s.inhoud.trim()
    const sH = tekstHoogte(inh) + TITEL_H + PADDING * 2 + 4  // totale hoogte + gap

    // Bepaal welke kolom als volgende gebruikt wordt
    // Vul linker kolom tot hij vol is, dan rechter, dan nieuwe pagina
    const beschikbaar = huidigePagina === 1 ? BESCHIKBAAR_P1 : BESCHIKBAAR
    const topVanPagina = huidigePagina === 1 ? HEADER_H + 4 : 14

    if (yL <= yR) {
      // Linker kolom is minder hoog (of gelijk) — probeer links
      const gebruiktL = yL - topVanPagina
      if (gebruiktL + sH <= beschikbaar) {
        // Pas in linker kolom
        tekenSectie(s, xL, yL, kleur)
        yL += sH
      } else {
        // Past niet links — probeer rechts op zelfde pagina
        const gebruiktR = yR - topVanPagina
        if (gebruiktR + sH <= beschikbaar) {
          tekenSectie(s, xR, yR, kleur)
          yR += sH
        } else {
          // Nieuwe pagina
          doc.addPage()
          huidigePagina++
          yL = 14; yR = 14
          tekenSectie(s, xL, yL, kleur)
          yL += sH
        }
      }
    } else {
      // Rechter kolom is lager — probeer rechts
      const gebruiktR = yR - topVanPagina
      if (gebruiktR + sH <= beschikbaar) {
        tekenSectie(s, xR, yR, kleur)
        yR += sH
      } else {
        // Past niet rechts — probeer links
        const gebruiktL = yL - topVanPagina
        if (gebruiktL + sH <= beschikbaar) {
          tekenSectie(s, xL, yL, kleur)
          yL += sH
        } else {
          // Nieuwe pagina
          doc.addPage()
          huidigePagina++
          yL = 14; yR = 14
          tekenSectie(s, xL, yL, kleur)
          yL += sH
        }
      }
    }
  }

  // ── Footer op alle pagina's ───────────────────────────────────────────────────
  const n = doc.getNumberOfPages()
  for (let p = 1; p <= n; p++) {
    doc.setPage(p)
    doc.setFillColor(...GROEN)
    doc.rect(0, PH - FOOTER_H, PW, FOOTER_H, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...WIT)
    doc.text('De Theepot — Kinderopvang', M, PH - 5)
    if (brief.locatie_naam) doc.text(brief.locatie_naam, PW / 2, PH - 5, { align: 'center' })
    doc.text(`${p} / ${n}`, PW - M, PH - 5, { align: 'right' })
  }

  doc.save(`Theepraatje_Nr${brief.nummer ?? ''}_${brief.datum}.pdf`)
}

async function exportPDF(brief: Nieuwsbrief) {
  if (brief.format === 'weekmemo') await exportWeekmemoPDF(brief)
  else await exportTheepraatjePDF(brief)
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
  const [editorFormat, setEditorFormat] = useState<Format>('weekmemo')
  const [editorSecties, setEditorSecties] = useState<Sectie[]>([])
  const [actieveSectie, setActieveSectie] = useState<string | null>(null)
  const [nieuwSectieNaam, setNieuwSectieNaam] = useState('')

  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data } = await getSupabase().from('nieuwsbrieven').select('*').order('aangemaakt_op', { ascending: false })
    setNieuwsbrieven((data ?? []) as Nieuwsbrief[])
    setLaden(false)
  }, [])

  useEffect(() => { haalOp() }, [haalOp])

  function nieuwAanmaken(format: Format) {
    setEditorTitel(format === 'weekmemo' ? 'Weekmemo' : 'Theepraatje')
    setEditorNummer('')
    setEditorLocatie('')
    setEditorDatum(new Date().toISOString().split('T')[0])
    setEditorFormat(format)
    setEditorSecties(maakSecties(format))
    setActieve(null)
    setActieveSectie(null)
    setBewerkModus(true)
  }

  function openBewerken(brief: Nieuwsbrief) {
    setEditorTitel(brief.titel)
    setEditorNummer(brief.nummer ?? '')
    setEditorLocatie(brief.locatie_naam ?? '')
    setEditorDatum(brief.datum)
    setEditorFormat(brief.format ?? 'weekmemo')
    setEditorSecties(brief.secties)
    setActieve(brief)
    setActieveSectie(null)
    setBewerkModus(true)
  }

  async function slaOp() {
    if (!editorTitel.trim()) return
    setOpslaan(true)
    const supabase = getSupabase()
    const data = {
      titel: editorTitel.trim(), nummer: editorNummer.trim() || null,
      locatie_naam: editorLocatie.trim() || null, datum: editorDatum,
      format: editorFormat, secties: editorSecties,
      aangemaakt_door: profiel?.id, bijgewerkt_op: new Date().toISOString(),
    }
    if (actieve) {
      await supabase.from('nieuwsbrieven').update(data).eq('id', actieve.id)
      setToast({ bericht: 'Opgeslagen!', type: 'success' })
    } else {
      const { data: nieuw } = await supabase.from('nieuwsbrieven').insert(data).select().single()
      if (nieuw) setActieve(nieuw as Nieuwsbrief)
      setToast({ bericht: 'Aangemaakt!', type: 'success' })
    }
    setOpslaan(false)
    await haalOp()
  }

  async function verwijder(id: string) {
    if (!confirm('Nieuwsbrief verwijderen?')) return
    await getSupabase().from('nieuwsbrieven').delete().eq('id', id)
    setBewerkModus(false); setActieve(null)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    await haalOp()
  }

  function verwijderSectie(id: string) {
    setEditorSecties(prev => prev.filter(s => s.id !== id))
    if (actieveSectie === id) setActieveSectie(null)
  }

  function verplaatsSectie(id: string, r: 'up' | 'down') {
    setEditorSecties(prev => {
      const idx = prev.findIndex(s => s.id === id)
      const nieuw = [...prev]
      const swap = r === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= nieuw.length) return prev
      ;[nieuw[idx], nieuw[swap]] = [nieuw[swap], nieuw[idx]]
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

  if (!magZien) return (
    <>
      <Topbar titel="Nieuwsbrieven" subtitel="Geen toegang" />
      <div className="page-content"><div className="empty-state"><FileText size={36} /><h3>Geen toegang</h3></div></div>
    </>
  )

  // ── Editor ──────────────────────────────────────────────────────────────────
  if (bewerkModus) {
    const huidigeBrief = actieve ? { ...actieve, titel: editorTitel, nummer: editorNummer || null, locatie_naam: editorLocatie || null, datum: editorDatum, format: editorFormat, secties: editorSecties } : null

    return (
      <>
        <Topbar
          titel={editorFormat === 'weekmemo' ? 'Weekmemo' : 'Theepraatje'}
          acties={
            <div style={{ display: 'flex', gap: 8 }}>
              {actieve && <button className="btn" onClick={() => exportPDF({ ...actieve, titel: editorTitel, nummer: editorNummer || null, locatie_naam: editorLocatie || null, datum: editorDatum, format: editorFormat, secties: editorSecties })}><Download size={14} /> PDF</button>}
              <button className="btn btn-primary" onClick={slaOp} disabled={opslaan || !editorTitel.trim()}>{opslaan ? 'Opslaan...' : 'Opslaan'}</button>
              <button className="btn" onClick={() => { setBewerkModus(false); setActieve(null) }}><ArrowLeft size={14} /> Terug</button>
            </div>
          }
        />

        <div className="page-content" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>

          {/* Links: instellingen + secties */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Format wisselaar */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditorFormat('weekmemo')} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: editorFormat === 'weekmemo' ? 'var(--primary-xlight)' : 'var(--bg)', border: `1.5px solid ${editorFormat === 'weekmemo' ? 'var(--primary)' : 'var(--border)'}`, textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: editorFormat === 'weekmemo' ? 'var(--primary-text)' : 'var(--text-muted)' }}>📋 Weekmemo</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Intern voor team</div>
              </button>
              <button onClick={() => setEditorFormat('theepraatje')} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: editorFormat === 'theepraatje' ? 'var(--primary-xlight)' : 'var(--bg)', border: `1.5px solid ${editorFormat === 'theepraatje' ? 'var(--primary)' : 'var(--border)'}`, textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: editorFormat === 'theepraatje' ? 'var(--primary-text)' : 'var(--text-muted)' }}>📰 Theepraatje</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Voor ouders</div>
              </button>
            </div>

            {/* Meta */}
            <div className="card">
              <div className="card-header"><span className="card-title">Instellingen</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><label className="form-label">Titel</label><input className="form-input" value={editorTitel} onChange={e => setEditorTitel(e.target.value)} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label className="form-label">{editorFormat === 'weekmemo' ? 'Weeknummer' : 'Nummer'}</label><input className="form-input" value={editorNummer} onChange={e => setEditorNummer(e.target.value)} placeholder={editorFormat === 'weekmemo' ? '20' : '119'} /></div>
                  <div><label className="form-label">Datum</label><input type="date" className="form-input" value={editorDatum} onChange={e => setEditorDatum(e.target.value)} /></div>
                </div>
                <div><label className="form-label">Locatie (optioneel)</label><input className="form-input" value={editorLocatie} onChange={e => setEditorLocatie(e.target.value)} placeholder="Bijv. Lisse" /></div>
              </div>
            </div>

            {/* Secties */}
            <div className="card">
              <div className="card-header"><span className="card-title">Secties</span></div>
              <div style={{ padding: '6px 0' }}>
                {editorSecties.map((s, idx) => (
                  <div key={s.id} onClick={() => setActieveSectie(s.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', cursor: 'pointer', background: actieveSectie === s.id ? 'var(--primary-xlight)' : 'transparent', borderLeft: actieveSectie === s.id ? '3px solid var(--primary)' : '3px solid transparent' }}>
                    <GripVertical size={12} color="var(--border-dark)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: actieveSectie === s.id ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{s.titel}</span>
                    {s.inhoud.trim() && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
                    <button onClick={e => { e.stopPropagation(); verplaatsSectie(s.id, 'up') }} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: idx === 0 ? 0.2 : 0.6, padding: '1px 2px', display: 'flex' }}><ChevronUp size={11} /></button>
                    <button onClick={e => { e.stopPropagation(); verplaatsSectie(s.id, 'down') }} disabled={idx === editorSecties.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: idx === editorSecties.length - 1 ? 0.2 : 0.6, padding: '1px 2px', display: 'flex' }}><ChevronDown size={11} /></button>
                    <button onClick={e => { e.stopPropagation(); verwijderSectie(s.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.4, padding: '1px 2px', display: 'flex' }}><X size={11} /></button>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
                <input className="form-input" style={{ flex: 1, fontSize: 12, padding: '5px 9px' }} value={nieuwSectieNaam} onChange={e => setNieuwSectieNaam(e.target.value)} placeholder="Nieuwe sectie..." onKeyDown={e => e.key === 'Enter' && voegSectieToe()} />
                <button className="btn btn-sm" onClick={voegSectieToe} disabled={!nieuwSectieNaam.trim()}><Plus size={12} /></button>
              </div>
            </div>

            {actieve && (
              <button className="btn" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(actieve.id)}>
                <Trash2 size={14} /> Verwijderen
              </button>
            )}
          </div>

          {/* Rechts: editor */}
          <div>
            {!actieveSectie ? (
              <div className="empty-state" style={{ padding: 60 }}><FileText size={32} /><h3>Kies een sectie</h3><p>Klik op een sectie links om te bewerken.</p></div>
            ) : (() => {
              const sectie = editorSecties.find(s => s.id === actieveSectie)
              if (!sectie) return null
              return (
                <div className="card">
                  <div className="card-header">
                    <input value={sectie.titel} onChange={e => updateSectie(sectie.id, 'titel', e.target.value)}
                      style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14, border: 'none', background: 'none', color: 'var(--text)', flex: 1, outline: 'none', padding: '4px 0' }} />
                  </div>
                  <div className="card-body">
                    <textarea value={sectie.inhoud} onChange={e => updateSectie(sectie.id, 'inhoud', e.target.value)}
                      placeholder={`Inhoud voor "${sectie.titel}"...`} autoFocus
                      style={{ width: '100%', minHeight: 380, border: '1px solid var(--border-dark)', borderRadius: 9, padding: '12px 14px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.8, background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none' }}
                      onFocus={e => (e.target.style.borderColor = 'var(--primary)')} onBlur={e => (e.target.style.borderColor = 'var(--border-dark)')} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{sectie.inhoud.length} tekens</div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
      </>
    )
  }

  // ── Overzicht ───────────────────────────────────────────────────────────────
  return (
    <>
      <Topbar
        titel="Nieuwsbrieven"
        subtitel={`${nieuwsbrieven.length} documenten`}
        acties={
          magBewerken ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => nieuwAanmaken('weekmemo')}><Plus size={14} /> Weekmemo</button>
              <button className="btn btn-primary" onClick={() => nieuwAanmaken('theepraatje')}><Plus size={14} /> Theepraatje</button>
            </div>
          ) : undefined
        }
      />

      <div className="page-content">
        {laden ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
        ) : nieuwsbrieven.length === 0 ? (
          <div className="empty-state">
            <FileText size={36} />
            <h3>Geen nieuwsbrieven</h3>
            <p>Maak een Weekmemo of Theepraatje aan.</p>
            {magBewerken && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn" onClick={() => nieuwAanmaken('weekmemo')}><Plus size={14} /> Weekmemo</button>
                <button className="btn btn-primary" onClick={() => nieuwAanmaken('theepraatje')}><Plus size={14} /> Theepraatje</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nieuwsbrieven.map(brief => (
              <div key={brief.id} className="card" onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Format icoon */}
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: brief.format === 'theepraatje' ? 'var(--primary-light)' : 'var(--bg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: brief.format === 'theepraatje' ? 18 : 16 }}>{brief.format === 'theepraatje' ? '📰' : '📋'}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14 }}>{brief.titel}</span>
                      {brief.nummer && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nr. {brief.nummer}</span>}
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: brief.format === 'theepraatje' ? 'var(--primary-light)' : 'var(--bg)', color: brief.format === 'theepraatje' ? 'var(--primary-text)' : 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 500 }}>
                        {brief.format === 'theepraatje' ? 'Theepraatje' : 'Weekmemo'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                      <span>📅 {fmtDatum(brief.datum)}</span>
                      {brief.locatie_naam && <span>📍 {brief.locatie_naam}</span>}
                      <span>📝 {brief.secties.filter(s => s.inhoud.trim()).length}/{brief.secties.length} secties</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => exportPDF(brief)}><Download size={13} /> PDF</button>
                    {magBewerken && <button className="btn btn-sm" onClick={() => openBewerken(brief)}><Pencil size={13} /> Bewerken</button>}
                    {magBewerken && <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(brief.id)}><Trash2 size={13} /></button>}
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
