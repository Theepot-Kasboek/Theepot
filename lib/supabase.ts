import { createBrowserClient } from '@supabase/ssr'

export function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Rol = 'superadmin' | 'directie' | 'leidinggevende' | 'locatie'

export const ROL_LABELS: Record<Rol, string> = {
  superadmin:     'Superadmin',
  directie:       'Directie',
  leidinggevende: 'Leidinggevende',
  locatie:        'Locatie',
}

export const ROL_VOLGORDE: Rol[] = ['superadmin', 'directie', 'leidinggevende', 'locatie']

export interface Profiel {
  id: string
  email: string
  naam: string
  rol: Rol
  actief: boolean
  aangemaakt_op: string
}

export interface Activiteit {
  id: string
  created_at: string
  naam: string
  beschrijving: string
  categorie: string
  thema: string
  leeftijd: string
  tijdsduur: number
  groepsgrootte: string
  materialen: string[]
  stappen: string[]
  materiaal_aanwezig: boolean
  ai_gegenereerd: boolean
}

export interface KasboekEntry {
  id: string
  periode: string
  categorie: string | null
  omschrijving: string | null
  bedrag: number
  type: 'inkomst' | 'uitgave'
  aangemaakt_door: string | null
  aangemaakt_op: string
  medewerker_naam?: string
}
