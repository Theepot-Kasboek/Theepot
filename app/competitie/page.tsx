'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import { Trophy, X } from 'lucide-react'

// ─── Config ─────────────────────────────────────────────────────────────────

const LOCATIES = [
  { naam: 'Lisse', kleur: '#e53e3e' },
  { naam: 'Brede', kleur: '#4dd0e1' },
  { naam: 'Reiger', kleur: '#d946ef' },
  { naam: 'Giraf', kleur: '#f0932b' },
  { naam: 'Vosse', kleur: '#f7e400' },
  { naam: 'SDO', kleur: '#7c7ce0' },
]
const DAGEN = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag']

const SLEUTEL_KIKKERS = 'kikkers'
const SLEUTEL_DIERENKRING = 'dierenkring'
const SLEUTEL_ROZE_ROOD = 'roze_rood'
const SLEUTEL_ROZE_ROOD_BONUS = 'roze_rood_bonus'

type KikkerData = Record<string, number | null>
type DierenkringData = Record<string, (number | null)[]>
interface RozeRoodDag { uitgevoerd: boolean; foto: boolean; pper: boolean; gesloten: boolean }
type RozeRoodData = Record<string, RozeRoodDag[]>
type RozeRoodBonusData = (string | null)[]

function legeKikkerData(): KikkerData {
  const d: KikkerData = {}
  LOCATIES.forEach(l => { d[l.naam] = null })
  return d
}
function legeDierenkringData(): DierenkringData {
  const d: DierenkringData = {}
  LOCATIES.forEach(l => { d[l.naam] = [null, null, null, null, null] })
  return d
}
function legeRozeRoodDag(): RozeRoodDag {
  return { uitgevoerd: false, foto: false, pper: false, gesloten: false }
}
function legeRozeRoodData(): RozeRoodData {
  const d: RozeRoodData = {}
  LOCATIES.forEach(l => { d[l.naam] = DAGEN.map(() => legeRozeRoodDag()) })
  return d
}
function legeBonusData(): RozeRoodBonusData {
  return DAGEN.map(() => null)
}

function dierenkringBeste(data: DierenkringData, naam: string): number {
  return Math.max(0, ...(data[naam] ?? []).map(v => v || 0))
}

function rozeRoodDagPunten(dag: RozeRoodDag | undefined): number {
  if (!dag) return 0
  if (dag.gesloten) return 10 + (dag.pper ? 5 : 0)
  return (dag.uitgevoerd ? 5 : 0) + (dag.foto ? 5 : 0) + (dag.pper ? 5 : 0)
}

function rozeRoodTotaal(data: RozeRoodData, bonus: RozeRoodBonusData, naam: string): number {
  const dagen = data[naam] ?? []
  const basis = dagen.reduce((som, dag) => som + rozeRoodDagPunten(dag), 0)
  const bonusPunten = bonus.filter(winnaar => winnaar === naam).length * 5
  return basis + bonusPunten
}

// ─── Pagina ─────────────────────────────────────────────────────────────────

