package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage

/** Centrale Supabase-client, analoog aan lib/supabase.ts in de webapp. */
object SupabaseManager {
    val client = createSupabaseClient(
        supabaseUrl = Secrets.SUPABASE_URL,
        supabaseKey = Secrets.SUPABASE_ANON_KEY,
    ) {
        install(Auth)
        install(Postgrest)
        install(Realtime)
        install(Storage)
    }
}
