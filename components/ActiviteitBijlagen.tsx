'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Upload, Download, Trash2, FileText, File, X } from 'lucide-react'

interface Bijlage {
  id: string
  activiteit_id: string
  naam: string
  bestand_pad: string
  bestand_type: string | null
  grootte: number | null
  aangemaakt_op: string
}

function fmtGrootte(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function bijlageIcoon(type: string | null) {
  if (type?.includes('pdf')) return <FileText size={18} color='#EF4444' />
  if (type?.includes('image')) return <FileText size={18} color='#3B82F6' />
  return <File size={18} color='var(--text-muted)' />
}

export default function ActiviteitBijlagen({ activiteitId, magBewerken = false }: {
  activiteitId: string
  magBewerken?: boolean
}) {
  const [bijlagen, setBijlagen] = useState<Bijlage[]>([])
  const [uploaden, setUploaden] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const haalOp = useCallback(async () => {
    const { data } = await getSupabase()
      .from('activiteit_bijlagen')
      .select('*')
      .eq('activiteit_id', activiteitId)
      .order('aangemaakt_op')
    setBijlagen((data ?? []) as Bijlage[])
  }, [activiteitId])

  useEffect(() => { haalOp() }, [haalOp])

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t) }
  }, [toast])

  async function upload(bestand: File) {
    setUploaden(true)
    const supabase = getSupabase()
    const pad = `${activiteitId}/${Date.now()}_${bestand.name.replace(/\s+/g, '_')}`
    const { error: upErr } = await supabase.storage.from('activiteit-bijlagen').upload(pad, bestand)
    if (upErr) { setToast('Upload mislukt: ' + upErr.message); setUploaden(false); return }
    await supabase.from('activiteit_bijlagen').insert({
      activiteit_id: activiteitId, naam: bestand.name,
      bestand_pad: pad, bestand_type: bestand.type || null, grootte: bestand.size
    })
    setToast('Bijlage toegevoegd!')
    setUploaden(false)
    await haalOp()
  }

  async function verwijder(b: Bijlage) {
    if (!confirm(`"${b.naam}" verwijderen?`)) return
    await getSupabase().storage.from('activiteit-bijlagen').remove([b.bestand_pad])
    await getSupabase().from('activiteit_bijlagen').delete().eq('id', b.id)
    await haalOp()
  }

  async function download(b: Bijlage) {
    const { data } = await getSupabase().storage.from('activiteit-bijlagen').download(b.bestand_pad)
    if (!data) return
    const url = URL.createObjectURL(data)
    const a = document.createElement('a'); a.href = url; a.download = b.naam; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Bijlagen {bijlagen.length > 0 && <span style={{ background: 'var(--primary-light)', color: 'var(--primary-text)', padding: '1px 7px', borderRadius: 20, fontWeight: 600, marginLeft: 4 }}>{bijlagen.length}</span>}
        </div>
        {magBewerken && (
          <label style={{ cursor: uploaden ? 'wait' : 'pointer' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border-dark)', background: 'var(--bg)', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Upload size={12} /> {uploaden ? 'Uploaden...' : 'Bijlage toevoegen'}
            </div>
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.mov" style={{ display: 'none' }} disabled={uploaden} onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        )}
      </div>

      {bijlagen.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>Geen bijlagen</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bijlagen.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ flexShrink: 0 }}>{bijlageIcoon(b.bestand_type)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.naam}</div>
                {b.grootte && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtGrootte(b.grootte)}</div>}
              </div>
              <button onClick={() => download(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                <Download size={14} />
              </button>
              {magBewerken && (
                <button onClick={() => verwijder(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, opacity: 0.5 }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.opacity = '0.5' }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--primary-text)', background: 'var(--primary-xlight)', padding: '6px 10px', borderRadius: 7 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
