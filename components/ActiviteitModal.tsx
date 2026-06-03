'use client'
import { X, Copy, Download, Edit2, Trash2, Image } from 'lucide-react'
import { Activiteit } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { exportActiviteitAlsPDF } from '@/lib/pdf-export'
import { getCategorieKleur, getCategorieEmoji } from '@/lib/categorieen'
import { getThemaEmoji } from '@/lib/themas'
import { useState, useEffect } from 'react'

interface Props {
  activiteit: Activiteit
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onToast: (msg: string) => void
  onAfbeeldingGewijzigd?: () => void
}

function maakKopieerTekst(a: Activiteit): string {
  const regels: string[] = [a.naam, '']
  if (a.beschrijving) { regels.push(a.beschrijving); regels.push('') }
  if (a.stappen.length > 0) { a.stappen.forEach((s, i) => regels.push(`${i + 1}. ${s}`)); regels.push('') }
  if (a.materialen.length > 0) { regels.push('Benodigdheden'); a.materialen.forEach(m => regels.push(`• ${m}`)) }
  return regels.join('\n')
}

export default function ActiviteitModal({ activiteit, onClose, onEdit, onDelete, onToast, onAfbeeldingGewijzigd }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [bevestigVerwijder, setBevestigVerwijder] = useState(false)
  const [afbeeldingUrl, setAfbeeldingUrl] = useState<string | null>(null)
  const [uploadLaden, setUploadLaden] = useState(false)

  // Laad afbeelding URL
  useEffect(() => {
    if (activiteit.afbeelding_pad) {
      const supabase = getSupabase()
      const { data } = supabase.storage.from('activiteit-afbeeldingen').getPublicUrl(activiteit.afbeelding_pad)
      setAfbeeldingUrl(data.publicUrl)
    } else {
      setAfbeeldingUrl(null)
    }
  }, [activiteit.afbeelding_pad])

  function kopieer() {
    navigator.clipboard.writeText(maakKopieerTekst(activiteit))
    onToast('✅ Gekopieerd!')
  }

  async function handlePDF() {
    setPdfLoading(true)
    try { await exportActiviteitAlsPDF(activiteit); onToast('📄 PDF geëxporteerd!') }
    catch { onToast('⚠️ PDF export mislukt') }
    setPdfLoading(false)
  }

  async function uploadAfbeelding(bestand: File) {
    setUploadLaden(true)
    const supabase = getSupabase()
    const ext = bestand.name.split('.').pop()
    const pad = `${activiteit.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('activiteit-afbeeldingen')
      .upload(pad, bestand, { upsert: true })

    if (uploadError) {
      onToast('⚠️ Upload mislukt: ' + uploadError.message)
      setUploadLaden(false)
      return
    }

    await supabase.from('activiteiten').update({ afbeelding_pad: pad }).eq('id', activiteit.id)
    const { data } = supabase.storage.from('activiteit-afbeeldingen').getPublicUrl(pad)
    setAfbeeldingUrl(data.publicUrl + '?t=' + Date.now())
    activiteit.afbeelding_pad = pad
    onToast('✅ Afbeelding opgeslagen!')
    setUploadLaden(false)
    onAfbeeldingGewijzigd?.()
  }

  async function verwijderAfbeelding() {
    const supabase = getSupabase()
    if (activiteit.afbeelding_pad) {
      await supabase.storage.from('activiteit-afbeeldingen').remove([activiteit.afbeelding_pad])
    }
    await supabase.from('activiteiten').update({ afbeelding_pad: null }).eq('id', activiteit.id)
    setAfbeeldingUrl(null)
    activiteit.afbeelding_pad = null
    onToast('✅ Afbeelding verwijderd')
    onAfbeeldingGewijzigd?.()
  }

  const catKleur = getCategorieKleur(activiteit.categorie)
  const catEmoji = getCategorieEmoji(activiteit.categorie)
  const themaEmoji = getThemaEmoji(Array.isArray(activiteit.thema) ? activiteit.thema[0] : activiteit.thema)

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 5, background: catKleur, borderRadius: '16px 16px 0 0' }} />

        <div style={{ padding: '24px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                {activiteit.naam}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: catKleur + '18', color: catKleur, border: `1px solid ${catKleur}40` }}>{catEmoji} {activiteit.categorie}</span>
                {(Array.isArray(activiteit.thema) ? activiteit.thema : activiteit.thema ? [activiteit.thema] : []).filter(Boolean).map((t: string, i: number) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>{t}</span>
                ))}
                <span className="tag" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>👶 {activiteit.leeftijd}</span>
                <span className="tag" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>⏱ {activiteit.tijdsduur} min</span>
                <span className="tag" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>👥 {activiteit.groepsgrootte}</span>
                {activiteit.materiaal_aanwezig && <span className="tag tag-green">✅ Beschikbaar</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-dark)', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, margin: '16px 0 0', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={kopieer}><Copy size={13} /> Kopiëren</button>
            <button className="btn btn-sm" onClick={handlePDF} disabled={pdfLoading}><Download size={13} /> {pdfLoading ? 'Laden...' : 'Export PDF'}</button>
            <button className="btn btn-sm" onClick={onEdit}><Edit2 size={13} /> Bewerken</button>
            <div style={{ marginLeft: 'auto' }}>
              {!bevestigVerwijder ? (
                <button className="btn btn-sm" onClick={() => setBevestigVerwijder(true)} style={{ color: '#DC2626', borderColor: '#FECACA' }}>
                  <Trash2 size={13} /> Verwijderen
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '6px 12px' }}>
                  <span style={{ fontSize: 12.5, color: '#991B1B', fontWeight: 500 }}>Zeker weten?</span>
                  <button className="btn btn-sm" onClick={onDelete} style={{ background: '#DC2626', color: '#fff', borderColor: '#DC2626', padding: '4px 10px' }}>Ja, verwijder</button>
                  <button className="btn btn-sm" onClick={() => setBevestigVerwijder(false)} style={{ padding: '4px 10px' }}>Annuleer</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ margin: '16px 28px 0', borderTop: '1px solid var(--border)' }} />

        <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Afbeelding sectie */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Voorbeeldafbeelding
            </div>
            {afbeeldingUrl ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img
                  src={afbeeldingUrl}
                  alt={activiteit.naam}
                  style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }}
                />
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                  <label style={{ cursor: 'pointer' }}>
                    <div className="btn btn-sm" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', backdropFilter: 'blur(4px)' }}>
                      <Image size={12} /> Wijzigen
                    </div>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadAfbeelding(e.target.files[0])} />
                  </label>
                  <button className="btn btn-sm" onClick={verwijderAfbeelding} style={{ background: 'rgba(220,38,38,0.8)', color: '#fff', border: 'none', backdropFilter: 'blur(4px)' }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <label style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px', borderRadius: 10, border: '2px dashed var(--border-dark)', background: 'var(--bg)', transition: 'all 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-dark)')}
                >
                  <Image size={24} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {uploadLaden ? 'Uploaden...' : 'Klik om een afbeelding toe te voegen'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.7 }}>JPG, PNG, WebP</span>
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadAfbeelding(e.target.files[0])} />
              </label>
            )}
          </div>

          {/* Beschrijving */}
          {activiteit.beschrijving && (
            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>
              {activiteit.beschrijving}
            </p>
          )}

          {/* Stappen */}
          {activiteit.stappen.length > 0 && (
            <div>
              {activiteit.stappen.map((stap, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <div style={{ minWidth: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65, paddingTop: 3 }}>{stap}</p>
                </div>
              ))}
            </div>
          )}

          {/* Materialen */}
          {activiteit.materialen.length > 0 && (
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Benodigdheden</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activiteit.materialen.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text)' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 16 }}>•</span>{m}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