export default function CompetitiePage() {
  const [kikkerData, setKikkerData] = useState<KikkerData>(legeKikkerData())
  const [dierenkringData, setDierenkringData] = useState<DierenkringData>(legeDierenkringData())
  const [rozeRoodData, setRozeRoodData] = useState<RozeRoodData>(legeRozeRoodData())
  const [bonusData, setBonusData] = useState<RozeRoodBonusData>(legeBonusData())
  const [laden, setLaden] = useState(true)
  const [bewerkCel, setBewerkCel] = useState<{ locatie: string; dagIndex: number } | null>(null)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  const haalOp = useCallback(async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('competitie_data')
      .select('sleutel, waarde')
      .in('sleutel', [SLEUTEL_KIKKERS, SLEUTEL_DIERENKRING, SLEUTEL_ROZE_ROOD, SLEUTEL_ROZE_ROOD_BONUS])

    if (error) { setLaden(false); return }

    const rijen = new Map((data ?? []).map((r: { sleutel: string; waarde: unknown }) => [r.sleutel, r.waarde]))

    const kikkers = rijen.get(SLEUTEL_KIKKERS) as KikkerData | undefined
    const dierenkring = rijen.get(SLEUTEL_DIERENKRING) as DierenkringData | undefined
    const rozeRood = rijen.get(SLEUTEL_ROZE_ROOD) as RozeRoodData | undefined
    const bonus = rijen.get(SLEUTEL_ROZE_ROOD_BONUS) as RozeRoodBonusData | undefined

    const gevuldeKikkers = legeKikkerData()
    const gevuldeDierenkring = legeDierenkringData()
    const gevuldeRozeRood = legeRozeRoodData()
    LOCATIES.forEach(l => {
      if (kikkers && l.naam in kikkers) gevuldeKikkers[l.naam] = kikkers[l.naam]
      if (dierenkring && dierenkring[l.naam]) gevuldeDierenkring[l.naam] = dierenkring[l.naam]
      if (rozeRood && rozeRood[l.naam]) gevuldeRozeRood[l.naam] = rozeRood[l.naam]
    })

    setKikkerData(gevuldeKikkers)
    setDierenkringData(gevuldeDierenkring)
    setRozeRoodData(gevuldeRozeRood)
    setBonusData(bonus && bonus.length === DAGEN.length ? bonus : legeBonusData())
    setLaden(false)
  }, [])

  useEffect(() => {
    haalOp()
    const supabase = getSupabase()
    const channel = supabase
      .channel('competitie-data-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitie_data' }, () => haalOp())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [haalOp])

  async function opslaan(sleutel: string, waarde: unknown) {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('competitie_data')
      .upsert({ sleutel, waarde, bijgewerkt_op: new Date().toISOString() })
    if (error) setToast({ bericht: 'Opslaan mislukt: ' + error.message, type: 'error' })
  }

  async function updateKikker(naam: string, waarde: string) {
    const val = waarde === '' ? null : Math.max(0, parseInt(waarde) || 0)
    const nieuw = { ...kikkerData, [naam]: val }
    setKikkerData(nieuw)
    await opslaan(SLEUTEL_KIKKERS, nieuw)
  }

  async function updateDierenkring(naam: string, dagIndex: number, waarde: string) {
    const val = waarde === '' ? null : Math.max(0, parseInt(waarde) || 0)
    const rij = [...(dierenkringData[naam] ?? [])]
    rij[dagIndex] = val
    const nieuw = { ...dierenkringData, [naam]: rij }
    setDierenkringData(nieuw)
    await opslaan(SLEUTEL_DIERENKRING, nieuw)
  }

  async function updateRozeRoodDag(naam: string, dagIndex: number, wijziging: Partial<RozeRoodDag>) {
    const rij = [...(rozeRoodData[naam] ?? DAGEN.map(() => legeRozeRoodDag()))]
    const huidig = rij[dagIndex] ?? legeRozeRoodDag()
    const nieuweDag: RozeRoodDag = { ...huidig, ...wijziging }
    if (nieuweDag.gesloten) { nieuweDag.uitgevoerd = true; nieuweDag.foto = true }
    rij[dagIndex] = nieuweDag
    const nieuw = { ...rozeRoodData, [naam]: rij }
    setRozeRoodData(nieuw)
    await opslaan(SLEUTEL_ROZE_ROOD, nieuw)
  }

  async function updateBonus(dagIndex: number, locatieNaam: string) {
    const nieuw = [...bonusData]
    nieuw[dagIndex] = locatieNaam === '' ? null : locatieNaam
    setBonusData(nieuw)
    await opslaan(SLEUTEL_ROZE_ROOD_BONUS, nieuw)
  }

  async function resetKikkers() {
    if (!confirm('Weet je zeker dat je de kikkerscores wilt resetten?')) return
    const nieuw = legeKikkerData()
    setKikkerData(nieuw)
    await opslaan(SLEUTEL_KIKKERS, nieuw)
  }
  async function resetDierenkring() {
    if (!confirm('Weet je zeker dat je de week dierenkring wilt resetten?')) return
    const nieuw = legeDierenkringData()
    setDierenkringData(nieuw)
    await opslaan(SLEUTEL_DIERENKRING, nieuw)
  }
  async function resetRozeRood() {
    if (!confirm('Weet je zeker dat je het Roze/Rood puntenschema wilt resetten?')) return
    const nieuwData = legeRozeRoodData()
    const nieuwBonus = legeBonusData()
    setRozeRoodData(nieuwData)
    setBonusData(nieuwBonus)
    await opslaan(SLEUTEL_ROZE_ROOD, nieuwData)
    await opslaan(SLEUTEL_ROZE_ROOD_BONUS, nieuwBonus)
  }

  // Ranglijst: kikkers + dierenkring (beste dag) + roze/rood totaal
  const ranglijst = LOCATIES.map(loc => {
    const kikkers = kikkerData[loc.naam] || 0
    const dieren = dierenkringBeste(dierenkringData, loc.naam)
    const rozeRood = rozeRoodTotaal(rozeRoodData, bonusData, loc.naam)
    return { ...loc, kikkers, dieren, rozeRood, totaal: kikkers + dieren + rozeRood }
  }).sort((a, b) => b.totaal - a.totaal)
  const topTotaal = ranglijst[0]?.totaal ?? 0
  const maxTotaal = Math.max(1, ...ranglijst.map(r => r.totaal))

  if (laden) {
    return (
      <>
        <Topbar titel="Competitie Activiteiten" subtitel="Laden..." />
        <div className="page-content"><div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div></div>
      </>
    )
  }

  return (
    <>
      <Topbar titel="🏆 Competitie Activiteiten" subtitel="Gedeelde gegevens — iedereen ziet dezelfde stand" />
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Week 1: Kikkers */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🐸 Week 1 — Kikkers zoeken</span>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Eindscore per locatie (totaal aantal gevonden kikkers van de hele week)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStijl('left')}>Locatie</th>
                    <th style={thStijl()}>Eindscore kikkers</th>
                  </tr>
                </thead>
                <tbody>
                  {LOCATIES.map(loc => (
                    <tr key={loc.naam}>
                      <td style={locCelStijl(loc.kleur)}>{loc.naam}</td>
                      <td style={tdStijl()}>
                        <input
                          type="number" min="0" className="form-input" style={{ width: 90, textAlign: 'center', margin: '0 auto' }}
                          value={kikkerData[loc.naam] ?? ''} placeholder="0"
                          onChange={e => updateKikker(loc.naam, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button className="btn btn-sm" onClick={resetKikkers}>Kikkers resetten</button>
            </div>
          </div>
        </div>

        {/* Week 2: Dierenkring */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🖤🤍 Week 2 — Zwart/Wit Dierenkring</span>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
              Hoeveel verschillende zwart/witte dieren zijn er per dag opgenoemd? Alleen de <strong>hoogste dagscore</strong> van de week telt mee voor de totale ranglijst.
            </div>
            <div style={{ background: 'var(--bg)', borderLeft: '4px solid #2b2b2b', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              <strong>Spelregels:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>1 poging per groep per dag, maar er mag maar 1 score per dag per locatie worden doorgegeven</li>
                <li>Niet van tevoren overleggen welke dieren genoemd worden</li>
                <li>Vooraf opzoeken is niet toegestaan</li>
                <li>Het dier moet merendeel zwart, wit of zwart/wit zijn</li>
              </ul>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStijl('left')}>Locatie / dag</th>
                    {DAGEN.map(dag => <th key={dag} style={thStijl()}>{dag}</th>)}
                    <th style={thStijl()}>Beste dag</th>
                  </tr>
                </thead>
                <tbody>
                  {LOCATIES.map(loc => (
                    <tr key={loc.naam}>
                      <td style={locCelStijl(loc.kleur)}>{loc.naam}</td>
                      {DAGEN.map((dag, i) => (
                        <td key={dag} style={tdStijl()}>
                          <input
                            type="number" min="0" className="form-input" style={{ width: 64, textAlign: 'center', margin: '0 auto' }}
                            value={dierenkringData[loc.naam]?.[i] ?? ''} placeholder="0"
                            onChange={e => updateDierenkring(loc.naam, i, e.target.value)}
                          />
                        </td>
                      ))}
                      <td style={{ ...tdStijl(), fontWeight: 800, color: 'var(--text)' }}>{dierenkringBeste(dierenkringData, loc.naam)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button className="btn btn-sm" onClick={resetDierenkring}>Week dieren resetten</button>
            </div>
          </div>
        </div>

        {/* Week 3: Roze en Rood puntenschema */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🌸❤️ Week 3 — Roze en Rood puntenschema</span>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
              In de week van Roze en Rood verdien je punten per activiteit. Klik op een dag om de behaalde punten voor die locatie in te vullen.
            </div>
            <div style={{ background: 'var(--bg)', borderLeft: '4px solid #e53e7c', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              <strong>Puntensysteem:</strong>
              <ul style={{ margin: '6px 0 10px', paddingLeft: 18 }}>
                <li>Uitvoeren = 5 punten</li>
                <li>Foto delen in groepsapp = 5 punten</li>
                <li>PP&rsquo;er die deelneemt aan de activiteit (foto in groepsapp!) = 5 punten</li>
                <li>De foto met het meeste enthousiasme van kinderen krijgt 5 bonuspunten (1x per dag te verdienen)</li>
              </ul>
              <strong>Spelregels:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>Elke activiteit mag maximaal 1 keer per dag uitgevoerd worden (voor punten)</li>
                <li>Per activiteit telt er 1 doorgestuurde foto voor punten, ook als meerdere PP&rsquo;ers meedoen</li>
                <li>Is je locatie op een dag niet open? Dan krijg je automatisch de punten voor uitvoeren en foto delen voor alle activiteiten van die dag (vink &ldquo;Locatie niet open&rdquo; aan)</li>
                <li>Eén iemand per groep stuurt aan het einde van de dag de behaalde punten door</li>
              </ul>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStijl('left')}>Locatie / dag</th>
                    {DAGEN.map(dag => <th key={dag} style={thStijl()}>{dag}</th>)}
                    <th style={thStijl()}>Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {LOCATIES.map(loc => (
                    <tr key={loc.naam}>
                      <td style={locCelStijl(loc.kleur)}>{loc.naam}</td>
                      {DAGEN.map((dag, i) => {
                        const info = rozeRoodData[loc.naam]?.[i]
                        const punten = rozeRoodDagPunten(info)
                        const bonusGewonnen = bonusData[i] === loc.naam
                        return (
                          <td key={dag} style={tdStijl()}>
                            <button
                              onClick={() => setBewerkCel({ locatie: loc.naam, dagIndex: i })}
                              style={{
                                width: 56, height: 40, borderRadius: 8, cursor: 'pointer',
                                border: `2px solid ${punten > 0 ? loc.kleur : 'var(--border)'}`,
                                background: punten > 0 ? 'var(--bg-card)' : 'transparent',
                                fontWeight: 700, fontSize: 14, color: 'var(--text)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
                              }}
                            >
                              {punten + (bonusGewonnen ? 5 : 0)}{bonusGewonnen && <span style={{ fontSize: 11 }}>👑</span>}
                            </button>
                          </td>
                        )
                      })}
                      <td style={{ ...tdStijl(), fontWeight: 800, color: 'var(--text)' }}>{rozeRoodTotaal(rozeRoodData, bonusData, loc.naam)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...locCelStijl('transparent'), color: 'var(--text-muted)', fontWeight: 600 }}>Bonus enthousiasme 👑</td>
                    {DAGEN.map((dag, i) => (
                      <td key={dag} style={tdStijl()}>
                        <select
                          className="form-select" style={{ width: 92, fontSize: 12 }}
                          value={bonusData[i] ?? ''}
                          onChange={e => updateBonus(i, e.target.value)}
                        >
                          <option value="">—</option>
                          {LOCATIES.map(l => <option key={l.naam} value={l.naam}>{l.naam}</option>)}
                        </select>
                      </td>
                    ))}
                    <td style={tdStijl()}></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button className="btn btn-sm" onClick={resetRozeRood}>Roze/Rood resetten</button>
            </div>
          </div>
        </div>

        {/* Totale ranglijst */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Trophy size={16} style={{ marginRight: 6, verticalAlign: -3 }} />Totale ranglijst</span>
          </div>
          <div className="card-body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ranglijst.map((entry, i) => {
              const isLeader = topTotaal > 0 && entry.totaal === topTotaal
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
              const totaalPct = (entry.totaal / maxTotaal) * 100
              const kikkerAandeel = entry.totaal > 0 ? entry.kikkers / entry.totaal : 0
              const dierenAandeel = entry.totaal > 0 ? entry.dieren / entry.totaal : 0
              return (
                <div key={entry.naam} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 800, fontSize: 18, width: 28, textAlign: 'center' }}>{medal}</div>
                  <div style={{ fontWeight: 700, width: 90, flexShrink: 0, borderLeft: `6px solid ${entry.kleur}`, paddingLeft: 8 }}>{entry.naam}</div>
                  <div style={{
                    flex: 1, height: 30, background: 'var(--bg)', borderRadius: 6, overflow: 'hidden', display: 'flex', position: 'relative',
                    boxShadow: isLeader ? 'inset 0 0 0 2px var(--text)' : 'none',
                  }}>
                    <div style={{ height: '100%', background: '#4a8f2e', width: `${totaalPct * kikkerAandeel}%` }} />
                    <div style={{ height: '100%', background: '#2b2b2b', width: `${totaalPct * dierenAandeel}%` }} />
                    <div style={{ height: '100%', background: '#e53e7c', width: `${totaalPct * (entry.totaal > 0 ? entry.rozeRood / entry.totaal : 0)}%` }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', width: 150, flexShrink: 0 }}>🐸 {entry.kikkers} &nbsp; 🐾 {entry.dieren} &nbsp; 🌸 {entry.rozeRood}</div>
                  <div style={{ fontWeight: 800, fontSize: 17, width: 80, flexShrink: 0, textAlign: 'right' }}>{entry.totaal} pt</div>
                  <div style={{ width: 28, flexShrink: 0, textAlign: 'center', fontSize: 17 }}>{isLeader ? '👑' : ''}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {bewerkCel && (
        <RozeRoodModal
          locatie={bewerkCel.locatie}
          dagIndex={bewerkCel.dagIndex}
          dag={rozeRoodData[bewerkCel.locatie]?.[bewerkCel.dagIndex] ?? legeRozeRoodDag()}
          onWijzig={wijziging => updateRozeRoodDag(bewerkCel.locatie, bewerkCel.dagIndex, wijziging)}
          onClose={() => setBewerkCel(null)}
        />
      )}
      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

function RozeRoodModal({ locatie, dagIndex, dag, onWijzig, onClose }: {
  locatie: string
  dagIndex: number
  dag: RozeRoodDag
  onWijzig: (wijziging: Partial<RozeRoodDag>) => void
  onClose: () => void
}) {
  const punten = rozeRoodDagPunten(dag)
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{locatie} — {DAGEN[dagIndex]}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={rijStijl}>
            <input type="checkbox" checked={dag.gesloten} onChange={e => onWijzig({ gesloten: e.target.checked })} />
            <span>Locatie niet open (automatisch uitvoeren + foto)</span>
          </label>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2px 0' }} />
          <label style={rijStijl}>
            <input type="checkbox" checked={dag.uitgevoerd} disabled={dag.gesloten} onChange={e => onWijzig({ uitgevoerd: e.target.checked })} />
            <span>Uitgevoerd <em style={{ color: 'var(--text-muted)', fontStyle: 'normal' }}>(5 pt)</em></span>
          </label>
          <label style={rijStijl}>
            <input type="checkbox" checked={dag.foto} disabled={dag.gesloten} onChange={e => onWijzig({ foto: e.target.checked })} />
            <span>Foto gedeeld in groepsapp <em style={{ color: 'var(--text-muted)', fontStyle: 'normal' }}>(5 pt)</em></span>
          </label>
          <label style={rijStijl}>
            <input type="checkbox" checked={dag.pper} onChange={e => onWijzig({ pper: e.target.checked })} />
            <span>PP&rsquo;er deelgenomen <em style={{ color: 'var(--text-muted)', fontStyle: 'normal' }}>(5 pt)</em></span>
          </label>
          <div style={{ textAlign: 'center', marginTop: 8, fontWeight: 800, fontSize: 16 }}>Totaal deze dag: {punten} pt</div>
          <button className="btn btn-primary" onClick={onClose}>Klaar</button>
        </div>
      </div>
    </div>
  )
}

const rijStijl: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }

function thStijl(align: 'left' | 'center' = 'center'): React.CSSProperties {
  return { padding: '10px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', textAlign: align, background: 'var(--bg)' }
}
function tdStijl(): React.CSSProperties {
  return { padding: 8, textAlign: 'center', borderBottom: '1px solid var(--border)' }
}
function locCelStijl(kleur: string): React.CSSProperties {
  return { padding: '8px 12px', textAlign: 'left', fontWeight: 700, borderLeft: `4px solid ${kleur}`, borderBottom: '1px solid var(--border)' }
}
