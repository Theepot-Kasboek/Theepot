'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase, ROL_LABELS, ROL_VOLGORDE, type Rol, type Profiel } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import { ShieldCheck, User, Users, ChevronDown, ChevronUp, Info } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recht {
  id: string
  rol: Rol | null
  profiel_id: string | null

  pagina_kasboek: Toegang
  pagina_vakantieplanningen: Toegang
  pagina_activiteiten: Toegang
  pagina_agenda: Toegang
  pagina_chat: Toegang
  pagina_medewerkers: Toegang

  kasboek_export: boolean
  kasboek_bonnetjes_inzien: boolean
  activiteiten_importeren: boolean
  activiteiten_verwijderen: boolean
  agenda_algemeen_bewerken: boolean
  agenda_personeel_inzien: boolean
  vakantie_exporteren: boolean
}

type Toegang = 'geen' | 'lezen' | 'bewerken'

// ─── Pagina definities ────────────────────────────────────────────────────────

interface PaginaDef {
  key: keyof Pick<Recht, 'pagina_kasboek' | 'pagina_vakantieplanningen' | 'pagina_activiteiten' | 'pagina_agenda' | 'pagina_chat' | 'pagina_medewerkers'>
  label: string
  icon: string
  functies: FunctieDef[]
}

interface FunctieDef {
  key: keyof Pick<Recht, 'kasboek_export' | 'kasboek_bonnetjes_inzien' | 'activiteiten_importeren' | 'activiteiten_verwijderen' | 'agenda_algemeen_bewerken' | 'agenda_personeel_inzien' | 'vakantie_exporteren'>
  label: string
  beschrijving: string
  vereist: Toegang
}

const PAGINAS: PaginaDef[] = [
  {
    key: 'pagina_kasboek',
    label: 'Kasboek',
    icon: '💰',
    functies: [
      { key: 'kasboek_export', label: 'Exporteren', beschrijving: 'Kasboek exporteren als PDF of Excel', vereist: 'lezen' },
      { key: 'kasboek_bonnetjes_inzien', label: 'Bonnetjes inzien', beschrijving: 'Geüploade bonnetjes bekijken en downloaden', vereist: 'lezen' },
    ],
  },
  {
    key: 'pagina_vakantieplanningen',
    label: 'Vakantieplanningen',
    icon: '🗺️',
    functies: [
      { key: 'vakantie_exporteren', label: 'Exporteren', beschrijving: 'Vakantieplanning exporteren als document', vereist: 'lezen' },
    ],
  },
  {
    key: 'pagina_activiteiten',
    label: 'Activiteitenbeheer',
    icon: '📚',
    functies: [
      { key: 'activiteiten_importeren', label: 'AI import', beschrijving: 'Activiteiten importeren via JSON / AI', vereist: 'bewerken' },
      { key: 'activiteiten_verwijderen', label: 'Verwijderen', beschrijving: 'Activiteiten permanent verwijderen', vereist: 'bewerken' },
    ],
  },
  {
    key: 'pagina_agenda',
    label: 'Agenda',
    icon: '📅',
    functies: [
      { key: 'agenda_algemeen_bewerken', label: 'Algemene agenda bewerken', beschrijving: 'Afspraken toevoegen aan gedeelde kalenders', vereist: 'bewerken' },
      { key: 'agenda_personeel_inzien', label: 'Personeelsagenda\'s inzien', beschrijving: 'Persoonlijke agenda\'s van collega\'s bekijken', vereist: 'lezen' },
    ],
  },
  {
    key: 'pagina_chat',
    label: 'Chat',
    icon: '💬',
    functies: [],
  },
  {
    key: 'pagina_medewerkers',
    label: 'Medewerkers',
    icon: '👥',
    functies: [],
  },
]

const TOEGANG_OPTIES: { waarde: Toegang; label: string; kleur: string; bg: string }[] = [
  { waarde: 'geen',     label: 'Geen toegang', kleur: '#6B7280', bg: '#F3F4F6' },
  { waarde: 'lezen',    label: 'Alleen lezen', kleur: '#185FA5', bg: '#E6F1FB' },
  { waarde: 'bewerken', label: 'Bewerken',     kleur: '#3D6B1A', bg: '#EBF5D6' },
]

function toegangKleur(t: Toegang) { return TOEGANG_OPTIES.find(o => o.waarde === t) ?? TOEGANG_OPTIES[0] }

// ─── Lege recht template ──────────────────────────────────────────────────────

function leegRecht(): Omit<Recht, 'id' | 'rol' | 'profiel_id'> {
  return {
    pagina_kasboek: 'geen',
    pagina_vakantieplanningen: 'geen',
    pagina_activiteiten: 'geen',
    pagina_agenda: 'geen',
    pagina_chat: 'geen',
    pagina_medewerkers: 'geen',
    kasboek_export: false,
    kasboek_bonnetjes_inzien: false,
    activiteiten_importeren: false,
    activiteiten_verwijderen: false,
    agenda_algemeen_bewerken: false,
    agenda_personeel_inzien: false,
    vakantie_exporteren: false,
  }
}

