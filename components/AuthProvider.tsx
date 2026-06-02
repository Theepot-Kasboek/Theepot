'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, type Profiel } from '@/lib/supabase'

type Toegang = 'geen' | 'lezen' | 'bewerken'

interface Rechten {
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

const SUPERADMIN_RECHTEN: Rechten = {
  pagina_kasboek: 'bewerken',
  pagina_vakantieplanningen: 'bewerken',
  pagina_activiteiten: 'bewerken',
  pagina_agenda: 'bewerken',
  pagina_chat: 'bewerken',
  pagina_medewerkers: 'bewerken',
  kasboek_export: true,
  kasboek_bonnetjes_inzien: true,
  activiteiten_importeren: true,
  activiteiten_verwijderen: true,
  agenda_algemeen_bewerken: true,
  agenda_personeel_inzien: true,
  vakantie_exporteren: true,
}

const GEEN_RECHTEN: Rechten = {
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

interface AuthContextType {
  user: User | null
  profiel: Profiel | null
  rechten: Rechten
  isSuperadmin: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profiel: null,
  rechten: GEEN_RECHTEN,
  isSuperadmin: false,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profiel, setProfiel] = useState<Profiel | null>(null)
  const [rechten, setRechten] = useState<Rechten>(GEEN_RECHTEN)
  const [loading, setLoading] = useState(true)

  async function laadProfiel(userId: string) {
    const supabase = getSupabase()
    try {
      const { data, error } = await supabase
        .from('profielen')
        .select('*')
        .eq('id', userId)
        .single()

      if (!data || error) { setProfiel(null); setRechten(GEEN_RECHTEN); return }

      const p = data as Profiel
      setProfiel(p)

      if (p.rol === 'superadmin') {
        setRechten(SUPERADMIN_RECHTEN)
        return
      }

      // Laad rechten: account-specifiek overschrijft rolrechten
      const [{ data: accountRecht }, { data: rolRecht }] = await Promise.all([
        supabase.from('rechten').select('*').eq('profiel_id', userId).single(),
        supabase.from('rechten').select('*').eq('rol', p.rol).single(),
      ])

      // Account recht heeft prioriteit, anders rolrecht, anders geen rechten
      const basis = (accountRecht ?? rolRecht ?? GEEN_RECHTEN) as Rechten
      setRechten(basis)
    } catch {
      setProfiel(null)
      setRechten(GEEN_RECHTEN)
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
  }

  const isSuperadmin = profiel?.rol === 'superadmin'

  return (
    <AuthContext.Provider value={{ user, profiel, rechten, isSuperadmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export type { Rechten, Toegang }
