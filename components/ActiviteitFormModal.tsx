'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Image as ImageIcon, Upload } from 'lucide-react'
import { getSupabase, Activiteit } from '@/lib/supabase'
import { ALLE_CATEGORIEEN } from '@/lib/categorieen'

interface Props {
  activiteit?: Partial<Activiteit>
  onSave: (data: Omit<Activiteit, 'id' | 'created_at'>) => Promise<void>
  onClose: () => void
}

export default function ActiviteitFormModal({ activiteit, onSave, onClose }: Props) {
  const [naam, setNaam] = useState(activiteit?.naam || '')
  const [beschrijving, setBeschrijving] = useState(activiteit?.beschrijving || '')
  const [categorie, setCategorie] = useState(activiteit?.categorie || '')
  const [thema, setThema] = useState(activiteit?.thema || '')
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
    // Laad bestaande afbeelding preview
    if (activiteit?.afbeelding_pad) {
      const supabase = getSupabase()
      const { data } = supabase.storage.from('activiteit-afbeeldingen').getPublicUrl(activiteit.afbeelding_pad)
      setAfbeeldingPreview(data.publicUrl)
    }

    getSupabase().from('activiteiten').select('thema').then(({ data }) => {
      if (data) {
        const uniek = Array.from(new Set(data.map((r: any) => r.thema).filter(Boolean))).sort() as string[]
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
      let definitiefPad = afbeeldingPad

      // Upload nieuwe afbeelding als die gekozen is
      if (afbeeldingBestand) {
        const supabase = getSupabase()
        // We hebben nog geen id bij nieuw aanmaken, gebruik tijdelijke naam
        const tijdelijkId = activiteit?.id ?? `nieuw-${Date.now()}`
        const ext = afbeeldingBestand.name.split('.').pop()
        const pad = `${tijdelijkId}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('activiteit-afbeeldingen')
          .upload(pad, afbeeldingBestand, { upsert: true })
        if (!uploadError) definitiefPad = pad
      }

      await onSave({
        naam: naam.trim(), beschrijving: beschrijving.trim(),
        categorie: categorie.trim(),
        thema: thema.trim(),
        leeftijd, tijdsduur: parseInt(tijdsduur) || 30, groepsgrootte,
        materialen: materialenRaw.split(',').map(s => s.trim()).filter(Boolean),
        stappen: stappenRaw.split('\n').map(s => s.trim()).filter(Boolean),
        materiaal_aanwezig: materiaalAanwezig,
        ai_gegenereerd: false,
        afbeelding_pad: definitiefPad,
      })
    } catch { setError('Er is iets misgegaan.') }
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
              <label className="form-label">Categorie * <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(bijv. Natuur, Sport, Creatief)</span></label>
              <input className="form-input" value={categorie} onChange={e => setCategorie(e.target.value)} placeholder="Bijv. Natuur, Creatief..." list="categorie-lijst" />
              <datalist id="categorie-lijst">
                {ALLE_CATEGORIEEN.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="form-label">Thema <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(bijv. Kerst, Zomer)</span></label>
              <input className="form-input" value={thema} onChange={e => setThema(e.target.value)} placeholder="Optioneel: Kerst, Lente..." list="thema-lijst" />
              <datalist id="thema-lijst">
                {themaSuggesties.map(t => <option key={t} value={t} />)}
              </datalist>
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
                    <div className="btn btn-sm" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', backdropFilter: 'blur(4px)' }}>
                      <ImageIcon size={12} /> Wijzigen
                    </div>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && kiesAfbeelding(e.target.files[0])} />
                  </label>
                  <button className="btn btn-sm" onClick={verwijderAfbeelding} style={{ background: 'rgba(220,38,38,0.8)', color: '#fff', border: 'none', backdropFilter: 'blur(4px)' }}>
                    <X size={12} /> Verwijderen
                  </button>
                </div>
              </div>
            ) : (
              <label style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, border: '2px dashed var(--border-dark)', background: 'var(--bg)', transition: 'all 0.12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-dark)' }}
                >
                  <Upload size={18} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.6 }} />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>Klik om een foto te kiezen</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>JPG, PNG of WebP</div>
                  </div>
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && kiesAfbeelding(e.target.files[0])} />
              </label>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: 'var(--text)' }}>
            <input type="checkbox" checked={materiaalAanwezig} onChange={e => setMateriaalAanwezig(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
            Materiaal is aanwezig
          </label>

          {error && <p style={{ color: '#DC2626', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Opslaan...' : 'Opslaan'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
