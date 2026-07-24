package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.models.PrikbordBericht
import nl.bsodetheepot.mobile.data.models.PrikbordPrioriteit

/**
 * Spiegelt app/prikbord/page.tsx. Zichtbaarheid/expiry wordt client-side
 * gefilterd net als in de webapp (geen server-side filter op verloopdatum).
 */
object PrikbordService {
    suspend fun berichten(): List<PrikbordBericht> {
        val alle = SupabaseManager.client.postgrest["prikbord_berichten"]
            .select(Columns.raw("*, profielen(naam)"))
            .decodeList<PrikbordBericht>()

        return alle
            .filter { !it.isVerlopen }
            .sortedWith(
                compareByDescending<PrikbordBericht> { it.prioriteit.ordinal }
                    .thenByDescending { it.aangemaaktOp },
            )
    }

    @Serializable
    private data class Insert(
        val locatie_naam: String,
        val titel: String,
        val inhoud: String,
        val prioriteit: String,
        val verloopdatum: String?,
        val aangemaakt_door: String,
    )

    suspend fun maakAan(locatieNaam: String, titel: String, inhoud: String, prioriteit: PrikbordPrioriteit, verloopdatum: String?, aangemaaktDoor: String) {
        SupabaseManager.client.postgrest["prikbord_berichten"]
            .insert(Insert(locatieNaam, titel, inhoud, prioriteit.name.lowercase(), verloopdatum, aangemaaktDoor))
    }

    @Serializable
    private data class Update(
        val titel: String,
        val inhoud: String,
        val prioriteit: String,
        val locatie_naam: String,
        val verloopdatum: String?,
    )

    suspend fun werkBij(id: String, titel: String, inhoud: String, prioriteit: PrikbordPrioriteit, locatieNaam: String, verloopdatum: String?) {
        SupabaseManager.client.postgrest["prikbord_berichten"]
            .update(Update(titel, inhoud, prioriteit.name.lowercase(), locatieNaam, verloopdatum)) {
                filter { eq("id", id) }
            }
    }

    suspend fun verwijder(id: String) {
        SupabaseManager.client.postgrest["prikbord_berichten"].delete {
            filter { eq("id", id) }
        }
    }

    @Serializable
    private data class Huidig(val gelezen_door: List<String>? = null)

    @Serializable
    private data class GelezenUpdate(val gelezen_door: List<String>)

    /** Markeert bericht als gelezen door de huidige gebruiker (read-then-write, net als de webapp). */
    suspend fun markeerGelezen(bericht: PrikbordBericht, profielId: String) {
        val huidig = SupabaseManager.client.postgrest["prikbord_berichten"]
            .select(Columns.raw("gelezen_door")) { filter { eq("id", bericht.id) } }
            .decodeSingle<Huidig>()

        val gelezen = huidig.gelezen_door.orEmpty()
        if (profielId in gelezen) return

        SupabaseManager.client.postgrest["prikbord_berichten"]
            .update(GelezenUpdate(gelezen + profielId)) {
                filter { eq("id", bericht.id) }
            }
    }
}
