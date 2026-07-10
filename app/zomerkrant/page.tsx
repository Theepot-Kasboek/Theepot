'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import { Plus, Trash2, Download, Pencil, ArrowLeft, Newspaper, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ThemaSleutel = 'blauwpaars' | 'groen' | 'roze' | 'geeloranje' | 'grijsbruin' | 'zwartwit'

interface EditorState {
  datum: string
  geschreven_door: string
  thema: ThemaSleutel
  weer_tekst: string
  interview_titel: string
  interview_tekst: string
  foto_interview_url: string
  review_activiteit_tekst: string
  foto_activiteit_url: string
  hahaha_tekst: string
}

interface Editie {
  id: string
  datum: string
  geschreven_door: string | null
  thema_kleur: ThemaSleutel
  weer_tekst: string | null
  interview_titel: string | null
  interview_tekst: string | null
  foto_interview_url: string | null
  review_activiteit_tekst: string | null
  foto_activiteit_url: string | null
  hahaha_tekst: string | null
  created_at: string
  aangemaakt_door: string | null
}

// ─── Thema configuratie ───────────────────────────────────────────────────────

const THEMAS: Record<ThemaSleutel, { naam: string; kleur: string; vars: Record<string, string> }> = {
  blauwpaars: {
    naam: 'Blauw/Paars', kleur: '#5B3A8E',
    vars: { '--paper': '#EDE3F7', '--paper-edge': '#DCC9F2', '--ink': '#3A2A57', '--plum': '#5B3A8E', '--plum-dark': '#3F2768', '--accent': '#E8B23B', '--accent2': '#eec168', '--paper-shadow': '0 10px 30px rgba(63,39,104,0.18)' },
  },
  groen: {
    naam: 'Groen', kleur: '#3E7A2D',
    vars: { '--paper': '#E3F0DE', '--paper-edge': '#C3E1B6', '--ink': '#24421F', '--plum': '#3E7A2D', '--plum-dark': '#2C5920', '--accent': '#F2C744', '--accent2': '#f5d874', '--paper-shadow': '0 10px 30px rgba(44,89,32,0.18)' },
  },
  roze: {
    naam: 'Roze/Rood', kleur: '#C23B4B',
    vars: { '--paper': '#FBE1E2', '--paper-edge': '#F3BFC4', '--ink': '#5A1A22', '--plum': '#C23B4B', '--plum-dark': '#8E2432', '--accent': '#F3A64B', '--accent2': '#f6bd77', '--paper-shadow': '0 10px 30px rgba(142,36,50,0.18)' },
  },
  geeloranje: {
    naam: 'Geel/Oranje', kleur: '#E07B23',
    vars: { '--paper': '#FDF0D2', '--paper-edge': '#F8D89A', '--ink': '#5A3B0E', '--plum': '#E07B23', '--plum-dark': '#B85A12', '--accent': '#4F8A8B', '--accent2': '#74a9a9', '--paper-shadow': '0 10px 30px rgba(184,90,18,0.18)' },
  },
  grijsbruin: {
    naam: 'Grijs/Bruin', kleur: '#6B5645',
    vars: { '--paper': '#EDE7DD', '--paper-edge': '#D6C9B4', '--ink': '#3E332A', '--plum': '#6B5645', '--plum-dark': '#4A3A2C', '--accent': '#C9A66B', '--accent2': '#d9bd8c', '--paper-shadow': '0 10px 30px rgba(74,58,44,0.18)' },
  },
  zwartwit: {
    naam: 'Zwart/Wit', kleur: '#222222',
    vars: { '--paper': '#F5F5F5', '--paper-edge': '#CFCFCF', '--ink': '#111111', '--plum': '#222222', '--plum-dark': '#000000', '--accent': '#4A4A4A', '--accent2': '#6b6b6b', '--paper-shadow': '0 10px 30px rgba(0,0,0,0.18)' },
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDatum(d: string) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function legeEditor(): EditorState {
  return {
    datum: new Date().toISOString().split('T')[0],
    geschreven_door: '',
    thema: 'blauwpaars',
    weer_tekst: '',
    interview_titel: '',
    interview_tekst: '',
    foto_interview_url: '',
    review_activiteit_tekst: '',
    foto_activiteit_url: '',
    hahaha_tekst: '',
  }
}

function editieNaarEditor(e: Editie): EditorState {
  return {
    datum: e.datum,
    geschreven_door: e.geschreven_door ?? '',
    thema: e.thema_kleur,
    weer_tekst: e.weer_tekst ?? '',
    interview_titel: e.interview_titel ?? '',
    interview_tekst: e.interview_tekst ?? '',
    foto_interview_url: e.foto_interview_url ?? '',
    review_activiteit_tekst: e.review_activiteit_tekst ?? '',
    foto_activiteit_url: e.foto_activiteit_url ?? '',
    hahaha_tekst: e.hahaha_tekst ?? '',
  }
}

// ─── HTML export (zelfde aanpak als nieuwsbrieven) ────────────────────────────

function genereerExportHTML(ed: EditorState): string {
  const t = THEMAS[ed.thema]
  const vars = Object.entries(t.vars).map(([k, v]) => `${k}:${v}`).join(';')

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function blokTekst(tekst: string): string {
    if (!tekst.trim()) return '<span style="opacity:0.4;font-style:italic">—</span>'
    return tekst.split('\n').filter(r => r.trim()).map(r => `<p style="margin:0 0 6px;line-height:1.65">${esc(r)}</p>`).join('')
  }

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Theepot Zomerkrant — ${fmtDatum(ed.datum)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Caveat:wght@600;700&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:28px 12px 60px;background:linear-gradient(180deg,${t.vars['--paper']},${t.vars['--paper-edge']} 100%);font-family:'Quicksand',sans-serif;color:${t.vars['--ink']};min-height:100vh;${vars}}
  .page{max-width:860px;margin:0 auto;background:var(--paper);border-radius:6px;box-shadow:var(--paper-shadow);position:relative;overflow:hidden;border:1px solid var(--paper-edge)}
  .tape{position:absolute;width:110px;height:34px;background:repeating-linear-gradient(45deg,var(--accent),var(--accent) 6px,var(--accent2) 6px,var(--accent2) 12px);opacity:0.85;box-shadow:0 2px 4px rgba(0,0,0,0.15)}
  .tape.tl{top:-10px;left:36px;transform:rotate(-8deg)}
  .tape.tr{top:-10px;right:36px;transform:rotate(7deg)}
  .masthead{padding:18px 36px 10px;text-align:center;border-bottom:3px solid var(--plum)}
  .kicker{font-weight:700;letter-spacing:3px;text-transform:uppercase;font-size:11px;color:var(--plum);opacity:0.75}
  h1.krant-titel{font-family:'Caveat',cursive;font-size:54px;line-height:0.9;margin:2px 0 4px;color:var(--plum-dark);letter-spacing:1px}
  .subtitle{font-family:'Patrick Hand',cursive;font-size:16px;color:var(--ink)}
  .meta-row{display:flex;justify-content:center;gap:26px;margin-top:8px;flex-wrap:wrap}
  .meta-field{font-family:'Patrick Hand',cursive;font-size:16px;display:flex;align-items:baseline;gap:6px}
  .meta-label{color:var(--plum);font-weight:700}
  .grid{display:grid;grid-template-columns:1fr 1fr}
  .col-left{border-right:3px solid var(--plum)}
  .block{padding:12px 26px;border-bottom:2px solid rgba(91,58,142,0.28)}
  .block:last-child{border-bottom:none}
  .block-h2{font-family:'Patrick Hand',cursive;font-size:19px;margin:0 0 6px;color:var(--plum-dark);display:flex;align-items:center;gap:8px}
  .body{font-family:'Patrick Hand',cursive;font-size:15px;line-height:1.65;color:var(--ink);background-image:repeating-linear-gradient(transparent,transparent 27px,rgba(91,58,142,0.22) 28px);background-position-y:6px;padding:4px 0;min-height:60px}
  .photo-box{margin-top:6px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,0.35)}
  .photo-box img{width:100%;display:block;max-height:220px;object-fit:cover}
  .footer-strip{text-align:center;padding:6px 20px 10px;font-family:'Patrick Hand',cursive;font-size:11px;color:rgba(58,42,87,0.6)}
  @media(max-width:640px){.grid{grid-template-columns:1fr}.col-left{border-right:none;border-bottom:3px solid var(--plum)}}
  @media print{body{background:white;padding:0;margin:0}.page{box-shadow:none;border-radius:0;border:none;max-width:100%}.block{break-inside:avoid}.tape{display:none}@page{size:A4;margin:8mm}}
</style>
</head>
<body>
<div class="page">
  <div class="tape tl"></div>
  <div class="tape tr"></div>
  <div class="masthead">
    <div class="kicker">BSO De Theepot</div>
    <h1 class="krant-titel">Theepot Zomerkrant</h1>
    <div class="subtitle">☀️ Zomervakantie editie ☀️</div>
    <div class="meta-row">
      <div class="meta-field"><span class="meta-label">Datum:</span> ${fmtDatum(ed.datum)}</div>
      ${ed.geschreven_door ? `<div class="meta-field"><span class="meta-label">Geschreven door:</span> ${esc(ed.geschreven_door)}</div>` : ''}
    </div>
  </div>
  <div class="grid">
    <div class="col-left">
      <div class="block">
        <div class="block-h2">🌤️ Weer</div>
        <div class="body">${blokTekst(ed.weer_tekst)}</div>
      </div>
      <div class="block">
        <div class="block-h2">🎤 Interview met ${ed.interview_titel ? `<em>${esc(ed.interview_titel)}</em>` : '<span style="opacity:0.5">...</span>'}</div>
        <div class="body">${blokTekst(ed.interview_tekst)}</div>
      </div>
      ${ed.foto_interview_url ? `<div class="block"><div class="block-h2">📸 Foto interview</div><div class="photo-box"><img src="${ed.foto_interview_url}" alt="Foto interview"></div></div>` : ''}
    </div>
    <div>
      <div class="block">
        <div class="block-h2">⭐ Review activiteit</div>
        <div class="body">${blokTekst(ed.review_activiteit_tekst)}</div>
      </div>
      ${ed.foto_activiteit_url ? `<div class="block"><div class="block-h2">📸 Foto activiteit</div><div class="photo-box"><img src="${ed.foto_activiteit_url}" alt="Foto activiteit"></div></div>` : ''}
      <div class="block">
        <div class="block-h2">😂 Hahaha (grap van de dag)</div>
        <div class="body">${blokTekst(ed.hahaha_tekst)}</div>
      </div>
    </div>
  </div>
  <div class="footer-strip">Theepot Zomerkrant • Zomervakantie • pagina wordt gebundeld tot het zomerboek</div>
</div>
</body>
</html>`
}

function downloadHTML(ed: EditorState) {
  const html = genereerExportHTML(ed)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ZomerkrantEditie_${ed.datum}.html`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Foto upload vak ──────────────────────────────────────────────────────────

interface FotoVakProps {
  url: string
  bezig: boolean
  icon: string
  label: string
  inputRef: React.RefObject<HTMLInputElement>
  onVerwijder: () => void
  onChange: (bestand: File) => void
}

function FotoVak({ url, bezig, icon, label, inputRef, onVerwijder, onChange }: FotoVakProps) {
  return (
    <div
      style={{ marginTop: 6, border: '2.5px dashed var(--plum)', borderRadius: 8, minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, cursor: bezig ? 'wait' : 'pointer', background: 'rgba(255,255,255,0.35)', position: 'relative', overflow: 'hidden', textAlign: 'center', padding: 8 }}
      onClick={() => !bezig && inputRef.current?.click()}
    >
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onVerwijder() }}
            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', color: 'var(--plum-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
          >
            <X size={12} />
          </button>
        </>
      ) : (
        <div style={{ fontFamily: "'Patrick Hand', cursive", color: 'var(--plum)', fontSize: 13, pointerEvents: 'none' }}>
          <span style={{ fontSize: 22, display: 'block', marginBottom: 2 }}>{icon}</span>
          {bezig ? 'Uploaden...' : 'Klik om een foto toe te voegen'}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = '' }}
      />
    </div>
  )
}

