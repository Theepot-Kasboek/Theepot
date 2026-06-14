'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import ActiviteitBijlagen from '@/components/ActiviteitBijlagen'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, ChevronLeft, ChevronRight, Scissors,
  Users, Download, BookOpen, Pencil, Trash2, MapPin, Upload
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActType = 'knutsel' | 'kook_bak' | 'groepsspel'

interface WeekPlanning {
  id: string
  locatie_naam: string
  week_start: string
  thema: string | null
  aangemaakt_op: string
}

interface WeekActiviteit {
  id: string
  planning_id: string
  type: ActType
  naam: string
  beschrijving: string | null
  materialen: string[]
  activiteit_id: string | null
  afbeelding_url: string | null
}

interface BibliotheekActiviteit {
  id: string
  naam: string
  categorie: string
  beschrijving: string
  materialen: string[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ActType, { label: string; icon: React.ReactNode; kleur: string; bg: string; beschrijving: string }> = {
  knutsel: {
    label: 'Knutsel',
    icon: <Scissors size={18} />,
    kleur: '#7C3AED',
    bg: '#EDE9FE',
    beschrijving: 'Creatieve knutselactiviteit',
  },
  kook_bak: {
    label: 'Koken / Bakken',
    icon: <span style={{ fontSize: 18 }}>🍳</span>,
    kleur: '#D97706',
    bg: '#FEF3C7',
    beschrijving: 'Kook- of bakactiviteit',
  },
  groepsspel: {
    label: 'Groepsspel',
    icon: <Users size={18} />,
    kleur: '#059669',
    bg: '#D1FAE5',
    beschrijving: 'Groepsactiviteit of spel',
  },
}

const ACTIVITEIT_SLOTS: ActType[] = ['knutsel', 'groepsspel']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maandaagVanWeek(d: Date): Date {
  const dag = d.getDay()
  const ma = new Date(d)
  ma.setDate(d.getDate() - (dag === 0 ? 6 : dag - 1))
  ma.setHours(0, 0, 0, 0)
  return ma
}

function toDateStr(d: Date): string {
  const jaar = d.getFullYear()
  const maand = String(d.getMonth() + 1).padStart(2, '0')
  const dag = String(d.getDate()).padStart(2, '0')
  return `${jaar}-${maand}-${dag}`
}

function fmtWeek(weekStart: string): string {
  const ma = new Date(weekStart)
  const vr = new Date(ma); vr.setDate(ma.getDate() + 4)
  return `${ma.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} – ${vr.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

function fmtMaand(weekStart: string): string {
  return new Date(weekStart).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportPDF(planning: WeekPlanning, activiteiten: WeekActiviteit[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const groen: [number, number, number] = [140, 198, 63]
  const wit: [number, number, number] = [255, 255, 255]
  const zwart: [number, number, number] = [30, 30, 30]
  const grijs: [number, number, number] = [150, 150, 150]
  const marge = 15
  const breedte = 210 - marge * 2
  let y = 0

  // Header
  doc.setFillColor(...groen)
  doc.rect(0, 0, 210, 18, 'F')
  doc.setTextColor(...wit)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('De Theepot — Weekplanning', marge, 11)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date().toLocaleDateString('nl-NL'), 210 - marge, 11, { align: 'right' })

  y = 30
  doc.setTextColor(...zwart)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(`Weekplanning — ${planning.locatie_naam}`, marge, y)
  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(61, 107, 26)
  doc.text(`Week: ${fmtWeek(planning.week_start)}`, marge, y)
  if (planning.thema) {
    y += 6
    doc.text(`Thema: ${planning.thema}`, marge, y)
  }
  y += 14

  // Per activiteit type
  const typen = activiteiten.reduce((acc, a) => {
    if (!acc[a.type]) acc[a.type] = a
    return acc
  }, {} as Record<string, WeekActiviteit>)

  const typenVolgorde: ActType[] = ['knutsel', 'kook_bak', 'groepsspel']

  typenVolgorde.forEach(type => {
    const act = typen[type]
    const config = TYPE_CONFIG[type]

    if (y > 240) { doc.addPage(); y = 20 }

    // Type header
    const kleurRGB = type === 'knutsel' ? [124, 58, 237] : type === 'kook_bak' ? [217, 119, 6] : [5, 150, 105]
    const bgRGB = type === 'knutsel' ? [237, 233, 254] : type === 'kook_bak' ? [254, 243, 199] : [209, 250, 229]

    doc.setFillColor(...bgRGB as [number, number, number])
    doc.roundedRect(marge, y, breedte, 10, 2, 2, 'F')
    doc.setDrawColor(...kleurRGB as [number, number, number])
    doc.setLineWidth(0.5)
    doc.roundedRect(marge, y, breedte, 10, 2, 2, 'S')
    doc.setTextColor(...kleurRGB as [number, number, number])
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(config.label, marge + 4, y + 6.5)
    y += 14

    if (!act) {
      doc.setTextColor(...grijs)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.text('Nog niet ingevuld', marge + 4, y)
      y += 14
      return
    }

    // Naam
    doc.setTextColor(...zwart)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(act.naam, marge, y)
    y += 8

    // Beschrijving
    if (act.beschrijving) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      const regels = doc.splitTextToSize(act.beschrijving, breedte)
      doc.text(regels, marge, y)
      y += regels.length * 5.5 + 6
    }

    // Materialen
    if (act.materialen.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...zwart)
      doc.text('Benodigdheden:', marge, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      act.materialen.forEach(m => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(`• ${m}`, marge + 3, y)
        y += 5.5
      })
      y += 4
    }

    y += 6
  })

  // Footer
  doc.setFillColor(245, 247, 245)
  doc.rect(0, 284, 210, 13, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...grijs)
  doc.text(`De Theepot — Weekplanning ${planning.locatie_naam}`, marge, 291)
  doc.text('1 / 1', 210 - marge, 291, { align: 'right' })

  doc.save(`Weekplanning_${planning.locatie_naam}_${planning.week_start}.pdf`)
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function WeekplanningenPage() {
  const { profiel, isSuperadmin } = useAuth()

  async function getToegankelijkeLocaties(alleLocaties: string[]): Promise<string[]> {
    const magAllesZien = isSuperadmin || profiel?.rol === 'directie' || profiel?.rol === 'leidinggevende'
    if (magAllesZien) return alleLocaties
    const { data } = await getSupabase()
      .from('locatie_toegang')
      .select('locatie_naam, toegang')
      .eq('profiel_id', profiel?.id ?? '')
      .eq('locatie_type', 'weekplanningen')
    const toegankelijk = (data ?? []).filter((t: { toegang: string }) => t.toegang !== 'geen').map((t: { locatie_naam: string }) => t.locatie_naam)
    return alleLocaties.filter(l => toegankelijk.includes(l))
  }

  const [locaties, setLocaties] = useState<string[]>([])
  const [actieveLocatie, setActieveLocatie] = useState<string>('')
  const [huidigWeekStart, setHuidigWeekStart] = useState(toDateStr(maandaagVanWeek(new Date())))
  const [planning, setPlanning] = useState<WeekPlanning | null>(null)
  const [activiteiten, setActiviteiten] = useState<WeekActiviteit[]>([])
  const [thema, setThema] = useState('')
  const [themaBewerken, setThemaBewerken] = useState(false)
  const [laden, setLaden] = useState(false)
  const [actieveSlot, setActieveSlot] = useState<ActType | null>(null)
  const [detailActiviteit, setDetailActiviteit] = useState<WeekActiviteit | null>(null)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  // ── Locaties ophalen — wacht op profiel ────────────────────────────────────
  useEffect(() => {
    if (!profiel) return  // Wacht tot profiel geladen is
    async function laad() {
      const supabase = getSupabase()
      const { data } = await supabase.from('kasboek_locaties').select('naam').eq('actief', true).order('naam')
      const allen = (data ?? []).map((l: { naam: string }) => l.naam)
      const namen = await getToegankelijkeLocaties(allen)
      setLocaties(namen)
      if (namen.length > 0) setActieveLocatie(namen[0])
    }
    laad()
  }, [profiel?.id])  // Herlaad als profiel verandert

  // ── Planning ophalen of aanmaken ────────────────────────────────────────────
  const haalPlanningOp = useCallback(async () => {
    if (!actieveLocatie) return
    setLaden(true)
    const supabase = getSupabase()

    const { data: bestaand } = await supabase
      .from('week_planningen')
      .select('*')
      .eq('locatie_naam', actieveLocatie)
      .eq('week_start', huidigWeekStart)
      .single()

    if (bestaand) {
      setPlanning(bestaand as WeekPlanning)
      setThema(bestaand.thema ?? '')
      const { data: acts } = await supabase
        .from('week_activiteiten').select('*').eq('planning_id', bestaand.id)
      setActiviteiten((acts ?? []) as WeekActiviteit[])
    } else {
      setPlanning(null)
      setThema('')
      setActiviteiten([])
    }
    setLaden(false)
  }, [actieveLocatie, huidigWeekStart])

  useEffect(() => { haalPlanningOp() }, [haalPlanningOp])

  // ── Planning aanmaken ───────────────────────────────────────────────────────
  async function zorgVoorPlanning(): Promise<string | null> {
    if (planning) return planning.id
    const { data, error } = await getSupabase().from('week_planningen').insert({
      locatie_naam: actieveLocatie,
      week_start: huidigWeekStart,
      thema: thema || null,
      aangemaakt_door: profiel?.id,
    }).select().single()
    if (error || !data) return null
    setPlanning(data as WeekPlanning)
    return data.id
  }

  // ── Thema opslaan ───────────────────────────────────────────────────────────
  async function slaThemaOp() {
    const supabase = getSupabase()
    if (planning) {
      await supabase.from('week_planningen').update({ thema: thema || null }).eq('id', planning.id)
    } else {
      await zorgVoorPlanning()
    }
    setThemaBewerken(false)
    setToast({ bericht: 'Thema opgeslagen!', type: 'success' })
    await haalPlanningOp()
  }

  // ── Activiteit opslaan ──────────────────────────────────────────────────────
  async function slaActiviteitOp(type: ActType, naam: string, beschrijving: string, materialen: string[], activiteitId: string | null, afbeeldingUrl: string | null) {
    const planningId = await zorgVoorPlanning()
    if (!planningId) return

    const bestaand = activiteiten.find(a => a.type === type)
    const supabase = getSupabase()

    if (bestaand) {
      await supabase.from('week_activiteiten').update({ naam, beschrijving: beschrijving || null, materialen, activiteit_id: activiteitId, afbeelding_url: afbeeldingUrl }).eq('id', bestaand.id)
    } else {
      await supabase.from('week_activiteiten').insert({ planning_id: planningId, type, naam, beschrijving: beschrijving || null, materialen, activiteit_id: activiteitId, afbeelding_url: afbeeldingUrl })
    }

    setActieveSlot(null)
    setToast({ bericht: `${TYPE_CONFIG[type].label} opgeslagen!`, type: 'success' })
    await haalPlanningOp()
  }

  // ── Activiteit verwijderen ──────────────────────────────────────────────────
  async function verwijderActiviteit(id: string) {
    await getSupabase().from('week_activiteiten').delete().eq('id', id)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    await haalPlanningOp()
  }

  const isHuidigeWeek = huidigWeekStart === toDateStr(maandaagVanWeek(new Date()))

  // ── SLOTS: knutsel kan worden vervangen door kook_bak ──────────────────────
  // Bepaal de actieve slots (knutsel OF kook_bak, plus groepsspel)
  const knutselAct = activiteiten.find(a => a.type === 'knutsel')
  const kookAct = activiteiten.find(a => a.type === 'kook_bak')
  const groepAct = activiteiten.find(a => a.type === 'groepsspel')

  // Slot 1: knutsel of kook_bak
  const slot1Type: ActType = kookAct && !knutselAct ? 'kook_bak' : 'knutsel'
  const slot1Act = knutselAct ?? kookAct ?? null

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        titel="Weekplanningen"
        subtitel={actieveLocatie || 'Selecteer een locatie'}
        acties={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {planning && (
              <button className="btn" onClick={() => exportPDF(planning, activiteiten)}>
                <Download size={14} /> PDF
              </button>
            )}
          </div>
        }
      />

      <div className="page-content">

        {/* Locatie tabs */}
        {locaties.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            {locaties.map(loc => (
              <button
                key={loc}
                onClick={() => setActieveLocatie(loc)}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s', borderColor: actieveLocatie === loc ? 'var(--primary)' : 'var(--border-dark)', background: actieveLocatie === loc ? 'var(--primary)' : 'var(--bg-card)', color: actieveLocatie === loc ? '#fff' : 'var(--text)' }}
              >
                {loc}
              </button>
            ))}
          </div>
        )}

        {locaties.length === 0 && (
          <div className="empty-state">
            <MapPin size={36} />
            <h3>Geen locaties</h3>
            <p>Voeg eerst locaties toe via het Kasboek.</p>
          </div>
        )}

        {locaties.length > 0 && (
          <>
            {/* Week navigatie */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <button className="btn" style={{ padding: '6px 8px' }} onClick={() => { const d = new Date(huidigWeekStart); d.setDate(d.getDate() - 7); setHuidigWeekStart(toDateStr(d)) }}><ChevronLeft size={16} /></button>
              <button
                onClick={() => setHuidigWeekStart(toDateStr(maandaagVanWeek(new Date())))}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 18px', borderRadius: 8, border: `1.5px solid ${isHuidigeWeek ? 'var(--primary)' : 'var(--border-dark)'}`, background: isHuidigeWeek ? 'var(--primary-xlight)' : 'var(--bg-card)', cursor: 'pointer', minWidth: 220 }}
              >
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700, color: isHuidigeWeek ? 'var(--primary-text)' : 'var(--text)' }}>
                  {fmtWeek(huidigWeekStart)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtMaand(huidigWeekStart)}</span>
              </button>
              <button className="btn" style={{ padding: '6px 8px' }} onClick={() => { const d = new Date(huidigWeekStart); d.setDate(d.getDate() + 7); setHuidigWeekStart(toDateStr(d)) }}><ChevronRight size={16} /></button>
            </div>

            {/* Thema */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>🎨</span>
                {themaBewerken ? (
                  <>
                    <input
                      className="form-input"
                      style={{ flex: 1 }}
                      value={thema}
                      onChange={e => setThema(e.target.value)}
                      placeholder="Weekthema (optioneel) — bijv. Jungle, Ruimtevaart..."
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && slaThemaOp()}
                    />
                    <button className="btn btn-primary btn-sm" onClick={slaThemaOp}>Opslaan</button>
                    <button className="btn btn-sm" onClick={() => setThemaBewerken(false)}>Annuleren</button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Weekthema</div>
                      <div style={{ fontSize: 14, fontWeight: thema ? 600 : 400, color: thema ? 'var(--text)' : 'var(--text-muted)', fontStyle: thema ? 'normal' : 'italic' }}>
                        {thema || 'Geen thema ingesteld'}
                      </div>
                    </div>
                    <button className="btn btn-sm" onClick={() => setThemaBewerken(true)}>
                      <Pencil size={13} /> {thema ? 'Wijzigen' : 'Instellen'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Activiteiten slots */}
            {laden ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* Slot 1: Knutsel / Koken */}
                <ActiviteitSlot
                  type={slot1Type}
                  activiteit={slot1Act}
                  alternatiefType={slot1Type === 'knutsel' ? 'kook_bak' : 'knutsel'}
                  onWijzigType={async (nieuwType) => {
                    if (slot1Act) await verwijderActiviteit(slot1Act.id)
                    setActieveSlot(nieuwType)
                  }}
                  onBekijk={() => slot1Act && setDetailActiviteit(slot1Act)}
                  onBewerk={() => setActieveSlot(slot1Type)}
                  onVerwijder={() => slot1Act && verwijderActiviteit(slot1Act.id)}
                />

                {/* Slot 2: Groepsspel */}
                <ActiviteitSlot
                  type="groepsspel"
                  activiteit={groepAct ?? null}
                  onBekijk={() => groepAct && setDetailActiviteit(groepAct)}
                  onBewerk={() => setActieveSlot('groepsspel')}
                  onVerwijder={() => groepAct && verwijderActiviteit(groepAct.id)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal voor activiteit toevoegen/bewerken */}
      {actieveSlot && (
        <ActiviteitModal
          type={actieveSlot}
          bestaand={activiteiten.find(a => a.type === actieveSlot) ?? null}
          onSave={slaActiviteitOp}
          onClose={() => setActieveSlot(null)}
        />
      )}

      {/* Detail modal */}
      {detailActiviteit && (
        <DetailModal
          activiteit={detailActiviteit}
          type={detailActiviteit.type as ActType}
          onClose={() => setDetailActiviteit(null)}
        />
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Activiteit Slot Card ─────────────────────────────────────────────────────

function ActiviteitSlot({ type, activiteit, alternatiefType, onWijzigType, onBekijk, onBewerk, onVerwijder }: {
  type: ActType
  activiteit: WeekActiviteit | null
  alternatiefType?: ActType
  onWijzigType?: (nieuwType: ActType) => void
  onBekijk?: () => void
  onBewerk: () => void
  onVerwijder: () => void
}) {
  const config = TYPE_CONFIG[type]
  const altConfig = alternatiefType ? TYPE_CONFIG[alternatiefType] : null

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Gekleurde bovenbalk */}
      <div style={{ height: 5, background: config.kleur }} />

      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: config.bg, color: config.kleur, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {config.icon}
          </div>
          <div>
            <div className="card-title">{config.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{config.beschrijving}</div>
          </div>
        </div>

        {/* Wissel knop voor slot 1 */}
        {altConfig && onWijzigType && (
          <button
            className="btn btn-sm"
            style={{ fontSize: 11, padding: '3px 10px' }}
            onClick={() => onWijzigType(alternatiefType!)}
            title={`Wissel naar ${altConfig.label}`}
          >
            ⇄ {altConfig.label}
          </button>
        )}
      </div>

      <div className="card-body">
        {!activiteit ? (
          /* Leeg slot */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 10 }}>
            <div style={{ fontSize: 32, opacity: 0.3 }}>{type === 'groepsspel' ? '🎮' : type === 'kook_bak' ? '🍳' : '✂️'}</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
              Nog geen {config.label.toLowerCase()} gepland
            </p>
            <button className="btn btn-primary btn-sm" onClick={onBewerk}>
              <Plus size={13} /> {config.label} toevoegen
            </button>
          </div>
        ) : (
          /* Gevuld slot */
          <div>
            {activiteit.afbeelding_url && (
              <div style={{ margin: '-2px -2px 10px', borderRadius: '8px 8px 0 0', overflow: 'hidden', maxHeight: 120 }}>
                <img src={activiteit.afbeelding_url} alt={activiteit.naam} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            )}
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              {activiteit.naam}
            </div>
            {activiteit.beschrijving && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {activiteit.beschrijving}
              </p>
            )}
            {activiteit.materialen.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Benodigdheden</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {activiteit.materialen.map((m, i) => (
                    <span key={i} style={{ padding: '2px 9px', borderRadius: 20, background: config.bg, color: config.kleur, fontSize: 11, fontWeight: 500 }}>{m}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              {onBekijk && <button className="btn btn-sm" onClick={onBekijk}>👁 Bekijken</button>}
              <button className="btn btn-sm" onClick={onBewerk}><Pencil size={12} /> Bewerken</button>
              <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA', marginLeft: 'auto' }} onClick={onVerwijder}><Trash2 size={12} /> Verwijderen</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Activiteit Modal ─────────────────────────────────────────────────────────

function ActiviteitModal({ type, bestaand, onSave, onClose }: {
  type: ActType
  bestaand: WeekActiviteit | null
  onSave: (type: ActType, naam: string, beschrijving: string, materialen: string[], activiteitId: string | null, afbeeldingUrl: string | null) => void
  onClose: () => void
}) {
  const config = TYPE_CONFIG[type]
  const [tab, setTab] = useState<'handmatig' | 'bibliotheek'>('handmatig')
  const [naam, setNaam] = useState(bestaand?.naam ?? '')
  const [beschrijving, setBeschrijving] = useState(bestaand?.beschrijving ?? '')
  const [materialenRaw, setMaterialenRaw] = useState((bestaand?.materialen ?? []).join(', '))
  const [activiteitId, setActiviteitId] = useState<string | null>(bestaand?.activiteit_id ?? null)
  const [bibliotheek, setBibliotheek] = useState<BibliotheekActiviteit[]>([])
  const [zoek, setZoek] = useState('')
  const [laden, setLaden] = useState(false)
  const [afbeeldingBestand, setAfbeeldingBestand] = useState<File | null>(null)
  const [afbeeldingPreview, setAfbeeldingPreview] = useState<string | null>(bestaand?.afbeelding_url ?? null)
  const [afbeeldingUrl, setAfbeeldingUrl] = useState<string | null>(bestaand?.afbeelding_url ?? null)
  const [urlInvoer, setUrlInvoer] = useState(bestaand?.afbeelding_url ?? '')
  const [uploading, setUploading] = useState(false)

  async function kiesAfbeelding(bestand: File) {
    setAfbeeldingBestand(bestand)
    const reader = new FileReader()
    reader.onload = e => setAfbeeldingPreview(e.target?.result as string)
    reader.readAsDataURL(bestand)

    // Upload naar Supabase storage
    setUploading(true)
    const ext = bestand.name.split('.').pop()?.toLowerCase() || 'jpg'
    const pad = `week-activiteit-${Date.now()}.${ext}`
    const supabase = getSupabase()
    const { error } = await supabase.storage.from('activiteit-afbeeldingen').upload(pad, bestand, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('activiteit-afbeeldingen').getPublicUrl(pad)
      setAfbeeldingUrl(data.publicUrl)
      setUrlInvoer(data.publicUrl)
    }
    setUploading(false)
  }

  function verwerkUrlInvoer(url: string) {
    setUrlInvoer(url)
    if (url.trim()) {
      setAfbeeldingUrl(url.trim())
      setAfbeeldingPreview(url.trim())
      setAfbeeldingBestand(null)
    } else {
      setAfbeeldingUrl(null)
      setAfbeeldingPreview(null)
    }
  }

  useEffect(() => {
    getSupabase().from('activiteiten').select('id, naam, categorie, beschrijving, materialen').order('naam')
      .then(({ data }) => setBibliotheek((data ?? []) as BibliotheekActiviteit[]))
  }, [])

  const gefilterd = bibliotheek.filter(a =>
    !zoek || a.naam.toLowerCase().includes(zoek.toLowerCase()) || a.categorie.toLowerCase().includes(zoek.toLowerCase())
  )

  function kiesUitBibliotheek(a: BibliotheekActiviteit) {
    setNaam(a.naam)
    setBeschrijving(a.beschrijving ?? '')
    setMaterialenRaw(a.materialen?.join(', ') ?? '')
    setActiviteitId(a.id)
    setTab('handmatig')
  }

  function handleSave() {
    if (!naam.trim()) return
    const materialen = materialenRaw.split(',').map(s => s.trim()).filter(Boolean)
    onSave(type, naam.trim(), beschrijving.trim(), materialen, activiteitId, afbeeldingUrl)
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: config.bg, color: config.kleur, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {config.icon}
            </div>
            <span className="card-title">{bestaand ? 'Bewerken' : 'Toevoegen'} — {config.label}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {(['handmatig', 'bibliotheek'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent' }}>
              {t === 'handmatig' ? '✏️ Handmatig' : '📚 Uit bibliotheek'}
            </button>
          ))}
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'handmatig' ? (
            <>
              <div>
                <label className="form-label">Naam activiteit *</label>
                <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder={`Naam van de ${config.label.toLowerCase()}`} autoFocus />
              </div>
              <div>
                <label className="form-label">Beschrijving</label>
                <textarea className="form-textarea" value={beschrijving} onChange={e => setBeschrijving(e.target.value)} placeholder="Korte omschrijving..." style={{ minHeight: 80 }} />
              </div>
              <div>
                <label className="form-label">Benodigdheden (kommagescheiden)</label>
                <input className="form-input" value={materialenRaw} onChange={e => setMaterialenRaw(e.target.value)} placeholder="Schaar, lijm, papier..." />
                {materialenRaw && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {materialenRaw.split(',').map(s => s.trim()).filter(Boolean).map((m, i) => (
                      <span key={i} style={{ padding: '2px 9px', borderRadius: 20, background: config.bg, color: config.kleur, fontSize: 11, fontWeight: 500 }}>{m}</span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Voorbeeldafbeelding (optioneel)</label>
                {afbeeldingPreview ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 8 }}>
                    <img src={afbeeldingPreview} alt="Preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <button onClick={() => { setAfbeeldingPreview(null); setAfbeeldingBestand(null); setAfbeeldingUrl(null); setUrlInvoer('') }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(220,38,38,0.8)', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <X size={11} /> Verwijderen
                    </button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'block', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 9, border: '2px dashed var(--border-dark)', background: 'var(--bg)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = config.kleur)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-dark)')}
                    >
                      <Upload size={16} color="var(--text-muted)" style={{ opacity: 0.6, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{uploading ? 'Uploaden...' : 'Klik om een foto te uploaden'}</span>
                    </div>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && kiesAfbeelding(e.target.files[0])} />
                  </label>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>Of plak URL:</span>
                  <input
                    className="form-input"
                    style={{ fontSize: 12 }}
                    value={urlInvoer}
                    onChange={e => verwerkUrlInvoer(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={onClose}>Annuleren</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={!naam.trim()}>
                  {bestaand ? 'Opslaan' : 'Toevoegen'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="search-bar" style={{ maxWidth: '100%' }}>
                <BookOpen size={14} color="var(--text-muted)" />
                <input placeholder="Zoek op naam of categorie..." value={zoek} onChange={e => setZoek(e.target.value)} style={{ flex: 1 }} />
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {gefilterd.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                    {bibliotheek.length === 0 ? 'Bibliotheek is leeg.' : 'Geen resultaten.'}
                  </p>
                )}
                {gefilterd.map(a => (
                  <div
                    key={a.id}
                    onClick={() => kiesUitBibliotheek(a)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg)', transition: 'border-color 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = config.kleur)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{a.naam}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.categorie}</div>
                    </div>
                    <span style={{ fontSize: 11, color: config.kleur, fontWeight: 500 }}>Kiezen →</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ activiteit, type, onClose }: {
  activiteit: WeekActiviteit
  type: ActType
  onClose: () => void
}) {
  const config = TYPE_CONFIG[type]

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        {/* Gekleurde top */}
        <div style={{ height: 5, background: config.kleur, borderRadius: '14px 14px 0 0' }} />

        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: config.bg, color: config.kleur, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {config.icon}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: config.kleur, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{config.label}</div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{activiteit.naam}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activiteit.beschrijving && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Beschrijving</div>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {activiteit.beschrijving}
              </p>
            </div>
          )}

          {activiteit.materialen.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Benodigdheden</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activiteit.materialen.map((m, i) => (
                  <span key={i} style={{ padding: '4px 12px', borderRadius: 20, background: config.bg, color: config.kleur, fontSize: 12, fontWeight: 500, border: `1px solid ${config.kleur}30` }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!activiteit.beschrijving && activiteit.materialen.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
              Geen extra informatie beschikbaar.
            </p>
          )}

          {activiteit.activiteit_id && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <ActiviteitBijlagen activiteitId={activiteit.activiteit_id} magBewerken={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
