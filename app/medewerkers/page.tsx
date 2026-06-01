'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase, ROL_LABELS, ROL_VOLGORDE, type Profiel, type Rol } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/Topbar'
import Toast from '@/components/Toast'
import {
  UserPlus, X, ChevronDown, MoreVertical,
  Pencil, Trash2, ToggleLeft, ToggleRight, ShieldAlert,
} from 'lucide-react'

const ROL_KLEUREN: Record<Rol, { bg: string; kleur: string }> = {
  superadmin:     { bg: '#FCEBEB', kleur: '#A32D2D' },
  directie:       { bg: '#E6F1FB', kleur: '#185FA5' },
  leidinggevende: { bg: '#EBF5D6', kleur: '#3D6B1A' },
  locatie:        { bg: '#FAEEDA', kleur: '#854F0B' },
}

interface Toast { bericht: string; type: 'success' | 'error' }

export default function MedewerkersPage() {
  const { isSuperadmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [medewerkers, setMedewerkers] = useState<Profiel[]>([])
  const [laden, setLaden] = useState(true)
  const [zoeken, setZoeken] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)

  // Nieuw medewerker modal
  const [toonModal, setToonModal] = useState(false)
  const [bewerkProfiel, setBewerkProfiel] = useState<Profiel | null>(null)

  // Form state
  const [formNaam, setFormNaam] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRol, setFormRol] = useState<Rol>('locatie')
  const [formWachtwoord, setFormWachtwoord] = useState('')
  const [formLaden, setFormLaden] = useState(false)
  const [formFout, setFormFout] = useState('')

  // Dropdown menu
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      router.push('/')
    }
  }, [authLoading, isSuperadmin, router])

  useEffect(() => {
    if (isSuperadmin) laadMedewerkers()
  }, [isSuperadmin])

  async function laadMedewerkers() {
    setLaden(true)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('profielen')
      .select('*')
      .order('aangemaakt_op', { ascending: false })

    if (!error && data) setMedewerkers(data as Profiel[])
    setLaden(false)
  }

  function openNieuw() {
    setBewerkProfiel(null)
    setFormNaam('')
    setFormEmail('')
    setFormRol('locatie')
    setFormWachtwoord('')
    setFormFout('')
    setToonModal(true)
  }

  function openBewerk(profiel: Profiel) {
    setBewerkProfiel(profiel)
    setFormNaam(profiel.naam)
    setFormEmail(profiel.email)
    setFormRol(profiel.rol)
    setFormWachtwoord('')
    setFormFout('')
    setOpenMenu(null)
    setToonModal(true)
  }

  async function handleOpslaan() {
    if (!formNaam.trim() || !formEmail.trim()) {
      setFormFout('Naam en e-mail zijn verplicht.')
      return
    }
    if (!bewerkProfiel && !formWachtwoord.trim()) {
      setFormFout('Wachtwoord is verplicht bij een nieuw account.')
      return
    }

    setFormLaden(true)
    setFormFout('')
    const supabase = getSupabase()

    if (bewerkProfiel) {
      // Bewerk bestaand profiel
      const { error } = await supabase
        .from('profielen')
        .update({ naam: formNaam.trim(), email: formEmail.trim(), rol: formRol })
        .eq('id', bewerkProfiel.id)

      if (error) {
        setFormFout('Er is iets misgegaan bij het opslaan.')
      } else {
        setToonModal(false)
        setToast({ bericht: `${formNaam} bijgewerkt.`, type: 'success' })
        laadMedewerkers()
      }
    } else {
      // Nieuw account aanmaken via Supabase Admin API
      // We gebruiken signUp — de superadmin moet dit doen via service role key
      // Alternatief: maak de user aan in auth en insert profiel handmatig
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formEmail.trim(),
        password: formWachtwoord,
        options: { emailRedirectTo: window.location.origin },
      })

      if (authError || !authData.user) {
        setFormFout(authError?.message ?? 'Aanmaken mislukt.')
        setFormLaden(false)
        return
      }

      const { error: profielError } = await supabase
        .from('profielen')
        .insert({
          id: authData.user.id,
          email: formEmail.trim(),
          naam: formNaam.trim(),
          rol: formRol,
          actief: true,
        })

      if (profielError) {
        setFormFout('Account aangemaakt maar profiel opslaan mislukt: ' + profielError.message)
      } else {
        setToonModal(false)
        setToast({ bericht: `${formNaam} toegevoegd.`, type: 'success' })
        laadMedewerkers()
      }
    }

    setFormLaden(false)
  }

  async function toggleActief(profiel: Profiel) {
    setOpenMenu(null)
    const supabase = getSupabase()
    const { error } = await supabase
      .from('profielen')
      .update({ actief: !profiel.actief })
      .eq('id', profiel.id)

    if (!error) {
      setToast({
        bericht: `${profiel.naam} ${!profiel.actief ? 'geactiveerd' : 'gedeactiveerd'}.`,
        type: 'success',
      })
      laadMedewerkers()
    }
  }

  async function verwijder(profiel: Profiel) {
    if (!confirm(`Weet je zeker dat je ${profiel.naam} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return
    setOpenMenu(null)
    const supabase = getSupabase()
    const { error } = await supabase.from('profielen').delete().eq('id', profiel.id)
    if (!error) {
      setToast({ bericht: `${profiel.naam} verwijderd.`, type: 'success' })
      laadMedewerkers()
    } else {
      setToast({ bericht: 'Verwijderen mislukt.', type: 'error' })
    }
  }

  const gefilterd = medewerkers.filter((m) =>
    m.naam.toLowerCase().includes(zoeken.toLowerCase()) ||
    m.email.toLowerCase().includes(zoeken.toLowerCase()) ||
    ROL_LABELS[m.rol].toLowerCase().includes(zoeken.toLowerCase())
  )

  if (authLoading) return null

  if (!isSuperadmin) {
    return (
      <>
        <Topbar titel="Medewerkers" subtitel="Toegang geweigerd" />
        <div className="page-content">
          <div className="empty-state">
            <ShieldAlert size={40} />
            <h3>Geen toegang</h3>
            <p>Je hebt geen rechten om deze pagina te bekijken.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        titel="Medewerkers"
        subtitel={`${medewerkers.length} account${medewerkers.length !== 1 ? 's' : ''}`}
        zoeken={{ placeholder: 'Zoek op naam, e-mail of rol...', waarde: zoeken, onChange: setZoeken }}
        acties={
          <button className="btn btn-primary" onClick={openNieuw}>
            <UserPlus size={15} />
            Medewerker toevoegen
          </button>
        }
      />

      <div className="page-content">
        {/* Statistieken per rol */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
          {ROL_VOLGORDE.map((rol) => {
            const aantal = medewerkers.filter((m) => m.rol === rol).length
            const { bg, kleur } = ROL_KLEUREN[rol]
            return (
              <div key={rol} className="stat-card">
                <div className="stat-icon" style={{ background: bg, color: kleur }}>
                  <UserPlus size={16} />
                </div>
                <div className="stat-label">{ROL_LABELS[rol]}</div>
                <div className="stat-val">{aantal}</div>
              </div>
            )
          })}
        </div>

        {/* Tabel */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Alle medewerkers</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {gefilterd.length} resultaten
            </span>
          </div>

          {laden ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>Laden...</p>
            </div>
          ) : gefilterd.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <h3>Geen medewerkers gevonden</h3>
              <p>{zoeken ? 'Pas je zoekopdracht aan.' : 'Voeg een eerste medewerker toe.'}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    {['Naam', 'E-mail', 'Rol', 'Status', ''].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gefilterd.map((m) => {
                    const { bg, kleur } = ROL_KLEUREN[m.rol]
                    return (
                      <tr
                        key={m.id}
                        style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Naam + avatar */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0, opacity: m.actief ? 1 : 0.4 }}>
                              {m.naam.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 500, opacity: m.actief ? 1 : 0.5 }}>{m.naam}</span>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', opacity: m.actief ? 1 : 0.5 }}>
                          {m.email}
                        </td>

                        {/* Rol */}
                        <td style={{ padding: '12px 16px' }}>
                          <span className="tag" style={{ background: bg, color: kleur }}>
                            {ROL_LABELS[m.rol]}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`tag ${m.actief ? 'tag-green' : 'tag-gray'}`}>
                            {m.actief ? 'Actief' : 'Inactief'}
                          </span>
                        </td>

                        {/* Acties */}
                        <td style={{ padding: '12px 16px', position: 'relative' }}>
                          <button
                            onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenu === m.id && (
                            <div style={{
                              position: 'absolute', right: 16, top: '100%', zIndex: 20,
                              background: 'var(--bg-card)', border: '1px solid var(--border)',
                              borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                              minWidth: 170, padding: 4,
                            }}>
                              <button onClick={() => openBewerk(m)} style={menuItemStyle}>
                                <Pencil size={14} /> Bewerken
                              </button>
                              <button onClick={() => toggleActief(m)} style={menuItemStyle}>
                                {m.actief ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                                {m.actief ? 'Deactiveren' : 'Activeren'}
                              </button>
                              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                              <button onClick={() => verwijder(m)} style={{ ...menuItemStyle, color: 'var(--danger)' }}>
                                <Trash2 size={14} /> Verwijderen
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Klik buiten menu sluit het */}
      {openMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpenMenu(null)} />
      )}

      {/* Modal */}
      {toonModal && (
        <div className="modal-backdrop" onClick={() => setToonModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="card-header">
              <span className="card-title">
                {bewerkProfiel ? 'Medewerker bewerken' : 'Medewerker toevoegen'}
              </span>
              <button onClick={() => setToonModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Naam</label>
                <input className="form-input" placeholder="Voor- en achternaam" value={formNaam} onChange={(e) => setFormNaam(e.target.value)} />
              </div>

              <div>
                <label className="form-label">E-mailadres</label>
                <input className="form-input" type="email" placeholder="naam@demolen.nl" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} disabled={!!bewerkProfiel} />
                {bewerkProfiel && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>E-mail kan niet worden gewijzigd.</p>}
              </div>

              <div>
                <label className="form-label">Rol</label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="form-select"
                    value={formRol}
                    onChange={(e) => setFormRol(e.target.value as Rol)}
                    style={{ appearance: 'none', paddingRight: 32 }}
                  >
                    {ROL_VOLGORDE.map((rol) => (
                      <option key={rol} value={rol}>{ROL_LABELS[rol]}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                </div>

                {/* Rol beschrijving */}
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 7, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {formRol === 'superadmin' && 'Volledige toegang tot alle functies en instellingen.'}
                  {formRol === 'directie' && 'Kan alle pagina\'s inzien maar heeft geen beheerfuncties.'}
                  {formRol === 'leidinggevende' && 'Beheer van activiteiten, planningen en agenda.'}
                  {formRol === 'locatie' && 'Basistoegang: activiteiten bekijken en agenda inzien.'}
                </div>
              </div>

              {!bewerkProfiel && (
                <div>
                  <label className="form-label">Tijdelijk wachtwoord</label>
                  <input className="form-input" type="password" placeholder="Minimaal 6 tekens" value={formWachtwoord} onChange={(e) => setFormWachtwoord(e.target.value)} />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    De medewerker kan dit later zelf wijzigen.
                  </p>
                </div>
              )}

              {formFout && (
                <p style={{ fontSize: 12, color: 'var(--danger)', background: '#FCEBEB', padding: '8px 12px', borderRadius: 7, margin: 0 }}>
                  {formFout}
                </p>
              )}

              {/* Knoppen */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button className="btn" onClick={() => setToonModal(false)}>Annuleren</button>
                <button className="btn btn-primary" onClick={handleOpslaan} disabled={formLaden}>
                  {formLaden ? 'Opslaan...' : (bewerkProfiel ? 'Opslaan' : 'Toevoegen')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast bericht={toast.bericht} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '8px 12px', background: 'none', border: 'none',
  cursor: 'pointer', fontSize: 13, color: 'var(--text)', borderRadius: 7,
  textAlign: 'left', transition: 'background 0.1s',
}
