'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, type Profiel } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  profiel: Profiel | null
  isSuperadmin: boolean
  isBeheerder: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profiel: null,
  isSuperadmin: false,
  isBeheerder: false,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profiel, setProfiel] = useState<Profiel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    async function laadProfiel(userId: string) {
      const { data } = await supabase
        .from('profielen')
        .select('*')
        .eq('id', userId)
        .single()
      if (data) setProfiel(data as Profiel)
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) laadProfiel(user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await laadProfiel(session.user.id)
        } else {
          setProfiel(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    setProfiel(null)
    setUser(null)
  }

  const isSuperadmin = profiel?.rol === 'superadmin'
  const isBeheerder = profiel?.rol === 'superadmin' || profiel?.rol === 'beheerder'

  return (
    <AuthContext.Provider value={{ user, profiel, isSuperadmin, isBeheerder, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
