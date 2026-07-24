import Foundation
import Supabase

/// Centrale Supabase-client, analoog aan lib/supabase.ts in de webapp.
enum SupabaseManager {
    static let client = SupabaseClient(
        supabaseURL: Secrets.supabaseURL,
        supabaseKey: Secrets.supabaseAnonKey
    )
}
