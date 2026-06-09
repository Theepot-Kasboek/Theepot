'use client'
import { useState, useEffect } from 'react'
import { X, Image as ImageIcon, Upload } from 'lucide-react'
import { getSupabase, Activiteit } from '@/lib/supabase'
import { ALLE_CATEGORIEEN } from '@/lib/categorieen'
import ActiviteitBijlagen from './ActiviteitBijlagen'

interface Props {
  activiteit?: Partial<Activiteit>
  onSave: (data: Omit<Activiteit, 'id' | 'created_at'>, afbeeldingBestand: File | null) => Promise<void>
  onClose: () => void
}

export default function ActiviteitFormModal({ activiteit, onSave, onClose }: Props) {
  const [naam, setNaam] = useState(activiteit?.naam || '')
  const [beschrijving, setBeschrijving] = useState(activiteit?.beschrijving || '')
  const [categorie, setCategorie] = useState(activiteit?.categorie || '')
  const [themas, setThemas] = useState<string[]>(
    Array.isArray(activiteit?.thema) ? activiteit.thema :
    (activiteit?.thema ? (activiteit.thema as unknown as string).split(',').map(t => t.trim()).filter(Boolean) : [])
  )
  const [themaInput, setThemaInput] = useState('')
  const [themaSuggesties, setThemaSuggesties] = useState<string[]>([])
  const [leeftijd, setLeeftijd] = useState(activiteit?.leeftijd || '4-12 jaar')
  const [tijdsduur, setTijdsduur] = useState(String(activiteit?.tijdsduur || 30))
  const [groepsgrootte, setGroepsgrootte] = useState(activiteit?.groepsgrootte || '2-15 kinderen')
  const [materialenRaw, setMaterialenRaw] = useState((activiteit?.materialen || []).join(', '))
  const [stappenRaw, setStappenRaw] = useState((activiteit?.stappen || []).join('\n'))
  const [materiaalAanwezig, setMateriaalAanwezig] = useState(activiteit?.materiaal_aanwezig || false)
  const [afbeeldingPad, setAfbeeldingPad] = useState<string | null>(activiteit?.afbeelding_pad ?? null)
  const [afbeeldingPreview, setAfbeeldingPreview] = useState<string | null>(null)
  const [afbeeldingBestand, setAfbeeldingBestand] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (activiteit?.afbeelding_pad) {
      const { data } = getSupabase().storage.from('activiteit-afbeeldingen').getPublicUrl(activiteit.afbeelding_pad)
      setAfbeeldingPreview(data.publicUrl)
    }
    getSupabase().from('activiteiten').select('thema').then(({ data }) => {
      if (data) {
        const uniek = Array.from(new Set(data.flatMap((r: { thema: string[] | string }) =>
          Array.isArray(r.thema) ? r.thema : [r.thema]
        ).filter(Boolean))).sort() as string[]
        setThemaSuggesties(uniek)
      }
    })
  }, [])

  function kiesAfbeelding(bestand: File) {
    setAfbeeldingBestand(bestand)
    const reader = new FileReader()
    reader.onload = e => setAfbeeldingPreview(e.target?.result as string)
    reader.readAsDataURL(bestand)
  }

  function verwijderAfbeelding() {
    setAfbeeldingBestand(null)
    setAfbeeldingPreview(null)
    setAfbeeldingPad(null)
  }

  async function handleSave() {
    if (!naam.trim() || !beschrijving.trim()) { setError('Vul naam en beschrijving in.'); return }
    if (!categorie.trim()) { setError('Vul een categorie in.'); return }
    setLoading(true); setError('')
    try {
      // Geef het bestand mee — de parent handelt de upload af nadat het ID bekend is
      await onSave({
        naam: naam.trim(),
        beschrijving: beschrijving.trim(),
        categorie: categorie.trim(),
        thema: themas,
        leeftijd,
        tijdsduur: parseInt(tijdsduur) || 30,
        groepsgrootte,
        materialen: materialenRaw.split(',').map(s => s.trim()).filter(Boolean),
        stappen: stappenRaw.split('\n').map(s => s.trim()).filter(Boolean),
        materiaal_aanwezig: materiaalAanwezig,
        ai_gegenereerd: false,
        afbeelding_pad: afbeeldingPad, // bestaand pad of null
      }, afbeeldingBestand) // nieuw bestand apart
    } catch (e: unknown) {
      setError(`Fout: ${e instanceof Error ? e.message : String(e)}`)
    }
    setLoading(false)
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 19, fontWeight: 700, color: 'var(--text)', flex: 1 }}>
            {activiteit?.naam ? 'Activiteit bewerken' : 'Activiteit toevoegen'}
          </h2>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-dark)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Naam activiteit *</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. Slakkenhuis van klei" />
          </div>
          <div>
            <label className="form-label">Beschrijving *</label>
            <textarea className="form-textarea" value={beschrijving} onChange={e => setBeschrijving(e.target.value)} placeholder="Beschrijving van de activiteit..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Categorie *</label>
              <input className="form-input" value={categorie} onChange={e => setCategorie(e.target.value)} placeholder="Bijv. Natuur, Creatief..." list="categorie-lijst" />
              <datalist id="categorie-lijst">{ALLE_CATEGORIEEN.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="form-label">Thema&apos;s</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                {themas.map((t, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: 12, fontWeight: 500 }}>
                    {t}
                    <button type="button" onClick={() => setThemas(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-text)', padding: 0, fontSize: 14 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-input" value={themaInput} onChange={e => setThemaInput(e.target.value)} placeholder="Kerst, Zomer..." list="thema-lijst"
                  onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && themaInput.trim()) { e.preventDefault(); const n = themaInput.trim().replace(/,$/, ''); if (n && !themas.includes(n)) setThemas(p => [...p, n]); setThemaInput('') } }}
                  style={{ flex: 1 }} />
                <button type="button" className="btn btn-sm" onClick={() => { const n = themaInput.trim(); if (n && !themas.includes(n)) setThemas(p => [...p, n]); setThemaInput('') }} disabled={!themaInput.trim()}>+ Voeg toe</button>
              </div>
              <datalist id="thema-lijst">{themaSuggesties.filter(t => !themas.includes(t)).map(t => <option key={t} value={t} />)}</datalist>
            </div>
            <div>
              <label className="form-label">Leeftijd</label>
              <input className="form-input" value={leeftijd} onChange={e => setLeeftijd(e.target.value)} placeholder="Bijv. 4-12 jaar" />
            </div>
            <div>
              <label className="form-label">Tijdsduur (minuten)</label>
              <input className="form-input" type="number" value={tijdsduur} onChange={e => setTijdsduur(e.target.value)} placeholder="30" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Groepsgrootte</label>
              <input className="form-input" value={groepsgrootte} onChange={e => setGroepsgrootte(e.target.value)} placeholder="Bijv. 2-15 kinderen" />
            </div>
          </div>

          <div>
            <label className="form-label">Materialen (kommagescheiden)</label>
            <input className="form-input" value={materialenRaw} onChange={e => setMaterialenRaw(e.target.value)} placeholder="Klei, verf, schaar, papier" />
          </div>
          <div>
            <label className="form-label">Stappen (één per regel)</label>
            <textarea className="form-textarea" style={{ minHeight: 100 }} value={stappenRaw} onChange={e => setStappenRaw(e.target.value)} placeholder={'Stap 1\nStap 2\nStap 3'} />
          </div>

          {/* Afbeelding */}
          <div>
            <label className="form-label">Voorbeeldafbeelding (optioneel)</label>
            {afbeeldingPreview ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img src={afbeeldingPreview} alt="Preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                  <label style={{ cursor: 'pointer' }}>
                    <div className="btn btn-sm" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none' }}><ImageIcon size={12} /> Wijzigen</div>
                    <input type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && kiesAfbeelding(e.target.files[0])} />
                  </label>
                  <button className="btn btn-sm" onClick={verwijderAfbeelding} style={{ background: 'rgba(220,38,38,0.8)', color: '#fff', border: 'none' }}><X size={12} /> Verwijderen</button>
                </div>
              </div>
            ) : (
              <label style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, border: '2px dashed var(--border-dark)', background: 'var(--bg)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-dark)')}>
                  <Upload size={18} color="var(--text-muted)" style={{ opacity: 0.6 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Klik om een foto te kiezen</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>JPG, PNG of WebP</div>
                  </div>
                </div>
                <input type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && kiesAfbeelding(e.target.files[0])} />
              </label>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={materiaalAanwezig} onChange={e => setMateriaalAanwezig(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
            Materiaal is aanwezig
          </label>

          {/* Bijlagen — alleen voor bestaande activiteiten */}
          {activiteit?.id && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <ActiviteitBijlagen activiteitId={activiteit.id} magBewerken={true} />
            </div>
          )}

          {error && <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Opslaan...' : 'Opslaan'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
