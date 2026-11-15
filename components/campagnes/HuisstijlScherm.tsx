'use client'

import { useState, useRef } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Upload, ArrowLeft } from 'lucide-react'
import {
  CampagneHuisstijl, logoUrl, CAMPAGNE_AFBEELDINGEN_BUCKET, STANDAARD_MERKKLEUR, STANDAARD_ACHTERGRONDKLEUR,
} from '@/lib/campagnes'
import Toast from '@/components/Toast'

interface Props {
  huisstijl: CampagneHuisstijl | null
  magBewerken: boolean
  onOpgeslagen: (huisstijl: CampagneHuisstijl) => void
  onTerug: () => void
}

export default function HuisstijlScherm({ huisstijl, magBewerken, onOpgeslagen, onTerug }: Props) {
  const [form, setForm] = useState<CampagneHuisstijl>(huisstijl ?? {
    id: 1, logo_pad: null, merkkleur: null, achtergrondkleur: null, koptekst: null, voettekst: null, bijgewerkt_op: '',
  })
  const [uploadBezig, setUploadBezig] = useState(false)
  const [opslaan, setOpslaan] = useState(false)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  function toon(bericht: string, type: 'success' | 'error' = 'success') {
    setToast({ bericht, type })
  }

  async function uploadLogo(bestand: File) {
    setUploadBezig(true)
    const ext = bestand.name.split('.').pop() || 'png'
    const pad = `huisstijl/logo.${ext}`
    const { error } = await getSupabase().storage.from(CAMPAGNE_AFBEELDINGEN_BUCKET).upload(pad, bestand, { upsert: true })
    setUploadBezig(false)
    if (error) { toon('Upload mislukt: ' + error.message, 'error'); return }
    setForm(prev => ({ ...prev, logo_pad: pad }))
  }

  async function slaOp() {
    setOpslaan(true)
    const payload = {
      id: 1,
      logo_pad: form.logo_pad,
      merkkleur: form.merkkleur,
      achtergrondkleur: form.achtergrondkleur,
      koptekst: form.koptekst,
      voettekst: form.voettekst,
      bijgewerkt_op: new Date().toISOString(),
    }
    const { data, error } = await getSupabase().from('campagne_huisstijl').upsert(payload).select().single()
    setOpslaan(false)
    if (error) { toon('Opslaan mislukt: ' + error.message, 'error'); return }
    onOpgeslagen(data as CampagneHuisstijl)
    toon('Huisstijl opgeslagen')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <button className="btn btn-sm" onClick={onTerug} style={{ alignSelf: 'flex-start' }}><ArrowLeft size={14} /> Terug naar overzicht</button>

      <div>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 600 }}>Huisstijl campagnes</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Logo, merkkleur en kop-/voettekst die automatisch om elke campagne heen gezet worden</p>
      </div>

      <fieldset disabled={!magBewerken} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 480, border: 'none' }}>
        <div>
          <label className="form-label">Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {form.logo_pad ? (
              <img src={logoUrl(form.logo_pad)} alt="Logo" style={{ height: 56, maxWidth: 160, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', padding: 4 }} />
            ) : (
              <div style={{ height: 56, width: 128, borderRadius: 6, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>Geen logo</div>
            )}
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
            <button type="button" className="btn btn-sm" onClick={() => inputRef.current?.click()} disabled={uploadBezig}>
              <Upload size={13} /> {uploadBezig ? 'Uploaden...' : 'Logo kiezen'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="form-label">Merkkleur</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={form.merkkleur || STANDAARD_MERKKLEUR}
                onChange={e => setForm(prev => ({ ...prev, merkkleur: e.target.value }))}
                style={{ width: 40, height: 40, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rand onder logo, knoppen</span>
            </div>
          </div>
          <div>
            <label className="form-label">Achtergrondkleur</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={form.achtergrondkleur || STANDAARD_ACHTERGRONDKLEUR}
                onChange={e => setForm(prev => ({ ...prev, achtergrondkleur: e.target.value }))}
                style={{ width: 40, height: 40, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Buiten de mailkaart</span>
            </div>
          </div>
        </div>

        <div>
          <label className="form-label">Koptekst (onder het logo, optioneel)</label>
          <input className="form-input" value={form.koptekst ?? ''} onChange={e => setForm(prev => ({ ...prev, koptekst: e.target.value }))}
            placeholder="Bijv. de slogan van je organisatie" />
        </div>

        <div>
          <label className="form-label">Voettekst (optioneel)</label>
          <textarea className="form-textarea" value={form.voettekst ?? ''} onChange={e => setForm(prev => ({ ...prev, voettekst: e.target.value }))}
            placeholder="Bijv. adres en contactgegevens" rows={3} />
        </div>

        {magBewerken && (
          <button className="btn btn-primary" onClick={slaOp} disabled={opslaan} style={{ alignSelf: 'flex-start' }}>
            {opslaan ? 'Opslaan...' : 'Opslaan'}
          </button>
        )}
      </fieldset>

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
