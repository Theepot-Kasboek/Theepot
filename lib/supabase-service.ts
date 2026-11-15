// Service-role Supabase-client - bypasst RLS, alleen server-side gebruiken
// (API-routes), nooit importeren in client-componenten. Zelfde patroon als
// app/api/agenda/ical/route.ts en app/api/push/agenda/route.ts.

import { createClient } from '@supabase/supabase-js'

export function getSupabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
