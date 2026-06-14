'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, type Profiel } from '@/lib/supabase'

type Toegang = 'geen' | 'lezen' | 'bewerken'

interface LocatieToegang {
  locatie_naam: string
  locatie_type: 'kasboek' | 'maaltijdlijst'
  toegang: Toegang
}

interface Rechten {
  pagina_kasboek: Toegang
  pagina_vakantieplanningen: Toegang
  pagina_activiteiten: Toegang
  pagina_agenda: Toegang
  pagina_chat: Toegang
  pagina_medewerkers: Toegang
  pagina_prikbord: Toegang
  pagina_ve_planning: Toegang
  pagina_archief: Toegang
  pagina_activiteiten_log: Toegang
  prikbord_toevoegen: boolean
  pagina_maaltijdlijst: Toegang
  pagina_weekplanningen: Toegang
  pagina_gesprekken: Toegang
  pagina_beleid: Toegang
  pagina_brandoefening: Toegang
  pagina_nieuwsbrieven: Toegang
  pagina_notulen: Toegang
  kasboek_export: boolean
  kasboek_bonnetjes_inzien: boolean
  activiteiten_importeren: boolean
  activiteiten_verwijderen: boolean
  agenda_algemeen_bewerken: boolean
  agenda_personeel_inzien: boolean
  vakantie_exporteren: boolean
  chat_starten: boolean
}

const SUPERADMIN_RECHTEN: Rechten = {
  pagina_kasboek: 'bewerken', pagina_vakantieplanningen: 'bewerken',
  pagina_activiteiten: 'bewerken', pagina_agenda: 'bewerken',
  pagina_chat: 'bewerken', pagina_medewerkers: 'bewerken',
  pagina_prikbord: 'bewerken', pagina_ve_planning: 'bewerken', pagina_archief: 'bewerken', pagina_activiteiten_log: 'bewerken', prikbord_toevoegen: true,
  pagina_maaltijdlijst: 'bewerken', pagina_weekplanningen: 'bewerken', pagina_gesprekken: 'bewerken',
  pagina_beleid: 'bewerken', pagina_brandoefening: 'bewerken', pagina_nieuwsbrieven: 'bewerken',
  pagina_notulen: 'bewerken',
  kasboek_export: true, kasboek_bonnetjes_inzien: true,
  activiteiten_importeren: true, activiteiten_verwijderen: true,
  agenda_algemeen_bewerken: true, agenda_personeel_inzien: true,
  vakantie_exporteren: true, chat_starten: true,
}

const GEEN_RECHTEN: Rechten = {
  pagina_kasboek: 'geen', pagina_vakantieplanningen: 'geen',
  pagina_activiteiten: 'geen', pagina_agenda: 'geen',
  pagina_chat: 'geen', pagina_medewerkers: 'geen',
  pagina_prikbord: 'geen', pagina_ve_planning: 'geen', pagina_archief: 'geen', pagina_activiteiten_log: 'geen', prikbord_toevoegen: false,
  pagina_maaltijdlijst: 'geen', pagina_weekplanningen: 'geen', pagina_gesprekken: 'geen',
  pagina_beleid: 'geen', pagina_brandoefening: 'geen', pagina_nieuwsbrieven: 'geen',
  pagina_notulen: 'lezen',
  kasboek_export: false, kasboek_bonnetjes_inzien: false,
  activiteiten_importeren: false, activiteiten_verwijderen: false,
  agenda_algemeen_bewerken: false, agenda_personeel_inzien: false,
  vakantie_exporteren: false, chat_starten: false,
}

interface AuthContextType {
  user: User | null
  profiel: Profiel | null
  rechten: Rechten
  locatieToegang: LocatieToegang[]
  isSuperadmin: boolean
  loading: boolean
  signOut: () => Promise<void>
  // Helpers voor locatietoegang
  kasboekToegang: (locatieNaam: string) => Toegang
  maaltijdToegang: (locatieNaam: string) => Toegang
}

const AuthContext = createContext<AuthContextType>({
  user: null, profiel: null, rechten: GEEN_RECHTEN,
  locatieToegang: [], isSuperadmin: false, loading: true,
  signOut: async () => {},
  kasboekToegang: () => 'geen',
  maaltijdToegang: () => 'geen',
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profiel, setProfiel] = useState<Profiel | null>(null)
  const [rechten, setRechten] = useState<Rechten>(GEEN_RECHTEN)
  const [locatieToegang, setLocatieToegang] = useState<LocatieToegang[]>([])
  const [loading, setLoading] = useState(true)

  async function laadProfiel(userId: string) {
    const supabase = getSupabase()
    try {
      const { data, error } = await supabase
        .from('profielen').select('*').eq('id', userId).single()

      if (!data || error) { setProfiel(null); setRechten(GEEN_RECHTEN); return }

      const p = data as Profiel
      setProfiel(p)

      if (p.rol === 'superadmin') {
        setRechten(SUPERADMIN_RECHTEN)
        setLocatieToegang([]) // superadmin ziet alles
        return
      }

      // Laad paginagerechten
      const [{ data: accountRecht }, { data: rolRecht }, { data: ltData }] = await Promise.all([
        supabase.from('rechten').select('*').eq('profiel_id', userId).single(),
        supabase.from('rechten').select('*').eq('rol', p.rol).single(),
        supabase.from('locatie_toegang').select('*').eq('profiel_id', userId),
      ])

      const basis = (accountRecht ?? rolRecht ?? GEEN_RECHTEN) as Rechten
      setRechten(basis)
      setLocatieToegang((ltData ?? []) as LocatieToegang[])
    } catch {
      setProfiel(null)
      setRechten(GEEN_RECHTEN)
      setLocatieToegang([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) laadProfiel(user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          laadProfiel(session.user.id)
        } else {
          setProfiel(null)
          setRechten(GEEN_RECHTEN)
          setLocatieToegang([])
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    setProfiel(null)
    setUser(null)
    setRechten(GEEN_RECHTEN)
    setLocatieToegang([])
  }

  const isSuperadmin = profiel?.rol === 'superadmin'

  // Helper: geeft toegangsniveau voor een specifieke locatie
  // Superadmin heeft altijd 'bewerken', anders op basis van locatie_toegang tabel
  const magAllesZien = isSuperadmin || profiel?.rol === 'directie' || profiel?.rol === 'leidinggevende'

  function kasboekToegang(locatieNaam: string): Toegang {
    if (magAllesZien) return 'bewerken'
    const gevonden = locatieToegang.find(t => t.locatie_type === 'kasboek' && t.locatie_naam === locatieNaam)
    return (gevonden?.toegang as Toegang) ?? 'geen'
  }

  function maaltijdToegang(locatieNaam: string): Toegang {
    if (magAllesZien) return 'bewerken'
    const gevonden = locatieToegang.find(t => t.locatie_type === 'maaltijdlijst' && t.locatie_naam === locatieNaam)
    return (gevonden?.toegang as Toegang) ?? 'geen'
  }

  return (
    <AuthContext.Provider value={{
      user, profiel, rechten, locatieToegang, isSuperadmin, loading,
      signOut, kasboekToegang, maaltijdToegang,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export type { Rechten, Toegang, LocatieToegang }
