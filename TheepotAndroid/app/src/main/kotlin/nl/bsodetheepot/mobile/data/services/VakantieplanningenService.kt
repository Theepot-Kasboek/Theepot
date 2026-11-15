package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.storage.storage
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
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

    @Serializable
    private data class BibFoto(
        val id: String,
        @SerialName("afbeelding_pad") val afbeeldingPad: String? = null,
    )

    /**
     * Activiteiten die uit de activiteitenbibliotheek zijn gekozen hebben hun
     * foto daar staan, niet op de rij in `vakantie_activiteiten` zelf — dit vult
     * `afbeeldingPad` aan vanuit de bibliotheek, net als de iOS-app.
     */
    suspend fun metBibliotheekFotos(activiteiten: List<VakantieActiviteit>): List<VakantieActiviteit> {
        val actIds = activiteiten.mapNotNull { it.activiteitId }.distinct()
        if (actIds.isEmpty()) return activiteiten

        val bibFotos = runCatching {
            SupabaseManager.client.postgrest["activiteiten"]
                .select {
                    filter { isIn("id", actIds) }
                }
                .decodeList<BibFoto>()
        }.getOrDefault(emptyList())

        val fotoMap = bibFotos.mapNotNull { foto ->
            foto.afbeeldingPad?.takeIf { it.isNotEmpty() }?.let { foto.id to it }
        }.toMap()

        return activiteiten.map { activiteit ->
            val bibliotheekPad = activiteit.activiteitId?.let { fotoMap[it] }
            if (bibliotheekPad != null) activiteit.copy(afbeeldingPad = bibliotheekPad) else activiteit
        }
    }

    fun fotoUrl(pad: String): String =
        SupabaseManager.client.storage["activiteit-afbeeldingen"].publicUrl(pad)
}
