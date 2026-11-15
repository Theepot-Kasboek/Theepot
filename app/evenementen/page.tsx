'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Link2, Calendar, Users, X } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { getSupabase } from '@/lib/supabase'
import { Evenement, haalEvenementenOp, maakEvenementAan, verwijderEvenement } from '@/lib/evenementen'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'

export default function EvenementenPagina() {
  const { rechten, isSuperadmin, profiel } = useAuth()
  const magZien = isSuperadmin || rechten.pagina_evenementen === 'lezen' || rechten.pagina_evenementen === 'bewerken'
  const magBewerken = isSuperadmin || rechten.pagina_evenementen === 'bewerken'

  const [evenementen, setEvenementen] = useState<Evenement[]>([])
  const [aantallen, setAantallen] = useState<Record<string, number>>({})
  const [laden, setLaden] = useState(true)
  const [toonNieuw, setToonNieuw] = useState(false)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)
  const [nieuw, setNieuw] = useState({
    titel: '', omschrijving: '', locatie: '', datum: '', sluit_aanmelden_op: '', max_aanmeldingen: '',
  })
  const [opslaan, setOpslaan] = useState(false)

  function toon(bericht: string, type: 'success' | 'error' = 'success') {
    setToast({ bericht, type })
  }

  const haalOp = useCallback(async () => {
    setLaden(true)
    const data = await haalEvenementenOp()
    setEvenementen(data)
    const tellingen: Record<string, number> = {}
    await Promise.all(data.map(async e => {
      const { count } = await getSupabase()
        .from('evenement_aanmeldingen')
        .select('*', { count: 'exact', head: true })
        .eq('evenement_id', e.id)
      tellingen[e.id] = count ?? 0
    }))
    setAantallen(tellingen)
    setLaden(false)
  }, [])

  useEffect(() => { if (magZien) haalOp() }, [haalOp, magZien])

  async function nieuwOpslaan() {
    if (!nieuw.titel.trim() || !nieuw.sluit_aanmelden_op) {
      toon('Vul titel en sluitingsdatum in.', 'error')
      return
    }
    setOpslaan(true)
    try {
      const e = await maakEvenementAan(profiel?.id ?? '', {
        titel: nieuw.titel.trim(),
        omschrijving: nieuw.omschrijving.trim() || undefined,
        locatie: nieuw.locatie.trim() || undefined,
        datum: nieuw.datum ? new Date(nieuw.datum).toISOString() : undefined,
        sluit_aanmelden_op: new Date(nieuw.sluit_aanmelden_op).toISOString(),
        max_aanmeldingen: nieuw.max_aanmeldingen ? parseInt(nieuw.max_aanmeldingen, 10) : undefined,
      })
      setEvenementen(prev => [e, ...prev])
      setAantallen(prev => ({ ...prev, [e.id]: 0 }))
      setToonNieuw(false)
      setNieuw({ titel: '', omschrijving: '', locatie: '', datum: '', sluit_aanmelden_op: '', max_aanmeldingen: '' })
      toon('Evenement aangemaakt')
    } catch (err) {
      toon('Aanmaken mislukt: ' + (err instanceof Error ? err.message : String(err)), 'error')
    } finally {
      setOpslaan(false)
    }
  }

  async function verwijder(id: string) {
    if (!confirm('Evenement verwijderen? Alle aanmeldingen gaan hiermee ook verloren.')) return
    try {
      await verwijderEvenement(id)
      setEvenementen(prev => prev.filter(e => e.id !== id))
      toon('Evenement verwijderd')
    } catch (err) {
      toon('Verwijderen mislukt: ' + (err instanceof Error ? err.message : String(err)), 'error')
    }
  }

  async function kopieerLink(id: string) {
    const url = `${window.location.origin}/evenementen/${id}/aanmelden`
    await navigator.clipboard.writeText(url)
    toon('Aanmeldlink gekopieerd')
  }

  if (!magZien) return (
    <>
      <Topbar titel="Evenementen" subtitel="Geen toegang" />
      <div className="page-content"><div className="empty-state"><Calendar size={36} /><h3>Geen toegang</h3></div></div>
    </>
  )

  return (
    <>
      <Topbar
        titel="Evenementen"
        subtitel="Evenementen met een publieke aanmeldlink"
        acties={magBewerken ? (
          <button className="btn btn-primary" onClick={() => setToonNieuw(true)}><Plus size={14} /> Nieuw evenement</button>
        ) : undefined}
      />

      <div className="page-content">
        {laden ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
        ) : evenementen.length === 0 ? (
          <div className="empty-state">
            <Calendar size={36} />
            <h3>Nog geen evenementen</h3>
            <p>Maak je eerste evenement aan.</p>
            {magBewerken && (
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setToonNieuw(true)}><Plus size={14} /> Nieuw evenement</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {evenementen.map(e => {
              const gesloten = new Date() > new Date(e.sluit_aanmelden_op) || e.status !== 'actief'
              const aantal = aantallen[e.id] ?? 0
              const vol = e.max_aanmeldingen != null && aantal >= e.max_aanmeldingen
              const badge = e.status === 'geannuleerd'
                ? { tekst: 'Geannuleerd', bg: '#FEE2E2', kleur: '#B91C1C' }
                : gesloten
                  ? { tekst: 'Gesloten', bg: 'var(--bg)', kleur: 'var(--text-muted)' }
                  : vol
                    ? { tekst: 'Vol', bg: '#FEF3C7', kleur: '#92400E' }
                    : { tekst: 'Open', bg: '#DCFCE7', kleur: '#15803D' }
              return (
                <div key={e.id} className="card" onMouseEnter={ev => (ev.currentTarget.style.borderColor = 'var(--primary)')} onMouseLeave={ev => (ev.currentTarget.style.borderColor = 'var(--border)')}>
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Link href={`/evenementen/${e.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14 }}>{e.titel}</span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.kleur, fontWeight: 600 }}>{badge.tekst}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 3 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {aantal}{e.max_aanmeldingen != null ? ` / ${e.max_aanmeldingen}` : ''} aanmeldingen</span>
                        <span>Sluit op {new Date(e.sluit_aanmelden_op).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </Link>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-sm" onClick={() => kopieerLink(e.id)} title="Aanmeldlink kopiëren"><Link2 size={13} /></button>
                      {magBewerken && (
                        <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(e.id)} title="Verwijderen"><Trash2 size={13} /></button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toonNieuw && (
        <div className="modal-backdrop" onClick={ev => { if (ev.target === ev.currentTarget) setToonNieuw(false) }}>
          <div className="modal-box">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title">Nieuw evenement</span>
              <button className="btn btn-sm" onClick={() => setToonNieuw(false)}><X size={14} /></button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="form-label">Titel *</label>
                <input className="form-input" value={nieuw.titel} onChange={e => setNieuw(n => ({ ...n, titel: e.target.value }))} placeholder="Bijv. Jaarlijkse open dag" />
              </div>
              <div>
                <label className="form-label">Omschrijving</label>
                <textarea className="form-textarea" value={nieuw.omschrijving} onChange={e => setNieuw(n => ({ ...n, omschrijving: e.target.value }))} rows={3} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Locatie</label>
                  <input className="form-input" value={nieuw.locatie} onChange={e => setNieuw(n => ({ ...n, locatie: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Datum evenement</label>
                  <input type="datetime-local" className="form-input" value={nieuw.datum} onChange={e => setNieuw(n => ({ ...n, datum: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Sluit aanmelden op *</label>
                  <input type="datetime-local" className="form-input" value={nieuw.sluit_aanmelden_op} onChange={e => setNieuw(n => ({ ...n, sluit_aanmelden_op: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Max. aantal aanmeldingen</label>
                  <input type="number" min={1} className="form-input" value={nieuw.max_aanmeldingen} onChange={e => setNieuw(n => ({ ...n, max_aanmeldingen: e.target.value }))} placeholder="Onbeperkt" />
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn" onClick={() => setToonNieuw(false)}>Annuleren</button>
              <button className="btn btn-primary" onClick={nieuwOpslaan} disabled={opslaan}>{opslaan ? 'Aanmaken...' : 'Aanmaken'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
