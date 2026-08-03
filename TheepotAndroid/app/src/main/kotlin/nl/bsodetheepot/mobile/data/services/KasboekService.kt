package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.storage.storage
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.models.KasboekCategorieen
import nl.bsodetheepot.mobile.data.models.KasboekEntry
import nl.bsodetheepot.mobile.data.models.KasboekType

object KasboekService {
    @Serializable
    private data class CategorieRow(val naam: String)

    suspend fun categorieen(): List<String> {
        val rijen = runCatching {
            SupabaseManager.client.postgrest["kasboek_categorieen"]
                .select { order("naam", Order.ASCENDING) }
                .decodeList<CategorieRow>()
        }.getOrDefault(emptyList())
        return rijen.map { it.naam }.ifEmpty { KasboekCategorieen.standaard }
    }

    suspend fun entries(locatieNaam: String, periode: String): List<KasboekEntry> =
        SupabaseManager.client.postgrest["kasboek_entries"]
            .select {
                filter {
                    eq("locatie", locatieNaam)
                    eq("periode", periode)
                }
                order("aangemaakt_op", Order.DESCENDING)
            }
            .decodeList()

    @Serializable
    private data class BedragRow(val bedrag: Double, val type: String)

    /** Som van alle boekingen uit voorgaande maanden, zodat het saldo doorloopt i.p.v. elke maand opnieuw bij nul te beginnen. */
    suspend fun beginsaldo(locatieNaam: String, voorPeriode: String): Double {
        val rijen = runCatching {
            SupabaseManager.client.postgrest["kasboek_entries"]
                .select(Columns.raw("bedrag, type")) {
                    filter {
                        eq("locatie", locatieNaam)
                        lt("periode", voorPeriode)
                    }
                }
                .decodeList<BedragRow>()
        }.getOrDefault(emptyList())
        return rijen.sumOf { if (it.type == "inkomst") it.bedrag else -it.bedrag }
    }

    @Serializable
    private data class EntryInsert(
        val periode: String,
        val categorie: String,
        val omschrijving: String?,
        val bedrag: Double,
        val type: String,
        val aangemaakt_door: String?,
        val locatie: String,
        val bonnetje_pad: String?,
    )

    suspend fun voegToe(
        locatieNaam: String,
        periode: String,
        categorie: String,
        omschrijving: String?,
        bedrag: Double,
        type: KasboekType,
        aangemaaktDoor: String?,
        bonnetjeBytes: ByteArray?,
    ) {
        var bonnetjePad: String? = null
        if (bonnetjeBytes != null) {
            val bestandsnaam = "bonnetje_${System.currentTimeMillis()}.jpg"
            val pad = "$locatieNaam/$periode/${System.currentTimeMillis()}_$bestandsnaam"
            SupabaseManager.client.storage["bonnetjes"].upload(pad, bonnetjeBytes)
            bonnetjePad = pad
        }
        SupabaseManager.client.postgrest["kasboek_entries"].insert(
            EntryInsert(periode, categorie, omschrijving, bedrag, type.name.lowercase(), aangemaaktDoor, locatieNaam, bonnetjePad),
        )
    }

    @Serializable
    private data class EntryUpdate(
        val type: String,
        val bedrag: Double,
        val categorie: String?,
        val omschrijving: String?,
        val bonnetje_pad: String?,
    )

    /**
     * Past een bestaande boeking aan. Een vervangen of verwijderd bonnetje wordt pas
     * uit de opslag gehaald nadat de boeking succesvol is bijgewerkt.
     */
    suspend fun werkBij(
        entry: KasboekEntry,
        type: KasboekType,
        bedrag: Double,
        categorie: String?,
        omschrijving: String?,
        nieuwBonnetje: ByteArray?,
        bonnetjeVerwijderen: Boolean,
    ) {
        var bonnetjePad = entry.bonnetjePad
        if (nieuwBonnetje != null) {
            val pad = "${entry.locatie}/${entry.periode}/${System.currentTimeMillis()}_bonnetje.jpg"
            SupabaseManager.client.storage["bonnetjes"].upload(pad, nieuwBonnetje)
            bonnetjePad = pad
        } else if (bonnetjeVerwijderen) {
            bonnetjePad = null
        }

        SupabaseManager.client.postgrest["kasboek_entries"].update(
            EntryUpdate(type.name.lowercase(), bedrag, categorie, omschrijving, bonnetjePad),
        ) {
            filter { eq("id", entry.id) }
        }

        val oudPad = entry.bonnetjePad
        if (oudPad != null && oudPad != bonnetjePad) {
            runCatching { SupabaseManager.client.storage["bonnetjes"].delete(oudPad) }
        }
    }

    suspend fun verwijder(id: String) {
        SupabaseManager.client.postgrest["kasboek_entries"].delete { filter { eq("id", id) } }
    }

    suspend fun downloadBonnetje(pad: String): ByteArray =
        SupabaseManager.client.storage["bonnetjes"].downloadAuthenticated(pad)
}
