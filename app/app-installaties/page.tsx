'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  Plus, X, Trash2, Pencil, Smartphone, Tablet, Apple, Bot,
  ShieldCheck, Tag,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'android' | 'ios'

interface AppVersie {
  id: string
  platform: Platform
  versie: string
  wijzigingen: string | null
  uitgebracht_op: string
  aangemaakt_op: string
}

interface AppInstallatie {
  id: string
  apparaat_naam: string
  platform: Platform
  versie_id: string | null
  notitie: string | null
  geinstalleerd_op: string
  aangemaakt_op: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDatum(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function PlatformIcon({ platform, size = 18 }: { platform: Platform; size?: number }) {
  return platform === 'ios'
    ? <Apple size={size} color="#111" />
    : <Bot size={size} color="#3DDC84" />
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function AppInstallatiesPage() {
  const { isSuperadmin } = useAuth()
  const [versies, setVersies] = useState<AppVersie[]>([])
  const [installaties, setInstallaties] = useState<AppInstallatie[]>([])
  const [laden, setLaden] = useState(true)
  const [versieModal, setVersieModal] = useState<AppVersie | 'nieuw' | null>(null)
  const [apparaatModal, setApparaatModal] = useState<AppInstallatie | 'nieuw' | null>(null)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  const haalOp = useCallback(async () => {
    setLaden(true)
    const [{ data: v }, { data: i }] = await Promise.all([
      getSupabase().from('app_versies').select('*').order('platform').order('aangemaakt_op', { ascending: false }),
      getSupabase().from('app_installaties').select('*').order('apparaat_naam'),
    ])
    setVersies((v ?? []) as AppVersie[])
    setInstallaties((i ?? []) as AppInstallatie[])
    setLaden(false)
  }, [])

  useEffect(() => { haalOp() }, [haalOp])

  function versieLabel(versieId: string | null) {
    const v = versies.find(x => x.id === versieId)
    return v ? v.versie : '—'
  }

  async function verwijderVersie(id: string) {
    if (!confirm('Deze versie verwijderen? Apparaten met deze versie tonen dan "—".')) return
    await getSupabase().from('app_versies').delete().eq('id', id)
    setToast({ bericht: 'Versie verwijderd.', type: 'success' })
    await haalOp()
  }

  async function verwijderApparaat(id: string) {
    if (!confirm('Dit apparaat verwijderen uit de lijst?')) return
    await getSupabase().from('app_installaties').delete().eq('id', id)
    setToast({ bericht: 'Apparaat verwijderd.', type: 'success' })
    await haalOp()
  }

  if (!isSuperadmin) {
    return (
      <>
        <Topbar titel="App-installaties" subtitel="Geen toegang" />
        <div className="page-content">
          <div className="empty-state">
            <ShieldCheck size={36} />
            <h3>Geen toegang</h3>
            <p>Alleen superadmins kunnen app-installaties beheren.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        titel="App-installaties"
        subtitel="Bijhouden op welke apparaten de app staat en welke versie"
      />

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Versies */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Versiegeschiedenis</span>
            <button className="btn btn-sm btn-primary" onClick={() => setVersieModal('nieuw')}>
              <Plus size={13} /> Versie toevoegen
            </button>
          </div>
          {laden ? (
            <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Laden...</div>
          ) : versies.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Tag size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>Nog geen versies geregistreerd</div>
            </div>
          ) : (
            <div>
              {versies.map((v, i) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 18px', borderBottom: i < versies.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}><PlatformIcon platform={v.platform} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>
                      {v.platform === 'ios' ? 'iOS' : 'Android'} · versie {v.versie}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Uitgebracht op {fmtDatum(v.uitgebracht_op)}
                    </div>
                    {v.wijzigingen && (
                      <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 6, whiteSpace: 'pre-wrap' }}>{v.wijzigingen}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => setVersieModal(v)}><Pencil size={12} /></button>
                    <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijderVersie(v.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Apparaten */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Apparaten</span>
            <button className="btn btn-sm btn-primary" onClick={() => setApparaatModal('nieuw')}>
              <Plus size={13} /> Apparaat toevoegen
            </button>
          </div>
          {laden ? (
            <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Laden...</div>
          ) : installaties.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Smartphone size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>Nog geen apparaten geregistreerd</div>
              <button className="btn btn-sm btn-primary" style={{ marginTop: 10 }} onClick={() => setApparaatModal('nieuw')}><Plus size={12} /> Toevoegen</button>
            </div>
          ) : (
            <div>
              {installaties.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < installaties.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ flexShrink: 0 }}><PlatformIcon platform={a.platform} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>{a.apparaat_naam}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>{a.platform === 'ios' ? 'iOS' : 'Android'}</span>
                      <span>·</span>
                      <span>versie {versieLabel(a.versie_id)}</span>
                      <span>·</span>
                      <span>geïnstalleerd {fmtDatum(a.geinstalleerd_op)}</span>
                    </div>
                    {a.notitie && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>📝 {a.notitie}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => setApparaatModal(a)}><Pencil size={12} /></button>
                    <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijderApparaat(a.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {versieModal && (
        <VersieModal
          versie={versieModal === 'nieuw' ? null : versieModal}
          onSave={async (data) => {
            if (versieModal === 'nieuw') {
              await getSupabase().from('app_versies').insert(data)
              setToast({ bericht: 'Versie toegevoegd!', type: 'success' })
            } else {
              await getSupabase().from('app_versies').update(data).eq('id', (versieModal as AppVersie).id)
              setToast({ bericht: 'Opgeslagen!', type: 'success' })
            }
            setVersieModal(null)
            await haalOp()
          }}
          onClose={() => setVersieModal(null)}
        />
      )}

      {apparaatModal && (
        <ApparaatModal
          apparaat={apparaatModal === 'nieuw' ? null : apparaatModal}
          versies={versies}
          onSave={async (data) => {
            if (apparaatModal === 'nieuw') {
              await getSupabase().from('app_installaties').insert(data)
              setToast({ bericht: 'Apparaat toegevoegd!', type: 'success' })
            } else {
              await getSupabase().from('app_installaties').update(data).eq('id', (apparaatModal as AppInstallatie).id)
              setToast({ bericht: 'Opgeslagen!', type: 'success' })
            }
            setApparaatModal(null)
            await haalOp()
          }}
          onClose={() => setApparaatModal(null)}
        />
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Versie Modal ─────────────────────────────────────────────────────────────

function VersieModal({ versie, onSave, onClose }: {
  versie: AppVersie | null
  onSave: (data: Omit<AppVersie, 'id' | 'aangemaakt_op'>) => void
  onClose: () => void
}) {
  const [platform, setPlatform] = useState<Platform>(versie?.platform ?? 'android')
  const [versienummer, setVersienummer] = useState(versie?.versie ?? '')
  const [wijzigingen, setWijzigingen] = useState(versie?.wijzigingen ?? '')
  const [uitgebrachtOp, setUitgebrachtOp] = useState(versie?.uitgebracht_op ?? new Date().toISOString().slice(0, 10))

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{versie ? 'Versie bewerken' : 'Versie toevoegen'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label className="form-label">Platform</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['android', 'ios'] as const).map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: `2px solid ${platform === p ? 'var(--primary)' : 'var(--border)'}`, background: platform === p ? 'var(--primary-xlight)' : 'var(--bg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.12s' }}>
                  <PlatformIcon platform={p} size={22} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: platform === p ? 'var(--primary-text)' : 'var(--text-muted)' }}>{p === 'ios' ? 'iOS' : 'Android'}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Versienummer</label>
            <input className="form-input" value={versienummer} onChange={e => setVersienummer(e.target.value)} placeholder="Bijv. 1.1" />
          </div>

          <div>
            <label className="form-label">Uitgebracht op</label>
            <input type="date" className="form-input" value={uitgebrachtOp} onChange={e => setUitgebrachtOp(e.target.value)} />
          </div>

          <div>
            <label className="form-label">Wijzigingen (optioneel)</label>
            <textarea className="form-input" value={wijzigingen} onChange={e => setWijzigingen(e.target.value)} rows={3} placeholder="Wat is er veranderd in deze versie?" />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" disabled={!versienummer.trim()} onClick={() => onSave({
              platform, versie: versienummer.trim(), wijzigingen: wijzigingen.trim() || null, uitgebracht_op: uitgebrachtOp,
            })}>
              {versie ? 'Opslaan' : 'Toevoegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Apparaat Modal ───────────────────────────────────────────────────────────

function ApparaatModal({ apparaat, versies, onSave, onClose }: {
  apparaat: AppInstallatie | null
  versies: AppVersie[]
  onSave: (data: Omit<AppInstallatie, 'id' | 'aangemaakt_op'>) => void
  onClose: () => void
}) {
  const [naam, setNaam] = useState(apparaat?.apparaat_naam ?? '')
  const [platform, setPlatform] = useState<Platform>(apparaat?.platform ?? 'android')
  const [versieId, setVersieId] = useState(apparaat?.versie_id ?? '')
  const [notitie, setNotitie] = useState(apparaat?.notitie ?? '')
  const [geinstalleerdOp, setGeinstalleerdOp] = useState(apparaat?.geinstalleerd_op ?? new Date().toISOString().slice(0, 10))

  const versiesVoorPlatform = versies.filter(v => v.platform === platform)

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{apparaat ? 'Apparaat bewerken' : 'Apparaat toevoegen'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label className="form-label">Platform</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['android', 'ios'] as const).map(p => (
                <button key={p} onClick={() => { setPlatform(p); setVersieId('') }}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: `2px solid ${platform === p ? 'var(--primary)' : 'var(--border)'}`, background: platform === p ? 'var(--primary-xlight)' : 'var(--bg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.12s' }}>
                  <PlatformIcon platform={p} size={22} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: platform === p ? 'var(--primary-text)' : 'var(--text-muted)' }}>{p === 'ios' ? 'iOS' : 'Android'}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Naam apparaat</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. Werktelefoon Lisse, iPhone Lucas" />
          </div>

          <div>
            <label className="form-label">Geïnstalleerde versie</label>
            <select className="form-select" value={versieId} onChange={e => setVersieId(e.target.value)}>
              <option value="">— Onbekend —</option>
              {versiesVoorPlatform.map(v => (
                <option key={v.id} value={v.id}>{v.versie}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Geïnstalleerd op</label>
            <input type="date" className="form-input" value={geinstalleerdOp} onChange={e => setGeinstalleerdOp(e.target.value)} />
          </div>

          <div>
            <label className="form-label">Notitie (optioneel)</label>
            <input className="form-input" value={notitie} onChange={e => setNotitie(e.target.value)} placeholder="Bijv. beheerd door Lucas" />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" disabled={!naam.trim()} onClick={() => onSave({
              apparaat_naam: naam.trim(), platform, versie_id: versieId || null,
              notitie: notitie.trim() || null, geinstalleerd_op: geinstalleerdOp,
            })}>
              {apparaat ? 'Opslaan' : 'Toevoegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
