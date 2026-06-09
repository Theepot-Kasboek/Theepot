'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, Trash2, Pencil, Car, Bus,
  ChevronRight, Calendar, AlertCircle, CheckCircle2,
  Settings
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Voertuig {
  id: string
  kenteken: string
  type: 'auto' | 'bus'
  omschrijving: string | null
  actief: boolean
  regelmaat_aantal: number
  regelmaat_eenheid: 'week' | 'maand' | 'kwartaal'
  aangemaakt_op: string
}

interface KmRegistratie {
  id: string
  voertuig_id: string
  kilometerstand: number
  datum: string
  notitie: string | null
  aangemaakt_op: string
  ingevoerd_door: string | null
  profiel_naam?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDatum(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtKenteken(k: string) {
  return k.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function regelmaatLabel(aantal: number, eenheid: string) {
  if (eenheid === 'week') return `Elke ${aantal === 1 ? '' : aantal + ' '}week${aantal > 1 ? 'en' : ''}`
  if (eenheid === 'kwartaal') return `Elk kwartaal`
  return `Elke ${aantal === 1 ? '' : aantal + ' '}maand${aantal > 1 ? 'en' : ''}`
}

function volgendeDatum(registraties: KmRegistratie[], voertuig: Voertuig): Date | null {
  if (registraties.length === 0) return null
  const laatste = new Date(registraties[0].datum)
  const volgende = new Date(laatste)
  if (voertuig.regelmaat_eenheid === 'week') volgende.setDate(volgende.getDate() + 7 * voertuig.regelmaat_aantal)
  else if (voertuig.regelmaat_eenheid === 'kwartaal') volgende.setMonth(volgende.getMonth() + 3)
  else volgende.setMonth(volgende.getMonth() + voertuig.regelmaat_aantal)
  return volgende
}

function statusKleur(volgende: Date | null) {
  if (!volgende) return '#888'
  const diff = volgende.getTime() - new Date().getTime()
  const dagen = diff / (1000 * 60 * 60 * 24)
  if (dagen < 0) return '#EF4444'
  if (dagen < 14) return '#F59E0B'
  return '#8CC63F'
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function KilometerstandenPage() {
  const { profiel, isSuperadmin } = useAuth()
  const [voertuigen, setVoertuigen] = useState<Voertuig[]>([])
  const [registraties, setRegistraties] = useState<Record<string, KmRegistratie[]>>({})
  const [actief, setActief] = useState<Voertuig | null>(null)
  const [laden, setLaden] = useState(true)
  const [voertuigModal, setVoertuigModal] = useState<Voertuig | 'nieuw' | null>(null)
  const [registratieModal, setRegistratieModal] = useState<Voertuig | null>(null)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data: vrtg } = await getSupabase().from('km_voertuigen').select('*').order('aangemaakt_op')
    setVoertuigen((vrtg ?? []) as Voertuig[])

    // Haal laatste 12 registraties per voertuig op
    if (vrtg && vrtg.length > 0) {
      const ids = vrtg.map((v: Voertuig) => v.id)
      const { data: regs } = await getSupabase()
        .from('km_registraties')
        .select('*, profielen(naam)')
        .in('voertuig_id', ids)
        .order('datum', { ascending: false })

      const gegroepeerd: Record<string, KmRegistratie[]> = {}
      for (const r of regs ?? []) {
        const reg = { ...r, profiel_naam: r.profielen?.naam }
        if (!gegroepeerd[r.voertuig_id]) gegroepeerd[r.voertuig_id] = []
        if (gegroepeerd[r.voertuig_id].length < 12) gegroepeerd[r.voertuig_id].push(reg)
      }
      setRegistraties(gegroepeerd)
    }
    setLaden(false)
  }, [])

  useEffect(() => { haalOp() }, [haalOp])

  async function verwijderVoertuig(id: string) {
    if (!confirm('Voertuig en alle registraties verwijderen?')) return
    await getSupabase().from('km_voertuigen').delete().eq('id', id)
    if (actief?.id === id) setActief(null)
    setToast({ bericht: 'Voertuig verwijderd.', type: 'success' })
    await haalOp()
  }

  async function verwijderRegistratie(id: string) {
    if (!confirm('Registratie verwijderen?')) return
    await getSupabase().from('km_registraties').delete().eq('id', id)
    setToast({ bericht: 'Registratie verwijderd.', type: 'success' })
    await haalOp()
  }

  const actiefRegs = actief ? (registraties[actief.id] ?? []) : []
  const actiefVolgende = actief ? volgendeDatum(actiefRegs, actief) : null
  const actiefStatus = statusKleur(actiefVolgende)

  return (
    <>
      <Topbar
        titel="Kilometerstanden"
        acties={
          isSuperadmin ? (
            <button className="btn btn-primary" onClick={() => setVoertuigModal('nieuw')}>
              <Plus size={14} /> Voertuig toevoegen
            </button>
          ) : undefined
        }
      />

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>

          {/* Voertuigenlijst */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Voertuigen
            </div>

            {laden ? <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>Laden...</div>
              : voertuigen.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  <Car size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                  <div style={{ fontSize: 13 }}>Nog geen voertuigen</div>
                  {isSuperadmin && <button className="btn btn-sm btn-primary" style={{ marginTop: 10 }} onClick={() => setVoertuigModal('nieuw')}><Plus size={12} /> Toevoegen</button>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {voertuigen.map(v => {
                    const regs = registraties[v.id] ?? []
                    const volgende = volgendeDatum(regs, v)
                    const kleur = statusKleur(volgende)
                    const isActief = actief?.id === v.id
                    return (
                      <div key={v.id} onClick={() => setActief(v)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.12s', background: isActief ? 'var(--primary-light)' : 'var(--bg-card)', border: `1px solid ${isActief ? 'var(--border-dark)' : 'var(--border)'}`, borderLeft: `4px solid ${kleur}` }}>
                        <div style={{ color: v.type === 'bus' ? '#3B82F6' : '#8CC63F' }}>
                          {v.type === 'bus' ? <Bus size={20} /> : <Car size={20} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em' }}>{v.kenteken}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                            {v.omschrijving ?? (v.type === 'bus' ? 'Bus' : 'Auto')} · {regelmaatLabel(v.regelmaat_aantal, v.regelmaat_eenheid)}
                          </div>
                          {regs.length > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                              Laatste: {regs[0].kilometerstand.toLocaleString('nl-NL')} km
                            </div>
                          )}
                        </div>
                        {volgende && (
                          <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: kleur }} title={`Volgende: ${fmtDatum(volgende.toISOString())}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>

          {/* Rechter paneel */}
          {!actief ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <Car size={36} />
              <h3>Selecteer een voertuig</h3>
              <p>Klik op een voertuig om de kilometerstanden te bekijken.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Voertuig header */}
              <div className="card">
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 12, background: actief.type === 'bus' ? '#DBEAFE' : 'var(--primary-xlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {actief.type === 'bus'
                      ? <Bus size={24} color="#3B82F6" />
                      : <Car size={24} color="var(--primary)" />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, letterSpacing: '0.08em' }}>{actief.kenteken}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {actief.omschrijving ?? (actief.type === 'bus' ? 'Bus' : 'Auto')} · {regelmaatLabel(actief.regelmaat_aantal, actief.regelmaat_eenheid)}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {actiefVolgende ? (
                      <>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Volgende invoer</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: actiefStatus }}>{fmtDatum(actiefVolgende.toISOString())}</div>
                        {actiefVolgende < new Date() && (
                          <div style={{ fontSize: 11, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            <AlertCircle size={11} /> Te laat
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nog geen registraties</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-primary" onClick={() => setRegistratieModal(actief)}>
                      <Plus size={14} /> Stand invoeren
                    </button>
                    {isSuperadmin && (
                      <>
                        <button className="btn btn-sm" onClick={() => setVoertuigModal(actief)}>
                          <Settings size={13} />
                        </button>
                        <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijderVoertuig(actief.id)}>
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                {actiefRegs.length > 0 && (
                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Huidige stand</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>{actiefRegs[0].kilometerstand.toLocaleString('nl-NL')} km</div>
                    </div>
                    {actiefRegs.length > 1 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Gereden (laatste periode)</div>
                        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Sora, sans-serif', color: 'var(--primary)' }}>
                          +{(actiefRegs[0].kilometerstand - actiefRegs[1].kilometerstand).toLocaleString('nl-NL')} km
                        </div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Registraties</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>{actiefRegs.length}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Registraties */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Geschiedenis</span>
                </div>
                {actiefRegs.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Nog geen registraties. Voeg de eerste kilometerstand in.
                  </div>
                ) : (
                  <div>
                    {actiefRegs.map((r, i) => {
                      const verschil = i < actiefRegs.length - 1 ? r.kilometerstand - actiefRegs[i + 1].kilometerstand : null
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < actiefRegs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? 'var(--primary)' : 'var(--border-dark)', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>
                              {r.kilometerstand.toLocaleString('nl-NL')} km
                              {verschil !== null && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--primary)', marginLeft: 8 }}>+{verschil.toLocaleString('nl-NL')} km</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10 }}>
                              <span>📅 {fmtDatum(r.datum)}</span>
                              {r.profiel_naam && <span>👤 {r.profiel_naam}</span>}
                              {r.notitie && <span>📝 {r.notitie}</span>}
                            </div>
                          </div>
                          {isSuperadmin && (
                            <button onClick={() => verwijderRegistratie(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.4, display: 'flex', padding: 4 }}
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
            </div>
          )}
        </div>
      </div>

      {voertuigModal && (
        <VoertuigModal
          voertuig={voertuigModal === 'nieuw' ? null : voertuigModal}
          onSave={async (data) => {
            if (voertuigModal === 'nieuw') {
              await getSupabase().from('km_voertuigen').insert(data)
              setToast({ bericht: 'Voertuig toegevoegd!', type: 'success' })
            } else {
              await getSupabase().from('km_voertuigen').update(data).eq('id', (voertuigModal as Voertuig).id)
              setToast({ bericht: 'Opgeslagen!', type: 'success' })
            }
            setVoertuigModal(null)
            await haalOp()
          }}
          onClose={() => setVoertuigModal(null)}
        />
      )}

      {registratieModal && (
        <RegistratieModal
          voertuig={registratieModal}
          laasteStand={registraties[registratieModal.id]?.[0]?.kilometerstand ?? null}
          onSave={async (data) => {
            await getSupabase().from('km_registraties').insert({ ...data, voertuig_id: registratieModal.id, ingevoerd_door: profiel?.id })
            setToast({ bericht: 'Kilometerstand opgeslagen!', type: 'success' })
            setRegistratieModal(null)
            await haalOp()
          }}
          onClose={() => setRegistratieModal(null)}
        />
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Voertuig Modal ───────────────────────────────────────────────────────────

function VoertuigModal({ voertuig, onSave, onClose }: {
  voertuig: Voertuig | null
  onSave: (data: Omit<Voertuig, 'id' | 'aangemaakt_op'>) => void
  onClose: () => void
}) {
  const [kenteken, setKenteken] = useState(voertuig?.kenteken ?? '')
  const [type, setType] = useState<'auto' | 'bus'>(voertuig?.type ?? 'auto')
  const [omschrijving, setOmschrijving] = useState(voertuig?.omschrijving ?? '')
  const [aantal, setAantal] = useState(String(voertuig?.regelmaat_aantal ?? 1))
  const [eenheid, setEenheid] = useState<'week' | 'maand' | 'kwartaal'>(voertuig?.regelmaat_eenheid ?? 'maand')
  const [actief, setActief] = useState(voertuig?.actief ?? true)

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{voertuig ? 'Voertuig bewerken' : 'Voertuig toevoegen'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Type */}
          <div>
            <label className="form-label">Type voertuig</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['auto', 'bus'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: `2px solid ${type === t ? (t === 'bus' ? '#3B82F6' : 'var(--primary)') : 'var(--border)'}`, background: type === t ? (t === 'bus' ? '#DBEAFE' : 'var(--primary-xlight)') : 'var(--bg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.12s' }}>
                  {t === 'bus' ? <Bus size={24} color={type === t ? '#3B82F6' : 'var(--text-muted)'} /> : <Car size={24} color={type === t ? 'var(--primary)' : 'var(--text-muted)'} />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: type === t ? (t === 'bus' ? '#3B82F6' : 'var(--primary-text)') : 'var(--text-muted)', textTransform: 'capitalize' }}>{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Kenteken */}
          <div>
            <label className="form-label">Kenteken</label>
            <input className="form-input" value={kenteken} onChange={e => setKenteken(e.target.value.toUpperCase())}
              placeholder="Bijv. AB-123-C" style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, letterSpacing: '0.1em' }} />
          </div>

          {/* Omschrijving */}
          <div>
            <label className="form-label">Omschrijving (optioneel)</label>
            <input className="form-input" value={omschrijving} onChange={e => setOmschrijving(e.target.value)} placeholder="Bijv. Witte Volkswagen, BSO Bus Lisse" />
          </div>

          {/* Regelmaat */}
          <div>
            <label className="form-label">Hoe vaak kilometerstand invoeren?</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>Elke</span>
              {eenheid !== 'kwartaal' && (
                <input type="number" min="1" max="12" className="form-input" value={aantal} onChange={e => setAantal(e.target.value)}
                  style={{ width: 70, textAlign: 'center' }} />
              )}
              <select className="form-select" value={eenheid} onChange={e => setEenheid(e.target.value as 'week' | 'maand' | 'kwartaal')} style={{ flex: 1 }}>
                <option value="week">week/weken</option>
                <option value="maand">maand/maanden</option>
                <option value="kwartaal">kwartaal</option>
              </select>
            </div>
            <div style={{ fontSize: 11, color: 'var(--primary-text)', marginTop: 6, background: 'var(--primary-xlight)', padding: '5px 10px', borderRadius: 6 }}>
              📅 {regelmaatLabel(parseInt(aantal) || 1, eenheid)}
            </div>
          </div>

          {/* Actief */}
          {voertuig && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="actief" checked={actief} onChange={e => setActief(e.target.checked)} />
              <label htmlFor="actief" style={{ fontSize: 13, cursor: 'pointer' }}>Voertuig actief</label>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" disabled={!kenteken.trim()} onClick={() => onSave({
              kenteken: fmtKenteken(kenteken),
              type, omschrijving: omschrijving.trim() || null,
              actief, regelmaat_aantal: parseInt(aantal) || 1, regelmaat_eenheid: eenheid
            })}>
              {voertuig ? 'Opslaan' : 'Toevoegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Registratie Modal ────────────────────────────────────────────────────────

function RegistratieModal({ voertuig, laasteStand, onSave, onClose }: {
  voertuig: Voertuig
  laasteStand: number | null
  onSave: (data: { kilometerstand: number; datum: string; notitie: string | null }) => void
  onClose: () => void
}) {
  const [stand, setStand] = useState('')
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [notitie, setNotitie] = useState('')
  const [fout, setFout] = useState('')

  function valideer() {
    const km = parseInt(stand)
    if (!stand || isNaN(km)) { setFout('Voer een geldige kilometerstand in.'); return false }
    if (laasteStand && km <= laasteStand) { setFout(`Stand moet hoger zijn dan de vorige (${laasteStand.toLocaleString('nl-NL')} km).`); return false }
    setFout('')
    return true
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Kilometerstand invoeren</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg)', borderRadius: 9, border: '1px solid var(--border)' }}>
            {voertuig.type === 'bus' ? <Bus size={20} color="#3B82F6" /> : <Car size={20} color="var(--primary)" />}
            <div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, letterSpacing: '0.1em' }}>{voertuig.kenteken}</div>
              {laasteStand && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vorige stand: {laasteStand.toLocaleString('nl-NL')} km</div>}
            </div>
          </div>

          <div>
            <label className="form-label">Kilometerstand *</label>
            <input className="form-input" type="number" inputMode="numeric" value={stand} onChange={e => { setStand(e.target.value); setFout('') }}
              placeholder={laasteStand ? `Meer dan ${laasteStand.toLocaleString('nl-NL')}` : 'Bijv. 125430'} autoFocus
              style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'Sora, sans-serif' }} />
            {stand && laasteStand && parseInt(stand) > laasteStand && (
              <div style={{ fontSize: 12, color: 'var(--primary-text)', marginTop: 4, background: 'var(--primary-xlight)', padding: '4px 10px', borderRadius: 6 }}>
                ✓ +{(parseInt(stand) - laasteStand).toLocaleString('nl-NL')} km gereden
              </div>
            )}
            {fout && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{fout}</div>}
          </div>

          <div>
            <label className="form-label">Datum</label>
            <input type="date" className="form-input" value={datum} onChange={e => setDatum(e.target.value)} />
          </div>

          <div>
            <label className="form-label">Notitie (optioneel)</label>
            <input className="form-input" value={notitie} onChange={e => setNotitie(e.target.value)} placeholder="Bijv. na grote beurt, tankbeurt" />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => { if (valideer()) onSave({ kilometerstand: parseInt(stand), datum, notitie: notitie.trim() || null }) }}>
              Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
