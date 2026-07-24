package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import nl.bsodetheepot.mobile.data.models.VakantieActiviteit
import nl.bsodetheepot.mobile.data.models.VakantiePlanning
import nl.bsodetheepot.mobile.data.models.VakantieWeek

object VakantieplanningenService {
    suspend fun planningen(magOngepubliceerdeZien: Boolean): List<VakantiePlanning> =
        SupabaseManager.client.postgrest["vakantie_planningen"]
            .select {
                if (!magOngepubliceerdeZien) filter { eq("gepubliceerd", true) }
                order("start_datum", Order.DESCENDING)
            }
            .decodeList()

    suspend fun weken(planningId: String): List<VakantieWeek> =
        SupabaseManager.client.postgrest["vakantie_weken"]
            .select {
                filter { eq("planning_id", planningId) }
                order("week_nummer", Order.ASCENDING)
            }
            .decodeList()

    suspend fun activiteiten(weekIds: List<String>): List<VakantieActiviteit> {
        if (weekIds.isEmpty()) return emptyList()
        return SupabaseManager.client.postgrest["vakantie_activiteiten"]
            .select {
                filter { isIn("week_id", weekIds) }
                order("volgorde", Order.ASCENDING)
            }
            .decodeList()
    }
}
