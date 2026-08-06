package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.models.DashboardVoorkeurenRow

/**
 * Beheert enkel de widget-volgorde-voorkeur (tabel `dashboard_voorkeuren`).
 * De widget-databerekeningen zelf blijven in hun eigen services
 * (PrikbordService, KilometerstandenService, MaaltijdlijstService, TakenService).
 */
object DashboardService {
    /** Geeft een lege lijst terug als er nog geen rij bestaat voor dit profiel (nieuwe gebruiker). */
    suspend fun laadVoorkeuren(profielId: String): List<String> = runCatching {
        SupabaseManager.client.postgrest["dashboard_voorkeuren"]
            .select { filter { eq("profiel_id", profielId) } }
            .decodeSingle<DashboardVoorkeurenRow>()
            .widgetVolgorde
    }.getOrDefault(emptyList())

    @Serializable
    private data class Upsert(val profiel_id: String, val widget_volgorde: List<String>, val bijgewerkt_op: String)

    suspend fun bewaarVolgorde(profielId: String, volgorde: List<String>) {
        SupabaseManager.client.postgrest["dashboard_voorkeuren"]
            .upsert(Upsert(profielId, volgorde, DateUtils.nowIso())) { onConflict = "profiel_id" }
    }
}
