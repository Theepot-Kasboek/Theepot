'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Upload } from 'lucide-react'
import { getSupabase, Activiteit } from '@/lib/supabase'
import { ALLE_CATEGORIEEN } from '@/lib/categorieen'
import ActiviteitBijlagen from './ActiviteitBijlagen'

interface Props {
  activiteit?: Partial<Activiteit>
  onSave: (data: Omit<Activiteit, 'id' | 'created_at'>) => Promise<void>
  onClose: () => void
}

export default function ActiviteitFormModal({ activiteit, onSave, onClose }: Props) {
  const [naam, setNaam] = useState(activiteit?.naam || '')
  const [beschrijving, setBeschrijving] = useState(activiteit?.beschrijving || '')
  const [categorie, setCategorie] = useState(activiteit?.categorie || '')
  const [themas, setThemas] = useState<string[]>(
    Array.isArray(activiteit?.thema) ? activiteit.thema as string[] :
    (activiteit?.thema ? String(activiteit.thema).split(',').map(t => t.trim()).filter(Boolean) : [])
  )
  const [themaInput, setThemaInput] = useState('')
  const [leeftijd, setLeeftijd] = useState(activiteit?.leeftijd || '4-12 jaar')
  const [tijdsduur, setTijdsduur] = useState(String(activiteit?.tijdsduur || 30))
  const [groepsgrootte, setGroepsgrootte] = useState(activiteit?.groepsgrootte || '2-15 kinderen')
  const [materialenRaw, setMaterialenRaw] = useState((activiteit?.materialen || []).join(', '))
  const [stappenRaw, setStappenRaw] = useState((activiteit?.stappen || []).join('\n'))
  const [materiaalAanwezig, setMateriaalAanwezig] = useState(activiteit?.materiaal_aanwezig || false)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fout, setFout] = useState('')
  const bestandRef = useRef<File | null>(null)
  const bestaandPad = useRef<string | null>(activiteit?.afbeelding_pad ?? null)

  useEffect(() => {
    if (activiteit?.afbeelding_pad) {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/activiteit-afbeeldingen/${activiteit.afbeelding_pad}`
      setPreview(url)
    }
  }, [])

  function kiesBestand(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    bestandRef.current = f
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  function verwijder() {
    bestandRef.current = null
    bestaandPad.current = null
    setPreview(null)
  }

  async function opslaan() {
    if (!naam.trim()) { setFout('Vul een naam in.'); return }
    if (!beschrijving.trim()) { setFout('Vul een beschrijving in.'); return }
    if (!categorie.trim()) { setFout('Vul een categorie in.'); return }

    setLoading(true)
    setFout('')

    try {
      const supabase = getSupabase()
      let fotoPad = bestaandPad.current

      // Upload foto als er een nieuw bestand gekozen is
      if (bestandRef.current) {
        const bestand = bestandRef.current
        const ext = bestand.name.split('.').pop()?.toLowerCase() || 'jpg'

        // Bepaal pad: gebruik activiteit ID als die bestaat, anders tijdelijk
        const tijdelijkId = activiteit?.id || `tmp_${Date.now()}`
        const uploadPad = `${tijdelijkId}.${ext}`

        const { data: upResult, error: upFout } = await supabase.storage
          .from('activiteit-afbeeldingen')
          .upload(uploadPad, bestand, { upsert: true })

        if (upFout) {
          setFout(`Foto kon niet worden opgeslagen: ${upFout.message}`)
          setLoading(false)
          return
        }
        fotoPad = upResult.path
      }

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
        afbeelding_pad: fotoPad,
      })
    } catch (e: unknown) {
      setFout(e instanceof Error ? e.message : 'Er ging iets mis.')
    }

    setLoading(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, flex: 1, margin: 0 }}>
            {activiteit?.naam ? 'Activiteit bewerken' : 'Activiteit toevoegen'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: '6px 8px', display: 'flex', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Naam *</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. Slakkenhuis van klei" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Beschrijving *</label>
            <textarea className="form-textarea" value={beschrijving} onChange={e => setBeschrijving(e.target.value)} placeholder="Beschrijving..." style={{ minHeight: 90 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Categorie *</label>
              <input className="form-input" value={categorie} onChange={e => setCategorie(e.target.value)} list="cat-lijst" placeholder="Bijv. Natuur" />
              <datalist id="cat-lijst">{ALLE_CATEGORIEEN.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Leeftijd</label>
              <input className="form-input" value={leeftijd} onChange={e => setLeeftijd(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Tijdsduur (min)</label>
              <input className="form-input" type="number" value={tijdsduur} onChange={e => setTijdsduur(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Groepsgrootte</label>
              <input className="form-input" value={groepsgrootte} onChange={e => setGroepsgrootte(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Thema&apos;s</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
              {themas.map((t, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: 12 }}>
                  {t}
                  <button type="button" onClick={() => setThemas(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-input" value={themaInput} onChange={e => setThemaInput(e.target.value)} placeholder="Voeg thema toe en druk Enter"
                onKeyDown={e => { if (e.key === 'Enter' && themaInput.trim()) { e.preventDefault(); if (!themas.includes(themaInput.trim())) setThemas(p => [...p, themaInput.trim()]); setThemaInput('') } }} />
              <button type="button" className="btn btn-sm" onClick={() => { if (themaInput.trim() && !themas.includes(themaInput.trim())) setThemas(p => [...p, themaInput.trim()]); setThemaInput('') }}>+</button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Materialen (kommagescheiden)</label>
            <input className="form-input" value={materialenRaw} onChange={e => setMaterialenRaw(e.target.value)} placeholder="Klei, verf, schaar" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Stappen (één per regel)</label>
            <textarea className="form-textarea" style={{ minHeight: 80 }} value={stappenRaw} onChange={e => setStappenRaw(e.target.value)} placeholder={'Stap 1\nStap 2'} />
          </div>

          {/* Foto */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Foto (optioneel)</label>
            {preview ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                  <label style={{ cursor: 'pointer' }}>
                    <span className="btn btn-sm" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', display: 'inline-flex' }}>Wijzigen</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={kiesBestand} />
                  </label>
                  <button type="button" className="btn btn-sm" onClick={verwijder} style={{ background: 'rgba(220,38,38,0.8)', color: '#fff', border: 'none' }}>Verwijderen</button>
                </div>
              </div>
            ) : (
              <label style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, border: '2px dashed var(--border-dark)', background: 'var(--bg)' }}>
                  <Upload size={18} color="var(--text-muted)" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Klik om een foto te kiezen</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>JPG, PNG of WebP</div>
                  </div>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={kiesBestand} />
              </label>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={materiaalAanwezig} onChange={e => setMateriaalAanwezig(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
            Materiaal is aanwezig
          </label>

          {activiteit?.id && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <ActiviteitBijlagen activiteitId={activiteit.id} magBewerken={true} />
            </div>
          )}

          {fout && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13 }}>
              {fout}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0, background: 'var(--bg-card)' }}>
          <button type="button" className="btn" onClick={onClose} disabled={loading}>Annuleren</button>
          <button type="button" className="btn btn-primary" onClick={opslaan} disabled={loading}>
            {loading ? 'Bezig...' : 'Opslaan'}
          </button>
        </div>

      </div>
    </div>
  )
}
