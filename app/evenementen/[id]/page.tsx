'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Link2, Download, Trash2, Users, UserPlus, X, Plus, Settings, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import {
  Evenement, EvenementAanmelding, EvenementVeld, haalAanmeldingenOp, wijzigEvenement, verwijderAanmelding, voegAanmeldingHandmatigToe,
  haalVeldenOp, maakVeldAan, wijzigVeld, verwijderVeld, haalAntwoordenOp, meerkeuzeOpties, wisselMeerkeuzeOptie,
} from '@/lib/evenementen'
import { getSupabase } from '@/lib/supabase'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'

export default function EvenementDetailPagina() {
  const params = useParams()
  const evenementId = params?.id as string
  const { rechten, isSuperadmin } = useAuth()
  const magBewerken = isSuperadmin || rechten.pagina_evenementen === 'bewerken'

  const [evenement, setEvenement] = useState<Evenement | null>(null)
  const [aanmeldingen, setAanmeldingen] = useState<EvenementAanmelding[]>([])
  const [velden, setVelden] = useState<EvenementVeld[]>([])
  const [antwoorden, setAntwoorden] = useState<Record<string, Record<string, string>>>({})
  const [laden, setLaden] = useState(true)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)
  const [toonHandmatig, setToonHandmatig] = useState(false)
  const [handmatig, setHandmatig] = useState({ naam: '', email: '' })
  const [handmatigAntwoorden, setHandmatigAntwoorden] = useState<Record<string, string>>({})
  const [opslaanHandmatig, setOpslaanHandmatig] = useState(false)
  const [toonVelden, setToonVelden] = useState(false)
  const [nieuwVeld, setNieuwVeld] = useState<{ label: string; type: 'tekst' | 'keuze'; opties: string; meerdere: boolean; verplicht: boolean }>({ label: '', type: 'tekst', opties: '', meerdere: false, verplicht: false })
  const [opslaanVeld, setOpslaanVeld] = useState(false)

  function toon(bericht: string, type: 'success' | 'error' = 'success') {
    setToast({ bericht, type })
  }

  const haalOp = useCallback(async () => {
    if (!evenementId) return
    setLaden(true)
    const [{ data: e }, aanmeldingenData, veldenData] = await Promise.all([
      getSupabase().from('evenementen').select('*').eq('id', evenementId).single(),
      haalAanmeldingenOp(evenementId),
      haalVeldenOp(evenementId),
    ])
    setEvenement((e ?? null) as Evenement | null)
    setAanmeldingen(aanmeldingenData)
    setVelden(veldenData)
    setAntwoorden(await haalAntwoordenOp(aanmeldingenData.map(a => a.id)))
    setLaden(false)
  }, [evenementId])

  useEffect(() => { haalOp() }, [haalOp])

  async function veldOpslaan() {
    if (!evenement) return
    if (!nieuwVeld.label.trim()) {
      toon('Vul een label in.', 'error')
      return
    }
    const opties = nieuwVeld.type === 'keuze'
      ? nieuwVeld.opties.split(',').map(o => o.trim()).filter(Boolean)
      : null
    if (nieuwVeld.type === 'keuze' && (!opties || opties.length === 0)) {
      toon('Vul minstens één keuze-optie in.', 'error')
      return
    }
    setOpslaanVeld(true)
    try {
      const veld = await maakVeldAan(evenement.id, nieuwVeld.label.trim(), nieuwVeld.verplicht, velden.length, nieuwVeld.type, opties, nieuwVeld.meerdere)
      setVelden(prev => [...prev, veld])
      setNieuwVeld({ label: '', type: 'tekst', opties: '', meerdere: false, verplicht: false })
      toon('Veld toegevoegd')
    } catch (err) {
      toon('Toevoegen mislukt: ' + (err instanceof Error ? err.message : String(err)), 'error')
    } finally {
      setOpslaanVeld(false)
    }
  }

  async function veldVerwijderen(id: string) {
    if (!confirm('Dit veld verwijderen? Eerder ingevulde antwoorden gaan hiermee ook verloren.')) return
    try {
      await verwijderVeld(id)
      setVelden(prev => prev.filter(v => v.id !== id))
      toon('Veld verwijderd')
    } catch (err) {
      toon('Verwijderen mislukt: ' + (err instanceof Error ? err.message : String(err)), 'error')
    }
  }

  async function veldVerplaatsen(index: number, richting: -1 | 1) {
    const doel = index + richting
    if (doel < 0 || doel >= velden.length) return
    const a = velden[index], b = velden[doel]
    const nieuw = [...velden]
    nieuw[index] = b; nieuw[doel] = a
    setVelden(nieuw)
    await Promise.all([wijzigVeld(a.id, { volgorde: doel }), wijzigVeld(b.id, { volgorde: index })])
  }

  async function kopieerLink() {
    const url = `${window.location.origin}/evenementen/${evenementId}/aanmelden`
    await navigator.clipboard.writeText(url)
    toon('Aanmeldlink gekopieerd')
  }

  async function annuleer() {
    if (!evenement) return
    const nieuweStatus = evenement.status === 'actief' ? 'geannuleerd' : 'actief'
    try {
      await wijzigEvenement(evenement.id, { status: nieuweStatus })
      setEvenement({ ...evenement, status: nieuweStatus })
      toon(nieuweStatus === 'geannuleerd' ? 'Evenement geannuleerd' : 'Evenement weer actief')
    } catch (err) {
      toon('Wijzigen mislukt: ' + (err instanceof Error ? err.message : String(err)), 'error')
    }
  }

  async function verwijder(id: string) {
    if (!confirm('Deze aanmelding verwijderen?')) return
    try {
      await verwijderAanmelding(id)
      setAanmeldingen(prev => prev.filter(a => a.id !== id))
      toon('Aanmelding verwijderd')
    } catch (err) {
      toon('Verwijderen mislukt: ' + (err instanceof Error ? err.message : String(err)), 'error')
    }
  }

  async function handmatigOpslaan() {
    if (!evenement) return
    if (!handmatig.naam.trim()) {
      toon('Vul een naam in.', 'error')
      return
    }
    const email = handmatig.email.trim()
    if (!email) {
      toon('Vul een e-mailadres in.', 'error')
      return
    }
    for (const veld of velden) {
      if (veld.verplicht && !handmatigAntwoorden[veld.id]?.trim()) {
        toon(`Vul "${veld.label}" in.`, 'error')
        return
      }
    }
    const vol = evenement.max_aanmeldingen != null && aanmeldingen.length >= evenement.max_aanmeldingen
    if (vol && !confirm(`Dit evenement zit al op het maximum (${evenement.max_aanmeldingen}). Toch toevoegen?`)) {
      return
    }
    setOpslaanHandmatig(true)
    try {
      const { bijgewerkt } = await voegAanmeldingHandmatigToe(evenement.id, email, handmatig.naam, handmatigAntwoorden)
      await haalOp()
      setToonHandmatig(false)
      setHandmatig({ naam: '', email: '' })
      setHandmatigAntwoorden({})
      toon(bijgewerkt ? 'Aanmelding bijgewerkt' : 'Aanmelding toegevoegd')
    } catch (err) {
      toon('Toevoegen mislukt: ' + (err instanceof Error ? err.message : String(err)), 'error')
    } finally {
      setOpslaanHandmatig(false)
    }
  }

  function csvDownload(rijen: string[][], bestandsnaam: string) {
    const csv = rijen.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = bestandsnaam; a.click()
    URL.revokeObjectURL(url)
  }

  function exporteerVolledig() {
    const titelSlug = (evenement?.titel ?? 'evenement').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const rijen = [
      ['Naam', 'E-mail', 'Aangemeld op', ...velden.map(v => v.label)],
      ...aanmeldingen.map(a => [a.naam ?? '', a.email, new Date(a.aangemeld_op).toLocaleString('nl-NL'), ...velden.map(v => antwoorden[a.id]?.[v.id] ?? '')]),
    ]
    csvDownload(rijen, `evenement-${titelSlug}-aanmeldingen-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  function exporteerEmails() {
    const titelSlug = (evenement?.titel ?? 'evenement').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const rijen = [['E-mail'], ...aanmeldingen.map(a => [a.email])]
    csvDownload(rijen, `evenement-${titelSlug}-emails-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  if (laden) {
    return (
      <>
        <Topbar titel="Evenement" />
        <div className="page-content" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
      </>
    )
  }

  if (!evenement) {
    return (
      <>
        <Topbar titel="Evenement" />
        <div className="page-content">
          <div className="empty-state">
            <h3>Evenement niet gevonden</h3>
            <Link href="/evenementen" className="btn" style={{ marginTop: 8 }}><ArrowLeft size={14} /> Terug naar overzicht</Link>
          </div>
        </div>
      </>
    )
  }

  const gesloten = new Date() > new Date(evenement.sluit_aanmelden_op) || evenement.status !== 'actief'
  const vol = evenement.max_aanmeldingen != null && aanmeldingen.length >= evenement.max_aanmeldingen
  const badge = evenement.status === 'geannuleerd'
    ? { tekst: 'Geannuleerd', bg: '#FEE2E2', kleur: '#B91C1C' }
    : gesloten
      ? { tekst: 'Gesloten', bg: 'var(--bg)', kleur: 'var(--text-muted)' }
      : vol
        ? { tekst: 'Vol', bg: '#FEF3C7', kleur: '#92400E' }
        : { tekst: 'Open', bg: '#DCFCE7', kleur: '#15803D' }

  return (
    <>
      <Topbar
        titel={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{evenement.titel}<span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.kleur, fontWeight: 600 }}>{badge.tekst}</span></span>}
        subtitel={`Sluit op ${new Date(evenement.sluit_aanmelden_op).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}${evenement.max_aanmeldingen != null ? ` · max. ${evenement.max_aanmeldingen} aanmeldingen` : ''}`}
        acties={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={kopieerLink}><Link2 size={14} /> Kopieer aanmeldlink</button>
            {magBewerken && (
              <>
                <button className="btn" onClick={() => setToonVelden(true)}><Settings size={14} /> Velden beheren</button>
                <button className="btn" onClick={annuleer}>{evenement.status === 'actief' ? 'Annuleren' : 'Heractiveren'}</button>
              </>
            )}
            <Link href="/evenementen" className="btn"><ArrowLeft size={14} /> Terug</Link>
          </div>
        }
      />

      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={15} /> {aanmeldingen.length} aanmelding{aanmeldingen.length === 1 ? '' : 'en'}
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {magBewerken && (
              <button className="btn btn-primary" onClick={() => setToonHandmatig(true)}><UserPlus size={14} /> Handmatig aanmelden</button>
            )}
            {aanmeldingen.length > 0 && (
              <>
                <button className="btn" onClick={exporteerEmails}><Download size={14} /> Exporteer e-mails</button>
                <button className="btn" onClick={exporteerVolledig}><Download size={14} /> Exporteer lijst (CSV)</button>
              </>
            )}
          </div>
        </div>

        {aanmeldingen.length === 0 ? (
          <div className="empty-state">
            <h3>Nog geen aanmeldingen</h3>
            <p>Deel de aanmeldlink om aanmeldingen te ontvangen.</p>
          </div>
        ) : (
          <div className="card table-scroll-x">
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Naam</th>
                  <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>E-mail</th>
                  <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Aangemeld op</th>
                  {velden.map(v => (
                    <th key={v.id} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{v.label}</th>
                  ))}
                  {magBewerken && <th style={{ padding: '10px 16px' }} />}
                </tr>
              </thead>
              <tbody>
                {aanmeldingen.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px' }}>{a.naam || '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{a.email}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{new Date(a.aangemeld_op).toLocaleString('nl-NL')}</td>
                    {velden.map(v => (
                      <td key={v.id} style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{antwoorden[a.id]?.[v.id] || '—'}</td>
                    ))}
                    {magBewerken && (
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(a.id)} title="Verwijderen"><Trash2 size={13} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toonHandmatig && (
        <div className="modal-backdrop" onClick={ev => { if (ev.target === ev.currentTarget) setToonHandmatig(false) }}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title">Handmatig aanmelden</span>
              <button className="btn btn-sm" onClick={() => setToonHandmatig(false)}><X size={14} /></button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="form-label">Naam *</label>
                <input className="form-input" value={handmatig.naam} onChange={e => setHandmatig(h => ({ ...h, naam: e.target.value }))} placeholder="Voor- en achternaam" />
              </div>
              <div>
                <label className="form-label">E-mail *</label>
                <input type="email" className="form-input" value={handmatig.email} onChange={e => setHandmatig(h => ({ ...h, email: e.target.value }))} placeholder="naam@voorbeeld.nl" />
              </div>
              {velden.map(v => (
                <div key={v.id}>
                  <label className="form-label">{v.label}{v.verplicht ? ' *' : ''}</label>
                  {v.type === 'keuze' && v.meerdere ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                      {(v.opties ?? []).map(o => (
                        <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={meerkeuzeOpties(handmatigAntwoorden[v.id] ?? '').includes(o)}
                            onChange={() => setHandmatigAntwoorden(a => ({ ...a, [v.id]: wisselMeerkeuzeOptie(a[v.id] ?? '', o) }))}
                          />
                          {o}
                        </label>
                      ))}
                    </div>
                  ) : v.type === 'keuze' ? (
                    <select className="form-input" value={handmatigAntwoorden[v.id] ?? ''} onChange={e => setHandmatigAntwoorden(a => ({ ...a, [v.id]: e.target.value }))}>
                      <option value="">Maak een keuze...</option>
                      {(v.opties ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="form-input" value={handmatigAntwoorden[v.id] ?? ''} onChange={e => setHandmatigAntwoorden(a => ({ ...a, [v.id]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn" onClick={() => setToonHandmatig(false)}>Annuleren</button>
              <button className="btn btn-primary" onClick={handmatigOpslaan} disabled={opslaanHandmatig}>{opslaanHandmatig ? 'Toevoegen...' : 'Toevoegen'}</button>
            </div>
          </div>
        </div>
      )}

      {toonVelden && (
        <div className="modal-backdrop" onClick={ev => { if (ev.target === ev.currentTarget) setToonVelden(false) }}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title">Aanvullende velden</span>
              <button className="btn btn-sm" onClick={() => setToonVelden(false)}><X size={14} /></button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Standaardvelden</div>
              {[{ label: 'Naam' }, { label: 'E-mail' }].map(v => (
                <div key={v.label} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tekstveld · Altijd verplicht</div>
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>Aanvullende velden</div>
              {velden.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Nog geen aanvullende velden. Voeg een invulvakje of dropdown toe die bezoekers naast naam en e-mail moeten (of mogen) invullen.
                </p>
              )}
              {velden.map((v, i) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {v.type === 'keuze' ? `Dropdown${v.meerdere ? ' (meerdere toegestaan)' : ''}: ${(v.opties ?? []).join(', ')}` : 'Tekstveld'} · {v.verplicht ? 'Verplicht' : 'Optioneel'}
                    </div>
                  </div>
                  <button className="btn btn-sm" disabled={i === 0} onClick={() => veldVerplaatsen(i, -1)} title="Omhoog"><ArrowUp size={13} /></button>
                  <button className="btn btn-sm" disabled={i === velden.length - 1} onClick={() => veldVerplaatsen(i, 1)} title="Omlaag"><ArrowDown size={13} /></button>
                  <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => veldVerwijderen(v.id)} title="Verwijderen"><Trash2 size={13} /></button>
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Nieuw veld</div>
                <input className="form-input" placeholder="Label, bijv. Aantal personen" value={nieuwVeld.label} onChange={e => setNieuwVeld(v => ({ ...v, label: e.target.value }))} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <select className="form-input" value={nieuwVeld.type} onChange={e => setNieuwVeld(v => ({ ...v, type: e.target.value as 'tekst' | 'keuze' }))}>
                    <option value="tekst">Tekstveld</option>
                    <option value="keuze">Dropdown (keuzemenu)</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input type="checkbox" checked={nieuwVeld.verplicht} onChange={e => setNieuwVeld(v => ({ ...v, verplicht: e.target.checked }))} />
                    Verplicht
                  </label>
                </div>
                {nieuwVeld.type === 'keuze' && (
                  <>
                    <input className="form-input" placeholder="Opties, gescheiden door komma's" value={nieuwVeld.opties} onChange={e => setNieuwVeld(v => ({ ...v, opties: e.target.value }))} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <input type="checkbox" checked={nieuwVeld.meerdere} onChange={e => setNieuwVeld(v => ({ ...v, meerdere: e.target.checked }))} />
                      Meerdere opties mogen aangevinkt worden
                    </label>
                  </>
                )}
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={veldOpslaan} disabled={opslaanVeld}>
                  <Plus size={14} /> {opslaanVeld ? 'Toevoegen...' : 'Veld toevoegen'}
                </button>
              </div>
            </div>
            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setToonVelden(false)}>Sluiten</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
