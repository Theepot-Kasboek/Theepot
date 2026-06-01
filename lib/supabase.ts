import { createBrowserClient } from '@supabase/ssr'

export function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Rol = 'superadmin' | 'beheerder' | 'medewerker'

export interface Profiel {
  id: string
  email: string
  naam: string
  rol: Rol
  actief: boolean
  aangemaakt_op: string
}
