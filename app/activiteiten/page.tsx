'use client'
import { useState, useEffect, useCallback, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Search, BookOpen, Clock, Copy, Download, Filter } from 'lucide-react'
import { getSupabase, type Activiteit } from '@/lib/supabase'
import { getCategorieKleur, getCategorieEmoji } from '@/lib/categorieen'
import { getThemaKleur, getThemaEmoji } from '@/lib/themas'
import { exportActiviteitAlsPDF } from '@/lib/pdf-export'
import ActiviteitModal from '@/components/ActiviteitModal'
import ActiviteitFormModal from '@/components/ActiviteitFormModal'
import Toast from '@/components/Toast'
import Topbar from '@/components/Topbar'

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
  const themas = useMemo(() =>
    Array.from(new Set(activiteiten.map(a => a.thema).filter(Boolean))).sort(),
    [activiteiten]
  )

  const gefilterd = activiteiten.filter(a => {
    const zoek = zoekterm.toLowerCase()
    const matchZoek = !zoekterm ||
      a.naam.toLowerCase().includes(zoek) ||
      a.beschrijving.toLowerCase().includes(zoek) ||
      a.thema?.toLowerCase().includes(zoek) ||
      a.categorie?.toLowerCase().includes(zoek) ||
      a.materialen.some(m => m.toLowerCase().includes(zoek))
    let matchFilter = true
    if (actieveFilter === 'beschikbaar') matchFilter = a.materiaal_aanwezig
    else if (actieveFilter === 'kort') matchFilter = a.tijdsduur <= 30
    else if (actieveFilter.startsWith('cat:')) matchFilter = a.categorie === actieveFilter.slice(4)
    else if (actieveFilter.startsWith('thema:')) matchFilter = a.thema === actieveFilter.slice(6)
    return matchZoek && matchFilter
  })

  async function slaOp(data: Omit<Activiteit, 'id' | 'created_at'>) {
    const { error } = await getSupabase().from('activiteiten').insert([data])
    if (!error) { await laadActiviteiten(); setToevoegen(false); setToast({ bericht: 'Activiteit opgeslagen!', type: 'success' }) }
    else setToast({ bericht: `Fout: ${error.message}`, type: 'error' })
  }

  async function slaBewerking(data: Omit<Activiteit, 'id' | 'created_at'>) {
    if (!bewerkActiviteit) return
    const { error } = await getSupabase().from('activiteiten').update(data).eq('id', bewerkActiviteit.id)
    if (!error) { await laadActiviteiten(); setBewerkActiviteit(null); setGeselecteerd(null); setToast({ bericht: 'Bijgewerkt!', type: 'success' }) }
  }

  async function verwijderActiviteit() {
    if (!geselecteerd) return
    const { error } = await getSupabase().from('activiteiten').delete().eq('id', geselecteerd.id)
    if (!error) { await laadActiviteiten(); setGeselecteerd(null); setToast({ bericht: 'Verwijderd!', type: 'success' }) }
  }

  async function kopieerKaart(a: Activiteit, e: React.MouseEvent) {
    e.stopPropagation()
    const regels: string[] = [a.naam, '']
    if (a.beschrijving) { regels.push(a.beschrijving); regels.push('') }
    if (a.stappen.length > 0) { a.stappen.forEach((s, i) => regels.push(`${i + 1}. ${s}`)); regels.push('') }
    if (a.materialen.length > 0) { regels.push('Benodigdheden'); a.materialen.forEach(m => regels.push(`• ${m}`)) }
    await navigator.clipboard.writeText(regels.join('\n'))
    setToast({ bericht: 'Gekopieerd!', type: 'success' })
  }

  async function exportKaart(a: Activiteit, e: React.MouseEvent) {
    e.stopPropagation()
    try { await exportActiviteitAlsPDF(a); setToast({ bericht: 'PDF geëxporteerd!', type: 'success' }) }
    catch { setToast({ bericht: 'PDF export mislukt', type: 'error' }) }
  }

  // Toast helper voor modals die string sturen
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
            <button className="btn" onClick={() => window.location.href = '/upload'}>
              <Filter size={13} /> PDF Importeren
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

          {/* Algemene filters */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
            {[
              { key: 'all', label: 'Alle' },
              { key: 'beschikbaar', label: '✅ Beschikbaar' },
              { key: 'kort', label: '⏱ Kort (≤30 min)' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setActieveFilter(f.key)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '1.5px solid',
                  borderColor: actieveFilter === f.key ? 'var(--primary)' : 'var(--border-dark)',
                  background: actieveFilter === f.key ? 'var(--primary)' : 'var(--bg-card)',
                  color: actieveFilter === f.key ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.12s',
                }}
              >{f.label}</button>
            ))}
          </div>

          {/* Categorieën */}
          {categorieen.length > 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Categorie</span>
              {categorieen.map(c => (
                <button
                  key={c}
                  onClick={() => setActieveFilter(`cat:${c}`)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', border: '1.5px solid',
                    borderColor: actieveFilter === `cat:${c}` ? getCategorieKleur(c) : 'var(--border-dark)',
                    background: actieveFilter === `cat:${c}` ? getCategorieKleur(c) : 'var(--bg-card)',
                    color: actieveFilter === `cat:${c}` ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.12s',
                  }}
                >{getCategorieEmoji(c)} {c}</button>
              ))}
            </div>
          )}

          {/* Thema's */}
          {themas.length > 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Thema</span>
              {themas.map(t => (
                <button
                  key={t}
                  onClick={() => setActieveFilter(`thema:${t}`)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', border: '1.5px solid',
                    borderColor: actieveFilter === `thema:${t}` ? '#D97706' : 'var(--border-dark)',
                    background: actieveFilter === `thema:${t}` ? '#D97706' : 'var(--bg-card)',
                    color: actieveFilter === `thema:${t}` ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.12s',
                  }}
                >{getThemaEmoji(t)} {t}</button>
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
            <p>{zoekterm ? 'Pas je zoekopdracht aan.' : 'Voeg een eerste activiteit toe.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {gefilterd.map(a => {
              const catKleur = getCategorieKleur(a.categorie)
              const catEmoji = getCategorieEmoji(a.categorie)
              const themaEmoji = getThemaEmoji(a.thema)
              return (
                <div
                  key={a.id}
                  className="card"
                  onClick={() => setGeselecteerd(a)}
                  style={{ cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(140,198,63,0.15)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                >
                  <div style={{ height: 4, background: catKleur }} />
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, lineHeight: 1.35, flex: 1, paddingRight: 8 }}>{a.naam}</h3>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={e => kopieerKaart(a, e)} className="btn btn-sm" style={{ padding: '4px 8px' }}><Copy size={11} /></button>
                        <button onClick={e => exportKaart(a, e)} className="btn btn-sm" style={{ padding: '4px 8px' }}><Download size={11} /></button>
                      </div>
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {a.beschrijving}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: catKleur + '20', color: catKleur, border: `1px solid ${catKleur}40` }}>{catEmoji} {a.categorie}</span>
                      {a.thema && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>{themaEmoji} {a.thema}</span>}
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

      {geselecteerd && !bewerkActiviteit && (
        <ActiviteitModal
          activiteit={geselecteerd}
          onClose={() => setGeselecteerd(null)}
          onEdit={() => setBewerkActiviteit(geselecteerd)}
          onDelete={verwijderActiviteit}
          onToast={handleToast}
        />
      )}
      {(toevoegen || bewerkActiviteit) && (
        <ActiviteitFormModal
          activiteit={bewerkActiviteit || undefined}
          onSave={bewerkActiviteit ? slaBewerking : slaOp}
          onClose={() => { setToevoegen(false); setBewerkActiviteit(null) }}
        />
      )}
      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

export default function Page() {
  return <Suspense><ActiviteitenPage /></Suspense>
}
