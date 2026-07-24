package nl.bsodetheepot.mobile.data.models

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.services.SupabaseManager

/**
 * Tabel `kasboek_locaties` — gedeelde locatielijst, hergebruikt door kasboek,
 * maaltijdlijst, prikbord en weekplanningen (net als in de webapp).
 */
@Serializable
data class Locatie(
    val id: String,
    val naam: String,
    val actief: Boolean,
)

object LocatieService {
    suspend fun actieveLocaties(): List<Locatie> =
        SupabaseManager.client.postgrest["kasboek_locaties"]
            .select {
                filter { eq("actief", true) }
                order("naam", Order.ASCENDING)
            }
            .decodeList()
}
