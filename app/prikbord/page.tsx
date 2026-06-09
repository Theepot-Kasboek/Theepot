'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import { Plus, X, Trash2, Pencil, Pin, AlertTriangle, Info, MapPin } from 'lucide-react'

interface PrikbordBericht {
  id: string
  locatie_naam: string
  titel: string
  inhoud: string
  prioriteit: 'normaal' | 'belangrijk' | 'urgent'
  aangemaakt_door: string | null
  aangemaakt_op: string
  verloopdatum: string | null
  profiel_naam?: string
}

function prioriteitConfig(p: string) {
  if (p === 'urgent') return { kleur: '#EF4444', bg: '#FEF2F2', border: '#FECACA', label: '🚨 Urgent', icoon: <AlertTriangle size={14} color="#EF4444" /> }
  if (p === 'belangrijk') return { kleur: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: '⚠️ Belangrijk', icoon: <AlertTriangle size={14} color="#F59E0B" /> }
  return { kleur: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', label: 'ℹ️ Mededeling', icoon: <Info size={14} color="#3B82F6" /> }
}

function fmtDatum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PrikbordPage() {
  const { profiel, isSuperadmin, rechten } = useAuth()
  const magZien = isSuperadmin || rechten.pagina_prikbord !== 'geen'
  const magBewerken = isSuperadmin || rechten.pagina_prikbord === 'bewerken'
  const magToevoegen = isSuperadmin || rechten.prikbord_toevoegen === true

  const [berichten, setBerichten] = useState<PrikbordBericht[]>([])
  const [locaties, setLocaties] = useState<string[]>([])
  const [actieveLocatie, setActieveLocatie] = useState<string>('alle')
  const [laden, setLaden] = useState(true)
  const [modal, setModal] = useState<PrikbordBericht | 'nieuw' | null>(null)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data } = await getSupabase()
      .from('prikbord_berichten')
      .select('*, profielen(naam)')
      .order('prioriteit', { ascending: false })
      .order('aangemaakt_op', { ascending: false })
    const mapped = (data ?? []).map((b: PrikbordBericht & { profielen?: { naam: string } }) => ({ ...b, profiel_naam: b.profielen?.naam }))
    // Filter verlopen berichten
    const actief = mapped.filter((b: PrikbordBericht) => !b.verloopdatum || new Date(b.verloopdatum) >= new Date())
    setBerichten(actief)
    setLaden(false)
  }, [])

  useEffect(() => {
    haalOp()
    getSupabase().from('kasboek_locaties').select('naam').eq('actief', true).order('naam')
      .then(({ data }) => setLocaties((data ?? []).map((l: { naam: string }) => l.naam)))
  }, [haalOp])

  async function verwijder(id: string) {
    if (!confirm('Bericht verwijderen?')) return
    await getSupabase().from('prikbord_berichten').delete().eq('id', id)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    await haalOp()
  }

  const gefilterd = actieveLocatie === 'alle' ? berichten : berichten.filter(b => b.locatie_naam === actieveLocatie || b.locatie_naam === 'alle')

  if (!magZien) return (
    <>
      <Topbar titel="Prikbord" subtitel="Geen toegang" />
      <div className="page-content"><div className="empty-state"><Pin size={36} /><h3>Geen toegang</h3></div></div>
    </>
  )

  return (
    <>
      <Topbar
        titel="Prikbord"
        subtitel={`${gefilterd.length} berichten`}
        acties={
          (magToevoegen || magBewerken) ? (
            <button className="btn btn-primary" onClick={() => setModal('nieuw')}>
              <Plus size={14} /> Bericht plaatsen
            </button>
          ) : undefined
        }
      />

      <div className="page-content">
        {/* Locatie filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          {['alle', ...locaties].map(loc => (
            <button key={loc} onClick={() => setActieveLocatie(loc)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s',
                borderColor: actieveLocatie === loc ? 'var(--primary)' : 'var(--border-dark)',
                background: actieveLocatie === loc ? 'var(--primary)' : 'var(--bg-card)',
                color: actieveLocatie === loc ? '#fff' : 'var(--text)' }}>
              {loc === 'alle' ? 'Alle locaties' : loc}
            </button>
          ))}
        </div>

        {laden ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
          : gefilterd.length === 0 ? (
            <div className="empty-state">
              <Pin size={36} />
              <h3>Geen berichten</h3>
              <p>Er zijn geen mededelingen voor deze locatie.</p>
              {(magToevoegen || magBewerken) && <button className="btn btn-primary" onClick={() => setModal('nieuw')}><Plus size={14} /> Bericht plaatsen</button>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {gefilterd.map(b => {
                const cfg = prioriteitConfig(b.prioriteit)
                return (
                  <div key={b.id} className="card" style={{ borderLeft: `4px solid ${cfg.kleur}`, transition: 'border-color 0.15s' }}>
                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flexShrink: 0, marginTop: 2 }}>{cfg.icoon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15 }}>{b.titel}</span>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.kleur, border: `1px solid ${cfg.border}`, fontWeight: 500 }}>{cfg.label}</span>
                            {b.locatie_naam !== 'alle' && (
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                📍 {b.locatie_naam}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{b.inhoud}</p>
                          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            {b.profiel_naam && <span>👤 {b.profiel_naam}</span>}
                            <span>📅 {fmtDatum(b.aangemaakt_op)}</span>
                            {b.verloopdatum && <span>⏱ Geldig tot {fmtDatum(b.verloopdatum)}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {(magBewerken || (magToevoegen && b.aangemaakt_door === profiel?.id)) && (
                            <button className="btn btn-sm" onClick={() => setModal(b)}><Pencil size={12} /></button>
                          )}
                          {(magBewerken || (magToevoegen && b.aangemaakt_door === profiel?.id)) && (
                            <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(b.id)}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>

      {modal && (
        <BerichtModal
          bericht={modal === 'nieuw' ? null : modal}
          locaties={locaties}
          onSave={async (data) => {
            if (modal === 'nieuw') {
              await getSupabase().from('prikbord_berichten').insert({ ...data, aangemaakt_door: profiel?.id })
              setToast({ bericht: 'Bericht geplaatst!', type: 'success' })
            } else {
              await getSupabase().from('prikbord_berichten').update(data).eq('id', (modal as PrikbordBericht).id)
              setToast({ bericht: 'Opgeslagen!', type: 'success' })
            }
            setModal(null)
            await haalOp()
          }}
          onClose={() => setModal(null)}
        />
      )}
      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

function BerichtModal({ bericht, locaties, onSave, onClose }: {
  bericht: PrikbordBericht | null
  locaties: string[]
  onSave: (data: Omit<PrikbordBericht, 'id' | 'aangemaakt_door' | 'aangemaakt_op' | 'profiel_naam'>) => void
  onClose: () => void
}) {
  const [titel, setTitel] = useState(bericht?.titel ?? '')
  const [inhoud, setInhoud] = useState(bericht?.inhoud ?? '')
  const [prioriteit, setPrioriteit] = useState<'normaal' | 'belangrijk' | 'urgent'>(bericht?.prioriteit ?? 'normaal')
  const [locatie, setLocatie] = useState(bericht?.locatie_naam ?? 'alle')
  const [verloopdatum, setVerloopdatum] = useState(bericht?.verloopdatum ?? '')

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{bericht ? 'Bericht bewerken' : 'Bericht plaatsen'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Prioriteit */}
          <div>
            <label className="form-label">Type bericht</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['normaal', 'belangrijk', 'urgent'] as const).map(p => {
                const cfg = prioriteitConfig(p)
                return (
                  <button key={p} onClick={() => setPrioriteit(p)}
                    style={{ flex: 1, padding: '10px 8px', borderRadius: 9, border: `2px solid ${prioriteit === p ? cfg.kleur : 'var(--border)'}`, background: prioriteit === p ? cfg.bg : 'var(--bg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.12s' }}>
                    <span style={{ fontSize: 18 }}>{p === 'urgent' ? '🚨' : p === 'belangrijk' ? '⚠️' : 'ℹ️'}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: prioriteit === p ? cfg.kleur : 'var(--text-muted)', textTransform: 'capitalize' }}>{p}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div><label className="form-label">Titel *</label><input className="form-input" value={titel} onChange={e => setTitel(e.target.value)} placeholder="Bijv. GGD inspectie aanstaande vrijdag" autoFocus /></div>

          <div>
            <label className="form-label">Inhoud *</label>
            <textarea className="form-textarea" style={{ minHeight: 120 }} value={inhoud} onChange={e => setInhoud(e.target.value)} placeholder="Schrijf hier de mededeling..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="form-label">Locatie</label>
              <select className="form-select" value={locatie} onChange={e => setLocatie(e.target.value)}>
                <option value="alle">Alle locaties</option>
                {locaties.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Geldig tot (optioneel)</label>
              <input type="date" className="form-input" value={verloopdatum} onChange={e => setVerloopdatum(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" disabled={!titel.trim() || !inhoud.trim()}
              onClick={() => onSave({ titel: titel.trim(), inhoud: inhoud.trim(), prioriteit, locatie_naam: locatie, verloopdatum: verloopdatum || null })}>
              {bericht ? 'Opslaan' : 'Plaatsen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
