'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import PreviewModal from '@/components/PreviewModal'
import {
  Plus, X, Trash2, Download, Pencil, Eye,
  ChevronUp, ChevronDown, ArrowLeft,
  GripVertical, FileText, Settings, Send
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sectie {
  id: string
  titel: string
  inhoud: string
}

interface Notulen {
  id: string
  titel: string
  vergaderdatum: string
  locatie_naam: string | null
  aanwezigen: string | null
  secties: Sectie[]
  gepubliceerd: boolean
  aangemaakt_op: string
  aangemaakt_door: string | null
}

interface StandaardKop {
  id: string
  titel: string
  volgorde: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nieuwId() { return Math.random().toString(36).slice(2) }

function fmtDatum(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDatumKort(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Logo (ingebakken) ────────────────────────────────────────────────────────
const LOGO_B64 = "data:image/jpeg;base64,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"

// ─── HTML export ──────────────────────────────────────────────────────────────

function genereerNotulentHTML(notulen: Notulen): string {
  const secties = notulen.secties.filter(s => s.inhoud.trim())

  function verwerkInhoud(tekst: string): string {
    const regels = tekst.split('\n')
    let html = ''
    let inLijst = false
    for (const rij of regels) {
      const r = rij.trim()
      const isBullet = /^[●•*\-–]\s/.test(r)
      if (!r) {
        if (inLijst) { html += `</ul>`; inLijst = false }
        html += `<div style="height:5px"></div>`
        continue
      }
      if (isBullet) {
        const inhoud = r.replace(/^[●•*\-–]\s*/, '')
        if (!inLijst) { html += `<ul style="margin:4px 0 4px 18px;padding:0">`; inLijst = true }
        html += `<li style="margin:2px 0;line-height:1.6">${inhoud}</li>`
      } else {
        if (inLijst) { html += `</ul>`; inLijst = false }
        html += `<p style="margin:0 0 5px;line-height:1.6">${r}</p>`
      }
    }
    if (inLijst) html += `</ul>`
    return html
  }

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Notulen — ${fmtDatum(notulen.vergaderdatum)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  body { font-family: Arial, sans-serif; font-size: 10.5pt; color: #1e1e1e; background: white; }
  .pagina { max-width: 180mm; margin: 0 auto; padding: 12mm; }
  .header { background: #8CC63F !important; color: white !important; padding: 14px 18px; display: flex; align-items: center; gap: 14px; border-radius: 12px 12px 0 0; margin: 8px 8px 0; }
  .header h1 { font-size: 18pt; font-weight: bold; color: white !important; }
  .header .sub { font-size: 8.5pt; color: rgba(255,255,255,0.88); margin-top: 3px; }
  .logo { width: 44px; height: 44px; object-fit: contain; border-radius: 8px; }
  .streep { background: #3D7010 !important; height: 4px; margin: 0 8px 16px; }
  .meta { background: #f5f9ee !important; border: 1px solid #d4eaaa; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 9.5pt; }
  .meta-rij { display: flex; gap: 8px; margin-bottom: 4px; }
  .meta-label { font-weight: bold; color: #3D7010 !important; min-width: 90px; }
  .sectie { margin-bottom: 10px; border-left: 4px solid #8CC63F; padding: 9px 12px; background: #f9fdf4 !important; page-break-inside: avoid; break-inside: avoid; }
  .sectie h2 { font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #3D7010 !important; margin-bottom: 7px; letter-spacing: 0.05em; }
  .footer { margin-top: 16px; border-top: 3px solid #8CC63F; padding-top: 7px; font-size: 7.5pt; color: #666; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="pagina">
  <div class="header">
    <img class="logo" src="${LOGO_B64}" alt="" />
    <div>
      <h1>Notulen Teamvergadering</h1>
      <div class="sub">${fmtDatum(notulen.vergaderdatum)}${notulen.locatie_naam ? '  •  ' + notulen.locatie_naam : ''}</div>
    </div>
  </div>
  <div class="streep"></div>
  ${notulen.aanwezigen ? `<div class="meta"><div class="meta-rij"><span class="meta-label">Aanwezigen:</span><span>${notulen.aanwezigen}</span></div></div>` : ''}
  ${secties.map(s => `<div class="sectie"><h2>${s.titel}</h2>${verwerkInhoud(s.inhoud.trim())}</div>`).join('')}
  <div class="footer">
    <span>De Theepot — Kinderopvang</span>
    ${notulen.locatie_naam ? `<span>${notulen.locatie_naam}</span>` : '<span></span>'}
    <span>${fmtDatum(notulen.vergaderdatum)}</span>
  </div>
</div>
</body>
</html>`
}

async function exportHTML(notulen: Notulen) {
  const html = genereerNotulentHTML(notulen)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Notulen_${notulen.vergaderdatum}.html`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function NotulenPage() {
  const { profiel, isSuperadmin, rechten } = useAuth()

  // Notulen opstellen: alleen superadmin/directie
  const magZien = isSuperadmin || profiel?.rol === 'directie' || (rechten as any).pagina_notulen !== 'geen'
  const magBewerken = isSuperadmin || profiel?.rol === 'directie'

  const [notulenLijst, setNotulenLijst] = useState<Notulen[]>([])
  const [actieve, setActieve] = useState<Notulen | null>(null)
  const [bewerkModus, setBewerkModus] = useState(false)
  const [instellingenOpen, setInstellingenOpen] = useState(false)
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)
  const [previewHTML, setPreviewHTML] = useState<string | null>(null)

  // Standaard koppen
  const [standaardKoppen, setStandaardKoppen] = useState<StandaardKop[]>([])
  const [nieuweKopNaam, setNieuweKopNaam] = useState('')

  // Editor state
  const [editorTitel, setEditorTitel] = useState('Notulen Teamvergadering')
  const [editorDatum, setEditorDatum] = useState('')
  const [editorLocatie, setEditorLocatie] = useState('')
  const [editorAanwezigen, setEditorAanwezigen] = useState('')
  const [editorSecties, setEditorSecties] = useState<Sectie[]>([])
  const [actieveSectie, setActieveSectie] = useState<string | null>(null)
  const [nieuwSectieNaam, setNieuwSectieNaam] = useState('')

  // Zoeken
  const [zoekterm, setZoekterm] = useState('')

  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data } = await getSupabase()
      .from('notulen')
      .select('*')
      .order('vergaderdatum', { ascending: false })
    setNotulenLijst((data ?? []) as Notulen[])
    setLaden(false)
  }, [])

  const haalKoppenOp = useCallback(async () => {
    const { data } = await getSupabase()
      .from('notulen_standaard_koppen')
      .select('*')
      .order('volgorde', { ascending: true })
    setStandaardKoppen((data ?? []) as StandaardKop[])
  }, [])

  useEffect(() => { haalOp(); haalKoppenOp() }, [haalOp, haalKoppenOp])

  function maakSectiesVanKoppen(koppen: StandaardKop[]): Sectie[] {
    return koppen.map(k => ({ id: nieuwId(), titel: k.titel, inhoud: '' }))
  }

  function nieuwAanmaken() {
    setEditorTitel('Notulen Teamvergadering')
    setEditorDatum(new Date().toISOString().split('T')[0])
    setEditorLocatie('')
    setEditorAanwezigen('')
    setEditorSecties(maakSectiesVanKoppen(standaardKoppen))
    setActieve(null)
    setActieveSectie(null)
    setBewerkModus(true)
  }

  function openBewerken(n: Notulen) {
    setEditorTitel(n.titel)
    setEditorDatum(n.vergaderdatum)
    setEditorLocatie(n.locatie_naam ?? '')
    setEditorAanwezigen(n.aanwezigen ?? '')
    setEditorSecties(n.secties)
    setActieve(n)
    setActieveSectie(null)
    setBewerkModus(true)
  }

  async function slaOp() {
    if (!editorTitel.trim()) return
    setOpslaan(true)
    const supabase = getSupabase()
    const data = {
      titel: editorTitel.trim(),
      vergaderdatum: editorDatum,
      locatie_naam: editorLocatie.trim() || null,
      aanwezigen: editorAanwezigen.trim() || null,
      secties: editorSecties,
      aangemaakt_door: profiel?.id,
      bijgewerkt_op: new Date().toISOString(),
    }
    // gepubliceerd alleen bij nieuw aanmaken op false zetten
    const insertData = { ...data, gepubliceerd: false }
    if (actieve) {
      await supabase.from('notulen').update(data).eq('id', actieve.id)
      setToast({ bericht: 'Opgeslagen!', type: 'success' })
    } else {
      const { data: nieuw } = await supabase.from('notulen').insert(insertData).select().single()
      if (nieuw) setActieve(nieuw as Notulen)
      setToast({ bericht: 'Aangemaakt!', type: 'success' })
    }
    setOpslaan(false)
    await haalOp()
  }

  async function verwijder(id: string) {
    if (!confirm('Notulen verwijderen?')) return
    await getSupabase().from('notulen').delete().eq('id', id)
    setBewerkModus(false); setActieve(null)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    await haalOp()
  }

  // Secties beheren
  function verwijderSectie(id: string) {
    setEditorSecties(prev => prev.filter(s => s.id !== id))
    if (actieveSectie === id) setActieveSectie(null)
  }

  function verplaatsSectie(id: string, r: 'up' | 'down') {
    setEditorSecties(prev => {
      const idx = prev.findIndex(s => s.id === id)
      const nieuw = [...prev]
      const swap = r === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= nieuw.length) return prev
      ;[nieuw[idx], nieuw[swap]] = [nieuw[swap], nieuw[idx]]
      return nieuw
    })
  }

  function updateSectie(id: string, veld: 'titel' | 'inhoud', waarde: string) {
    setEditorSecties(prev => prev.map(s => s.id === id ? { ...s, [veld]: waarde } : s))
  }

  function voegSectieToe() {
    if (!nieuwSectieNaam.trim()) return
    setEditorSecties(prev => [...prev, { id: nieuwId(), titel: nieuwSectieNaam.trim(), inhoud: '' }])
    setNieuwSectieNaam('')
  }

  // Standaard koppen beheren
  async function voegKopToe() {
    if (!nieuweKopNaam.trim()) return
    const volgorde = standaardKoppen.length + 1
    await getSupabase().from('notulen_standaard_koppen').insert({ titel: nieuweKopNaam.trim(), volgorde })
    setNieuweKopNaam('')
    await haalKoppenOp()
  }

  async function verwijderKop(id: string) {
    await getSupabase().from('notulen_standaard_koppen').delete().eq('id', id)
    await haalKoppenOp()
  }

  async function verplaatsKop(id: string, r: 'up' | 'down') {
    const idx = standaardKoppen.findIndex(k => k.id === id)
    const swap = r === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= standaardKoppen.length) return
    const a = standaardKoppen[idx]
    const b = standaardKoppen[swap]
    const supabase = getSupabase()
    await supabase.from('notulen_standaard_koppen').update({ volgorde: b.volgorde }).eq('id', a.id)
    await supabase.from('notulen_standaard_koppen').update({ volgorde: a.volgorde }).eq('id', b.id)
    await haalKoppenOp()
  }

  async function togglePubliceer(n: Notulen) {
    await getSupabase().from('notulen').update({ gepubliceerd: !n.gepubliceerd }).eq('id', n.id)
    setToast({ bericht: n.gepubliceerd ? 'Notulen verborgen.' : 'Notulen gepubliceerd!', type: 'success' })
    await haalOp()
  }

  // Filter: niet-bewerkers zien alleen gepubliceerde notulen
  const zichtbareNotulen = magBewerken ? notulenLijst : notulenLijst.filter(n => n.gepubliceerd)
  const gefilterdeNotulen = zichtbareNotulen.filter(n =>
    !zoekterm || n.titel.toLowerCase().includes(zoekterm.toLowerCase()) ||
    fmtDatum(n.vergaderdatum).toLowerCase().includes(zoekterm.toLowerCase()) ||
    (n.locatie_naam ?? '').toLowerCase().includes(zoekterm.toLowerCase()) ||
    (n.aanwezigen ?? '').toLowerCase().includes(zoekterm.toLowerCase()) ||
    n.secties.some(s => s.inhoud.toLowerCase().includes(zoekterm.toLowerCase()))
  )

  // ── Geen toegang ─────────────────────────────────────────────────────────────
  if (!magZien) return (
    <>
      <Topbar titel="Notulen" subtitel="Geen toegang" />
      <div className="page-content"><div className="empty-state"><FileText size={36} /><h3>Geen toegang</h3></div></div>
    </>
  )

  // ── Instellingen modal ────────────────────────────────────────────────────────
  const InstellingenModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: 480, maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15 }}>Standaard koppen beheren</span>
          <button onClick={() => setInstellingenOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 18 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Deze koppen worden automatisch toegevoegd bij elke nieuwe notulen. Je kunt ze per notulen nog aanpassen.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {standaardKoppen.map((k, idx) => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <GripVertical size={13} color="var(--border-dark)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13 }}>{k.titel}</span>
                <button onClick={() => verplaatsKop(k.id, 'up')} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: idx === 0 ? 0.2 : 0.7 }}><ChevronUp size={13} /></button>
                <button onClick={() => verplaatsKop(k.id, 'down')} disabled={idx === standaardKoppen.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: idx === standaardKoppen.length - 1 ? 0.2 : 0.7 }}><ChevronDown size={13} /></button>
                <button onClick={() => verwijderKop(k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', opacity: 0.7 }}><Trash2 size={13} /></button>
              </div>
            ))}
            {standaardKoppen.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>Nog geen standaard koppen.</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              value={nieuweKopNaam}
              onChange={e => setNieuweKopNaam(e.target.value)}
              placeholder="Nieuwe kop toevoegen..."
              onKeyDown={e => e.key === 'Enter' && voegKopToe()}
            />
            <button className="btn btn-primary btn-sm" onClick={voegKopToe} disabled={!nieuweKopNaam.trim()}>
              <Plus size={14} /> Toevoegen
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Editor ────────────────────────────────────────────────────────────────────
  if (bewerkModus) {
    const huidigNotulen: Notulen = {
      id: actieve?.id ?? '',
      titel: editorTitel,
      vergaderdatum: editorDatum,
      locatie_naam: editorLocatie || null,
      aanwezigen: editorAanwezigen || null,
      secties: editorSecties,
      aangemaakt_op: actieve?.aangemaakt_op ?? new Date().toISOString(),
      aangemaakt_door: profiel?.id ?? null,
    }

    return (
      <>
        <Topbar
          titel="Notulen opstellen"
          acties={
            <div style={{ display: 'flex', gap: 8 }}>
              {actieve && <>
                <button className="btn" onClick={() => setPreviewHTML(genereerNotulentHTML(huidigNotulen))}><Eye size={14} /> Preview</button>
                <button className="btn" onClick={() => exportHTML(huidigNotulen)}><Download size={14} /> Exporteren</button>
              </>}
              <button className="btn btn-primary" onClick={slaOp} disabled={opslaan || !editorTitel.trim()}>
                {opslaan ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button className="btn" onClick={() => { setBewerkModus(false); setActieve(null) }}>
                <ArrowLeft size={14} /> Terug
              </button>
            </div>
          }
        />

        <div className="page-content" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>

          {/* Links: meta + secties */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Meta */}
            <div className="card">
              <div className="card-header"><span className="card-title">Vergadering</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label className="form-label">Datum</label>
                  <input type="date" className="form-input" value={editorDatum} onChange={e => setEditorDatum(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Locatie (optioneel)</label>
                  <input className="form-input" value={editorLocatie} onChange={e => setEditorLocatie(e.target.value)} placeholder="Bijv. Lisse" />
                </div>
                <div>
                  <label className="form-label">Aanwezigen (optioneel)</label>
                  <input className="form-input" value={editorAanwezigen} onChange={e => setEditorAanwezigen(e.target.value)} placeholder="Bijv. Anna, Bas, Carla..." />
                </div>
              </div>
            </div>

            {/* Secties */}
            <div className="card">
              <div className="card-header"><span className="card-title">Koppen</span></div>
              <div style={{ padding: '6px 0' }}>
                {editorSecties.map((s, idx) => (
                  <div
                    key={s.id}
                    onClick={() => setActieveSectie(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                      cursor: 'pointer',
                      background: actieveSectie === s.id ? 'var(--primary-xlight)' : 'transparent',
                      borderLeft: actieveSectie === s.id ? '3px solid var(--primary)' : '3px solid transparent'
                    }}
                  >
                    <GripVertical size={12} color="var(--border-dark)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: actieveSectie === s.id ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{s.titel}</span>
                    {s.inhoud.trim() && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
                    <button onClick={e => { e.stopPropagation(); verplaatsSectie(s.id, 'up') }} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: idx === 0 ? 0.2 : 0.6, padding: '1px 2px', display: 'flex' }}><ChevronUp size={11} /></button>
                    <button onClick={e => { e.stopPropagation(); verplaatsSectie(s.id, 'down') }} disabled={idx === editorSecties.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: idx === editorSecties.length - 1 ? 0.2 : 0.6, padding: '1px 2px', display: 'flex' }}><ChevronDown size={11} /></button>
                    <button onClick={e => { e.stopPropagation(); verwijderSectie(s.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.4, padding: '1px 2px', display: 'flex' }}><X size={11} /></button>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
                <input
                  className="form-input"
                  style={{ flex: 1, fontSize: 12, padding: '5px 9px' }}
                  value={nieuwSectieNaam}
                  onChange={e => setNieuwSectieNaam(e.target.value)}
                  placeholder="Extra kop toevoegen..."
                  onKeyDown={e => e.key === 'Enter' && voegSectieToe()}
                />
                <button className="btn btn-sm" onClick={voegSectieToe} disabled={!nieuwSectieNaam.trim()}><Plus size={12} /></button>
              </div>
            </div>

            {actieve && (
              <button className="btn" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(actieve.id)}>
                <Trash2 size={14} /> Verwijderen
              </button>
            )}
          </div>

          {/* Rechts: editor */}
          <div>
            {!actieveSectie ? (
              <div className="empty-state" style={{ padding: 60 }}>
                <FileText size={32} />
                <h3>Kies een kop</h3>
                <p>Klik op een kop links om te beginnen met schrijven.</p>
              </div>
            ) : (() => {
              const sectie = editorSecties.find(s => s.id === actieveSectie)
              if (!sectie) return null
              return (
                <div className="card">
                  <div className="card-header">
                    <input
                      value={sectie.titel}
                      onChange={e => updateSectie(sectie.id, 'titel', e.target.value)}
                      style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14, border: 'none', background: 'none', color: 'var(--text)', flex: 1, outline: 'none', padding: '4px 0' }}
                    />
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                        Bullets: begin een regel met • of -
                      </span>
                    </div>
                    <textarea
                      value={sectie.inhoud}
                      onChange={e => updateSectie(sectie.id, 'inhoud', e.target.value)}
                      placeholder={`Notities voor "${sectie.titel}"...`}
                      autoFocus
                      style={{ width: '100%', minHeight: 400, border: '1px solid var(--border-dark)', borderRadius: 9, padding: '12px 14px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.8, background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none' }}
                      onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-dark)')}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{sectie.inhoud.length} tekens</div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
        {previewHTML && <PreviewModal titel="Notulen preview" html={previewHTML} onClose={() => setPreviewHTML(null)} />}
      </>
    )
  }

  // ── Overzicht ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Topbar
        titel="Notulen"
        subtitel={`${notulenLijst.length} vergaderingen`}
        zoeken={{ placeholder: 'Zoeken in notulen...', waarde: zoekterm, onChange: setZoekterm }}
        acties={
          <div style={{ display: 'flex', gap: 8 }}>
            {isSuperadmin && (
              <button className="btn" onClick={() => setInstellingenOpen(true)}>
                <Settings size={14} /> Koppen
              </button>
            )}
            {magBewerken && (
              <button className="btn btn-primary" onClick={nieuwAanmaken}>
                <Plus size={14} /> Nieuwe notulen
              </button>
            )}
          </div>
        }
      />

      <div className="page-content">
        {laden ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
        ) : gefilterdeNotulen.length === 0 ? (
          <div className="empty-state">
            <FileText size={36} />
            <h3>{zoekterm ? 'Geen resultaten' : 'Geen notulen'}</h3>
            <p>{zoekterm ? `Niets gevonden voor "${zoekterm}"` : 'Maak de eerste notulen aan.'}</p>
            {magBewerken && !zoekterm && (
              <button className="btn btn-primary" onClick={nieuwAanmaken} style={{ marginTop: 8 }}>
                <Plus size={14} /> Nieuwe notulen
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gefilterdeNotulen.map(n => (
              <div
                key={n.id}
                className="card"
                style={{ opacity: !n.gepubliceerd && magBewerken ? 0.75 : 1 }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Datum badge */}
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--primary-light)', border: '1px solid var(--primary-xlight)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, gap: 1 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--primary-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {new Date(n.vergaderdatum).toLocaleDateString('nl-NL', { month: 'short' })}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-text)', lineHeight: 1 }}>
                      {new Date(n.vergaderdatum).getDate()}
                    </span>
                    <span style={{ fontSize: 8, color: 'var(--primary-text)', opacity: 0.7 }}>
                      {new Date(n.vergaderdatum).getFullYear()}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {n.titel}
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: n.gepubliceerd ? 'var(--primary-light)' : 'var(--bg)', color: n.gepubliceerd ? 'var(--primary-text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {n.gepubliceerd ? '● Gepubliceerd' : '○ Concept'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>📅 {fmtDatumKort(n.vergaderdatum)}</span>
                      {n.locatie_naam && <span>📍 {n.locatie_naam}</span>}
                      {n.aanwezigen && <span>👥 {n.aanwezigen}</span>}
                      <span>📝 {n.secties.filter(s => s.inhoud.trim()).length}/{n.secties.length} koppen ingevuld</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => setPreviewHTML(genereerNotulentHTML(n))}><Eye size={13} /> Preview</button>
                    <button className="btn btn-sm" onClick={() => exportHTML(n)}><Download size={13} /> Exporteren</button>
                    {magBewerken && (
                      <button className="btn btn-sm" onClick={() => togglePubliceer(n)} title={n.gepubliceerd ? 'Verbergen' : 'Publiceren'}>
                        {n.gepubliceerd ? <Eye size={13} style={{ opacity: 0.5 }} /> : <Send size={13} color="var(--primary)" />}
                        {n.gepubliceerd ? ' Verbergen' : ' Publiceren'}
                      </button>
                    )}
                    {magBewerken && <button className="btn btn-sm" onClick={() => openBewerken(n)}><Pencil size={13} /> Bewerken</button>}
                    {magBewerken && (
                      <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(n.id)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
      {previewHTML && <PreviewModal titel="Notulen preview" html={previewHTML} onClose={() => setPreviewHTML(null)} />}
      {instellingenOpen && isSuperadmin && <InstellingenModal />}
    </>
  )
}