// ─── Hoofd component ──────────────────────────────────────────────────────────

export default function ZomerkrantPage() {
  const { profiel, isSuperadmin, rechten } = useAuth()
  const zomerkrantRecht = ((rechten as unknown as Record<string, string>)['pagina_zomerkrant']) ?? 'geen'
  const magZien = isSuperadmin || zomerkrantRecht !== 'geen'
  const magBewerken = isSuperadmin || zomerkrantRecht === 'bewerken'

  const [edities, setEdities] = useState<Editie[]>([])
  const [bewerkModus, setBewerkModus] = useState(false)
  const [actieveEditie, setActieveEditie] = useState<Editie | null>(null)
  const [ed, setEd] = useState<EditorState>(legeEditor())
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [uploadBezig, setUploadBezig] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  const fotoInterviewRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>
  const fotoActiviteitRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>

  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data } = await getSupabase()
      .from('zomerkrant_edities')
      .select('*')
      .order('datum', { ascending: false })
    setEdities((data ?? []) as Editie[])
    setLaden(false)
  }, [])

  useEffect(() => { haalOp() }, [haalOp])

  function update<K extends keyof EditorState>(veld: K, waarde: EditorState[K]) {
    setEd(prev => ({ ...prev, [veld]: waarde }))
  }

  function nieuwAanmaken() {
    setEd(legeEditor())
    setActieveEditie(null)
    setBewerkModus(true)
  }

  function openBewerken(editie: Editie) {
    setEd(editieNaarEditor(editie))
    setActieveEditie(editie)
    setBewerkModus(true)
  }

  async function uploadFoto(bestand: File, veld: 'foto_interview_url' | 'foto_activiteit_url') {
    setUploadBezig(prev => ({ ...prev, [veld]: true }))
    const supabase = getSupabase()
    const veiligeNaam = bestand.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const pad = `${Date.now()}_${veiligeNaam}`
    const { error } = await supabase.storage.from('zomerkrant-fotos').upload(pad, bestand)
    if (error) {
      setToast({ bericht: 'Foto uploaden mislukt: ' + error.message, type: 'error' })
      setUploadBezig(prev => ({ ...prev, [veld]: false }))
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('zomerkrant-fotos').getPublicUrl(pad)
    update(veld, publicUrl)
    setUploadBezig(prev => ({ ...prev, [veld]: false }))
  }

  async function slaOp() {
    setOpslaan(true)
    const supabase = getSupabase()
    const data = {
      datum: ed.datum,
      geschreven_door: ed.geschreven_door || null,
      thema_kleur: ed.thema,
      weer_tekst: ed.weer_tekst || null,
      interview_titel: ed.interview_titel || null,
      interview_tekst: ed.interview_tekst || null,
      foto_interview_url: ed.foto_interview_url || null,
      review_activiteit_tekst: ed.review_activiteit_tekst || null,
      foto_activiteit_url: ed.foto_activiteit_url || null,
      hahaha_tekst: ed.hahaha_tekst || null,
      aangemaakt_door: profiel?.id ?? null,
    }
    if (actieveEditie) {
      const { error } = await supabase.from('zomerkrant_edities').update(data).eq('id', actieveEditie.id)
      if (error) { setToast({ bericht: 'Opslaan mislukt: ' + error.message, type: 'error' }); setOpslaan(false); return }
      setToast({ bericht: 'Editie opgeslagen!', type: 'success' })
    } else {
      const { data: nieuw, error } = await supabase.from('zomerkrant_edities').insert(data).select().single()
      if (error) { setToast({ bericht: 'Aanmaken mislukt: ' + error.message, type: 'error' }); setOpslaan(false); return }
      if (nieuw) setActieveEditie(nieuw as Editie)
      setToast({ bericht: 'Editie aangemaakt!', type: 'success' })
    }
    setOpslaan(false)
    await haalOp()
  }

  async function verwijder(id: string) {
    if (!confirm('Editie verwijderen?')) return
    await getSupabase().from('zomerkrant_edities').delete().eq('id', id)
    setBewerkModus(false)
    setActieveEditie(null)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    await haalOp()
  }

  // ── Toegang check ─────────────────────────────────────────────────────────────
  if (!magZien) return (
    <>
      <Topbar titel="Zomerkrant" subtitel="Geen toegang" />
      <div className="page-content">
        <div className="empty-state"><Newspaper size={36} /><h3>Geen toegang</h3></div>
      </div>
    </>
  )

  // ── Editor ────────────────────────────────────────────────────────────────────
  if (bewerkModus) {
    const thema = THEMAS[ed.thema]
    const cssVars = thema.vars as unknown as React.CSSProperties

    const taStyle: React.CSSProperties = {
      fontFamily: "'Patrick Hand', cursive",
      fontSize: 14,
      lineHeight: 1.65,
      color: 'var(--ink)',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      resize: 'none',
      width: '100%',
      padding: 0,
      backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(91,58,142,0.2) 28px)',
      backgroundPositionY: 6,
    }

    const inputStyleMeta: React.CSSProperties = {
      fontFamily: "'Patrick Hand', cursive",
      fontSize: 15,
      color: 'var(--ink)',
      background: 'transparent',
      border: 'none',
      borderBottom: '1.5px dashed var(--plum)',
      outline: 'none',
      padding: '0 4px 1px',
      minWidth: 140,
    }

    const inputStyleTitel: React.CSSProperties = {
      fontFamily: "'Patrick Hand', cursive",
      fontSize: 17,
      color: 'var(--ink)',
      background: 'transparent',
      border: 'none',
      borderBottom: '1.5px dashed var(--plum)',
      outline: 'none',
      padding: '0 4px 1px',
      minWidth: 100,
    }

    const blokBorder: React.CSSProperties = {
      borderBottom: '2px solid rgba(91,58,142,0.25)',
    }

    const blokH2: React.CSSProperties = {
      fontFamily: "'Patrick Hand', cursive",
      fontSize: 19,
      margin: '0 0 6px',
      color: 'var(--plum-dark)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    }

    return (
      <>
        {/* Google Fonts voor krant-design */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Caveat:wght@600;700&family=Quicksand:wght@400;500;600;700&display=swap');
          .zomerkrant-grid { display: grid; grid-template-columns: 1fr 1fr; }
          .zomerkrant-col-left { border-right: 3px solid var(--plum); }
          .zomerkrant-titel { font-size: 54px; }
          .zomerkrant-masthead { padding: 18px 36px 10px; }
          .zomerkrant-block { padding: 12px 26px; }
          @media (max-width: 640px) {
            .zomerkrant-grid { grid-template-columns: 1fr; }
            .zomerkrant-col-left { border-right: none; border-bottom: 3px solid var(--plum); }
            .zomerkrant-masthead { padding: 14px 18px 8px; }
            .zomerkrant-block { padding: 10px 16px; }
          }
          @media (max-width: 480px) {
            .zomerkrant-titel { font-size: 36px; }
          }
        `}</style>

        <Topbar
          titel="🗞️ Zomerkrant"
          acties={
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Thema swatches */}
              {(Object.entries(THEMAS) as [ThemaSleutel, typeof THEMAS[ThemaSleutel]][]).map(([sleutel, t]) => (
                <button
                  key={sleutel}
                  onClick={() => update('thema', sleutel)}
                  title={t.naam}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    border: `2px solid ${ed.thema === sleutel ? t.kleur : 'transparent'}`,
                    background: 'var(--bg-card)', borderRadius: 999,
                    padding: '3px 10px 3px 4px', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, color: 'var(--text)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    transition: 'border-color 0.12s',
                  }}
                >
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: t.kleur, border: '1px solid rgba(0,0,0,0.15)', display: 'block', flexShrink: 0 }} />
                  <span style={{ display: 'none', whiteSpace: 'nowrap' }} className="theme-label-text">{t.naam}</span>
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
              {actieveEditie && (
                <button className="btn btn-sm" onClick={() => downloadHTML(ed)}>
                  <Download size={13} /> Exporteer
                </button>
              )}
              <button className="btn btn-primary" onClick={slaOp} disabled={opslaan || !ed.datum}>
                {opslaan ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button className="btn" onClick={() => { setBewerkModus(false); setActieveEditie(null) }}>
                <ArrowLeft size={14} /> Terug
              </button>
            </div>
          }
        />

        <div className="page-content">
          {/* Krant container met CSS variabelen voor theming */}
          <div style={{ ...cssVars, maxWidth: 860, margin: '0 auto', width: '100%' }}>
            <div style={{
              background: 'var(--paper)',
              borderRadius: 6,
              boxShadow: 'var(--paper-shadow)',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid var(--paper-edge)',
            }}>
              {/* Plakband links */}
              <div style={{
                position: 'absolute', width: 110, height: 34, top: -10, left: 36, transform: 'rotate(-8deg)',
                background: 'repeating-linear-gradient(45deg, var(--accent), var(--accent) 6px, var(--accent2) 6px, var(--accent2) 12px)',
                opacity: 0.85, boxShadow: '0 2px 4px rgba(0,0,0,0.15)', zIndex: 1,
              }} />
              {/* Plakband rechts */}
              <div style={{
                position: 'absolute', width: 110, height: 34, top: -10, right: 36, transform: 'rotate(7deg)',
                background: 'repeating-linear-gradient(45deg, var(--accent), var(--accent) 6px, var(--accent2) 6px, var(--accent2) 12px)',
                opacity: 0.85, boxShadow: '0 2px 4px rgba(0,0,0,0.15)', zIndex: 1,
              }} />

              {/* Masthead */}
              <div className="zomerkrant-masthead" style={{ textAlign: 'center', borderBottom: '3px solid var(--plum)', position: 'relative' }}>
                <div style={{ fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', fontSize: 11, color: 'var(--plum)', opacity: 0.75 }}>BSO De Theepot</div>
                <div className="zomerkrant-titel" style={{ fontFamily: "'Caveat', cursive", lineHeight: 0.9, margin: '2px 0 4px', color: 'var(--plum-dark)', letterSpacing: 1 }}>
                  Theepot Zomerkrant
                </div>
                <div style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 16, color: 'var(--ink)' }}>
                  ☀️ Zomervakantie editie ☀️
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 26, marginTop: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 15, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ color: 'var(--plum)', fontWeight: 700 }}>Datum:</span>
                    <input
                      type="date"
                      value={ed.datum}
                      onChange={e => update('datum', e.target.value)}
                      style={inputStyleMeta}
                    />
                  </div>
                  <div style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 15, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ color: 'var(--plum)', fontWeight: 700 }}>Geschreven door:</span>
                    <input
                      value={ed.geschreven_door}
                      onChange={e => update('geschreven_door', e.target.value)}
                      placeholder="naam van de schrijver(s)"
                      style={inputStyleMeta}
                    />
                  </div>
                </div>
              </div>

              {/* Tweekoloms grid */}
              <div className="zomerkrant-grid">

                {/* ── Linker kolom ────────────────────────────────────────── */}
                <div className="zomerkrant-col-left">

                  {/* Weer */}
                  <div className="zomerkrant-block" style={blokBorder}>
                    <div style={blokH2}><span>🌤️</span> Weer</div>
                    <textarea
                      value={ed.weer_tekst}
                      onChange={e => update('weer_tekst', e.target.value)}
                      placeholder="Hoe is het weer vandaag? Zon, regen, wind..."
                      rows={4}
                      style={taStyle}
                    />
                  </div>

                  {/* Interview */}
                  <div className="zomerkrant-block" style={blokBorder}>
                    <div style={{ ...blokH2, gap: 4 }}>
                      <span>🎤</span>
                      <span>Interview met</span>
                      <input
                        value={ed.interview_titel}
                        onChange={e => update('interview_titel', e.target.value)}
                        placeholder="naam..."
                        style={inputStyleTitel}
                      />
                    </div>
                    <textarea
                      value={ed.interview_tekst}
                      onChange={e => update('interview_tekst', e.target.value)}
                      placeholder="Schrijf hier het interview op..."
                      rows={7}
                      style={taStyle}
                    />
                  </div>

                  {/* Foto interview */}
                  <div className="zomerkrant-block" style={{ ...blokBorder, borderBottom: 'none' }}>
                    <div style={blokH2}><span>📸</span> Foto interview</div>
                    <FotoVak
                      url={ed.foto_interview_url}
                      bezig={!!uploadBezig['foto_interview_url']}
                      icon="🙂🙂"
                      label="Foto interview"
                      inputRef={fotoInterviewRef}
                      onVerwijder={() => update('foto_interview_url', '')}
                      onChange={f => uploadFoto(f, 'foto_interview_url')}
                    />
                  </div>
                </div>

                {/* ── Rechter kolom ───────────────────────────────────────── */}
                <div>

                  {/* Review activiteit */}
                  <div className="zomerkrant-block" style={blokBorder}>
                    <div style={blokH2}><span>⭐</span> Review activiteit</div>
                    <textarea
                      value={ed.review_activiteit_tekst}
                      onChange={e => update('review_activiteit_tekst', e.target.value)}
                      placeholder="Wat hebben we vandaag gedaan? Vonden de kinderen het leuk?"
                      rows={5}
                      style={taStyle}
                    />
                  </div>

                  {/* Foto activiteit */}
                  <div className="zomerkrant-block" style={blokBorder}>
                    <div style={blokH2}><span>📸</span> Foto activiteit</div>
                    <FotoVak
                      url={ed.foto_activiteit_url}
                      bezig={!!uploadBezig['foto_activiteit_url']}
                      icon="🖼️"
                      label="Foto activiteit"
                      inputRef={fotoActiviteitRef}
                      onVerwijder={() => update('foto_activiteit_url', '')}
                      onChange={f => uploadFoto(f, 'foto_activiteit_url')}
                    />
                  </div>

                  {/* Hahaha */}
                  <div className="zomerkrant-block" style={{ ...blokBorder, borderBottom: 'none' }}>
                    <div style={blokH2}><span>😂</span> Hahaha (grap van de dag)</div>
                    <textarea
                      value={ed.hahaha_tekst}
                      onChange={e => update('hahaha_tekst', e.target.value)}
                      placeholder="Vertel hier de grappigste mop of het leukste moment van vandaag..."
                      rows={5}
                      style={taStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Footer strip */}
              <div style={{ textAlign: 'center', padding: '6px 20px 10px', fontFamily: "'Patrick Hand', cursive", fontSize: 11, color: 'rgba(58,42,87,0.6)', borderTop: '1px solid rgba(91,58,142,0.15)' }}>
                Theepot Zomerkrant • Zomervakantie • pagina wordt gebundeld tot het zomerboek
              </div>
            </div>

            {/* Verwijder knop onderaan krant */}
            {actieveEditie && magBewerken && (
              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <button className="btn" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(actieveEditie.id)}>
                  <Trash2 size={14} /> Editie verwijderen
                </button>
              </div>
            )}
          </div>
        </div>

        {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
      </>
    )
  }

  // ── Overzicht ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Topbar
        titel="Zomerkrant"
        subtitel={`${edities.length} ${edities.length === 1 ? 'editie' : 'edities'}`}
        acties={
          magBewerken ? (
            <button className="btn btn-primary" onClick={nieuwAanmaken}>
              <Plus size={14} /> Nieuwe editie
            </button>
          ) : undefined
        }
      />

      <div className="page-content">
        {laden ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
        ) : edities.length === 0 ? (
          <div className="empty-state">
            <Newspaper size={36} />
            <h3>Nog geen edities</h3>
            <p>Maak de eerste dag-editie aan voor de Theepot Zomerkrant.</p>
            {magBewerken && (
              <button className="btn btn-primary" onClick={nieuwAanmaken}>
                <Plus size={14} /> Nieuwe editie
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {edities.map(editie => {
              const t = THEMAS[editie.thema_kleur] ?? THEMAS.blauwpaars
              const edState = editieNaarEditor(editie)
              return (
                <div
                  key={editie.id}
                  className="card"
                  onMouseEnter={e => (e.currentTarget.style.borderColor = t.kleur)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Kleur-icoon */}
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: t.kleur + '22', border: `1.5px solid ${t.kleur}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
                      🗞️
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14 }}>{fmtDatum(editie.datum)}</span>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.kleur, flexShrink: 0, display: 'inline-block' }} title={t.naam} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.naam}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {editie.geschreven_door && <span>✍️ {editie.geschreven_door}</span>}
                        {editie.foto_interview_url && <span>📸 Foto interview</span>}
                        {editie.foto_activiteit_url && <span>🖼️ Foto activiteit</span>}
                        {!editie.geschreven_door && !editie.foto_interview_url && !editie.foto_activiteit_url && (
                          <span style={{ opacity: 0.5 }}>Geen extra info</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-sm" onClick={() => downloadHTML(edState)}>
                        <Download size={13} /> Exporteer
                      </button>
                      {magBewerken && (
                        <button className="btn btn-sm" onClick={() => openBewerken(editie)}>
                          <Pencil size={13} /> Bewerken
                        </button>
                      )}
                      {magBewerken && (
                        <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(editie.id)}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Tip voor bundelen */}
            <div style={{ marginTop: 8, padding: '10px 16px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              💡 Exporteer elke editie als HTML en open in de browser → Cmd+P → &quot;Opslaan als PDF&quot; om alle edities te bundelen tot het Zomerboek.
            </div>
          </div>
        )}
      </div>

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
