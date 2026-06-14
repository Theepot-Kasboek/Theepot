'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import { Activity, Filter } from 'lucide-react'

interface LogRegel {
  id: string
  actie: string
  pagina: string
  object_type: string | null
  object_naam: string | null
  aangemaakt_op: string
  profiel_naam?: string
  profiel_id: string | null
}

function fmtDatumTijd(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ACTIE_KLEUR: Record<string, string> = {
  aangemaakt: '#8CC63F',
  bijgewerkt: '#3B82F6',
  verwijderd: '#EF4444',
  gedownload: '#F59E0B',
  ingelogd: '#8B5CF6',
  uitgelogd: '#6B7280',
  gepubliceerd: '#0EA5E9',
}

export default function ActiviteitenLogPage() {
  const { isSuperadmin, rechten } = useAuth()
  const [regels, setRegels] = useState<LogRegel[]>([])
  const [laden, setLaden] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [filterPagina, setFilterPagina] = useState('')
  const [filterActie, setFilterActie] = useState('')
  const PER_PAGINA = 50

  const magZien = isSuperadmin || rechten.pagina_activiteiten_log !== 'geen'

  const haalOp = useCallback(async () => {
    setLaden(true)
    let query = getSupabase()
      .from('activiteiten_log')
      .select('*, profielen(naam)')
      .order('aangemaakt_op', { ascending: false })
      .range(pagina * PER_PAGINA, (pagina + 1) * PER_PAGINA - 1)

    if (filterPagina) query = query.eq('pagina', filterPagina)
    if (filterActie) query = query.eq('actie', filterActie)

    const { data } = await query
    setRegels((data ?? []).map((r: LogRegel & { profielen?: { naam: string } }) => ({ ...r, profiel_naam: r.profielen?.naam })))
    setLaden(false)
  }, [pagina, filterPagina, filterActie])

  useEffect(() => { haalOp() }, [haalOp])

  if (!magZien) return (
    <>
      <Topbar titel="Activiteitenlog" subtitel="Geen toegang" />
      <div className="page-content"><div className="empty-state"><Activity size={36} /><h3>Geen toegang</h3></div></div>
    </>
  )

  const paginas = ['activiteiten', 'nieuwsbrieven', 'beleid', 'weekplanningen', 'vakantieplanningen', 'kasboek', 'prikbord', 've-planning', 'agenda', 'medewerkers']
  const acties = ['aangemaakt', 'bijgewerkt', 'verwijderd', 'gedownload', 'gepubliceerd', 'ingelogd']

  return (
    <>
      <Topbar titel="Activiteitenlog" subtitel="Wie heeft wat gedaan" />
      <div className="page-content">

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={14} color="var(--text-muted)" />
          <select className="form-select" style={{ width: 'auto' }} value={filterPagina} onChange={e => { setFilterPagina(e.target.value); setPagina(0) }}>
            <option value="">Alle pagina&apos;s</option>
            {paginas.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={filterActie} onChange={e => { setFilterActie(e.target.value); setPagina(0) }}>
            <option value="">Alle acties</option>
            {acties.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="btn btn-sm" onClick={() => { setFilterPagina(''); setFilterActie(''); setPagina(0) }}>Wis filters</button>
        </div>

        {/* Log tabel */}
        <div className="card">
          {laden ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Laden...</div>
            : regels.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Activity size={28} style={{ opacity: 0.2, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                Nog geen activiteiten vastgelegd
              </div>
            ) : (
              <div>
                {regels.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < regels.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    {/* Actie badge */}
                    <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 20, fontWeight: 600, flexShrink: 0,
                      background: (ACTIE_KLEUR[r.actie] ?? '#888') + '18',
                      color: ACTIE_KLEUR[r.actie] ?? '#888' }}>
                      {r.actie}
                    </span>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text)' }}>
                        <span style={{ fontWeight: 600 }}>{r.profiel_naam ?? 'Onbekend'}</span>
                        {' '}{r.actie}{' '}
                        {r.object_type && <span style={{ color: 'var(--text-muted)' }}>{r.object_type}</span>}
                        {r.object_naam && <span style={{ fontStyle: 'italic' }}> &ldquo;{r.object_naam}&rdquo;</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        📄 {r.pagina}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{fmtDatumTijd(r.aangemaakt_op)}</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Paginering */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
          <button className="btn btn-sm" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>← Vorige</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 8px' }}>Pagina {pagina + 1}</span>
          <button className="btn btn-sm" disabled={regels.length < PER_PAGINA} onClick={() => setPagina(p => p + 1)}>Volgende →</button>
        </div>
      </div>
    </>
  )
}
