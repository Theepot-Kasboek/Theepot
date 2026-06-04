'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase, type Profiel } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import { Plus, X, Send, Users, User, MessageSquare, Search, Check, CheckCheck, Paperclip, Download, FileText } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Gesprek {
  id: string
  naam: string
  type: 'direct' | 'groep'
  aangemaakt_door: string | null
  aangemaakt_op: string
  laatste_bericht_op: string
}

interface Bericht {
  id: string
  gesprek_id: string
  afzender_id: string | null
  inhoud: string
  verstuurd_op: string
  gelezen_door: string[]
  afzender?: Profiel
  bericht_type?: 'tekst' | 'bestand'
  bestand_pad?: string | null
  bestand_naam?: string | null
  bestand_type?: string | null
}

interface Deelnemer {
  gesprek_id: string
  profiel_id: string
  profiel?: Profiel
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTijd(iso: string) {
  const d = new Date(iso)
  const nu = new Date()
  const gisteren = new Date(nu); gisteren.setDate(nu.getDate() - 1)
  if (d.toDateString() === nu.toDateString()) {
    return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  }
  if (d.toDateString() === gisteren.toDateString()) return 'Gisteren'
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function initialen(naam: string) {
  return naam.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Hoofd component ──────────────────────────────────────────────────────────

export default function ChatPage() {
  const { profiel, rechten, isSuperadmin } = useAuth()
  const magStarten = isSuperadmin || rechten.chat_starten

  const [gesprekken, setGesprekken] = useState<Gesprek[]>([])
  const [actiefGesprek, setActiefGesprek] = useState<Gesprek | null>(null)
  const [berichten, setBerichten] = useState<Bericht[]>([])
  const [deelnemers, setDeelnemers] = useState<Deelnemer[]>([])
  const [alleProfielen, setAlleProfielen] = useState<Profiel[]>([])
  const [nieuwBericht, setNieuwBericht] = useState('')
  const [zoeken, setZoeken] = useState('')
  const [nieuwGesprekModal, setNieuwGesprekModal] = useState(false)
  const [laden, setLaden] = useState(false)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)
  const berichtenRef = useRef<HTMLDivElement>(null)

  // ── Data ophalen ────────────────────────────────────────────────────────────

  const haalGesprekkenOp = useCallback(async () => {
    if (!profiel) return
    const supabase = getSupabase()

    // Haal gesprekken op waar gebruiker deelnemer van is
    const { data: deelnemerData } = await supabase
      .from('chat_deelnemers')
      .select('gesprek_id')
      .eq('profiel_id', profiel.id)

    if (!deelnemerData || deelnemerData.length === 0) {
      setGesprekken([])
      return
    }

    const ids = deelnemerData.map((d: { gesprek_id: string }) => d.gesprek_id)
    const { data } = await supabase
      .from('chat_gesprekken')
      .select('*')
      .in('id', ids)
      .order('laatste_bericht_op', { ascending: false })

    setGesprekken((data ?? []) as Gesprek[])
  }, [profiel])

  const haalBerichtenOp = useCallback(async (gesprekId: string) => {
    setLaden(true)
    const supabase = getSupabase()

    const { data: berichtData } = await supabase
      .from('chat_berichten')
      .select('*')
      .eq('gesprek_id', gesprekId)
      .order('verstuurd_op')

    if (!berichtData) { setLaden(false); return }

    // Laad afzenders
    const afzenderIds = Array.from(new Set(berichtData.map((b: Bericht) => b.afzender_id).filter(Boolean)))
    const { data: profielData } = await supabase
      .from('profielen')
      .select('*')
      .in('id', afzenderIds)

    const profielMap = Object.fromEntries((profielData ?? []).map((p: Profiel) => [p.id, p]))
    const metAfzenders = berichtData.map((b: Bericht) => ({ ...b, afzender: profielMap[b.afzender_id ?? ''] }))

    setBerichten(metAfzenders)
    setLaden(false)

    // Markeer als gelezen
    if (profiel) {
      const ongelezen = berichtData.filter((b: Bericht) => !b.gelezen_door?.includes(profiel.id) && b.afzender_id !== profiel.id)
      for (const b of ongelezen) {
        await supabase.from('chat_berichten').update({ gelezen_door: [...(b.gelezen_door ?? []), profiel.id] }).eq('id', b.id)
      }
    }
  }, [profiel])

  const haalDeelnemersOp = useCallback(async (gesprekId: string) => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('chat_deelnemers')
      .select('*, profiel:profielen(*)')
      .eq('gesprek_id', gesprekId)
    setDeelnemers((data ?? []) as Deelnemer[])
  }, [])

  useEffect(() => {
    haalGesprekkenOp()
    getSupabase().from('profielen').select('*').order('naam').then(({ data }) => {
      setAlleProfielen((data ?? []) as Profiel[])
    })
  }, [haalGesprekkenOp])

  useEffect(() => {
    if (actiefGesprek) {
      haalBerichtenOp(actiefGesprek.id)
      haalDeelnemersOp(actiefGesprek.id)
    }
  }, [actiefGesprek, haalBerichtenOp, haalDeelnemersOp])

  // Auto-scroll naar beneden bij nieuwe berichten
  useEffect(() => {
    if (berichtenRef.current) {
      berichtenRef.current.scrollTop = berichtenRef.current.scrollHeight
    }
  }, [berichten])

  // Realtime updates
  useEffect(() => {
    if (!actiefGesprek) return
    const supabase = getSupabase()
    const channel = supabase
      .channel(`chat-${actiefGesprek.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_berichten', filter: `gesprek_id=eq.${actiefGesprek.id}` },
        () => { haalBerichtenOp(actiefGesprek.id); haalGesprekkenOp() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [actiefGesprek, haalBerichtenOp, haalGesprekkenOp])

  // ── Bericht versturen ───────────────────────────────────────────────────────

  async function verstuurBericht(e: React.FormEvent) {
    e.preventDefault()
    if (!nieuwBericht.trim() || !actiefGesprek || !profiel) return

    const inhoud = nieuwBericht.trim()
    setNieuwBericht('')

    const supabase = getSupabase()
    await supabase.from('chat_berichten').insert({
      gesprek_id: actiefGesprek.id,
      afzender_id: profiel.id,
      inhoud,
      gelezen_door: [profiel.id],
    })

    await supabase.from('chat_gesprekken').update({ laatste_bericht_op: new Date().toISOString() }).eq('id', actiefGesprek.id)

    await haalBerichtenOp(actiefGesprek.id)
    await haalGesprekkenOp()
  }

  // ── Bestand versturen ──────────────────────────────────────────────────────
  async function verstuurBestand(bestand: File) {
    if (!actiefGesprek || !profiel) return
    const supabase = getSupabase()
    const pad = `chat/${actiefGesprek.id}/${Date.now()}_${bestand.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadError } = await supabase.storage.from('chat-bestanden').upload(pad, bestand)
    if (uploadError) { setToast({ bericht: 'Upload mislukt: ' + uploadError.message, type: 'error' }); return }

    await supabase.from('chat_berichten').insert({
      gesprek_id: actiefGesprek.id,
      afzender_id: profiel.id,
      inhoud: bestand.name,
      gelezen_door: [profiel.id],
      bericht_type: 'bestand',
      bestand_pad: pad,
      bestand_naam: bestand.name,
      bestand_type: bestand.type || null,
    })
    await supabase.from('chat_gesprekken').update({ laatste_bericht_op: new Date().toISOString() }).eq('id', actiefGesprek.id)
    await haalBerichtenOp(actiefGesprek.id)
    await haalGesprekkenOp()
  }

  async function downloadBestand(b: Bericht) {
    if (!b.bestand_pad) return
    const supabase = getSupabase()
    const { data } = await supabase.storage.from('chat-bestanden').download(b.bestand_pad)
    if (!data) return
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url; a.download = b.bestand_naam ?? 'bestand'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Gesprek aanmaken ────────────────────────────────────────────────────────

  async function maakGesprek(naam: string, type: 'direct' | 'groep', deelnemerIds: string[]) {
    if (!profiel) return
    const supabase = getSupabase()

    const { data: gesprek, error } = await supabase
      .from('chat_gesprekken')
      .insert({ naam, type, aangemaakt_door: profiel.id })
      .select()
      .single()

    if (error || !gesprek) { setToast({ bericht: 'Mislukt: ' + error?.message, type: 'error' }); return }

    // Voeg deelnemers toe (inclusief zichzelf)
    const alleDeelnemers = Array.from(new Set([profiel.id, ...deelnemerIds]))
    await supabase.from('chat_deelnemers').insert(alleDeelnemers.map(id => ({ gesprek_id: gesprek.id, profiel_id: id })))

    setNieuwGesprekModal(false)
    await haalGesprekkenOp()
    setActiefGesprek(gesprek as Gesprek)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function ongelezen(gesprek: Gesprek): number {
    if (!profiel) return 0
    return berichten.filter(b => b.gesprek_id === gesprek.id && !b.gelezen_door?.includes(profiel.id) && b.afzender_id !== profiel.id).length
  }

  function gefilterdeGesprekken() {
    if (!zoeken) return gesprekken
    return gesprekken.filter(g => g.naam.toLowerCase().includes(zoeken.toLowerCase()))
  }

  function laasteBericht(gesprekId: string) {
    const gb = berichten.filter(b => b.gesprek_id === gesprekId)
    return gb[gb.length - 1]
  }

  // Support medewerker bovenaan (Lucas als superadmin)
  const supportProfiel = alleProfielen.find(p => p.rol === 'superadmin')

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        titel="Chat"
        subtitel="Intern berichtenverkeer"
        acties={
          magStarten ? (
            <button className="btn btn-primary" onClick={() => setNieuwGesprekModal(true)}>
              <Plus size={14} /> Nieuw gesprek
            </button>
          ) : undefined
        }
      />

      <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

        {/* ── Linker paneel: gesprekkenlijst ── */}
        <div style={{ width: 300, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', flexShrink: 0 }}>

          {/* Support sectie bovenaan */}
          {supportProfiel && profiel?.id !== supportProfiel.id && (
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Support</div>
              <div
                onClick={() => {
                  // Zoek bestaand gesprek met support (check via alle deelnemers van elk gesprek)
                  const bestaand = gesprekken.find(g => {
                    if (g.type !== 'direct') return false
                    // We checken dit via de gespreksnaam als fallback
                    return g.naam.includes(supportProfiel.naam) && g.naam.includes(profiel?.naam ?? '')
                  })
                  if (bestaand) {
                    setActiefGesprek(bestaand)
                  } else {
                    // Iedereen mag altijd een gesprek starten met support
                    maakGesprek(`${profiel?.naam} & ${supportProfiel.naam}`, 'direct', [supportProfiel.id])
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', background: 'var(--primary-xlight)', border: '1px solid var(--border-dark)', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-light)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--primary-xlight)')}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {initialen(supportProfiel.naam)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{supportProfiel.naam}</div>
                  <div style={{ fontSize: 11, color: 'var(--primary-text)' }}>💬 Stuur een bericht</div>
                </div>
              </div>
            </div>
          )}

          {/* Zoekbalk */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div className="search-bar" style={{ maxWidth: '100%' }}>
              <Search size={13} color="var(--text-muted)" />
              <input placeholder="Zoek gesprek..." value={zoeken} onChange={e => setZoeken(e.target.value)} style={{ flex: 1 }} />
            </div>
          </div>

          {/* Gesprekken */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {gefilterdeGesprekken().length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                {gesprekken.length === 0 ? 'Nog geen gesprekken.' : 'Geen resultaten.'}
              </div>
            ) : (
              gefilterdeGesprekken().map(g => {
                const actief = actiefGesprek?.id === g.id
                const lb = berichten.find(b => b.gesprek_id === g.id)
                return (
                  <div
                    key={g.id}
                    onClick={() => setActiefGesprek(g)}
                    style={{ display: 'flex', gap: 10, padding: '12px 14px', cursor: 'pointer', background: actief ? 'var(--primary-xlight)' : 'transparent', borderBottom: '1px solid var(--border)', transition: 'background 0.1s', borderLeft: actief ? '3px solid var(--primary)' : '3px solid transparent' }}
                    onMouseEnter={e => !actief && (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => !actief && (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Avatar */}
                    <div style={{ width: 38, height: 38, borderRadius: g.type === 'groep' ? 10 : '50%', background: actief ? 'var(--primary)' : 'var(--border-dark)', color: actief ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                      {g.type === 'groep' ? <Users size={16} /> : <User size={16} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.naam}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 6 }}>{fmtTijd(g.laatste_bericht_op)}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {g.type === 'groep' ? '👥 Groep' : '💬 Direct'}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Rechter paneel: berichten ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!actiefGesprek ? (
            <div className="empty-state" style={{ height: '100%' }}>
              <MessageSquare size={40} />
              <h3>Selecteer een gesprek</h3>
              <p>Kies een gesprek uit de lijst of start een nieuw gesprek.</p>
              {magStarten && (
                <button className="btn btn-primary" onClick={() => setNieuwGesprekModal(true)}>
                  <Plus size={14} /> Nieuw gesprek
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Gesprek header */}
              <div style={{ padding: '12px 18px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: actiefGesprek.type === 'groep' ? 9 : '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {actiefGesprek.type === 'groep' ? <Users size={16} /> : <User size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14 }}>{actiefGesprek.naam}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {deelnemers.length} deelnemers · {actiefGesprek.type === 'groep' ? 'Groepsgesprek' : 'Direct bericht'}
                  </div>
                </div>
                {/* Deelnemers avatars */}
                <div style={{ display: 'flex', gap: -4 }}>
                  {deelnemers.slice(0, 4).map((d, i) => (
                    <div key={d.profiel_id} title={(d.profiel as Profiel)?.naam} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)', marginLeft: i > 0 ? -8 : 0, zIndex: deelnemers.length - i }}>
                      {initialen((d.profiel as Profiel)?.naam ?? '??')}
                    </div>
                  ))}
                </div>
              </div>

              {/* Berichten */}
              <div ref={berichtenRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {laden && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Laden...</div>}
                {berichten.filter(b => b.gesprek_id === actiefGesprek.id).length === 0 && !laden && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 32 }}>
                    Nog geen berichten. Stuur het eerste bericht!
                  </div>
                )}
                {berichten.filter(b => b.gesprek_id === actiefGesprek.id).map((b, i, arr) => {
                  const isEigen = b.afzender_id === profiel?.id
                  const afzender = b.afzender
                  const vorigeBericht = arr[i - 1]
                  const zelfdeAfzender = vorigeBericht?.afzender_id === b.afzender_id
                  const gelezen = b.gelezen_door?.length > 1

                  return (
                    <div key={b.id} style={{ display: 'flex', flexDirection: isEigen ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                      {/* Avatar (alleen bij eerste in reeks) */}
                      {!isEigen && (
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: zelfdeAfzender ? 'transparent' : 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {!zelfdeAfzender && initialen(afzender?.naam ?? '?')}
                        </div>
                      )}

                      <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', alignItems: isEigen ? 'flex-end' : 'flex-start' }}>
                        {/* Naam (alleen bij eerste in reeks en groepsgesprek) */}
                        {!isEigen && !zelfdeAfzender && actiefGesprek.type === 'groep' && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3, paddingLeft: 4 }}>
                            {afzender?.naam ?? 'Onbekend'}
                          </div>
                        )}

                        {/* Bericht bubbel */}
                        <div style={{
                          padding: '9px 13px',
                          borderRadius: isEigen ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: isEigen ? 'var(--primary)' : 'var(--bg)',
                          color: isEigen ? '#fff' : 'var(--text)',
                          fontSize: 13,
                          lineHeight: 1.5,
                          border: isEigen ? 'none' : '1px solid var(--border)',
                          wordBreak: 'break-word',
                          cursor: b.bericht_type === 'bestand' ? 'pointer' : 'default',
                        }}
                          onClick={() => b.bericht_type === 'bestand' && downloadBestand(b)}
                        >
                          {b.bericht_type === 'bestand' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FileText size={18} style={{ flexShrink: 0, opacity: 0.8 }} />
                              <div>
                                <div style={{ fontWeight: 500 }}>{b.bestand_naam ?? b.inhoud}</div>
                                <div style={{ fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <Download size={10} /> Klik om te downloaden
                                </div>
                              </div>
                            </div>
                          ) : b.inhoud}
                        </div>

                        {/* Tijd + gelezen */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtTijd(b.verstuurd_op)}</span>
                          {isEigen && (
                            gelezen
                              ? <CheckCheck size={12} color="var(--primary)" />
                              : <Check size={12} color="var(--text-muted)" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Berichtinvoer */}
              <div style={{ padding: '12px 16px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
                <form onSubmit={verstuurBericht} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <label title="Bestand toevoegen" style={{ cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border-dark)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-dark)')}
                    >
                      <Paperclip size={16} />
                    </div>
                    <input type="file" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && verstuurBestand(e.target.files[0])} />
                  </label>
                  <textarea
                    value={nieuwBericht}
                    onChange={e => setNieuwBericht(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); verstuurBericht(e as unknown as React.FormEvent) } }}
                    placeholder="Schrijf een bericht... (Enter om te versturen)"
                    rows={1}
                    style={{
                      flex: 1, resize: 'none', border: '1px solid var(--border-dark)', borderRadius: 10,
                      padding: '10px 14px', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
                      background: 'var(--bg)', color: 'var(--text)', outline: 'none',
                      maxHeight: 120, overflowY: 'auto', lineHeight: 1.5,
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-dark)')}
                  />
                  <button
                    type="submit"
                    disabled={!nieuwBericht.trim()}
                    style={{
                      width: 40, height: 40, borderRadius: 10, border: 'none',
                      background: nieuwBericht.trim() ? 'var(--primary)' : 'var(--border-dark)',
                      color: '#fff', cursor: nieuwBericht.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s', flexShrink: 0,
                    }}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Nieuw gesprek modal */}
      {nieuwGesprekModal && (
        <NieuwGesprekModal
          profielen={alleProfielen.filter(p => p.id !== profiel?.id)}
          eigenId={profiel?.id ?? ''}
          onSave={maakGesprek}
          onClose={() => setNieuwGesprekModal(false)}
        />
      )}

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── Nieuw gesprek modal ──────────────────────────────────────────────────────

function NieuwGesprekModal({ profielen, eigenId, onSave, onClose }: {
  profielen: Profiel[]
  eigenId: string
  onSave: (naam: string, type: 'direct' | 'groep', deelnemerIds: string[]) => void
  onClose: () => void
}) {
  const [type, setType] = useState<'direct' | 'groep'>('direct')
  const [geselecteerd, setGeselecteerd] = useState<string[]>([])
  const [groepNaam, setGroepNaam] = useState('')
  const [zoek, setZoek] = useState('')

  const gefilterd = profielen.filter(p => !zoek || p.naam.toLowerCase().includes(zoek.toLowerCase()))

  // Support bovenaan
  const gesorteerd = [...gefilterd].sort((a, b) => {
    if (a.rol === 'superadmin') return -1
    if (b.rol === 'superadmin') return 1
    return a.naam.localeCompare(b.naam)
  })

  function toggleSelecteer(id: string) {
    if (type === 'direct') {
      setGeselecteerd([id])
    } else {
      setGeselecteerd(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }
  }

  function handleSave() {
    if (geselecteerd.length === 0) return
    let naam = groepNaam.trim()
    if (!naam) {
      if (type === 'direct') {
        const p = profielen.find(p => p.id === geselecteerd[0])
        naam = p?.naam ?? 'Direct bericht'
      } else {
        naam = `Groep (${geselecteerd.length + 1})`
      }
    }
    onSave(naam, type, geselecteerd)
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Nieuw gesprek</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Type */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 9, padding: 4 }}>
            {(['direct', 'groep'] as const).map(t => (
              <button key={t} onClick={() => { setType(t); setGeselecteerd([]) }} style={{ flex: 1, padding: '7px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: type === t ? 'var(--primary)' : 'transparent', color: type === t ? '#fff' : 'var(--text-muted)', transition: 'all 0.12s' }}>
                {t === 'direct' ? '💬 Direct bericht' : '👥 Groepsgesprek'}
              </button>
            ))}
          </div>

          {/* Groepsnaam */}
          {type === 'groep' && (
            <div>
              <label className="form-label">Naam groep (optioneel)</label>
              <input className="form-input" value={groepNaam} onChange={e => setGroepNaam(e.target.value)} placeholder="Bijv. Team Maandag" />
            </div>
          )}

          {/* Zoek */}
          <div className="search-bar" style={{ maxWidth: '100%' }}>
            <Search size={13} color="var(--text-muted)" />
            <input placeholder="Zoek medewerker..." value={zoek} onChange={e => setZoek(e.target.value)} style={{ flex: 1 }} />
          </div>

          {/* Lijst */}
          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {gesorteerd.map(p => {
              const geselecteerdBool = geselecteerd.includes(p.id)
              const isSupport = p.rol === 'superadmin'
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelecteer(p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: `1px solid ${geselecteerdBool ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer', background: geselecteerdBool ? 'var(--primary-xlight)' : 'var(--bg)', transition: 'all 0.12s' }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: isSupport ? 'var(--primary)' : 'var(--border-dark)', color: isSupport ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    {initialen(p.naam)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.naam}
                      {isSupport && <span style={{ fontSize: 10, background: 'var(--primary-light)', color: 'var(--primary-text)', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>Support</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.rol}</div>
                  </div>
                  {geselecteerdBool && <Check size={16} color="var(--primary)" />}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuleren</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={geselecteerd.length === 0}>
              {type === 'direct' ? 'Gesprek starten' : `Groep aanmaken (${geselecteerd.length + 1})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
