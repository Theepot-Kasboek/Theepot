'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, ChevronDown, ChevronRight, Trash2,
  Calendar, Download, Eye, Upload, Pencil, GripVertical,
  BookOpen, ArrowLeft
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Planning {
  id: string
  naam: string
  vakantie: string
  thema: string
  start_datum: string
  eind_datum: string
  aangemaakt_door: string | null
  aangemaakt_op: string
}

interface Week {
  id: string
  planning_id: string
  week_nummer: number
  naam: string
}

interface VakantieActiviteit {
  id: string
  week_id: string
  dag: Dag
  volgorde: number
  categorie: string
  naam: string
  beschrijving: string | null
  activiteit_id: string | null
}

interface BibliotheekActiviteit {
  id: string
  naam: string
  categorie: string
  thema: string
  tijdsduur: number
}

type Dag = 'maandag' | 'dinsdag' | 'woensdag' | 'donderdag' | 'vrijdag'
const DAGEN: Dag[] = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']
const DAG_KORT: Record<Dag, string> = { maandag: 'Ma', dinsdag: 'Di', woensdag: 'Wo', donderdag: 'Do', vrijdag: 'Vr' }
const DAG_LABEL: Record<Dag, string> = { maandag: 'Maandag', dinsdag: 'Dinsdag', woensdag: 'Woensdag', donderdag: 'Donderdag', vrijdag: 'Vrijdag' }

const VAKANTIES = ['Herfstvakantie', 'Kerstvakantie', 'Voorjaarsvakantie', 'Meivakantie', 'Zomervakantie']
const STANDAARD_CATEGORIEEN = ['Knutsel', 'Groepsspel', 'Buiten', 'Koken', 'Overig']

