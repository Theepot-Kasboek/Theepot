'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, Settings, MapPin, Trash2, Check,
  Download, ChevronLeft, ChevronRight, UserPlus,
  Pencil, GripVertical
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Locatie { id: string; naam: string; actief: boolean }
interface StandaardKind { id: string; locatie_id: string; naam: string; bijzonderheden: string | null; dag: Dag; volgorde: number }
interface Week { id: string; locatie_id: string; maand: string; week_start: string }
interface Registratie {
  id: string; week_id: string; dag: Dag; naam: string
  bijzonderheden: string | null; wat_gegeten: string | null
  aanwezig: boolean; is_extra: boolean; volgorde: number
}

type Dag = 'maandag' | 'dinsdag' | 'woensdag' | 'donderdag' | 'vrijdag'
const DAGEN: Dag[] = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']
const DAG_LABEL: Record<Dag, string> = { maandag: 'Maandag', dinsdag: 'Dinsdag', woensdag: 'Woensdag', donderdag: 'Donderdag', vrijdag: 'Vrijdag' }
const DAG_KORT: Record<Dag, string> = { maandag: 'Ma', dinsdag: 'Di', woensdag: 'Wo', donderdag: 'Do', vrijdag: 'Vr' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maandaagVanWeek(d: Date): Date {
  const dag = d.getDay()
  const ma = new Date(d)
  ma.setDate(d.getDate() - (dag === 0 ? 6 : dag - 1))
  ma.setHours(0, 0, 0, 0)
  return ma
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function fmtWeek(weekStart: string): string {
  const ma = new Date(weekStart)
  const vr = new Date(ma); vr.setDate(ma.getDate() + 4)
  return `${ma.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} – ${vr.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

function dagDatum(weekStart: string, dag: Dag): string {
  const ma = new Date(weekStart)
  const idx = DAGEN.indexOf(dag)
  const d = new Date(ma); d.setDate(ma.getDate() + idx)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function maandLabel(weekStart: string): string {
  return new Date(weekStart).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exporteerPDF(
  locatieNaam: string,
  weekStart: string,
  registraties: Registratie[],
  orientatie: 'portrait' | 'landscape' = 'portrait'
) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: orientatie, unit: 'mm', format: 'a4' })

  const groen: [number, number, number] = [140, 198, 63]
  const donkerGroen: [number, number, number] = [61, 107, 26]
  const wit: [number, number, number] = [255, 255, 255]
  const zwart: [number, number, number] = [30, 30, 30]
  const grijs: [number, number, number] = [180, 180, 180]
  const lichtGroen: [number, number, number] = [235, 245, 214]

  const isLandscape = orientatie === 'landscape'
  const paginaBreedte = isLandscape ? 297 : 210
  const paginaHoogte = isLandscape ? 210 : 297
  const marge = 14
  const breedte = paginaBreedte - marge * 2
  let y = 0

  const ma = new Date(weekStart)
  const vr = new Date(ma); vr.setDate(ma.getDate() + 4)
  const weekLabel = `${ma.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} – ${vr.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`

  // Kolom breedtes afhankelijk van orientatie
  const kol = {
    dag:    isLandscape ? 32 : 28,
    naam:   isLandscape ? 54 : 46,
    bijz:   isLandscape ? 54 : 46,
    meeg:   isLandscape ? 22 : 18,
    wat:    isLandscape ? 46 : 38,
    extra:  isLandscape ? 20 : 16,
  }

  // Header
  doc.setFillColor(...groen)
  doc.rect(0, 0, paginaBreedte, 16, 'F')
  doc.setTextColor(...wit)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text('De Theepot — Maaltijdlijst', marge, 10)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date().toLocaleDateString('nl-NL'), paginaBreedte - marge, 10, { align: 'right' })

  // Titel
  y = 26
  doc.setTextColor(...zwart)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Eetlijst — ${locatieNaam}`, marge, y)
  y += 7
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...donkerGroen)
  doc.text(`Maand: ${maandLabel(weekStart)} · Week: ${weekLabel}`, marge, y)
  y += 10

  // Tabelheader
  const kolomX = [
    marge,
    marge + kol.dag,
    marge + kol.dag + kol.naam,
    marge + kol.dag + kol.naam + kol.bijz,
    marge + kol.dag + kol.naam + kol.bijz + kol.meeg,
    marge + kol.dag + kol.naam + kol.bijz + kol.meeg + kol.wat,
  ]

  const rijH = 8.5

  function tekenHeader() {
    doc.setFillColor(...groen)
    doc.rect(marge, y, breedte, rijH, 'F')
    doc.setTextColor(...wit)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    const headers = ['Dag + datum', 'Naam kind', 'Bijzonderheden', 'Meegegeten', 'Wat gegeten?', 'Extra']
    headers.forEach((h, i) => doc.text(h, kolomX[i] + 2, y + 5.5))
    y += rijH
  }

  tekenHeader()

  DAGEN.forEach((dag) => {
    const dagRegs = registraties.filter(r => r.dag === dag).sort((a, b) => a.volgorde - b.volgorde)
    const datum = dagDatum(weekStart, dag)
    const aantalRijen = Math.max(dagRegs.length, 1)
    const blokHoogte = aantalRijen * rijH

    // Nieuwe pagina nodig?
    if (y + blokHoogte > paginaHoogte - 20) {
      doc.addPage()
      y = 20
      tekenHeader()
    }

    const dagY = y

    if (dagRegs.length === 0) {
      // Lege rij
      doc.setFillColor(...lichtGroen)
      doc.rect(marge, y, kol.dag, rijH, 'F')
      doc.setFillColor(252, 252, 252)
      doc.rect(marge + kol.dag, y, breedte - kol.dag, rijH, 'F')
      doc.setDrawColor(...grijs)
      doc.setLineWidth(0.25)
      doc.rect(marge, y, breedte, rijH)

      doc.setTextColor(...donkerGroen)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.text(DAG_LABEL[dag], marge + 2, y + 5.5)

      doc.setTextColor(...grijs)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7.5)
      doc.text(datum, marge + 2, y + 5.5 + 3.5)

      y += rijH
    } else {
      dagRegs.forEach((reg, i) => {
        const rijY = dagY + i * rijH
        const isOneven = i % 2 === 1

        // Dag cel (alleen eerste rij)
        if (i === 0) {
          doc.setFillColor(...lichtGroen)
          doc.rect(marge, dagY, kol.dag, blokHoogte, 'F')
          doc.setDrawColor(...grijs)
          doc.setLineWidth(0.25)
          doc.rect(marge, dagY, kol.dag, blokHoogte)
          doc.setTextColor(...donkerGroen)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7.5)
          doc.text(DAG_LABEL[dag], marge + 2, dagY + 5.5)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
          doc.text(datum, marge + 2, dagY + 10)
        }

        // Inhoud kolommen
        doc.setFillColor(isOneven ? 248 : 255, isOneven ? 250 : 255, isOneven ? 248 : 255)
        doc.rect(marge + kol.dag, rijY, breedte - kol.dag, rijH, 'F')
        doc.setDrawColor(...grijs)
        doc.setLineWidth(0.25)
        // Horizontale lijn
        if (i > 0) doc.line(marge + kol.dag, rijY, marge + breedte, rijY)
        // Verticale lijnen
        ;[kol.dag, kol.dag + kol.naam, kol.dag + kol.naam + kol.bijz, kol.dag + kol.naam + kol.bijz + kol.meeg, kol.dag + kol.naam + kol.bijz + kol.meeg + kol.wat].forEach(x => {
          doc.line(marge + x, rijY, marge + x, rijY + rijH)
        })
        doc.rect(marge, dagY, breedte, blokHoogte)

        // Naam
        doc.setTextColor(reg.aanwezig ? 30 : 150, 30, 30)
        doc.setFont('helvetica', reg.is_extra ? 'italic' : 'normal')
        doc.setFontSize(7.5)
        const naamTekst = (reg.naam + (reg.is_extra ? ' (extra)' : '')).substring(0, 22)
        doc.text(naamTekst, kolomX[1] + 2, rijY + 5.5)

        // Bijzonderheden
        if (reg.bijzonderheden) {
          doc.setTextColor(100, 100, 100)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.text(reg.bijzonderheden.substring(0, 22), kolomX[2] + 2, rijY + 5.5)
        }

        // Meegegeten
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(reg.aanwezig ? 61 : 200, reg.aanwezig ? 107 : 50, reg.aanwezig ? 26 : 50)
        doc.text(reg.aanwezig ? '✓' : '✗', kolomX[3] + kol.meeg / 2 - 2, rijY + 5.8)

        // Wat gegeten
        if (reg.wat_gegeten) {
          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(30, 30, 30)
          doc.text(reg.wat_gegeten.substring(0, 20), kolomX[4] + 2, rijY + 5.5)
        }
      })

      y = dagY + blokHoogte
    }

    // Dikke scheidingslijn tussen dagen
    doc.setFillColor(...groen)
    doc.rect(marge, y, breedte, 2.5, 'F')
    y += 2.5
  })

  // Footer op alle pagina's
  const aantalPaginas = doc.getNumberOfPages()
  for (let p = 1; p <= aantalPaginas; p++) {
    doc.setPage(p)
    doc.setFillColor(245, 247, 245)
    doc.rect(0, paginaHoogte - 12, paginaBreedte, 12, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grijs)
    doc.text(`De Theepot — Maaltijdlijst ${locatieNaam} — ${weekLabel}`, marge, paginaHoogte - 5)
    doc.text(`${p} / ${aantalPaginas}`, paginaBreedte - marge, paginaHoogte - 5, { align: 'right' })
  }

  doc.save(`Maaltijdlijst_${locatieNaam}_${weekStart}.pdf`)
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function MaaltijdlijstPage() {
  const { profiel, isSuperadmin, maaltijdToegang } = useAuth()
  const [toegestaneLocaties, setToegestaneLocaties] = useState<{naam: string; toegang: string}[]>([])

  const [locaties, setLocaties] = useState<Locatie[]>([])
  const [actieveLocatie, setActieveLocatie] = useState<Locatie | null>(null)
  const [week, setWeek] = useState<Week | null>(null)
  const [registraties, setRegistraties] = useState<Registratie[]>([])
  const [standaardKinderen, setStandaardKinderen] = useState<StandaardKind[]>([])
  const [huidigWeekStart, setHuidigWeekStart] = useState(toDateStr(maandaagVanWeek(new Date())))

  const [locatieModal, setLocatieModal] = useState(false)
  const [standaardModal, setStandaardModal] = useState(false)
  const [extraModal, setExtraModal] = useState<Dag | null>(null)
  const [watGegetenModal, setWatGegetenModal] = useState<Registratie | null>(null)

  const [laden, setLaden] = useState(false)
  const [exportOrientatie, setExportOrientatie] = useState<'portrait' | 'landscape'>('portrait')
  const [toonOrientatieKeuze, setToonOrientatieKeuze] = useState(false)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  // ── Locaties ────────────────────────────────────────────────────────────────
  const haalLocatiesOp = useCallback(async () => {
    if (!profiel) return
    const supabase = getSupabase()
    const { data: alleLocaties } = await supabase.from('maaltijd_locaties').select('*').eq('actief', true).order('naam')
    if (!alleLocaties) return

    let zichtbaar: Locatie[] = []

    const magAllesZien = isSuperadmin || profiel.rol === 'directie' || profiel.rol === 'leidinggevende'

    if (magAllesZien) {
      zichtbaar = alleLocaties as Locatie[]
      setToegestaneLocaties((alleLocaties as Locatie[]).map(l => ({ naam: l.naam, toegang: 'bewerken' })))
    } else {
      const { data: toegangData } = await supabase
        .from('locatie_toegang')
        .select('locatie_naam, toegang')
        .eq('profiel_id', profiel.id)
        .eq('locatie_type', 'maaltijdlijst')
        .neq('toegang', 'geen')

      const toegangMap = Object.fromEntries((toegangData ?? []).map((t: {locatie_naam: string; toegang: string}) => [t.locatie_naam, t.toegang]))
      setToegestaneLocaties((toegangData ?? []).map((t: {locatie_naam: string; toegang: string}) => ({ naam: t.locatie_naam, toegang: t.toegang })))
      zichtbaar = (alleLocaties as Locatie[]).filter(l => toegangMap[l.naam])
    }

    setLocaties(zichtbaar)
    if (zichtbaar.length > 0 && !actieveLocatie) setActieveLocatie(zichtbaar[0])
    else if (actieveLocatie && !zichtbaar.find(l => l.id === actieveLocatie.id)) setActieveLocatie(zichtbaar[0] ?? null)
  }, [profiel, isSuperadmin, actieveLocatie])

  useEffect(() => { haalLocatiesOp() }, [profiel])

  // ── Standaard kinderen ──────────────────────────────────────────────────────
  const haalStandaardOp = useCallback(async () => {
    if (!actieveLocatie) return
    const { data } = await getSupabase().from('maaltijd_standaard_kinderen').select('*').eq('locatie_id', actieveLocatie.id).order('dag').order('volgorde')
    setStandaardKinderen((data ?? []) as StandaardKind[])
  }, [actieveLocatie])

  // ── Week ophalen of aanmaken ─────────────────────────────────────────────────
  const haalWeekOp = useCallback(async () => {
    if (!actieveLocatie) return
    setLaden(true)
    const supabase = getSupabase()

    let { data: weekData } = await supabase.from('maaltijd_weken').select('*').eq('locatie_id', actieveLocatie.id).eq('week_start', huidigWeekStart).maybeSingle()

    if (!weekData) {
      // Maak nieuwe week aan en kopieer standaard kinderen
      const { data: nieuw } = await supabase.from('maaltijd_weken').insert({
        locatie_id: actieveLocatie.id,
        maand: maandLabel(huidigWeekStart),
        week_start: huidigWeekStart,
      }).select().single()

      if (nieuw) {
        weekData = nieuw
        // Standaard kinderen invoegen per dag
        const std = standaardKinderen.length > 0 ? standaardKinderen : (await supabase.from('maaltijd_standaard_kinderen').select('*').eq('locatie_id', actieveLocatie.id).order('dag').order('volgorde')).data ?? []

        if (std.length > 0) {
          const invoegen = std.map((k: StandaardKind) => ({
            week_id: nieuw.id, dag: k.dag, naam: k.naam,
            bijzonderheden: k.bijzonderheden, aanwezig: true, is_extra: false, volgorde: k.volgorde,
          }))
          await supabase.from('maaltijd_registraties').insert(invoegen)
        }
      }
    }

    setWeek(weekData as Week)

    if (weekData) {
      const { data: regData } = await supabase.from('maaltijd_registraties').select('*').eq('week_id', weekData.id).order('volgorde')
      setRegistraties((regData ?? []) as Registratie[])
    }
    setLaden(false)
  }, [actieveLocatie, huidigWeekStart, standaardKinderen])

  // Laad standaard kinderen EERST, daarna pas de week
  useEffect(() => {
    if (!actieveLocatie) return
    async function laadAlles() {
      // 1. Standaard kinderen ophalen
      const { data: stdData } = await getSupabase()
        .from('maaltijd_standaard_kinderen')
        .select('*')
        .eq('locatie_id', actieveLocatie!.id)
        .order('dag').order('volgorde')
      const std = (stdData ?? []) as StandaardKind[]
      setStandaardKinderen(std)

      // 2. Week ophalen of aanmaken (nu met standaard kinderen beschikbaar)
      setLaden(true)
      const supabase = getSupabase()
      let { data: weekData } = await supabase
        .from('maaltijd_weken').select('*')
        .eq('locatie_id', actieveLocatie!.id)
        .eq('week_start', huidigWeekStart).maybeSingle()

      if (!weekData) {
        const { data: nieuw } = await supabase.from('maaltijd_weken').insert({
          locatie_id: actieveLocatie!.id,
          maand: maandLabel(huidigWeekStart),
          week_start: huidigWeekStart,
        }).select().single()

        if (nieuw) {
          weekData = nieuw
          if (std.length > 0) {
            const invoegen = std.map((k: StandaardKind) => ({
              week_id: nieuw.id, dag: k.dag, naam: k.naam,
              bijzonderheden: k.bijzonderheden, aanwezig: true, is_extra: false, volgorde: k.volgorde,
            }))
            await supabase.from('maaltijd_registraties').insert(invoegen)
          }
        }
      }

      setWeek(weekData as Week)
      if (weekData) {
        const { data: regData } = await supabase
          .from('maaltijd_registraties').select('*')
          .eq('week_id', weekData.id).order('volgorde')
        setRegistraties((regData ?? []) as Registratie[])
      }
      setLaden(false)
    }
    laadAlles()
  }, [actieveLocatie, huidigWeekStart])

  // ── Toggle aanwezig ─────────────────────────────────────────────────────────
  async function toggleAanwezig(reg: Registratie) {
    await getSupabase().from('maaltijd_registraties').update({ aanwezig: !reg.aanwezig }).eq('id', reg.id)
    setRegistraties(prev => prev.map(r => r.id === reg.id ? { ...r, aanwezig: !r.aanwezig } : r))
  }

  // ── Extra kind toevoegen ────────────────────────────────────────────────────
  async function voegExtraToe(dag: Dag, naam: string, bijzonderheden: string) {
    if (!week) return
    const dagRegs = registraties.filter(r => r.dag === dag)
    const { data } = await getSupabase().from('maaltijd_registraties').insert({
      week_id: week.id, dag, naam, bijzonderheden: bijzonderheden || null,
      aanwezig: true, is_extra: true, volgorde: dagRegs.length,
    }).select().single()
    if (data) setRegistraties(prev => [...prev, data as Registratie])
    setExtraModal(null)
    setToast({ bericht: `${naam} toegevoegd!`, type: 'success' })
  }

  // ── Wat gegeten opslaan ─────────────────────────────────────────────────────
  async function slaWatGegeten(reg: Registratie, wat: string) {
    await getSupabase().from('maaltijd_registraties').update({ wat_gegeten: wat || null }).eq('id', reg.id)
    setRegistraties(prev => prev.map(r => r.id === reg.id ? { ...r, wat_gegeten: wat || null } : r))
    setWatGegetenModal(null)
  }

  // ── Registratie verwijderen ─────────────────────────────────────────────────
  async function verwijderRegistratie(id: string) {
    await getSupabase().from('maaltijd_registraties').delete().eq('id', id)
    setRegistraties(prev => prev.filter(r => r.id !== id))
  }

  function navigeerWeek(richting: number) {
    const d = new Date(huidigWeekStart)
    d.setDate(d.getDate() + richting * 7)
    setHuidigWeekStart(toDateStr(d))
  }

  const isHuidigeWeek = huidigWeekStart === toDateStr(maandaagVanWeek(new Date()))
  const magBewerken = isSuperadmin || (actieveLocatie ? maaltijdToegang(actieveLocatie.naam) === 'bewerken' : false)

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        titel="Maaltijdlijst"
        subtitel={actieveLocatie ? actieveLocatie.naam : 'Selecteer een locatie'}
        acties={
          <div style={{ display: 'flex', gap: 8 }}>
            {actieveLocatie && week && (
              <div style={{ position: 'relative' }}>
                <button className="btn" onClick={() => setToonOrientatieKeuze(o => !o)}>
                  <Download size={14} /> Export PDF
                </button>
                {toonOrientatieKeuze && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', padding: 4, zIndex: 30, minWidth: 170 }}>
                    {(['portrait', 'landscape'] as const).map(o => (
                      <button key={o} onClick={() => { setToonOrientatieKeuze(false); exporteerPDF(actieveLocatie.naam, huidigWeekStart, registraties, o) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', borderRadius: 7, textAlign: 'left' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <span style={{ fontSize: 16 }}>{o === 'portrait' ? '📄' : '📰'}</span>
                        {o === 'portrait' ? 'Staand (A4)' : 'Liggend (A4)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isSuperadmin && actieveLocatie && (
              <button className="btn" onClick={() => setStandaardModal(true)}>
                <Settings size={14} /> Standaard kinderen
              </button>
            )}
            {!isSuperadmin && actieveLocatie && maaltijdToegang(actieveLocatie.naam) === 'lezen' && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', borderRadius: 7, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                👁 Alleen lezen
              </span>
            )}
            {isSuperadmin && (
              <button className="btn" onClick={() => setLocatieModal(true)}>
                <MapPin size={14} /> Locaties
              </button>
            )}
            {!isSuperadmin && actieveLocatie && maaltijdToegang(actieveLocatie.naam) === 'lezen' && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                👁 Alleen lezen
              </span>
            )}
            {!magBewerken && actieveLocatie && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 10px' }}>
                👁️ Alleen lezen
              </span>
            )}
          </div>
        }
      />

      <div className="page-content">

        {/* Geen locaties */}
        {locaties.length === 0 && (
          <div className="empty-state">
            <MapPin size={36} />
            <h3>Geen locaties</h3>
            <p>Voeg eerst een locatie toe.</p>
            {isSuperadmin && <button className="btn btn-primary" onClick={() => setLocatieModal(true)}><Plus size={14} /> Locatie toevoegen</button>}
          </div>
        )}

        {locaties.length > 0 && (
          <>
            {/* Locatie tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              {locaties.map(loc => (
                <button key={loc.id} onClick={() => setActieveLocatie(loc)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s', borderColor: actieveLocatie?.id === loc.id ? 'var(--primary)' : 'var(--border-dark)', background: actieveLocatie?.id === loc.id ? 'var(--primary)' : 'var(--bg-card)', color: actieveLocatie?.id === loc.id ? '#fff' : 'var(--text)' }}>
                  {loc.naam}
                </button>
              ))}
            </div>

            {/* Week navigatie */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <button className="btn" style={{ padding: '6px 8px' }} onClick={() => navigeerWeek(-1)}><ChevronLeft size={16} /></button>
              <button
                onClick={() => setHuidigWeekStart(toDateStr(maandaagVanWeek(new Date())))}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 18px', borderRadius: 8, border: `1.5px solid ${isHuidigeWeek ? 'var(--primary)' : 'var(--border-dark)'}`, background: isHuidigeWeek ? 'var(--primary-xlight)' : 'var(--bg-card)', cursor: 'pointer', minWidth: 200 }}
              >
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700, color: isHuidigeWeek ? 'var(--primary-text)' : 'var(--text)' }}>
                  {fmtWeek(huidigWeekStart)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{maandLabel(huidigWeekStart)}</span>
              </button>
              <button className="btn" style={{ padding: '6px 8px' }} onClick={() => navigeerWeek(1)}><ChevronRight size={16} /></button>
            </div>

            {/* Tabel */}
            {laden ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 120, padding: '10px 14px', background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 12, textAlign: 'left', border: '1px solid var(--primary-dark)' }}>Dag + datum</th>
                      <th style={{ padding: '10px 14px', background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 12, textAlign: 'left', border: '1px solid var(--primary-dark)', minWidth: 180 }}>Naam kind</th>
                      <th style={{ padding: '10px 14px', background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 12, textAlign: 'left', border: '1px solid var(--primary-dark)', minWidth: 160 }}>Bijzonderheden / allergie</th>
                      <th style={{ width: 90, padding: '10px 14px', background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 12, textAlign: 'center', border: '1px solid var(--primary-dark)' }}>Meegegeten</th>
                      <th style={{ padding: '10px 14px', background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 12, textAlign: 'left', border: '1px solid var(--primary-dark)', minWidth: 140 }}>Wat gegeten?</th>
                      <th style={{ width: 60, padding: '10px 14px', background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary-dark)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAGEN.map(dag => {
                      const dagRegs = registraties.filter(r => r.dag === dag).sort((a, b) => a.volgorde - b.volgorde)
                      const aantalRijen = Math.max(dagRegs.length, 1)
                      const datum = week ? dagDatum(huidigWeekStart, dag) : ''

                      return [
                        // Lege rij of kinderen
                        ...(dagRegs.length === 0 ? [
                          <tr key={`${dag}-leeg`} style={{ background: 'var(--bg-card)' }}>
                            <td rowSpan={1} style={{ padding: '10px 14px', border: '1px solid var(--border)', background: 'var(--primary-xlight)', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-text)' }}>{DAG_LABEL[dag]}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{datum}</div>
                            </td>
                            <td colSpan={4} style={{ padding: '10px 14px', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>Geen kinderen</td>
                            <td style={{ border: '1px solid var(--border)', textAlign: 'center', padding: 6 }}>
                              {magBewerken && <button onClick={() => setExtraModal(dag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', margin: '0 auto' }} title="Extra kind toevoegen"><UserPlus size={14} /></button>}
                            </td>
                          </tr>
                        ] : dagRegs.map((reg, i) => (
                          <tr key={reg.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg)' }}>
                            {i === 0 && (
                              <td rowSpan={dagRegs.length} style={{ padding: '10px 14px', border: '1px solid var(--border)', background: 'var(--primary-xlight)', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-text)' }}>{DAG_LABEL[dag]}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{datum}</div>
                              </td>
                            )}
                            {/* Naam */}
                            <td style={{ padding: '8px 14px', border: '1px solid var(--border)' }}>
                              <span style={{ fontWeight: reg.is_extra ? 400 : 500, fontStyle: reg.is_extra ? 'italic' : 'normal', color: reg.aanwezig ? 'var(--text)' : 'var(--text-muted)', textDecoration: reg.aanwezig ? 'none' : 'line-through' }}>
                                {reg.naam}
                              </span>
                              {reg.is_extra && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--primary-light)', color: 'var(--primary-text)', padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>extra</span>}
                            </td>
                            {/* Bijzonderheden */}
                            <td style={{ padding: '8px 14px', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                              {reg.bijzonderheden ?? '—'}
                            </td>
                            {/* Meegegeten toggle */}
                            <td style={{ padding: '8px 14px', border: '1px solid var(--border)', textAlign: 'center' }}>
                              <button
                                onClick={() => magBewerken ? toggleAanwezig(reg) : undefined}
                                disabled={!magBewerken}
                                style={{
                                  width: 32, height: 32, borderRadius: 8, border: 'none',
                                  cursor: magBewerken ? 'pointer' : 'default',
                                  background: reg.aanwezig ? 'var(--primary)' : '#FEF2F2',
                                  color: reg.aanwezig ? '#fff' : '#DC2626',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  margin: '0 auto', fontSize: 16, transition: 'all 0.15s',
                                  opacity: magBewerken ? 1 : 0.7,
                                }}
                                title={magBewerken ? (reg.aanwezig ? 'Klik om af te vinken' : 'Klik om aan te vinken') : 'Alleen lezen'}
                              >
                                {reg.aanwezig ? '✓' : '✗'}
                              </button>
                            </td>
                            {/* Wat gegeten */}
                            <td style={{ padding: '8px 14px', border: '1px solid var(--border)', cursor: magBewerken ? 'pointer' : 'default' }} onClick={() => magBewerken && setWatGegetenModal(reg)}>
                              <span style={{ fontSize: 12, color: reg.wat_gegeten ? 'var(--text)' : 'var(--text-muted)', fontStyle: reg.wat_gegeten ? 'normal' : 'italic' }}>
                                {reg.wat_gegeten ?? 'Klik om in te vullen...'}
                              </span>
                            </td>
                            {/* Acties */}
                            <td style={{ padding: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                {magBewerken && i === dagRegs.length - 1 && (
                                  <button onClick={() => setExtraModal(dag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }} title="Extra toevoegen"><UserPlus size={13} /></button>
                                )}
                                {magBewerken && (
                                  <button onClick={() => verwijderRegistratie(reg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', display: 'flex', opacity: 0.6 }} title={reg.is_extra ? 'Extra kind verwijderen' : 'Kind verwijderen van deze dag'}><Trash2 size={13} /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))),
                        // Scheidingsrij
                        <tr key={`${dag}-sep`}>
                          <td colSpan={6} style={{ height: 6, background: 'var(--primary-dark)', padding: 0 }} />
                        </tr>
                      ]
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {toonOrientatieKeuze && <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setToonOrientatieKeuze(false)} />}

      {/* ─── Modals ──────────────────────────────────────────────────────────── */}

      {/* Locaties beheer */}
      {locatieModal && (
        <LocatieModal
          locaties={locaties}
          onClose={() => setLocatieModal(false)}
          onRefresh={haalLocatiesOp}
          onToast={setToast}
        />
      )}

      {/* Standaard kinderen */}
      {standaardModal && actieveLocatie && (
        <StandaardKinderenModal
          locatie={actieveLocatie}
          onClose={() => { setStandaardModal(false); haalStandaardOp() }}
          onToast={setToast}
        />
      )}

      {/* Extra kind */}
      {extraModal && (
        <ExtraKindModal
          dag={extraModal}
          onSave={voegExtraToe}
          onClose={() => setExtraModal(null)}
        />
      )}

      {/* Wat gegeten */}
      {watGegetenModal && (
        <WatGegetenModal
          registratie={watGegetenModal}
          onSave={slaWatGegeten}
          onClose={() => setWatGegetenModal(null)}
        />
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Sub-modals ───────────────────────────────────────────────────────────────

function LocatieModal({ locaties, onClose, onRefresh, onToast }: {
  locaties: Locatie[]
  onClose: () => void
  onRefresh: () => void
  onToast: (t: { bericht: string; type: 'success' | 'error' }) => void
}) {
  const [naam, setNaam] = useState('')
  const [laden, setLaden] = useState(false)

  async function voegToe() {
    if (!naam.trim()) return
    setLaden(true)
    const { error } = await getSupabase().from('maaltijd_locaties').insert({ naam: naam.trim() })
    if (error) { onToast({ bericht: 'Mislukt: ' + error.message, type: 'error' }) }
    else { setNaam(''); onRefresh(); onToast({ bericht: 'Locatie toegevoegd!', type: 'success' }) }
    setLaden(false)
  }

  async function verwijder(id: string) {
    await getSupabase().from('maaltijd_locaties').update({ actief: false }).eq('id', id)
    onRefresh()
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Locaties beheren</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Nieuwe locatie</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. De Theepot Noord" onKeyDown={e => e.key === 'Enter' && voegToe()} />
              <button className="btn btn-primary" onClick={voegToe} disabled={laden || !naam.trim()}><Plus size={14} /></button>
            </div>
          </div>
          <div className="divider" style={{ margin: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {locaties.map(loc => (
              <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <MapPin size={14} color="var(--primary)" />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{loc.naam}</span>
                <button onClick={() => verwijder(loc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={onClose}>Klaar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StandaardKinderenModal({ locatie, onClose, onToast }: {
  locatie: Locatie
  onClose: () => void
  onToast: (t: { bericht: string; type: 'success' | 'error' }) => void
}) {
  const [kinderen, setKinderen] = useState<StandaardKind[]>([])
  const [activeDag, setActiveDag] = useState<Dag>('maandag')
  const [naam, setNaam] = useState('')
  const [bijzonderheden, setBijzonderheden] = useState('')

  useEffect(() => {
    getSupabase().from('maaltijd_standaard_kinderen').select('*').eq('locatie_id', locatie.id).order('dag').order('volgorde')
      .then(({ data }) => setKinderen((data ?? []) as StandaardKind[]))
  }, [locatie.id])

  async function voegToe() {
    if (!naam.trim()) return
    const dagKinderen = kinderen.filter(k => k.dag === activeDag)
    const { data } = await getSupabase().from('maaltijd_standaard_kinderen').insert({
      locatie_id: locatie.id, naam: naam.trim(), bijzonderheden: bijzonderheden.trim() || null,
      dag: activeDag, volgorde: dagKinderen.length,
    }).select().single()
    if (data) { setKinderen(prev => [...prev, data as StandaardKind]); setNaam(''); setBijzonderheden('') }
  }

  async function verwijder(id: string) {
    await getSupabase().from('maaltijd_standaard_kinderen').delete().eq('id', id)
    setKinderen(prev => prev.filter(k => k.id !== id))
  }

  const dagKinderen = kinderen.filter(k => k.dag === activeDag)

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Standaard kinderen — {locatie.naam}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Standaard kinderen worden automatisch ingevuld als je een nieuwe week opent.
          </p>

          {/* Dag tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 9, padding: 3 }}>
            {DAGEN.map(dag => (
              <button key={dag} onClick={() => setActiveDag(dag)} style={{ flex: 1, padding: '6px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: activeDag === dag ? 'var(--primary)' : 'transparent', color: activeDag === dag ? '#fff' : 'var(--text-muted)', transition: 'all 0.12s', position: 'relative' }}>
                {DAG_KORT[dag]}
                {kinderen.filter(k => k.dag === dag).length > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: activeDag === dag ? '#fff' : 'var(--primary)' }} />
                )}
              </button>
            ))}
          </div>

          {/* Kinderen voor deze dag */}
          <div style={{ minHeight: 80 }}>
            {dagKinderen.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Geen standaard kinderen voor {DAG_LABEL[activeDag]}.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dagKinderen.map(k => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{k.naam}</div>
                    {k.bijzonderheden && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.bijzonderheden}</div>}
                  </div>
                  <button onClick={() => verwijder(k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="divider" style={{ margin: 0 }} />

          {/* Toevoegen */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="form-label">Naam kind *</label>
              <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Voornaam achternaam" onKeyDown={e => e.key === 'Enter' && voegToe()} />
            </div>
            <div>
              <label className="form-label">Bijzonderheden / allergie</label>
              <input className="form-input" value={bijzonderheden} onChange={e => setBijzonderheden(e.target.value)} placeholder="Optioneel" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Sluiten</button>
            <button className="btn btn-primary" onClick={voegToe} disabled={!naam.trim()}>
              <Plus size={14} /> Toevoegen aan {DAG_LABEL[activeDag]}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExtraKindModal({ dag, onSave, onClose }: {
  dag: Dag
  onSave: (dag: Dag, naam: string, bijzonderheden: string) => void
  onClose: () => void
}) {
  const [naam, setNaam] = useState('')
  const [bijzonderheden, setBijzonderheden] = useState('')
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Extra kind — {DAG_LABEL[dag]}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Naam kind *</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Voornaam achternaam" autoFocus />
          </div>
          <div>
            <label className="form-label">Bijzonderheden / allergie</label>
            <input className="form-input" value={bijzonderheden} onChange={e => setBijzonderheden(e.target.value)} placeholder="Optioneel" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => naam.trim() && onSave(dag, naam.trim(), bijzonderheden)} disabled={!naam.trim()}>
              <UserPlus size={14} /> Toevoegen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function WatGegetenModal({ registratie, onSave, onClose }: {
  registratie: Registratie
  onSave: (reg: Registratie, wat: string) => void
  onClose: () => void
}) {
  const [wat, setWat] = useState(registratie.wat_gegeten ?? '')
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Wat gegeten? — {registratie.naam}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Wat heeft {registratie.naam} gegeten?</label>
            <input className="form-input" value={wat} onChange={e => setWat(e.target.value)} placeholder="Bijv. Boerenkool met worst" autoFocus onKeyDown={e => e.key === 'Enter' && onSave(registratie, wat)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => onSave(registratie, wat)}>Opslaan</button>
          </div>
        </div>
      </div>
    </div>
  )
}
