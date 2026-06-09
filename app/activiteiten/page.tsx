'use client'
import { useState, useEffect, useCallback, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Search, BookOpen, Clock, Copy, Download, Upload, X, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { getSupabase, type Activiteit } from '@/lib/supabase'
import { getCategorieKleur, getCategorieEmoji } from '@/lib/categorieen'
import { getThemaEmoji } from '@/lib/themas'
import { exportActiviteitAlsPDF } from '@/lib/pdf-export'
import ActiviteitModal from '@/components/ActiviteitModal'
import ActiviteitFormModal from '@/components/ActiviteitFormModal'
import Toast from '@/components/Toast'
import Topbar from '@/components/Topbar'

// ─── Standaard AI prompt ───────────────────────────────────────────────────────

const AI_PROMPT = `Bedenk 10 activiteiten voor de BSO waar ik werk. Geef ALLEEN een JSON-array terug, geen uitleg:
[
  {
    "naam": "Naam van de activiteit",
    "thema": "Kies voor elke activiteit een origineel en specifiek thema. Zorg voor veel variatie en denk verder dan de standaard thema's — voorbeelden: Ruimtevaart, Middeleeuwen, Circus, Superhelden, Oceaan, Jungle, Detectives, Sprookjes, Robots, Olympische Spelen, Boerderij, Piraten, Dinosaurussen, Weersomstandigheden, enz.",
    "leeftijd": "bijv. 4-12 jaar",
    "tijdsduur": 45,
    "groepsgrootte": "bijv. 2-15 kinderen",
    "beschrijving": "Uitgebreide beschrijving van 8 tot 12 zinnen. Beschrijf wat de kinderen doen, hoe de activiteit verloopt, wat het doel is en waarom het leuk of leerzaam is.",
    "materialen": ["materiaal 1", "materiaal 2"],
    "stappen": ["Stap 1", "Stap 2", "Stap 3"]
  }
]`

// ─── JSON Import Modal ─────────────────────────────────────────────────────────

interface ImportResultaat {
  succes: number
  mislukt: number
  fouten: string[]
}

function JsonImportModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (aantal: number) => void
}) {
  const [stap, setStap] = useState<'prompt' | 'json' | 'bezig' | 'klaar'>('prompt')
  const [jsonTekst, setJsonTekst] = useState('')
  const [geparsed, setGeparsed] = useState<Omit<Activiteit, 'id' | 'created_at'>[]>([])
  const [parseError, setParseError] = useState('')
  const [resultaat, setResultaat] = useState<ImportResultaat | null>(null)
  const [promptGekopieerd, setPromptGekopieerd] = useState(false)

  function kopieerPrompt() {
    navigator.clipboard.writeText(AI_PROMPT)
    setPromptGekopieerd(true)
    setTimeout(() => setPromptGekopieerd(false), 2000)
  }

  function parseerJson() {
    setParseError('')
    try {
      const raw = JSON.parse(jsonTekst)
      const arr = Array.isArray(raw) ? raw : [raw]

      const gevalideerd = arr.map((item: Record<string, unknown>, i: number) => {
        if (!item.naam) throw new Error(`Item ${i + 1}: "naam" ontbreekt`)
        return {
          naam: String(item.naam),
          beschrijving: String(item.beschrijving || ''),
          categorie: String(item.categorie || 'Creatief'),
          thema: item.thema ? (Array.isArray(item.thema) ? item.thema : [String(item.thema)]) : [],
          leeftijd: String(item.leeftijd || '4-12 jaar'),
          tijdsduur: Number(item.tijdsduur) || 45,
          groepsgrootte: String(item.groepsgrootte || '2-15 kinderen'),
          materialen: Array.isArray(item.materialen) ? item.materialen.map(String) : [],
          stappen: Array.isArray(item.stappen) ? item.stappen.map(String) : [],
          materiaal_aanwezig: Boolean(item.materiaal_aanwezig ?? false),
          ai_gegenereerd: true,
          afbeelding_pad: null,
        }
      })

      setGeparsed(gevalideerd)
      setStap('json')
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Ongeldige JSON')
    }
  }

  async function importeer() {
    setStap('bezig')
    const supabase = getSupabase()
    let succes = 0
    const fouten: string[] = []

    for (const activiteit of geparsed) {
      const { error } = await supabase.from('activiteiten').insert([activiteit])
      if (error) fouten.push(`${activiteit.naam}: ${error.message}`)
      else succes++
    }

    setResultaat({ succes, mislukt: fouten.length, fouten })
    setStap('klaar')
    if (succes > 0) onSuccess(succes)
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="card-header">
          <span className="card-title">
            {stap === 'prompt' && 'Activiteiten importeren via AI'}
            {stap === 'json' && `${geparsed.length} activiteiten gevonden`}
            {stap === 'bezig' && 'Importeren...'}
            {stap === 'klaar' && 'Import voltooid'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Stap 1: Prompt */}
          {stap === 'prompt' && (
            <>
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                  Kopieer de prompt hieronder, plak hem in <strong>Claude.ai</strong> of een andere AI-assistent,
                  en plak daarna de gegenereerde JSON terug in het veld eronder.
                </p>

                {/* Prompt box */}
                <div style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border-dark)',
                  borderRadius: 10,
                  padding: 14,
                  fontFamily: 'monospace',
                  fontSize: 11.5,
                  lineHeight: 1.6,
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 200,
                  overflowY: 'auto',
                  marginBottom: 8,
                }}>
                  {AI_PROMPT}
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={kopieerPrompt}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {promptGekopieerd ? <><CheckCircle size={14} /> Gekopieerd!</> : <><Copy size={14} /> Prompt kopiëren</>}
                </button>
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* JSON plakken */}
              <div>
                <label className="form-label">Plak hier de JSON van de AI</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 12 }}
                  placeholder={'[\n  {\n    "naam": "Watergevecht",\n    ...\n  }\n]'}
                  value={jsonTekst}
                  onChange={e => { setJsonTekst(e.target.value); setParseError('') }}
                />
                {parseError && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, color: '#DC2626', fontSize: 12 }}>
                    <AlertCircle size={14} />
                    {parseError}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={onClose}>Annuleren</button>
                <button
                  className="btn btn-primary"
                  onClick={parseerJson}
                  disabled={!jsonTekst.trim()}
                >
                  Controleren →
                </button>
              </div>
            </>
          )}

          {/* Stap 2: Bevestigen */}
          {stap === 'json' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                De volgende <strong>{geparsed.length} activiteiten</strong> worden toegevoegd aan de bibliotheek:
              </p>

              <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {geparsed.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 9,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: 'var(--primary-light)', color: 'var(--primary-text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.naam}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                        {a.thema && <span>{Array.isArray(a.thema) ? a.thema.join(', ') : a.thema}</span>}
                        <span>⏱ {a.tijdsduur} min</span>
                        <span>{(a.stappen ?? []).length} stappen</span>
                        <span>{(a.materialen ?? []).length} materialen</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setStap('prompt')}>← Terug</button>
                <button className="btn btn-primary" onClick={importeer}>
                  <Upload size={14} /> {geparsed.length} activiteiten importeren
                </button>
              </div>
            </>
          )}

          {/* Stap 3: Bezig */}
          {stap === 'bezig' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Activiteiten worden opgeslagen...
              </p>
            </div>
          )}

          {/* Stap 4: Klaar */}
          {stap === 'klaar' && resultaat && (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>
                  {resultaat.mislukt === 0 ? '✅' : '⚠️'}
                </div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                  {resultaat.succes} van {geparsed.length} geïmporteerd
                </div>
                {resultaat.mislukt > 0 && (
                  <p style={{ fontSize: 13, color: '#DC2626' }}>
                    {resultaat.mislukt} activiteit{resultaat.mislukt !== 1 ? 'en' : ''} mislukt
                  </p>
                )}
              </div>

              {resultaat.fouten.length > 0 && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px' }}>
                  {resultaat.fouten.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#991B1B', marginBottom: 4 }}>• {f}</div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={onClose}>Sluiten</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Hoofd pagina ──────────────────────────────────────────────────────────────

function ActiviteitenPage() {
  const searchParams = useSearchParams()
  const themaParam = searchParams.get('thema')
  const categorieParam = searchParams.get('categorie')

  const [activiteiten, setActiviteiten] = useState<Activiteit[]>([])
  const [loading, setLoading] = useState(true)
  const [zoekterm, setZoekterm] = useState('')
  const [actieveFilter, setActieveFilter] = useState(
    categorieParam ? `cat:${categorieParam}` : themaParam ? `thema:${themaParam}` : 'all'
  )
  const [geselecteerd, setGeselecteerd] = useState<Activiteit | null>(null)
  const [bewerkActiviteit, setBewerkActiviteit] = useState<Activiteit | null>(null)
  const [toevoegen, setToevoegen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [pdfOrientatie, setPdfOrientatie] = useState<'portrait' | 'landscape'>('portrait')
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  const laadActiviteiten = useCallback(async () => {
    setLoading(true)
    const { data } = await getSupabase().from('activiteiten').select('*').order('created_at', { ascending: false })
    if (data) setActiviteiten(data as Activiteit[])
    setLoading(false)
  }, [])

  useEffect(() => { laadActiviteiten() }, [laadActiviteiten])
  useEffect(() => {
    if (categorieParam) setActieveFilter(`cat:${categorieParam}`)
    else if (themaParam) setActieveFilter(`thema:${themaParam}`)
  }, [themaParam, categorieParam])

  const categorieen = useMemo(() =>
    Array.from(new Set(activiteiten.map(a => a.categorie).filter(Boolean))).sort(),
    [activiteiten]
  )
  const themas = useMemo(() => {
    const alle: string[] = []
    activiteiten.forEach(a => {
      if (Array.isArray(a.thema)) alle.push(...a.thema.filter(Boolean))
      else if (a.thema) alle.push(a.thema as string)
    })
    return Array.from(new Set(alle)).sort()
  }, [activiteiten])

  const gefilterd = activiteiten.filter(a => {
    const zoek = zoekterm.toLowerCase()
    const matchZoek = !zoekterm ||
      (a.naam ?? '').toLowerCase().includes(zoek) ||
      (a.beschrijving ?? '').toLowerCase().includes(zoek) ||
      (Array.isArray(a.thema) ? a.thema.join(' ') : (a.thema ?? '')).toLowerCase().includes(zoek) ||
      (a.categorie ?? '').toLowerCase().includes(zoek) ||
      (a.materialen ?? []).some(m => m.toLowerCase().includes(zoek))
    let matchFilter = true
    if (actieveFilter === 'kort') matchFilter = a.tijdsduur <= 30
    else if (actieveFilter === 'leeftijd_jong') {
      const l = (typeof a.leeftijd === 'string' ? a.leeftijd : '').toLowerCase()
      matchFilter = l.includes('4') || l.includes('5') || l.includes('6') || l.includes('7') || l.includes('jong') || l.includes('klein')
    }
    else if (actieveFilter === 'leeftijd_oud') {
      const l = (typeof a.leeftijd === 'string' ? a.leeftijd : '').toLowerCase()
      const getallen = l.match(/\d+/g)?.map(Number) ?? []
      matchFilter = getallen.some(n => n >= 8) || l.includes('8') || l.includes('oud') || l.includes('groot')
    }
    else if (actieveFilter.startsWith('cat:')) matchFilter = a.categorie === actieveFilter.slice(4)
    else if (actieveFilter.startsWith('thema:')) { const t = actieveFilter.slice(6); matchFilter = Array.isArray(a.thema) ? a.thema.includes(t) : a.thema === t }
    return matchZoek && matchFilter
  })

  async function uploadAfbeelding(activiteitId: string, bestand: File): Promise<string | null> {
    const supabase = getSupabase()
    const ext = bestand.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const pad = `${activiteitId}.${ext}`
    const { data, error } = await supabase.storage
      .from('activiteit-afbeeldingen')
      .upload(pad, bestand, { upsert: true, cacheControl: '3600' })
    if (error) {
      setToast({ bericht: `Foto upload mislukt: ${error.message}`, type: 'error' })
      return null
    }
    return data?.path ?? pad
  }

  async function slaOp(data: Omit<Activiteit, 'id' | 'created_at'>, afbeeldingBestand: File | null) {
    const supabase = getSupabase()
    // Sla eerst op zonder afbeelding
    const { data: nieuw, error } = await supabase
      .from('activiteiten')
      .insert([{ ...data, afbeelding_pad: null }])
      .select()
      .single()
    if (error) { setToast({ bericht: `Fout: ${error.message}`, type: 'error' }); return }

    // Upload foto nu het ID bekend is
    if (nieuw && afbeeldingBestand) {
      const pad = await uploadAfbeelding(nieuw.id, afbeeldingBestand)
      if (pad) {
        await supabase.from('activiteiten').update({ afbeelding_pad: pad }).eq('id', nieuw.id)
      }
    }

    await laadActiviteiten()
    setToevoegen(false)
    setToast({ bericht: 'Activiteit opgeslagen!', type: 'success' })
  }

  async function slaBewerking(data: Omit<Activiteit, 'id' | 'created_at'>, afbeeldingBestand: File | null) {
    if (!bewerkActiviteit) return
    const supabase = getSupabase()

    let afbeeldingPad = data.afbeelding_pad

    // Upload nieuwe foto als die gekozen is
    if (afbeeldingBestand) {
      const pad = await uploadAfbeelding(bewerkActiviteit.id, afbeeldingBestand)
      if (pad) afbeeldingPad = pad
      else return // upload mislukt, stop
    }

    const { error } = await supabase
      .from('activiteiten')
      .update({ ...data, afbeelding_pad: afbeeldingPad })
      .eq('id', bewerkActiviteit.id)

    if (error) { setToast({ bericht: `Fout: ${error.message}`, type: 'error' }); return }
    await laadActiviteiten()
    setBewerkActiviteit(null)
    setGeselecteerd(null)
    setToast({ bericht: 'Bijgewerkt!', type: 'success' })
  }

  async function verwijderActiviteit() {
    if (!geselecteerd) return
    const { error } = await getSupabase().from('activiteiten').delete().eq('id', geselecteerd.id)
    if (!error) { await laadActiviteiten(); setGeselecteerd(null); setToast({ bericht: 'Verwijderd!', type: 'success' }) }
  }

  async function uploadAfbeeldingVanKaart(a: Activiteit, bestand: File, e: React.MouseEvent) {
    e.stopPropagation()
    const supabase = getSupabase()
    const ext = bestand.name.split('.').pop()
    const pad = `${a.id}.${ext}`
    const { error } = await supabase.storage.from('activiteit-afbeeldingen').upload(pad, bestand, { upsert: true })
    if (error) { setToast({ bericht: 'Upload mislukt: ' + error.message, type: 'error' }); return }
    await supabase.from('activiteiten').update({ afbeelding_pad: pad }).eq('id', a.id)
    setToast({ bericht: 'Afbeelding toegevoegd!', type: 'success' })
    await laadActiviteiten()
  }

  async function kopieerAlsJSON(a: Activiteit, e: React.MouseEvent) {
    e.stopPropagation()
    const json = JSON.stringify([{
      naam: a.naam,
      thema: Array.isArray(a.thema) ? a.thema.join(', ') : a.thema,
      leeftijd: a.leeftijd,
      tijdsduur: a.tijdsduur,
      groepsgrootte: a.groepsgrootte,
      beschrijving: a.beschrijving,
      materialen: a.materialen,
      stappen: a.stappen,
      categorie: a.categorie,
    }], null, 2)
    await navigator.clipboard.writeText(json)
    setToast({ bericht: 'JSON gekopieerd!', type: 'success' })
  }

  async function kopieerKaart(a: Activiteit, e: React.MouseEvent) {
    e.stopPropagation()
    const regels: string[] = [a.naam, '']
    if (a.beschrijving) { regels.push(a.beschrijving); regels.push('') }
    if ((a.stappen ?? []).length > 0) { (a.stappen ?? []).forEach((s, i) => regels.push(`${i + 1}. ${s}`)); regels.push('') }
    if ((a.materialen ?? []).length > 0) { regels.push('Benodigdheden'); (a.materialen ?? []).forEach(m => regels.push(`• ${m}`)) }
    await navigator.clipboard.writeText(regels.join('\n'))
    setToast({ bericht: 'Gekopieerd!', type: 'success' })
  }

  async function exportKaart(a: Activiteit, e: React.MouseEvent) {
    e.stopPropagation()
    try { await exportActiviteitAlsPDF(a); setToast({ bericht: 'PDF geëxporteerd!', type: 'success' }) }
    catch { setToast({ bericht: 'PDF export mislukt', type: 'error' }) }
  }

  function handleToast(msg: string) {
    setToast({ bericht: msg, type: msg.includes('mislukt') || msg.includes('Fout') ? 'error' : 'success' })
  }

  return (
    <>
      <Topbar
        titel="Activiteitenbeheer"
        subtitel={`${activiteiten.length} activiteiten`}
        acties={
          <>
            <button className="btn" onClick={() => setImportOpen(true)}>
              <Upload size={14} /> AI Import
            </button>
            <button className="btn btn-primary" onClick={() => setToevoegen(true)}>
              <Plus size={14} /> Toevoegen
            </button>
          </>
        }
      />

      <div className="page-content">
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Activiteiten', value: activiteiten.length, bg: '#EBF5D6', emoji: '📚' },
            { label: 'Categorieën', value: categorieen.length, bg: '#EDE9FE', emoji: '🏷️' },
            { label: "Thema's", value: themas.length, bg: '#FEF3C7', emoji: '🎉' },
            { label: 'Beschikbaar', value: activiteiten.filter(a => a.materiaal_aanwezig).length, bg: '#DCFCE7', emoji: '✅' },
          ].map(({ label, value, bg, emoji }) => (
            <div key={label} className="stat-card">
              <div className="stat-icon" style={{ background: bg, fontSize: 18 }}>{emoji}</div>
              <div className="stat-label">{label}</div>
              <div className="stat-val">{value}</div>
            </div>
          ))}
        </div>

        {/* Filter kaart */}
        <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
              <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 34 }}
                placeholder="Zoek op naam, categorie, thema, materiaal..."
                value={zoekterm}
                onChange={e => setZoekterm(e.target.value)}
              />
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{gefilterd.length} resultaten</span>
          </div>

          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
            {[
              { key: 'all', label: 'Alle' },
              { key: 'leeftijd_jong', label: '👶 4–7 jaar' },
              { key: 'leeftijd_oud', label: '🧒 8+ jaar' },

              { key: 'kort', label: '⏱ Kort (≤30 min)' },
            ].map(f => (
              <button key={f.key} onClick={() => setActieveFilter(f.key)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', borderColor: actieveFilter === f.key ? 'var(--primary)' : 'var(--border-dark)', background: actieveFilter === f.key ? 'var(--primary)' : 'var(--bg-card)', color: actieveFilter === f.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.12s' }}>
                {f.label}
              </button>
            ))}
          </div>

          {categorieen.length > 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Categorie</span>
              {categorieen.map(c => (
                <button key={c} onClick={() => setActieveFilter(`cat:${c}`)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', borderColor: actieveFilter === `cat:${c}` ? getCategorieKleur(c) : 'var(--border-dark)', background: actieveFilter === `cat:${c}` ? getCategorieKleur(c) : 'var(--bg-card)', color: actieveFilter === `cat:${c}` ? '#fff' : 'var(--text-muted)', transition: 'all 0.12s' }}>
                  {getCategorieEmoji(c)} {c}
                </button>
              ))}
            </div>
          )}

          {themas.length > 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Thema</span>
              {themas.map(t => (
                <button key={t} onClick={() => setActieveFilter(`thema:${t}`)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', borderColor: actieveFilter === `thema:${t}` ? '#D97706' : 'var(--border-dark)', background: actieveFilter === `thema:${t}` ? '#D97706' : 'var(--bg-card)', color: actieveFilter === `thema:${t}` ? '#fff' : 'var(--text-muted)', transition: 'all 0.12s' }}>
                  {getThemaEmoji(t)} {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)' }}>Laden...</div>
        ) : gefilterd.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={40} />
            <h3>Geen activiteiten gevonden</h3>
            <p>{zoekterm ? 'Pas je zoekopdracht aan.' : 'Voeg een eerste activiteit toe of importeer via AI.'}</p>
            <button className="btn btn-primary" onClick={() => setImportOpen(true)}>
              <Upload size={14} /> Importeren via AI
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {gefilterd.map(a => {
              const catKleur = getCategorieKleur(a.categorie ?? '')
              const catEmoji = getCategorieEmoji(a.categorie ?? '')
              const eersteThema = Array.isArray(a.thema) ? (a.thema[0] ?? '') : (a.thema ?? '')
              const themaEmoji = eersteThema ? getThemaEmoji(eersteThema) : ''
              return (
                <div
                  key={a.id}
                  className="card"
                  onClick={() => setGeselecteerd(a)}
                  style={{ cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(140,198,63,0.15)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                >
                  {a.afbeelding_pad && (
                    <div style={{ height: 120, overflow: 'hidden', position: 'relative' }}>
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/activiteit-afbeeldingen/${a.afbeelding_pad}`}
                        alt={a.naam}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: catKleur }} />
                    </div>
                  )}
                  {!a.afbeelding_pad && <div style={{ height: 4, background: catKleur }} />}
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, lineHeight: 1.35, flex: 1, paddingRight: 8 }}>{a.naam}</h3>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={e => kopieerKaart(a, e)} className="btn btn-sm" style={{ padding: '4px 8px' }} title="Kopieer als tekst"><Copy size={11} /></button>
                        <button onClick={e => exportKaart(a, e)} className="btn btn-sm" style={{ padding: '4px 8px' }} title="PDF exporteren"><Download size={11} /></button>
                        <button onClick={e => kopieerAlsJSON(a, e)} className="btn btn-sm" style={{ padding: '4px 8px' }} title="Kopieer als JSON"><span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}>JSON</span></button>
                        <label onClick={e => e.stopPropagation()} title="Afbeelding toevoegen" style={{ cursor: 'pointer' }}>
                          <div className="btn btn-sm" style={{ padding: '4px 8px', color: a.afbeelding_pad ? 'var(--primary)' : 'var(--text-muted)' }}>
                            <ImageIcon size={11} />
                          </div>
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadAfbeeldingVanKaart(a, e.target.files[0], e as unknown as React.MouseEvent)} />
                        </label>
                      </div>
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {a.beschrijving}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: catKleur + '20', color: catKleur, border: `1px solid ${catKleur}40` }}>{catEmoji} {a.categorie}</span>
                      {(Array.isArray(a.thema) ? a.thema : a.thema ? [a.thema] : []).filter(Boolean).map((t: string, i: number) => (<span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', marginRight: 2 }}>{t}</span>))}
                      <span className="tag" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: 11 }}><Clock size={10} style={{ marginRight: 2 }} />{a.tijdsduur} min</span>
                      {a.materiaal_aanwezig && <span className="tag tag-green" style={{ fontSize: 11 }}>Beschikbaar</span>}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>👶 {a.leeftijd}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>👥 {a.groepsgrootte}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {importOpen && (
        <JsonImportModal
          onClose={() => setImportOpen(false)}
          onSuccess={async (aantal) => {
            setToast({ bericht: `${aantal} activiteiten geïmporteerd!`, type: 'success' })
            await laadActiviteiten()
          }}
        />
      )}

      {geselecteerd && !bewerkActiviteit && (
        <ActiviteitModal activiteit={geselecteerd} onClose={() => setGeselecteerd(null)} onEdit={() => setBewerkActiviteit(geselecteerd)} onDelete={verwijderActiviteit} onToast={handleToast} onAfbeeldingGewijzigd={laadActiviteiten} />
      )}
      {(toevoegen || bewerkActiviteit) && (
        <ActiviteitFormModal activiteit={bewerkActiviteit || undefined} onSave={bewerkActiviteit ? slaBewerking : slaOp} onClose={() => { setToevoegen(false); setBewerkActiviteit(null) }} />
      )}
      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

export default function Page() {
  return <Suspense><ActiviteitenPage /></Suspense>
}
