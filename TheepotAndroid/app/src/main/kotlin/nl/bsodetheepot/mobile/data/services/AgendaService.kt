package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.models.AgendaAfspraak
import nl.bsodetheepot.mobile.data.models.AgendaKalender

/**
 * Spiegelt app/agenda/page.tsx (zonder ICS-import/-abonneren, dat blijft een
 * web-only functie). Zichtbaarheid van kalenders volgt dezelfde regels als de
 * webapp: eigen persoonlijke kalender + (voor bevoorrechte rollen) alle
 * personeelskalenders + algemene kalenders (rechtstreeks zichtbaar voor
 * bevoorrechte rollen, anders alleen via `agenda_gedeeld`).
 */
object AgendaService {
    suspend fun kalenders(profielId: String, magAlleKalendersZien: Boolean, magAllePersoonlijkZien: Boolean): List<AgendaKalender> {
        var persoonlijk = SupabaseManager.client.postgrest["agenda_kalenders"]
            .select { filter { eq("type", "persoonlijk"); eq("eigenaar_id", profielId) } }
            .decodeList<AgendaKalender>()

        if (persoonlijk.isEmpty()) {
            // Nieuwe gebruiker zonder persoonlijke kalender: eenmalig aanmaken,
            // zelfde als bij de eerste keer dat de webagenda ooit werd geopend.
            persoonlijk = listOf(maakPersoonlijkeKalender(profielId))
        }

        var allePersoonlijk = persoonlijk
        if (magAllePersoonlijkZien) {
            allePersoonlijk = SupabaseManager.client.postgrest["agenda_kalenders"]
                .select { filter { eq("type", "persoonlijk") } }
                .decodeList<AgendaKalender>()
        }

        val algemeen = if (magAlleKalendersZien) {
            SupabaseManager.client.postgrest["agenda_kalenders"]
                .select { filter { eq("type", "algemeen") } }
                .decodeList<AgendaKalender>()
        } else {
            @Serializable
            data class GedeeldRij(val kalender_id: String)

            val gedeeld = SupabaseManager.client.postgrest["agenda_gedeeld"]
                .select(Columns.raw("kalender_id")) { filter { eq("profiel_id", profielId) } }
                .decodeList<GedeeldRij>()

            if (gedeeld.isEmpty()) {
                emptyList()
            } else {
                SupabaseManager.client.postgrest["agenda_kalenders"]
                    .select { filter { isIn("id", gedeeld.map { it.kalender_id }) } }
                    .decodeList<AgendaKalender>()
            }
        }

        return allePersoonlijk + algemeen
    }

    @Serializable
    private data class KalenderInsert(val naam: String, val type: String, val eigenaar_id: String, val kleur: String)

    private suspend fun maakPersoonlijkeKalender(profielId: String): AgendaKalender {
        return SupabaseManager.client.postgrest["agenda_kalenders"]
            .insert(KalenderInsert("Mijn agenda", "persoonlijk", profielId, "#4F46E5")) { select() }
            .decodeSingle<AgendaKalender>()
    }

    suspend fun afspraken(kalenderIds: List<String>): List<AgendaAfspraak> {
        if (kalenderIds.isEmpty()) return emptyList()
        return SupabaseManager.client.postgrest["agenda_afspraken"]
            .select {
                filter { isIn("kalender_id", kalenderIds) }
                order("start_tijd", Order.ASCENDING)
            }
            .decodeList<AgendaAfspraak>()
    }

    @Serializable
    private data class AfspraakInsert(
        val kalender_id: String,
        val titel: String,
        val beschrijving: String?,
        val start_tijd: String,
        val eind_tijd: String,
        val hele_dag: Boolean,
        val herinnering_minuten: Int?,
        val aangemaakt_door: String,
    )

    suspend fun maakAfspraak(
        kalenderId: String, titel: String, beschrijving: String?,
        startTijd: String, eindTijd: String, heleDag: Boolean,
        herinneringMinuten: Int?, aangemaaktDoor: String,
    ) {
        SupabaseManager.client.postgrest["agenda_afspraken"]
            .insert(AfspraakInsert(kalenderId, titel, beschrijving, startTijd, eindTijd, heleDag, herinneringMinuten, aangemaaktDoor))
    }

    @Serializable
    private data class AfspraakUpdate(
        val kalender_id: String,
        val titel: String,
        val beschrijving: String?,
        val start_tijd: String,
        val eind_tijd: String,
        val hele_dag: Boolean,
        val herinnering_minuten: Int?,
    )

    suspend fun werkAfspraakBij(
        id: String, kalenderId: String, titel: String, beschrijving: String?,
        startTijd: String, eindTijd: String, heleDag: Boolean, herinneringMinuten: Int?,
    ) {
        SupabaseManager.client.postgrest["agenda_afspraken"]
            .update(AfspraakUpdate(kalenderId, titel, beschrijving, startTijd, eindTijd, heleDag, herinneringMinuten)) {
                filter { eq("id", id) }
            }
    }

    suspend fun verwijderAfspraak(id: String) {
        SupabaseManager.client.postgrest["agenda_afspraken"].delete {
            filter { eq("id", id) }
        }
    }
}
