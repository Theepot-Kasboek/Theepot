'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, type Profiel } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  profiel: Profiel | null
  isSuperadmin: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profiel: null,
  isSuperadmin: false,
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
      try {
        const { data, error } = await supabase
          .from('profielen')
          .select('*')
          .eq('id', userId)
          .single()

        if (data && !error) {
          setProfiel(data as Profiel)
        } else {
          setProfiel(null)
        }
      } catch {
        setProfiel(null)
      } finally {
        setLoading(false)
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        laadProfiel(user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          laadProfiel(session.user.id)
        } else {
          setProfiel(null)
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
  }

  const isSuperadmin = profiel?.rol === 'superadmin'

  return (
    <AuthContext.Provider value={{ user, profiel, isSuperadmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