// ─── Hoofd component ──────────────────────────────────────────────────────────

export default function RechtenPage() {
  const { isSuperadmin } = useAuth()

  const [tab, setTab] = useState<'rollen' | 'accounts'>('rollen')
  const [rechten, setRechten] = useState<Recht[]>([])
  const [profielen, setProfielen] = useState<Profiel[]>([])
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState<string | null>(null)
  const [openSectie, setOpenSectie] = useState<string | null>(null)
  const [toast, setToast] = useState<{ bericht: string; type: 'success' | 'error' } | null>(null)

  const haalOp = useCallback(async () => {
    setLaden(true)
    const supabase = getSupabase()
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('rechten').select('*'),
      supabase.from('profielen').select('*').neq('rol', 'superadmin').order('naam'),
    ])
    setRechten((r ?? []) as Recht[])
    setProfielen((p ?? []) as Profiel[])
    setLaden(false)
  }, [])

  useEffect(() => { haalOp() }, [haalOp])

  async function slaOp(recht: Recht) {
    const id = recht.rol ?? recht.profiel_id ?? ''
    setOpslaan(id)
    const supabase = getSupabase()
    const { id: _id, ...data } = recht

    if (recht.id) {
      await supabase.from('rechten').update(data).eq('id', recht.id)
    } else {
      await supabase.from('rechten').insert(data)
    }

    setToast({ bericht: 'Rechten opgeslagen!', type: 'success' })
    setOpslaan(null)
    await haalOp()
  }

  function rechtVoorRol(rol: Rol): Recht {
    const gevonden = rechten.find(r => r.rol === rol)
    return gevonden ?? { id: '', rol, profiel_id: null, ...leegRecht() }
  }

  function rechtVoorProfiel(profielId: string): Recht {
    const gevonden = rechten.find(r => r.profiel_id === profielId)
    return gevonden ?? { id: '', rol: null, profiel_id: profielId, ...leegRecht() }
  }

  if (!isSuperadmin) {
    return (
      <>
        <Topbar titel="Rechtenbeheer" subtitel="Geen toegang" />
        <div className="page-content">
          <div className="empty-state">
            <ShieldCheck size={36} />
            <h3>Geen toegang</h3>
            <p>Alleen superadmins kunnen rechten beheren.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        titel="Rechtenbeheer"
        subtitel="Toegang per rol en per account instellen"
      />

      <div className="page-content">

        {/* Uitleg banner */}
        <div style={{ display: 'flex', gap: 12, background: 'var(--primary-xlight)', border: '1px solid var(--border-dark)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--primary-text)', lineHeight: 1.6 }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Hoe werkt het?</strong> Rolrechten gelden voor iedereen met die rol. Accountrechten <em>overschrijven</em> de rolrechten voor dat specifieke account.
            Superadmins hebben altijd volledige toegang en worden hier niet getoond.
          </div>
        </div>

        {/* Toegangslegende */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {TOEGANG_OPTIES.map(o => (
            <div key={o.waarde} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: o.bg, border: `1px solid ${o.kleur}30` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: o.kleur }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: o.kleur }}>{o.label}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {([['rollen', '🎭 Per rol', Users], ['accounts', '👤 Per account', User]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === key ? 600 : 400, color: tab === key ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.12s' }}
            >
              {label}
            </button>
          ))}
        </div>

        {laden ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Laden...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Per rol */}
            {tab === 'rollen' && ROL_VOLGORDE.filter(r => r !== 'superadmin').map(rol => (
              <RechtKaart
                key={rol}
                titel={ROL_LABELS[rol]}
                subtitel={`Geldt voor alle medewerkers met de rol ${ROL_LABELS[rol]}`}
                avatar={<div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎭</div>}
                recht={rechtVoorRol(rol)}
                open={openSectie === rol}
                onToggle={() => setOpenSectie(openSectie === rol ? null : rol)}
                onSave={slaOp}
                opslaan={opslaan === rol}
              />
            ))}

            {/* Per account */}
            {tab === 'accounts' && profielen.map(p => (
              <RechtKaart
                key={p.id}
                titel={p.naam}
                subtitel={`${ROL_LABELS[p.rol]} — ${p.email} · Overschrijft rolrechten`}
                avatar={
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
                    {p.naam.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                }
                recht={rechtVoorProfiel(p.id)}
                open={openSectie === p.id}
                onToggle={() => setOpenSectie(openSectie === p.id ? null : p.id)}
                onSave={slaOp}
                opslaan={opslaan === p.id}
              />
            ))}

            {tab === 'accounts' && profielen.length === 0 && (
              <div className="empty-state" style={{ padding: 40 }}>
                <User size={32} />
                <h3>Geen medewerkers</h3>
                <p>Voeg eerst medewerkers toe via de Medewerkers pagina.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

// ─── RechtKaart component ─────────────────────────────────────────────────────

function RechtKaart({ titel, subtitel, avatar, recht, open, onToggle, onSave, opslaan }: {
  titel: string
  subtitel: string
  avatar: React.ReactNode
  recht: Recht
  open: boolean
  onToggle: () => void
  onSave: (r: Recht) => void
  opslaan: boolean
}) {
  const [lokaal, setLokaal] = useState<Recht>(recht)
  const [gewijzigd, setGewijzigd] = useState(false)

  useEffect(() => { setLokaal(recht); setGewijzigd(false) }, [recht])

  function update(key: keyof Recht, waarde: Toegang | boolean) {
    setLokaal(prev => ({ ...prev, [key]: waarde }))
    setGewijzigd(true)
  }

  function toegangVoor(key: keyof Pick<Recht, 'pagina_kasboek' | 'pagina_vakantieplanningen' | 'pagina_activiteiten' | 'pagina_agenda' | 'pagina_chat' | 'pagina_medewerkers'>): Toegang {
    return lokaal[key] as Toegang
  }

  // Snelle samenvatting voor gesloten kaart
  const actiefPaginas = PAGINAS.filter(p => toegangVoor(p.key) !== 'geen')

  return (
    <div className="card">
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}
        onClick={onToggle}
      >
        {avatar}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14 }}>{titel}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitel}</div>
        </div>

        {/* Samenvatting badges */}
        {!open && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 300 }}>
            {actiefPaginas.length === 0 ? (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Geen toegang</span>
            ) : actiefPaginas.map(p => {
              const t = toegangVoor(p.key)
              const opt = toegangKleur(t)
              return (
                <span key={p.key} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: opt.bg, color: opt.kleur }}>
                  {p.icon} {p.label}
                </span>
              )
            })}
          </div>
        )}

        <div style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {PAGINAS.map(pagina => {
            const toegang = toegangVoor(pagina.key)
            const beschikbareFuncties = pagina.functies.filter(f => {
              if (f.vereist === 'lezen') return toegang !== 'geen'
              if (f.vereist === 'bewerken') return toegang === 'bewerken'
              return true
            })

            return (
              <div key={pagina.key}>
                {/* Pagina rij */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: beschikbareFuncties.length > 0 ? 10 : 0 }}>
                  <span style={{ fontSize: 18, width: 28 }}>{pagina.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{pagina.label}</div>
                  </div>
                  {/* Toegang toggle */}
                  <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
                    {TOEGANG_OPTIES.map(opt => (
                      <button
                        key={opt.waarde}
                        onClick={() => update(pagina.key, opt.waarde)}
                        style={{
                          padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          transition: 'all 0.12s',
                          background: toegang === opt.waarde ? opt.bg : 'transparent',
                          color: toegang === opt.waarde ? opt.kleur : 'var(--text-muted)',
                          outline: toegang === opt.waarde ? `1.5px solid ${opt.kleur}40` : 'none',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Functies */}
                {pagina.functies.length > 0 && (
                  <div style={{ marginLeft: 40, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pagina.functies.map(functie => {
                      const beschikbaar = beschikbareFuncties.includes(functie)
                      const aan = lokaal[functie.key] as boolean

                      return (
                        <div
                          key={functie.key}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', opacity: beschikbaar ? 1 : 0.4 }}
                        >
                          {/* Toggle */}
                          <button
                            onClick={() => beschikbaar && update(functie.key, !aan)}
                            disabled={!beschikbaar}
                            style={{
                              width: 36, height: 20, borderRadius: 10, border: 'none', cursor: beschikbaar ? 'pointer' : 'not-allowed',
                              background: aan && beschikbaar ? 'var(--primary)' : 'var(--border-dark)',
                              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                            }}
                          >
                            <div style={{
                              position: 'absolute', top: 2,
                              left: aan && beschikbaar ? 18 : 2,
                              width: 16, height: 16, borderRadius: '50%',
                              background: '#fff', transition: 'left 0.2s',
                            }} />
                          </button>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{functie.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{functie.beschrijving}</div>
                          </div>
                          {!beschikbaar && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Vereist: {functie.vereist}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Opslaan */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            {gewijzigd && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Niet-opgeslagen wijzigingen</span>
            )}
            <button
              className="btn btn-primary"
              onClick={() => onSave(lokaal)}
              disabled={opslaan || !gewijzigd}
              style={{ opacity: !gewijzigd ? 0.5 : 1 }}
            >
              {opslaan ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