function fmtDatum(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Hoofd component ──────────────────────────────────────────────────────────

export default function VakantieplanningenPage() {
  const { profiel } = useAuth()

  const [planningen, setPlanningen] = useState<Planning[]>([])
  const [actievePlanning, setActievePlanning] = useState<Planning | null>(null)
  const [weken, setWeken] = useState<Week[]>([])
  const [activiteiten, setActiviteiten] = useState<VakantieActiviteit[]>([])
  const [bibliotheek, setBibliotheek] = useState<BibliotheekActiviteit[]>([])
  const [laden, setLaden] = useState(false)
  const [actieveWeek, setActieveWeek] = useState<string | null>(null)
  const [weergave, setWeergave] = useState<'overzicht' | 'document'>('overzicht')
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  // Modals
  const [nieuwePlanningModal, setNieuwePlanningModal] = useState(false)
  const [nieuweWeekModal, setNieuweWeekModal] = useState(false)
  const [activiteitModal, setActiviteitModal] = useState<{ weekId: string; dag: Dag } | null>(null)
  const [jsonImportModal, setJsonImportModal] = useState<{ weekId: string; dag: Dag } | null>(null)
  const [bewerkActiviteit, setBewerkActiviteit] = useState<VakantieActiviteit | null>(null)

  // ── Data ophalen ────────────────────────────────────────────────────────────

  const haalPlanningenOp = useCallback(async () => {
    const { data } = await getSupabase().from('vakantie_planningen').select('*').order('start_datum', { ascending: false })
    setPlanningen((data ?? []) as Planning[])
  }, [])

  const haalWekenOp = useCallback(async (planningId: string) => {
    const { data } = await getSupabase().from('vakantie_weken').select('*').eq('planning_id', planningId).order('week_nummer')
    setWeken((data ?? []) as Week[])
    if (data && data.length > 0) setActieveWeek(data[0].id)
  }, [])

  const haalActiviteitenOp = useCallback(async (planningId: string) => {
    const weekIds = weken.map(w => w.id)
    if (weekIds.length === 0) return
    const { data } = await getSupabase().from('vakantie_activiteiten').select('*').in('week_id', weekIds).order('volgorde')
    setActiviteiten((data ?? []) as VakantieActiviteit[])
  }, [weken])

  const haalBibliotheekOp = useCallback(async () => {
    const { data } = await getSupabase().from('activiteiten').select('id, naam, categorie, thema, tijdsduur').order('naam')
    setBibliotheek((data ?? []) as BibliotheekActiviteit[])
  }, [])

  useEffect(() => { haalPlanningenOp(); haalBibliotheekOp() }, [haalPlanningenOp, haalBibliotheekOp])
  useEffect(() => { if (actievePlanning) haalWekenOp(actievePlanning.id) }, [actievePlanning, haalWekenOp])
  useEffect(() => { if (actievePlanning) haalActiviteitenOp(actievePlanning.id) }, [weken, actievePlanning, haalActiviteitenOp])

  // ── Acties ──────────────────────────────────────────────────────────────────

  async function maakPlanning(data: Omit<Planning, 'id' | 'aangemaakt_door' | 'aangemaakt_op'>) {
    const { data: nieuw, error } = await getSupabase().from('vakantie_planningen').insert({ ...data, aangemaakt_door: profiel?.id }).select().single()
    if (error) { setToast({ bericht: 'Mislukt: ' + error.message, type: 'error' }); return }
    setToast({ bericht: `${data.naam} aangemaakt!`, type: 'success' })
    setNieuwePlanningModal(false)
    await haalPlanningenOp()
    setActievePlanning(nieuw as Planning)
  }

  async function verwijderPlanning(id: string) {
    if (!confirm('Planning verwijderen? Alle weken en activiteiten gaan verloren.')) return
    await getSupabase().from('vakantie_planningen').delete().eq('id', id)
    setActievePlanning(null)
    setWeken([])
    setActiviteiten([])
    await haalPlanningenOp()
    setToast({ bericht: 'Planning verwijderd.', type: 'success' })
  }

  async function maakWeek(naam: string) {
    if (!actievePlanning) return
    const weekNr = weken.length + 1
    const { error } = await getSupabase().from('vakantie_weken').insert({ planning_id: actievePlanning.id, week_nummer: weekNr, naam })
    if (error) { setToast({ bericht: 'Mislukt: ' + error.message, type: 'error' }); return }
    setNieuweWeekModal(false)
    setToast({ bericht: `Week ${weekNr} toegevoegd!`, type: 'success' })
    await haalWekenOp(actievePlanning.id)
  }

  async function voegActiviteitToe(data: Omit<VakantieActiviteit, 'id'>) {
    const { error } = await getSupabase().from('vakantie_activiteiten').insert(data)
    if (error) { setToast({ bericht: 'Mislukt: ' + error.message, type: 'error' }); return }
    setActiviteitModal(null)
    setToast({ bericht: 'Activiteit toegevoegd!', type: 'success' })
    await haalActiviteitenOp(actievePlanning!.id)
  }

  async function bewerkActiviteitOp(id: string, data: Partial<VakantieActiviteit>) {
    await getSupabase().from('vakantie_activiteiten').update(data).eq('id', id)
    setBewerkActiviteit(null)
    setActiviteitModal(null)
    await haalActiviteitenOp(actievePlanning!.id)
  }

  async function verwijderActiviteit(id: string) {
    await getSupabase().from('vakantie_activiteiten').delete().eq('id', id)
    await haalActiviteitenOp(actievePlanning!.id)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
  }

  async function importeerJsonActiviteiten(weekId: string, dag: Dag, json: string) {
    try {
      const arr = JSON.parse(json)
      const items = Array.isArray(arr) ? arr : [arr]
      const huidigeVolgorde = activiteiten.filter(a => a.week_id === weekId && a.dag === dag).length

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        await getSupabase().from('vakantie_activiteiten').insert({
          week_id: weekId,
          dag,
          volgorde: huidigeVolgorde + i,
          categorie: item.categorie || 'Overig',
          naam: item.naam || item.name || 'Activiteit',
          beschrijving: item.beschrijving || item.description || null,
          activiteit_id: null,
        })
      }
      setJsonImportModal(null)
      setToast({ bericht: `${items.length} activiteiten geïmporteerd!`, type: 'success' })
      await haalActiviteitenOp(actievePlanning!.id)
    } catch {
      setToast({ bericht: 'Ongeldige JSON', type: 'error' })
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function activiteitenVan(weekId: string, dag: Dag) {
    return activiteiten.filter(a => a.week_id === weekId && a.dag === dag).sort((a, b) => a.volgorde - b.volgorde)
  }

  function dagDatumStr(week: Week, dag: Dag): string {
    if (!actievePlanning) return ''
    try {
      const start = new Date(actievePlanning.start_datum)
      const dow = start.getDay() === 0 ? 6 : start.getDay() - 1
      const eersteMA = new Date(start)
      eersteMA.setDate(start.getDate() - dow)
      const dagIdx = DAGEN.indexOf(dag)
      const target = new Date(eersteMA)
      target.setDate(eersteMA.getDate() + (week.week_nummer - 1) * 7 + dagIdx)
      return target.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    } catch { return '' }
  }

  // ─── OVERZICHT tabblad ────────────────────────────────────────────────────────

  if (!actievePlanning) {
    return (
      <>
        <Topbar
          titel="Vakantieplanningen"
          subtitel={`${planningen.length} planningen`}
          acties={
            <button className="btn btn-primary" onClick={() => setNieuwePlanningModal(true)}>
              <Plus size={14} /> Nieuwe planning
            </button>
          }
        />
        <div className="page-content">
          {planningen.length === 0 ? (
            <div className="empty-state">
              <Calendar size={36} />
              <h3>Geen planningen</h3>
              <p>Maak een eerste vakantieplanning aan.</p>
              <button className="btn btn-primary" onClick={() => setNieuwePlanningModal(true)}>
                <Plus size={14} /> Nieuwe planning
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {planningen.map(p => (
                <div
                  key={p.id}
                  className="card"
                  style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ height: 4, background: 'var(--primary)', borderRadius: '12px 12px 0 0' }} />
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{p.naam}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.vakantie} — {p.thema}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); verwijderPlanning(p.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.5, padding: 4, display: 'flex' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                      📅 {fmtDatum(p.start_datum)} — {fmtDatum(p.eind_datum)}
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setActievePlanning(p)}>
                      Openen <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {nieuwePlanningModal && (
          <NieuwePlanningModal onSave={maakPlanning} onClose={() => setNieuwePlanningModal(false)} />
        )}
        {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
      </>
    )
  }

  // ─── Planning geopend ────────────────────────────────────────────────────────

  const actieveWeekObj = weken.find(w => w.id === actieveWeek)

  return (
    <>
      <Topbar
        titel={actievePlanning.naam}
        subtitel={`${actievePlanning.vakantie} · ${actievePlanning.thema} · ${fmtDatum(actievePlanning.start_datum)} – ${fmtDatum(actievePlanning.eind_datum)}`}
        acties={
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Weergave toggle */}
            <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {(['overzicht', 'document'] as const).map(w => (
                <button key={w} onClick={() => setWeergave(w)} style={{ padding: '6px 12px', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: weergave === w ? 'var(--primary)' : 'transparent', color: weergave === w ? '#fff' : 'var(--text-muted)', transition: 'all 0.12s', textTransform: 'capitalize' }}>
                  {w === 'overzicht' ? '📅 Overzicht' : '📄 Document'}
                </button>
              ))}
            </div>
            <button className="btn" onClick={() => { setActievePlanning(null); setWeken([]); setActiviteiten([]) }}>
              <ArrowLeft size={14} /> Terug
            </button>
          </div>
        }
      />

      <div className="page-content">

        {/* Week tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {weken.map(w => (
            <button
              key={w.id}
              onClick={() => setActieveWeek(w.id)}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s', borderColor: actieveWeek === w.id ? 'var(--primary)' : 'var(--border-dark)', background: actieveWeek === w.id ? 'var(--primary)' : 'var(--bg-card)', color: actieveWeek === w.id ? '#fff' : 'var(--text)' }}
            >
              Week {w.week_nummer} — {w.naam}
            </button>
          ))}
          <button className="btn btn-sm" onClick={() => setNieuweWeekModal(true)}>
            <Plus size={13} /> Week toevoegen
          </button>
        </div>

        {/* Weergave */}
        {weergave === 'overzicht' && actieveWeekObj && (
          <WeekOverzicht
            week={actieveWeekObj}
            activiteiten={activiteiten}
            planning={actievePlanning}
            dagDatumStr={dagDatumStr}
            onNieuw={(dag) => { setBewerkActiviteit(null); setActiviteitModal({ weekId: actieveWeekObj.id, dag }) }}
            onBewerk={(a) => { setBewerkActiviteit(a); setActiviteitModal({ weekId: a.week_id, dag: a.dag }) }}
            onVerwijder={verwijderActiviteit}
            onJsonImport={(dag) => setJsonImportModal({ weekId: actieveWeekObj.id, dag })}
            bibliotheek={bibliotheek}
          />
        )}

        {weergave === 'document' && (
          <DocumentWeergave
            planning={actievePlanning}
            weken={weken}
            activiteiten={activiteiten}
            dagDatumStr={dagDatumStr}
          />
        )}
      </div>

      {/* Modals */}
      {nieuweWeekModal && (
        <NieuweWeekModal weekNr={weken.length + 1} onSave={maakWeek} onClose={() => setNieuweWeekModal(false)} />
      )}

      {activiteitModal && (
        <ActiviteitToevoegenModal
          weekId={activiteitModal.weekId}
          dag={activiteitModal.dag}
          activiteit={bewerkActiviteit}
          bibliotheek={bibliotheek}
          volgorde={activiteiten.filter(a => a.week_id === activiteitModal.weekId && a.dag === activiteitModal.dag).length}
          onSave={voegActiviteitToe}
          onBewerk={(id, data) => bewerkActiviteitOp(id, data)}
          onClose={() => { setActiviteitModal(null); setBewerkActiviteit(null) }}
        />
      )}

      {jsonImportModal && (
        <JsonDagImportModal
          dag={jsonImportModal.dag}
          onImport={(json) => importeerJsonActiviteiten(jsonImportModal.weekId, jsonImportModal.dag, json)}
          onClose={() => setJsonImportModal(null)}
        />
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Week Overzicht tabel ─────────────────────────────────────────────────────

function WeekOverzicht({ week, activiteiten, planning, dagDatumStr, onNieuw, onBewerk, onVerwijder, onJsonImport, bibliotheek }: {
  week: Week
  activiteiten: VakantieActiviteit[]
  planning: Planning
  dagDatumStr: (week: Week, dag: Dag) => string
  onNieuw: (dag: Dag) => void
  onBewerk: (a: VakantieActiviteit) => void
  onVerwijder: (id: string) => void
  onJsonImport: (dag: Dag) => void
  bibliotheek: BibliotheekActiviteit[]
}) {
  function activiteitenVan(dag: Dag) {
    return activiteiten.filter(a => a.week_id === week.id && a.dag === dag).sort((a, b) => a.volgorde - b.volgorde)
  }

  const maxRijen = Math.max(...DAGEN.map(d => activiteitenVan(d).length), 3)

  return (
    <div>
      {/* Week header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
            Week {week.week_nummer} — {week.naam}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {planning.thema} · {planning.vakantie}
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: 110, padding: '10px 12px', background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 12, textAlign: 'left', borderRadius: '8px 0 0 0', border: '1px solid var(--primary-dark)' }}>
                Dag + datum
              </th>
              {DAGEN.map((dag, i) => (
                <th key={dag} style={{ padding: '10px 12px', background: 'var(--primary)', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13, textAlign: 'left', border: '1px solid var(--primary-dark)', borderRadius: i === DAGEN.length - 1 ? '0 8px 0 0' : 0 }}>
                  <div style={{ fontWeight: 700 }}>{DAG_LABEL[dag]}</div>
                  <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400 }}>{dagDatumStr(week, dag)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRijen }).map((_, rijIdx) => {
              const heeftInhoud = DAGEN.some(dag => activiteitenVan(dag)[rijIdx])
              return (
                <tr key={rijIdx} style={{ background: rijIdx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg)' }}>
                  {/* Categorie kolom */}
                  <td style={{ padding: '8px 12px', border: '1px solid var(--border)', fontWeight: 500, fontSize: 12, color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                    {DAGEN.map(dag => activiteitenVan(dag)[rijIdx]?.categorie).find(Boolean) ?? ''}
                  </td>
                  {/* Dag kolommen */}
                  {DAGEN.map(dag => {
                    const act = activiteitenVan(dag)[rijIdx]
                    return (
                      <td key={dag} style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle', minWidth: 140 }}>
                        {act ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              onClick={() => onBewerk(act)}
                              style={{ color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, flex: 1, fontWeight: 500 }}
                            >
                              {act.naam}
                            </span>
                            <button onClick={() => onVerwijder(act.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.4, padding: '2px 3px', display: 'flex', flexShrink: 0, transition: 'opacity 0.1s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onNieuw(dag)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-dark)', fontSize: 12, padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 4, opacity: 0.5, transition: 'opacity 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                          >
                            <Plus size={11} />
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {/* Toevoegen rij */}
            <tr>
              <td style={{ padding: '6px 10px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              {DAGEN.map(dag => (
                <td key={dag} style={{ padding: '6px 10px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => onNieuw(dag)}
                      className="btn btn-sm"
                      style={{ fontSize: 11, padding: '3px 8px', flex: 1, justifyContent: 'center' }}
                    >
                      <Plus size={11} /> Activiteit
                    </button>
                    <button
                      onClick={() => onJsonImport(dag)}
                      className="btn btn-sm"
                      style={{ fontSize: 11, padding: '3px 6px' }}
                      title="JSON importeren"
                    >
                      <Upload size={11} />
                    </button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Document weergave ────────────────────────────────────────────────────────

function DocumentWeergave({ planning, weken, activiteiten, dagDatumStr }: {
  planning: Planning
  weken: Week[]
  activiteiten: VakantieActiviteit[]
  dagDatumStr: (week: Week, dag: Dag) => string
}) {
  function activiteitenVan(weekId: string, dag: Dag) {
    return activiteiten.filter(a => a.week_id === weekId && a.dag === dag).sort((a, b) => a.volgorde - b.volgorde)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Titel */}
      <div style={{ textAlign: 'center', marginBottom: 32, padding: '24px 0' }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: 6 }}>{planning.naam}</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{planning.vakantie} · Thema: {planning.thema} · {fmtDatum(planning.start_datum)} – {fmtDatum(planning.eind_datum)}</div>
      </div>

      {/* Per week */}
      {weken.map(week => {
        const maxRijen = Math.max(...DAGEN.map(d => activiteitenVan(week.id, d).length), 2)
        return (
          <div key={week.id} style={{ marginBottom: 48 }}>
            {/* Week titel */}
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 14 }}>
              Week {week.week_nummer} — {week.naam}
            </h2>

            {/* Tabel */}
            <div style={{ overflowX: 'auto', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: 100, padding: '10px 14px', background: '#DC2626', color: '#fff', fontWeight: 700, fontSize: 12, textAlign: 'left', border: '1px solid rgba(0,0,0,0.1)' }}>
                      Dag + datum
                    </th>
                    {DAGEN.map(dag => (
                      <th key={dag} style={{ padding: '10px 14px', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 13, textAlign: 'left', border: '1px solid var(--primary-dark)' }}>
                        <a href={`#week-${week.week_nummer}-${dag}`} style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                          {DAG_LABEL[dag]}
                        </a>
                        <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>{dagDatumStr(week, dag)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: maxRijen }).map((_, rijIdx) => (
                    <tr key={rijIdx} style={{ background: rijIdx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg)' }}>
                      <td style={{ padding: '8px 14px', border: '1px solid var(--border)', fontWeight: 500, fontSize: 12, color: 'var(--text-muted)' }}>
                        {DAGEN.map(dag => activiteitenVan(week.id, dag)[rijIdx]?.categorie).find(Boolean) ?? ''}
                      </td>
                      {DAGEN.map(dag => {
                        const act = activiteitenVan(week.id, dag)[rijIdx]
                        return (
                          <td key={dag} style={{ padding: '8px 14px', border: '1px solid var(--border)' }}>
                            {act && (
                              <a
                                href={`#act-${act.id}`}
                                style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 500, textUnderlineOffset: 2 }}
                              >
                                {act.naam}
                              </a>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detail per dag */}
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
              {DAGEN.map(dag => {
                const dagActs = activiteitenVan(week.id, dag)
                if (dagActs.length === 0) return null
                return (
                  <div key={dag} id={`week-${week.week_nummer}-${dag}`}>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, padding: '8px 14px', background: 'var(--primary)', color: '#fff', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{DAG_LABEL[dag]}</span>
                      <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.9 }}>{dagDatumStr(week, dag)}</span>
                    </div>
                    <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                      {dagActs.map((act, i) => (
                        <div
                          key={act.id}
                          id={`act-${act.id}`}
                          style={{ padding: '14px 18px', borderBottom: i < dagActs.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: act.beschrijving ? 6 : 0 }}>
                            <span style={{ background: 'var(--primary-light)', color: 'var(--primary-text)', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{act.categorie}</span>
                            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14 }}>{act.naam}</span>
                          </div>
                          {act.beschrijving && (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{act.beschrijving}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function NieuwePlanningModal({ onSave, onClose }: {
  onSave: (data: Omit<Planning, 'id' | 'aangemaakt_door' | 'aangemaakt_op'>) => void
  onClose: () => void
}) {
  const [naam, setNaam] = useState('')
  const [vakantie, setVakantie] = useState(VAKANTIES[4])
  const [thema, setThema] = useState('')
  const [startDatum, setStartDatum] = useState('')
  const [eindDatum, setEindDatum] = useState('')

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Nieuwe vakantieplanning</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Naam planning *</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. Zomervakantie 2026 — BSO De Theepot" autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Vakantie</label>
              <select className="form-select" value={vakantie} onChange={e => setVakantie(e.target.value)}>
                {VAKANTIES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Thema</label>
              <input className="form-input" value={thema} onChange={e => setThema(e.target.value)} placeholder="Bijv. Jungle, Ruimte..." />
            </div>
            <div>
              <label className="form-label">Startdatum</label>
              <input type="date" className="form-input" value={startDatum} onChange={e => setStartDatum(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Einddatum</label>
              <input type="date" className="form-input" value={eindDatum} onChange={e => setEindDatum(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => naam && thema && startDatum && eindDatum && onSave({ naam, vakantie, thema, start_datum: startDatum, eind_datum: eindDatum })} disabled={!naam || !thema || !startDatum || !eindDatum}>
              Aanmaken
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NieuweWeekModal({ weekNr, onSave, onClose }: { weekNr: number; onSave: (naam: string) => void; onClose: () => void }) {
  const [naam, setNaam] = useState('')
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Week {weekNr} toevoegen</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Naam / thema week</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. Theepot Groen" autoFocus onKeyDown={e => e.key === 'Enter' && naam && onSave(naam)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => naam && onSave(naam)} disabled={!naam}>Toevoegen</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActiviteitToevoegenModal({ weekId, dag, activiteit, bibliotheek, volgorde, onSave, onBewerk, onClose }: {
  weekId: string
  dag: Dag
  activiteit: VakantieActiviteit | null
  bibliotheek: BibliotheekActiviteit[]
  volgorde: number
  onSave: (data: Omit<VakantieActiviteit, 'id'>) => void
  onBewerk: (id: string, data: Partial<VakantieActiviteit>) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'handmatig' | 'bibliotheek'>('handmatig')
  const [naam, setNaam] = useState(activiteit?.naam ?? '')
  const [categorie, setCategorie] = useState(activiteit?.categorie ?? STANDAARD_CATEGORIEEN[0])
  const [beschrijving, setBeschrijving] = useState(activiteit?.beschrijving ?? '')
  const [zoek, setZoek] = useState('')
  const [categorieen, setCategorieen] = useState<string[]>(STANDAARD_CATEGORIEEN)

  useEffect(() => {
    getSupabase().from('kasboek_categorieen').select('naam').then(({ data }) => {
      if (data && data.length > 0) setCategorieen(data.map((r: { naam: string }) => r.naam))
    })
  }, [])

  const gefilterd = bibliotheek.filter(a =>
    !zoek || a.naam.toLowerCase().includes(zoek.toLowerCase()) || a.categorie.toLowerCase().includes(zoek.toLowerCase())
  )

  function handleSave() {
    if (!naam.trim()) return
    const data = { week_id: weekId, dag, volgorde, categorie, naam: naam.trim(), beschrijving: beschrijving.trim() || null, activiteit_id: null }
    if (activiteit) onBewerk(activiteit.id, data)
    else onSave(data)
  }

  function kiesUitBibliotheek(a: BibliotheekActiviteit) {
    setNaam(a.naam)
    setCategorie(a.categorie)
    setTab('handmatig')
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{activiteit ? 'Activiteit bewerken' : `Activiteit toevoegen — ${DAG_LABEL[dag]}`}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {(['handmatig', 'bibliotheek'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.12s' }}>
              {t === 'handmatig' ? '✏️ Handmatig' : '📚 Uit bibliotheek'}
            </button>
          ))}
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'handmatig' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Naam activiteit *</label>
                  <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Naam van de activiteit" autoFocus />
                </div>
                <div>
                  <label className="form-label">Categorie</label>
                  <input className="form-input" value={categorie} onChange={e => setCategorie(e.target.value)} list="cat-lijst" placeholder="Bijv. Knutsel, Groepsspel..." />
                  <datalist id="cat-lijst">
                    {STANDAARD_CATEGORIEEN.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="form-label">Beschrijving (optioneel)</label>
                <textarea className="form-textarea" value={beschrijving} onChange={e => setBeschrijving(e.target.value)} placeholder="Korte omschrijving van de activiteit..." style={{ minHeight: 80 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={onClose}>Annuleren</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={!naam.trim()}>
                  {activiteit ? 'Opslaan' : 'Toevoegen'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="search-bar" style={{ maxWidth: '100%' }}>
                <BookOpen size={14} color="var(--text-muted)" />
                <input placeholder="Zoek op naam of categorie..." value={zoek} onChange={e => setZoek(e.target.value)} style={{ flex: 1 }} />
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {gefilterd.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Geen activiteiten gevonden.</p>}
                {gefilterd.map(a => (
                  <div key={a.id} onClick={() => kiesUitBibliotheek(a)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg)', transition: 'border-color 0.12s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{a.naam}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                        <span>{a.categorie}</span>
                        {a.thema && <span>· {a.thema}</span>}
                        <span>· {a.tijdsduur} min</span>
                      </div>
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
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

function JsonDagImportModal({ dag, onImport, onClose }: { dag: Dag; onImport: (json: string) => void; onClose: () => void }) {
  const [json, setJson] = useState('')
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">JSON importeren — {DAG_LABEL[dag]}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Plak een JSON array met activiteiten voor {DAG_LABEL[dag]}. Verwacht formaat:
          </p>
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {`[{ "naam": "Activiteitnaam", "categorie": "Knutsel", "beschrijving": "..." }]`}
          </div>
          <textarea className="form-textarea" style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 12 }} value={json} onChange={e => setJson(e.target.value)} placeholder='[{ "naam": "...", "categorie": "..." }]' />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => onImport(json)} disabled={!json.trim()}>Importeren</button>
          </div>
        </div>
      </div>
    </div>
  )
}


