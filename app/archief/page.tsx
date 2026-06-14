'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import PreviewModal from '@/components/PreviewModal'
import { Archive, Newspaper, Layers, Plus, X, Search, Eye, Trash2, Download, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArchiefNieuwsbrief {
  id: string
  titel: string
  datum: string
  nummer: string | null
  format: string
  locatie_naam: string | null
  aangemaakt_op: string
  secties: { titel: string; inhoud: string }[]
}

interface ThemaArchief {
  id: string
  naam: string
  seizoen: string | null
  jaar: number | null
  locatie_naam: string | null
  beschrijving: string | null
  aangemaakt_op: string
  profiel_naam?: string
}

function fmtDatum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Hoofd pagina ─────────────────────────────────────────────────────────────

export default function ArchiefPage() {
  const { isSuperadmin, rechten } = useAuth()
  const [actieveTab, setActieveTab] = useState<'nieuwsbrieven' | 'themas'>('nieuwsbrieven')
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  const magZien = isSuperadmin || rechten.pagina_archief !== 'geen'
  const magBewerken = isSuperadmin || rechten.pagina_archief === 'bewerken'

  if (!magZien) return (
    <>
      <Topbar titel="Archief" subtitel="Geen toegang" />
      <div className="page-content"><div className="empty-state"><Archive size={36} /><h3>Geen toegang</h3></div></div>
    </>
  )

  return (
    <>
      <Topbar titel="Archief" />
      <div className="page-content">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
          {[
            { id: 'nieuwsbrieven', label: '📰 Nieuwsbrieven', },
            { id: 'themas', label: '🎨 Thema\'s' },
          ].map(t => (
            <button key={t.id} onClick={() => setActieveTab(t.id as 'nieuwsbrieven' | 'themas')}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.12s',
                background: actieveTab === t.id ? 'var(--primary)' : 'transparent',
                color: actieveTab === t.id ? '#fff' : 'var(--text-muted)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {actieveTab === 'nieuwsbrieven' && <NieuwsbriefArchief magBewerken={magBewerken} setToast={setToast} />}
        {actieveTab === 'themas' && <ThemaArchiefTab magBewerken={magBewerken} isSuperadmin={isSuperadmin} setToast={setToast} />}
      </div>
      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Nieuwsbrief Archief ──────────────────────────────────────────────────────

function NieuwsbriefArchief({ magBewerken, setToast }: { magBewerken: boolean; setToast: (t: { bericht: string; type: 'success' | 'error' }) => void }) {
  const [brieven, setBrieven] = useState<ArchiefNieuwsbrief[]>([])
  const [laden, setLaden] = useState(true)
  const [zoek, setZoek] = useState('')
  const [preview, setPreview] = useState<ArchiefNieuwsbrief | null>(null)
  const [filterFormat, setFilterFormat] = useState<'alle' | 'weekmemo' | 'theepraatje'>('alle')

  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data } = await getSupabase().from('nieuwsbrieven').select('*').order('datum', { ascending: false })
    setBrieven((data ?? []) as ArchiefNieuwsbrief[])
    setLaden(false)
  }, [])

  useEffect(() => { haalOp() }, [haalOp])

  const gefilterd = brieven.filter(b => {
    if (filterFormat !== 'alle' && b.format !== filterFormat) return false
    if (zoek) {
      const z = zoek.toLowerCase()
      return b.titel?.toLowerCase().includes(z) ||
        b.locatie_naam?.toLowerCase().includes(z) ||
        b.secties?.some(s => s.inhoud?.toLowerCase().includes(z) || s.titel?.toLowerCase().includes(z))
    }
    return true
  })

  async function verwijder(id: string) {
    if (!confirm('Nieuwsbrief verwijderen?')) return
    await getSupabase().from('nieuwsbrieven').delete().eq('id', id)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    haalOp()
  }

  function genereerPreviewHTML(brief: ArchiefNieuwsbrief): string {
    const secties = (brief.secties ?? []).filter(s => s.inhoud?.trim())
    const kleuren = ['#8CC63F','#FF8C00','#8B2BE2','#DC3545','#3D7010','#009688']
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10pt;color:#1e1e1e}
      .h{background:#8CC63F;color:white;padding:14px 18px;border-radius:12px 12px 0 0;margin:8px 8px 0}
      .h h1{font-size:20pt;font-weight:bold}.sub{font-size:8.5pt;opacity:.85;margin-top:3px}
      .dk{background:#3D7010;height:4px;margin:0 8px 14px}
      .rij{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:0 8px 9px;break-inside:avoid}
      .s{border-radius:3px;overflow:hidden}.st{font-size:8pt;font-weight:bold;padding:5px 9px;color:white;text-transform:uppercase}
      .si{padding:7px 9px;font-size:9pt;line-height:1.55}p{margin-bottom:5px}ul{margin:4px 0 4px 16px}li{margin-bottom:3px}
    </style></head><body>
    <div class="h"><h1>${brief.format === 'weekmemo' ? 'Weekmemo' : 'Theepraatje'}</h1><div class="sub">${[brief.nummer ? 'Nr. ' + brief.nummer : null, brief.datum ? fmtDatum(brief.datum) : null, brief.locatie_naam].filter(Boolean).join(' • ')}</div></div>
    <div class="dk"></div>
    ${brief.format === 'weekmemo'
      ? secties.map((s, i) => `<div style="margin:0 8px 9px;border-left:4px solid ${kleuren[i%kleuren.length]};padding:9px 12px;background:#f9fdf4"><div style="font-size:9pt;font-weight:bold;text-transform:uppercase;color:${kleuren[i%kleuren.length]};margin-bottom:6px">${s.titel}</div><div style="font-size:9.5pt;line-height:1.55">${s.inhoud.split('\n').map(r => r.trim() ? `<p>${r}</p>` : '').join('')}</div></div>`).join('')
      : (() => {
          const l = secties.filter((_,i)=>i%2===0); const r = secties.filter((_,i)=>i%2===1)
          return Array.from({length:Math.max(l.length,r.length)},(_,i)=>`<div class="rij">${
            l[i]?`<div class="s"><div class="st" style="background:${kleuren[(i*2)%kleuren.length]}">${l[i].titel}</div><div class="si">${l[i].inhoud.split('\n').map(r=>r.trim()?`<p>${r}</p>`:'').join('')}</div></div>`:'<div></div>'
          }${
            r[i]?`<div class="s"><div class="st" style="background:${kleuren[(i*2+1)%kleuren.length]}">${r[i].titel}</div><div class="si">${r[i].inhoud.split('\n').map(rv=>rv.trim()?`<p>${rv}</p>`:'').join('')}</div></div>`:'<div></div>'
          }</div>`).join('')
        })()
    }
    </body></html>`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} value={zoek} onChange={e => setZoek(e.target.value)} placeholder="Zoek in nieuwsbrieven..." />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['alle','weekmemo','theepraatje'] as const).map(f => (
            <button key={f} onClick={() => setFilterFormat(f)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.12s',
                borderColor: filterFormat === f ? 'var(--primary)' : 'var(--border-dark)',
                background: filterFormat === f ? 'var(--primary)' : 'var(--bg-card)',
                color: filterFormat === f ? '#fff' : 'var(--text)' }}>
              {f === 'alle' ? 'Alle' : f === 'weekmemo' ? 'Weekmemo' : 'Theepraatje'}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gefilterd.length} nieuwsbrieven</span>
      </div>

      {laden ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Laden...</div>
        : gefilterd.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <Newspaper size={32} />
            <h3>Geen nieuwsbrieven gevonden</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gefilterd.map(b => (
              <div key={b.id} className="card">
                <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: b.format === 'weekmemo' ? 'var(--primary-xlight)' : '#FFF3E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Newspaper size={18} color={b.format === 'weekmemo' ? 'var(--primary)' : '#FF8C00'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{b.titel || (b.format === 'weekmemo' ? 'Weekmemo' : 'Theepraatje')}{b.nummer ? ` Nr. ${b.nummer}` : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10 }}>
                      <span>📅 {b.datum ? fmtDatum(b.datum) : '—'}</span>
                      {b.locatie_naam && <span>📍 {b.locatie_naam}</span>}
                      <span style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '0 7px', fontSize: 10 }}>{b.format}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => setPreview(b)}><Eye size={13} /> Bekijken</button>
                    {magBewerken && <button className="btn btn-sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => verwijder(b.id)}><Trash2 size={13} /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {preview && (
        <PreviewModal
          titel={`${preview.format === 'weekmemo' ? 'Weekmemo' : 'Theepraatje'}${preview.nummer ? ' Nr. ' + preview.nummer : ''} — ${preview.datum ? fmtDatum(preview.datum) : ''}`}
          html={genereerPreviewHTML(preview)}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}

// ─── Thema Archief ────────────────────────────────────────────────────────────

function ThemaArchiefTab({ magBewerken, isSuperadmin, setToast }: { magBewerken: boolean; isSuperadmin: boolean; setToast: (t: { bericht: string; type: 'success' | 'error' }) => void }) {
  const { profiel } = useAuth()
  const [themas, setThemas] = useState<ThemaArchief[]>([])
  const [laden, setLaden] = useState(true)
  const [zoek, setZoek] = useState('')
  const [modal, setModal] = useState<ThemaArchief | 'nieuw' | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const haalOp = useCallback(async () => {
    setLaden(true)
    const { data } = await getSupabase().from('thema_archief').select('*, profielen(naam)').order('jaar', { ascending: false }).order('aangemaakt_op', { ascending: false })
    setThemas((data ?? []).map((t: ThemaArchief & { profielen?: { naam: string } }) => ({ ...t, profiel_naam: t.profielen?.naam })))
    setLaden(false)
  }, [])

  useEffect(() => { haalOp() }, [haalOp])

  async function verwijder(id: string) {
    if (!confirm('Thema verwijderen?')) return
    await getSupabase().from('thema_archief').delete().eq('id', id)
    setToast({ bericht: 'Verwijderd.', type: 'success' })
    haalOp()
  }

  const gefilterd = zoek
    ? themas.filter(t => [t.naam, t.seizoen, t.beschrijving, t.locatie_naam].join(' ').toLowerCase().includes(zoek.toLowerCase()))
    : themas

  // Groepeer per jaar
  const perJaar: Record<string, ThemaArchief[]> = {}
  for (const t of gefilterd) {
    const jaar = t.jaar ? String(t.jaar) : 'Onbekend'
    if (!perJaar[jaar]) perJaar[jaar] = []
    perJaar[jaar].push(t)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} value={zoek} onChange={e => setZoek(e.target.value)} placeholder="Zoek thema's..." />
        </div>
        {magBewerken && (
          <button className="btn btn-primary" onClick={() => setModal('nieuw')}><Plus size={14} /> Thema toevoegen</button>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gefilterd.length} thema&apos;s</span>
      </div>

      {laden ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Laden...</div>
        : gefilterd.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <Layers size={32} />
            <h3>Nog geen thema&apos;s in het archief</h3>
            {magBewerken && <button className="btn btn-primary" onClick={() => setModal('nieuw')}><Plus size={14} /> Thema toevoegen</button>}
          </div>
        ) : (
          Object.entries(perJaar).sort(([a],[b]) => Number(b)-Number(a)).map(([jaar, items]) => (
            <div key={jaar}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{jaar}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {items.map(t => (
                  <div key={t.id} className="card">
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15 }}>{t.naam}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {t.seizoen && <span>🌿 {t.seizoen}</span>}
                            {t.locatie_naam && <span>📍 {t.locatie_naam}</span>}
                          </div>
                          {t.beschrijving && (
                            <p style={{ fontSize: 12, color: 'var(--text)', marginTop: 8, lineHeight: 1.6 }}>{t.beschrijving}</p>
                          )}
                        </div>
                        {magBewerken && (
                          <button onClick={() => verwijder(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.4, display: 'flex', flexShrink: 0, padding: 2 }}
                            onMouseEnter={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.color='#DC2626' }}
                            onMouseLeave={e => { e.currentTarget.style.opacity='0.4'; e.currentTarget.style.color='var(--text-muted)' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )
      }

      {modal && (
        <ThemaModal
          onSave={async (data) => {
            await getSupabase().from('thema_archief').insert({ ...data, aangemaakt_door: profiel?.id })
            setToast({ bericht: 'Thema toegevoegd!', type: 'success' })
            setModal(null)
            haalOp()
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function ThemaModal({ onSave, onClose }: { onSave: (data: Omit<ThemaArchief, 'id' | 'aangemaakt_op' | 'profiel_naam' | 'aangemaakt_door'>) => void; onClose: () => void }) {
  const [naam, setNaam] = useState('')
  const [seizoen, setSeiZoen] = useState('')
  const [jaar, setJaar] = useState(String(new Date().getFullYear()))
  const [locatie, setLocatie] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [locaties, setLocaties] = useState<string[]>([])

  useEffect(() => {
    getSupabase().from('kasboek_locaties').select('naam').eq('actief', true).order('naam')
      .then(({ data }) => setLocaties((data ?? []).map((l: { naam: string }) => l.naam)))
  }, [])

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Thema toevoegen aan archief</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label className="form-label">Naam *</label><input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Bijv. Natuurhelden" autoFocus /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="form-label">Seizoen</label><input className="form-input" value={seizoen} onChange={e => setSeiZoen(e.target.value)} placeholder="Bijv. Zomer, Herfst" /></div>
            <div><label className="form-label">Jaar</label><input type="number" className="form-input" value={jaar} onChange={e => setJaar(e.target.value)} /></div>
          </div>
          <div><label className="form-label">Locatie</label>
            <select className="form-select" value={locatie} onChange={e => setLocatie(e.target.value)}>
              <option value="">Alle locaties</option>
              {locaties.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div><label className="form-label">Beschrijving</label><textarea className="form-textarea" value={beschrijving} onChange={e => setBeschrijving(e.target.value)} placeholder="Wat hield dit thema in?" style={{ minHeight: 80 }} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" disabled={!naam.trim()} onClick={() => onSave({ naam: naam.trim(), seizoen: seizoen.trim() || null, jaar: parseInt(jaar) || null, locatie_naam: locatie || null, beschrijving: beschrijving.trim() || null})}>Opslaan</button>
          </div>
        </div>
      </div>
    </div>
  )
}
