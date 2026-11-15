'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import PreviewModal from '@/components/PreviewModal'
import CampagneBouwer from '@/components/campagnes/CampagneBouwer'
import HuisstijlScherm from '@/components/campagnes/HuisstijlScherm'
import NieuwsbriefSjabloonModal from '@/components/campagnes/NieuwsbriefSjabloonModal'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import { Plus, ArrowLeft, Trash2, Eye, Mail, Palette, Copy, BookmarkPlus, LayoutTemplate, X, ClipboardCopy, Code2 } from 'lucide-react'
import {
  Campagne, CampagneBlok, CampagneHuisstijl, BlokSjabloon, CampagneSjabloon,
  campagneNaarHtml, heeftBlokInhoud, leegBlokInhoud, kloonBlokken,
} from '@/lib/campagnes'

export default function CampagnesPagina() {
  const { rechten, isSuperadmin } = useAuth()
  const magZien = isSuperadmin || rechten.pagina_campagnes === 'lezen' || rechten.pagina_campagnes === 'bewerken'
  const magBewerken = isSuperadmin || rechten.pagina_campagnes === 'bewerken'

  const [campagnes, setCampagnes] = useState<Campagne[]>([])
  const [laden, setLaden] = useState(true)
  const [huidige, setHuidige] = useState<Campagne | null>(null)
  const [opslaan, setOpslaan] = useState(false)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)
  const [voorbeeldHtml, setVoorbeeldHtml] = useState<string | null>(null)
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({})
  const [huisstijl, setHuisstijl] = useState<CampagneHuisstijl | null>(null)
  const [toonHuisstijl, setToonHuisstijl] = useState(false)
  const [sjablonen, setSjablonen] = useState<BlokSjabloon[]>([])
  const [nieuwsbriefSjablonen, setNieuwsbriefSjablonen] = useState<CampagneSjabloon[]>([])
  const [toonSjabloonOpslaan, setToonSjabloonOpslaan] = useState(false)
  const [sjabloonOpslaanBezig, setSjabloonOpslaanBezig] = useState(false)
  const [toonSjabloonKiezen, setToonSjabloonKiezen] = useState(false)

  const haalOp = useCallback(async () => {
    setLaden(true)
    const supabase = getSupabase()
    const [{ data }, { data: hs }, { data: sj }, { data: nbsj }] = await Promise.all([
      supabase.from('campagnes').select('*').order('bijgewerkt_op', { ascending: false }),
      supabase.from('campagne_huisstijl').select('*').eq('id', 1).maybeSingle(),
      supabase.from('campagne_bloksjablonen').select('*').order('aangemaakt_op', { ascending: false }),
      supabase.from('campagne_nieuwsbriefsjablonen').select('*').order('aangemaakt_op', { ascending: false }),
    ])
    setCampagnes((data ?? []) as Campagne[])
    setHuisstijl((hs ?? null) as CampagneHuisstijl | null)
    setSjablonen((sj ?? []) as BlokSjabloon[])
    setNieuwsbriefSjablonen((nbsj ?? []) as CampagneSjabloon[])
    setLaden(false)
  }, [])

  useEffect(() => { if (magZien) haalOp() }, [haalOp, magZien])

  function toon(bericht: string, type: 'success' | 'error' = 'success') {
    setToast({ bericht, type })
  }

  async function nieuweCampagne() {
    const { data, error } = await getSupabase()
      .from('campagnes')
      .insert({ titel: 'Naamloze campagne', onderwerp: '', blokken: [] })
      .select()
      .single()
    if (error) { toon('Aanmaken mislukt: ' + error.message, 'error'); return }
    setCampagnes(prev => [data as Campagne, ...prev])
    setHuidige(data as Campagne)
  }

  async function verwijder(id: string) {
    if (!confirm('Campagne verwijderen? Dit kan niet ongedaan gemaakt worden.')) return
    const { error } = await getSupabase().from('campagnes').delete().eq('id', id)
    if (error) { toon('Verwijderen mislukt: ' + error.message, 'error'); return }
    setCampagnes(prev => prev.filter(c => c.id !== id))
    toon('Campagne verwijderd')
  }

  async function dupliceerCampagne(c: Campagne) {
    const { data, error } = await getSupabase()
      .from('campagnes')
      .insert({
        titel: `${c.titel} (kopie)`,
        onderwerp: c.onderwerp,
        afzender_naam: c.afzender_naam,
        blokken: c.blokken,
      })
      .select()
      .single()
    if (error) { toon('Dupliceren mislukt: ' + error.message, 'error'); return }
    setCampagnes(prev => [data as Campagne, ...prev])
    toon('Campagne gedupliceerd')
  }

  async function slaSjabloonOp(blok: CampagneBlok) {
    const naam = window.prompt('Naam voor dit sjabloon:')
    if (!naam || !naam.trim()) return
    const { data, error } = await getSupabase()
      .from('campagne_bloksjablonen')
      .insert({ naam: naam.trim(), blok })
      .select()
      .single()
    if (error) { toon('Opslaan sjabloon mislukt: ' + error.message, 'error'); return }
    setSjablonen(prev => [data as BlokSjabloon, ...prev])
    toon('Sjabloon opgeslagen')
  }

  async function verwijderSjabloon(id: string) {
    if (!confirm('Sjabloon verwijderen?')) return
    const { error } = await getSupabase().from('campagne_bloksjablonen').delete().eq('id', id)
    if (error) { toon('Verwijderen mislukt: ' + error.message, 'error'); return }
    setSjablonen(prev => prev.filter(s => s.id !== id))
  }

  async function slaNieuwsbriefSjabloonOp(naam: string, bewarenIds: Set<string>) {
    if (!huidige || !naam) return
    setSjabloonOpslaanBezig(true)
    const blokken = huidige.blokken.map(b => bewarenIds.has(b.id) ? b : leegBlokInhoud(b))
    const { data, error } = await getSupabase()
      .from('campagne_nieuwsbriefsjablonen')
      .insert({ naam, blokken })
      .select()
      .single()
    setSjabloonOpslaanBezig(false)
    if (error) { toon('Opslaan sjabloon mislukt: ' + error.message, 'error'); return }
    setNieuwsbriefSjablonen(prev => [data as CampagneSjabloon, ...prev])
    setToonSjabloonOpslaan(false)
    toon('Nieuwsbriefsjabloon opgeslagen')
  }

  async function verwijderNieuwsbriefSjabloon(id: string) {
    if (!confirm('Sjabloon verwijderen?')) return
    const { error } = await getSupabase().from('campagne_nieuwsbriefsjablonen').delete().eq('id', id)
    if (error) { toon('Verwijderen mislukt: ' + error.message, 'error'); return }
    setNieuwsbriefSjablonen(prev => prev.filter(s => s.id !== id))
  }

  async function nieuweCampagneVanuitSjabloon(sjabloon: CampagneSjabloon) {
    const { data, error } = await getSupabase()
      .from('campagnes')
      .insert({ titel: sjabloon.naam, onderwerp: '', blokken: kloonBlokken(sjabloon.blokken) })
      .select()
      .single()
    if (error) { toon('Aanmaken mislukt: ' + error.message, 'error'); return }
    setCampagnes(prev => [data as Campagne, ...prev])
    setToonSjabloonKiezen(false)
    setHuidige(data as Campagne)
  }

  async function slaOp() {
    if (!huidige) return
    setOpslaan(true)
    const { error } = await getSupabase()
      .from('campagnes')
      .update({
        titel: huidige.titel,
        onderwerp: huidige.onderwerp,
        afzender_naam: huidige.afzender_naam,
        blokken: huidige.blokken,
        bijgewerkt_op: new Date().toISOString(),
      })
      .eq('id', huidige.id)
    setOpslaan(false)
    if (error) { toon('Opslaan mislukt: ' + error.message, 'error'); return }
    setCampagnes(prev => prev.map(c => c.id === huidige.id ? huidige : c))
    toon('Campagne opgeslagen')
  }

  function updateHuidige(patch: Partial<Campagne>) {
    setHuidige(prev => prev ? { ...prev, ...patch } : prev)
  }

  async function kopieerAlsMail() {
    if (!huidige) return
    const html = campagneNaarHtml(huidige, qrDataUrls, huisstijl)
    try {
      const blob = new Blob([html], { type: 'text/html' })
      const tekstBlob = new Blob([huidige.onderwerp || huidige.titel], { type: 'text/plain' })
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob, 'text/plain': tekstBlob })])
      toon('Gekopieerd — plak in een nieuw e-mailconcept')
    } catch {
      toon('Kopiëren mislukt in deze browser, gebruik "Ruwe HTML" en plak die handmatig.', 'error')
    }
  }

  async function kopieerRuweHtml() {
    if (!huidige) return
    const html = campagneNaarHtml(huidige, qrDataUrls, huisstijl)
    await navigator.clipboard.writeText(html)
    toon('Ruwe HTML gekopieerd')
  }

  if (!magZien) return (
    <>
      <Topbar titel="Campagnes" subtitel="Geen toegang" />
      <div className="page-content"><div className="empty-state"><Mail size={36} /><h3>Geen toegang</h3></div></div>
    </>
  )

  if (toonHuisstijl) {
    return (
      <>
        <Topbar titel="Campagnes" subtitel="Huisstijl" />
        <div className="page-content">
          <HuisstijlScherm
            huisstijl={huisstijl}
            magBewerken={magBewerken}
            onOpgeslagen={hs => setHuisstijl(hs)}
            onTerug={() => setToonHuisstijl(false)}
          />
        </div>
      </>
    )
  }

  if (huidige) {
    const aantalMetInhoud = huidige.blokken.filter(heeftBlokInhoud).length
    return (
      <>
        <Topbar
          titel={huidige.titel}
          acties={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setVoorbeeldHtml(campagneNaarHtml(huidige, qrDataUrls, huisstijl))}><Eye size={14} /> Voorbeeld</button>
              <button className="btn" onClick={kopieerAlsMail}><ClipboardCopy size={14} /> Kopieer als mail</button>
              <button className="btn" onClick={kopieerRuweHtml}><Code2 size={14} /> Ruwe HTML</button>
              {magBewerken && (
                <button className="btn" onClick={() => setToonSjabloonOpslaan(true)}><BookmarkPlus size={14} /> Sjabloon</button>
              )}
              {magBewerken && (
                <button className="btn btn-primary" onClick={slaOp} disabled={opslaan}>{opslaan ? 'Opslaan...' : 'Opslaan'}</button>
              )}
              <button className="btn" onClick={() => setHuidige(null)}><ArrowLeft size={14} /> Terug</button>
            </div>
          }
        />

        <div className="page-content">
          <div className="card" style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label className="form-label">Titel (intern)</label>
              <input className="form-input" value={huidige.titel} onChange={e => updateHuidige({ titel: e.target.value })} disabled={!magBewerken} />
            </div>
            <div>
              <label className="form-label">Onderwerp (e-mail)</label>
              <input className="form-input" value={huidige.onderwerp} onChange={e => updateHuidige({ onderwerp: e.target.value })} disabled={!magBewerken}
                placeholder="Onderwerpregel van de e-mail" />
            </div>
            <div>
              <label className="form-label">Afzendernaam</label>
              <input className="form-input" value={huidige.afzender_naam ?? ''} onChange={e => updateHuidige({ afzender_naam: e.target.value })} disabled={!magBewerken}
                placeholder="De Theepot Kinderopvang" />
            </div>
          </div>

          <CampagneBouwer
            blokken={huidige.blokken}
            onChange={(blokken: CampagneBlok[]) => updateHuidige({ blokken })}
            magBewerken={magBewerken}
            onQrDataUrlsChange={setQrDataUrls}
            sjablonen={sjablonen}
            onSjabloonOpslaan={slaSjabloonOp}
            onSjabloonVerwijderen={verwijderSjabloon}
          />

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
            {aantalMetInhoud} van {huidige.blokken.length} blok(ken) heeft inhoud. Verstuur de campagne zelf handmatig via &quot;Kopieer als mail&quot;.
          </p>
        </div>

        {voorbeeldHtml && (
          <PreviewModal titel={huidige.titel} html={voorbeeldHtml} onClose={() => setVoorbeeldHtml(null)} />
        )}

        {toonSjabloonOpslaan && (
          <NieuwsbriefSjabloonModal
            blokken={huidige.blokken}
            opslaan={sjabloonOpslaanBezig}
            onOpslaan={slaNieuwsbriefSjabloonOp}
            onSluiten={() => setToonSjabloonOpslaan(false)}
          />
        )}

        {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
      </>
    )
  }

  return (
    <>
      <Topbar
        titel="Campagnes"
        subtitel="Stel e-mails samen met tekst, afbeeldingen, knoppen en QR-codes — zonder HTML"
        acties={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setToonHuisstijl(true)}><Palette size={14} /> Huisstijl</button>
            {magBewerken && nieuwsbriefSjablonen.length > 0 && (
              <button className="btn" onClick={() => setToonSjabloonKiezen(true)}><LayoutTemplate size={14} /> Nieuw vanuit sjabloon</button>
            )}
            {magBewerken && (
              <button className="btn btn-primary" onClick={nieuweCampagne}><Plus size={14} /> Nieuwe campagne</button>
            )}
          </div>
        }
      />

      <div className="page-content">
        {laden ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
        ) : campagnes.length === 0 ? (
          <div className="empty-state">
            <Mail size={36} />
            <h3>Nog geen campagnes</h3>
            <p>Maak je eerste e-mailcampagne aan.</p>
            {magBewerken && (
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={nieuweCampagne}><Plus size={14} /> Nieuwe campagne</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {campagnes.map(c => (
              <div key={c.id} className="card" onClick={() => setHuidige(c)} style={{ cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14 }}>{c.titel}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: c.status === 'verzonden' ? '#DCFCE7' : 'var(--bg)', color: c.status === 'verzonden' ? '#15803D' : 'var(--text-muted)' }}>
                        {c.status === 'verzonden' ? 'Verzonden' : 'Concept'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{c.onderwerp || 'Geen onderwerp'} · {c.blokken.length} blok(ken)</div>
                  </div>
                  {magBewerken && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-sm" onClick={e => { e.stopPropagation(); dupliceerCampagne(c) }} title="Dupliceren"><Copy size={13} /></button>
                      <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={e => { e.stopPropagation(); verwijder(c.id) }} title="Verwijderen"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toonSjabloonKiezen && (
        <div className="modal-backdrop" onClick={ev => { if (ev.target === ev.currentTarget) setToonSjabloonKiezen(false) }}>
          <div className="modal-box">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title">Nieuwe campagne vanuit sjabloon</span>
              <button className="btn btn-sm" onClick={() => setToonSjabloonKiezen(false)}><X size={14} /></button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nieuwsbriefSjablonen.map(s => (
                <div key={s.id} onClick={() => nieuweCampagneVanuitSjabloon(s)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, border: '1px solid var(--border)', padding: 12, cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.naam}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.blokken.length} blok(ken)</div>
                  </div>
                  <button className="btn btn-sm" onClick={e => { e.stopPropagation(); verwijderNieuwsbriefSjabloon(s.id) }}><X size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
