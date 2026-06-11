'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import PreviewModal from '@/components/PreviewModal'
import {
  Plus, X, Search, Download, Trash2,
  FileText, File, FileImage, Upload,
  FolderOpen, Eye
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Beleidsstuk {
  id: string
  naam: string
  beschrijving: string | null
  bestandsnaam: string
  bestandspad: string
  bestandstype: string | null
  bestandsgrootte: number | null
  categorie: string | null
  aangemaakt_door: string | null
  aangemaakt_op: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGrootte(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function bestandsIcon(type: string | null) {
  if (!type) return <File size={20} />
  if (type.includes('pdf')) return <FileText size={20} color="#DC2626" />
  if (type.includes('image')) return <FileImage size={20} color="#7C3AED" />
  if (type.includes('word') || type.includes('document')) return <FileText size={20} color="#2563EB" />
  if (type.includes('sheet') || type.includes('excel')) return <FileText size={20} color="#059669" />
  return <File size={20} color="var(--text-muted)" />
}

const CATEGORIEEN = ['Beleid', 'Protocol', 'Handleiding', 'Formulier', 'Overig']

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function BeleidPage() {
  const { profiel, isSuperadmin, rechten } = useAuth()
  const magZien = isSuperadmin || rechten.pagina_beleid !== 'geen'
  const magBewerken = isSuperadmin || rechten.pagina_beleid === 'bewerken'

  const [stukken, setStukken] = useState<Beleidsstuk[]>([])
  const [zoekterm, setZoekterm] = useState('')
  const [actieveCategorie, setActieveCategorie] = useState('Alle')
  const [laden, setLaden] = useState(true)
  const [uploadModal, setUploadModal] = useState(false)
  const [previewStuk, setPreviewStuk] = useState<{ url: string; naam: string } | null>(null)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  // ── Data ophalen ────────────────────────────────────────────────────────────
  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data } = await getSupabase()
      .from('beleidsstukken')
      .select('*')
      .order('aangemaakt_op', { ascending: false })
    setStukken((data ?? []) as Beleidsstuk[])
    setLaden(false)
  }, [])

  useEffect(() => { haalOp() }, [haalOp])

  // ── Preview ──────────────────────────────────────────────────────────────────
  async function preview(stuk: Beleidsstuk) {
    const supabase = getSupabase()
    const { data, error } = await supabase.storage.from('beleid-documenten').createSignedUrl(stuk.bestandspad, 300)
    if (error || !data) { setToast({ bericht: 'Preview mislukt', type: 'error' }); return }
    setPreviewStuk({ url: data.signedUrl, naam: stuk.bestandsnaam })
  }

  // ── Downloaden ──────────────────────────────────────────────────────────────
  async function download(stuk: Beleidsstuk) {
    const supabase = getSupabase()
    const { data, error } = await supabase.storage
      .from('beleidsstukken')
      .download(stuk.bestandspad)
    if (error || !data) { setToast({ bericht: 'Download mislukt', type: 'error' }); return }
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = stuk.bestandsnaam
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Bekijken in nieuwe tab ──────────────────────────────────────────────────
  async function bekijk(stuk: Beleidsstuk) {
    const supabase = getSupabase()
    const { data } = await supabase.storage
      .from('beleidsstukken')
      .createSignedUrl(stuk.bestandspad, 300) // 5 minuten geldig
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else setToast({ bericht: 'Kon bestand niet openen', type: 'error' })
  }

  // ── Verwijderen ─────────────────────────────────────────────────────────────
  async function verwijder(stuk: Beleidsstuk) {
    if (!confirm(`"${stuk.naam}" verwijderen?`)) return
    const supabase = getSupabase()
    await supabase.storage.from('beleidsstukken').remove([stuk.bestandspad])
    await supabase.from('beleidsstukken').delete().eq('id', stuk.id)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    haalOp()
  }

  // ── Filteren ────────────────────────────────────────────────────────────────
  const gefilterd = stukken.filter(s => {
    const matchZoek = !zoekterm ||
      s.naam.toLowerCase().includes(zoekterm.toLowerCase()) ||
      (s.beschrijving ?? '').toLowerCase().includes(zoekterm.toLowerCase()) ||
      (s.categorie ?? '').toLowerCase().includes(zoekterm.toLowerCase())
    const matchCat = actieveCategorie === 'Alle' || s.categorie === actieveCategorie
    return matchZoek && matchCat
  })

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  if (!magZien) return (
    <>
      <Topbar titel="Beleidsstukken" subtitel="Geen toegang" />
      <div className="page-content"><div className="empty-state"><FileText size={36} /><h3>Geen toegang</h3><p>Je hebt geen toegang tot de beleidsstukken.</p></div></div>
    </>
  )

  return (
    <>
      <Topbar
        titel="Beleidsstukken"
        subtitel={`${stukken.length} documenten`}
        acties={
          magBewerken ? (
            <button className="btn btn-primary" onClick={() => setUploadModal(true)}>
              <Upload size={14} /> Document uploaden
            </button>
          ) : undefined
        }
      />

      <div className="page-content">

        {/* Zoekbalk + categorie filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200, maxWidth: 360 }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder="Zoek op naam, beschrijving..."
              value={zoekterm}
              onChange={e => setZoekterm(e.target.value)}
              style={{ flex: 1 }}
            />
            {zoekterm && (
              <button onClick={() => setZoekterm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Categorie tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Alle', ...CATEGORIEEN].map(cat => (
              <button
                key={cat}
                onClick={() => setActieveCategorie(cat)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s',
                  borderColor: actieveCategorie === cat ? 'var(--primary)' : 'var(--border-dark)',
                  background: actieveCategorie === cat ? 'var(--primary)' : 'var(--bg-card)',
                  color: actieveCategorie === cat ? '#fff' : 'var(--text-muted)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Documenten grid */}
        {laden ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
        ) : gefilterd.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={36} />
            <h3>{zoekterm ? 'Geen resultaten' : 'Geen documenten'}</h3>
            <p>{zoekterm ? `Geen documenten gevonden voor "${zoekterm}"` : 'Upload het eerste beleidsstuk.'}</p>
            {isSuperadmin && !zoekterm && (
              <button className="btn btn-primary" onClick={() => setUploadModal(true)}>
                <Upload size={14} /> Document uploaden
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gefilterd.map(stuk => (
              <div
                key={stuk.id}
                className="card"
                style={{ transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Bestandsicoon */}
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {bestandsIcon(stuk.bestandstype)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stuk.naam}
                      </span>
                      {stuk.categorie && (
                        <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: 'var(--primary-light)', color: 'var(--primary-text)', flexShrink: 0 }}>
                          {stuk.categorie}
                        </span>
                      )}
                    </div>
                    {stuk.beschrijving && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stuk.beschrijving}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                      <span>📅 {fmtDatum(stuk.aangemaakt_op)}</span>
                      <span>📄 {stuk.bestandsnaam}</span>
                      <span>{fmtGrootte(stuk.bestandsgrootte)}</span>
                    </div>
                  </div>

                  {/* Acties */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => bekijk(stuk)} title="Openen in nieuw tabblad">
                      <Eye size={13} /> Bekijken
                    </button>
                    <button className="btn btn-sm" onClick={() => preview(stuk)} title="Bekijken">
                      <Eye size={13} /> Bekijken
                    </button>
                    <button className="btn btn-sm" onClick={() => download(stuk)} title="Downloaden">
                      <Download size={13} /> Download
                    </button>
                    {magBewerken && (
                      <button
                        className="btn btn-sm"
                        onClick={() => verwijder(stuk)}
                        style={{ color: '#DC2626', borderColor: '#FECACA' }}
                        title="Verwijderen"
                      >
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

      {/* Upload modal */}
      {uploadModal && (
        <UploadModal
          onClose={() => setUploadModal(false)}
          onSuccess={() => { setUploadModal(false); haalOp(); setToast({ bericht: 'Document geüpload!', type: 'success' }) }}
          profielId={profiel?.id ?? ''}
          onToast={setToast}
        />
      )}

      {previewStuk && (
        <PreviewModal
          titel={previewStuk.naam}
          url={previewStuk.url}
          bestandsNaam={previewStuk.naam}
          onClose={() => setPreviewStuk(null)}
          onDownload={async () => {
            const stuk = (stukken as Beleidsstuk[]).find(s => s.bestandsnaam === previewStuk.naam)
            if (stuk) await download(stuk)
          }}
        />
      )}
      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess, profielId, onToast }: {
  onClose: () => void
  onSuccess: () => void
  profielId: string
  onToast: (t: { bericht: string; type: 'success' | 'error' }) => void
}) {
  const [naam, setNaam] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [categorie, setCategorie] = useState('')
  const [bestand, setBestand] = useState<File | null>(null)
  const [uploaden, setUploaden] = useState(false)
  const [voortgang, setVoortgang] = useState(0)

  function kiesBestand(file: File) {
    setBestand(file)
    if (!naam) setNaam(file.name.replace(/\.[^.]+$/, ''))
  }

  async function handleUpload() {
    if (!bestand || !naam.trim()) return
    setUploaden(true)
    setVoortgang(30)

    const supabase = getSupabase()
    const ext = bestand.name.split('.').pop()
    const pad = `${Date.now()}_${bestand.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('beleidsstukken')
      .upload(pad, bestand)

    setVoortgang(70)

    if (uploadError) {
      onToast({ bericht: 'Upload mislukt: ' + uploadError.message, type: 'error' })
      setUploaden(false)
      return
    }

    const { error: dbError } = await supabase.from('beleidsstukken').insert({
      naam: naam.trim(),
      beschrijving: beschrijving.trim() || null,
      bestandsnaam: bestand.name,
      bestandspad: pad,
      bestandstype: bestand.type || null,
      bestandsgrootte: bestand.size,
      categorie: categorie || null,
      aangemaakt_door: profielId,
    })

    setVoortgang(100)

    if (dbError) {
      onToast({ bericht: 'Opslaan mislukt: ' + dbError.message, type: 'error' })
    } else {
      onSuccess()
    }
    setUploaden(false)
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Document uploaden</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Bestand kiezen */}
          <div>
            <label className="form-label">Bestand *</label>
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderRadius: 10, border: '2px dashed var(--border-dark)', background: 'var(--bg)',
                transition: 'all 0.12s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-dark)')}
              >
                <Upload size={20} color={bestand ? 'var(--primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: bestand ? 'var(--primary-text)' : 'var(--text)' }}>
                    {bestand ? bestand.name : 'Klik om een bestand te kiezen'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {bestand ? fmtGrootte(bestand.size) : 'PDF, Word, Excel, afbeeldingen...'}
                  </div>
                </div>
              </div>
              <input
                type="file"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && kiesBestand(e.target.files[0])}
              />
            </label>
          </div>

          <div>
            <label className="form-label">Naam document *</label>
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. Pestprotocol 2026" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Categorie</label>
              <select className="form-select" value={categorie} onChange={e => setCategorie(e.target.value)}>
                <option value="">Geen categorie</option>
                {CATEGORIEEN.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Beschrijving (optioneel)</label>
            <textarea
              className="form-textarea"
              value={beschrijving}
              onChange={e => setBeschrijving(e.target.value)}
              placeholder="Korte omschrijving van het document..."
              style={{ minHeight: 70 }}
            />
          </div>

          {/* Voortgangsbalk */}
          {uploaden && (
            <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${voortgang}%`, background: 'var(--primary)', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose} disabled={uploaden}>Annuleren</button>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploaden || !bestand || !naam.trim()}
            >
              {uploaden ? 'Uploaden...' : <><Upload size={14} /> Uploaden</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
