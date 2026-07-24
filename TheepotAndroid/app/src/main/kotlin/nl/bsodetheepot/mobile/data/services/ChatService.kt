package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.filter.FilterOperation
import io.github.jan.supabase.postgrest.query.filter.FilterOperator
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.models.BerichtType
import nl.bsodetheepot.mobile.data.models.ChatBericht
import nl.bsodetheepot.mobile.data.models.ChatDeelnemer
import nl.bsodetheepot.mobile.data.models.ChatGesprek
import nl.bsodetheepot.mobile.data.models.ChatType
import nl.bsodetheepot.mobile.data.models.Profiel

object ChatService {
    suspend fun gesprekken(profielId: String): List<ChatGesprek> {
        val ids = SupabaseManager.client.postgrest["chat_deelnemers"]
            .select(Columns.raw("gesprek_id")) { filter { eq("profiel_id", profielId) } }
            .decodeList<GesprekIdRow>()
            .map { it.gesprek_id }
        if (ids.isEmpty()) return emptyList()

        return SupabaseManager.client.postgrest["chat_gesprekken"]
            .select {
                filter { isIn("id", ids) }
                order("laatste_bericht_op", io.github.jan.supabase.postgrest.query.Order.DESCENDING)
            }
            .decodeList()
    }

    @Serializable
    private data class GesprekIdRow(val gesprek_id: String)

    suspend fun deelnemers(gesprekId: String): List<ChatDeelnemer> =
        SupabaseManager.client.postgrest["chat_deelnemers"]
            .select(Columns.raw("*, profiel:profielen(*)")) { filter { eq("gesprek_id", gesprekId) } }
            .decodeList()

    suspend fun alleProfielen(): List<Profiel> =
        SupabaseManager.client.postgrest["profielen"].select().decodeList()

    suspend fun berichten(gesprekId: String): List<ChatBericht> =
        SupabaseManager.client.postgrest["chat_berichten"]
            .select {
                filter { eq("gesprek_id", gesprekId) }
                order("verstuurd_op", io.github.jan.supabase.postgrest.query.Order.ASCENDING)
            }
            .decodeList()

    @Serializable
    private data class GelezenUpdate(val gelezen_door: List<String>)

    suspend fun markeerGelezen(berichtId: String, gelezenDoor: List<String>, profielId: String) {
        if (profielId in gelezenDoor) return
        SupabaseManager.client.postgrest["chat_berichten"]
            .update(GelezenUpdate(gelezenDoor + profielId)) { filter { eq("id", berichtId) } }
    }

    @Serializable
    private data class BerichtInsert(
        val gesprek_id: String,
        val afzender_id: String,
        val inhoud: String,
        val gelezen_door: List<String>,
        val bericht_type: String = "tekst",
        val bestand_pad: String? = null,
        val bestand_naam: String? = null,
        val bestand_type: String? = null,
    )

    @Serializable
    private data class GesprekBump(val laatste_bericht_op: String)

    private suspend fun bumpLaatsteBericht(gesprekId: String) {
        SupabaseManager.client.postgrest["chat_gesprekken"]
            .update(GesprekBump(DateUtils.nowIso())) { filter { eq("id", gesprekId) } }
    }

    suspend fun verstuurTekst(gesprekId: String, afzenderId: String, inhoud: String) {
        SupabaseManager.client.postgrest["chat_berichten"]
            .insert(BerichtInsert(gesprekId, afzenderId, inhoud, listOf(afzenderId)))
        bumpLaatsteBericht(gesprekId)
    }

    suspend fun verstuurBestand(gesprekId: String, afzenderId: String, bestandsnaam: String, bytes: ByteArray, mimeType: String) {
        val safeName = bestandsnaam.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val pad = "chat/$gesprekId/${System.currentTimeMillis()}_$safeName"
        SupabaseManager.client.storage["chat-bestanden"].upload(pad, bytes)

        SupabaseManager.client.postgrest["chat_berichten"].insert(
            BerichtInsert(
                gesprek_id = gesprekId,
                afzender_id = afzenderId,
                inhoud = bestandsnaam,
                gelezen_door = listOf(afzenderId),
                bericht_type = "bestand",
                bestand_pad = pad,
                bestand_naam = bestandsnaam,
                bestand_type = mimeType,
            ),
        )
        bumpLaatsteBericht(gesprekId)
    }

    suspend fun downloadBestand(pad: String): ByteArray =
        SupabaseManager.client.storage["chat-bestanden"].downloadAuthenticated(pad)

    @Serializable
    private data class GesprekInsert(val naam: String, val type: String)

    @Serializable
    private data class DeelnemerInsert(val gesprek_id: String, val profiel_id: String)

    suspend fun nieuwGesprek(naam: String, type: ChatType, deelnemerIds: List<String>): ChatGesprek {
        val gesprek = SupabaseManager.client.postgrest["chat_gesprekken"]
            .insert(GesprekInsert(naam, type.name.lowercase())) { select() }
            .decodeSingle<ChatGesprek>()

        SupabaseManager.client.postgrest["chat_deelnemers"]
            .insert(deelnemerIds.map { DeelnemerInsert(gesprek.id, it) })

        return gesprek
    }

    /**
     * Realtime: opent een kanaal dat nieuwe berichten in dit gesprek meldt.
     * Caller moet `channel.subscribe()` aanroepen, de flow verzamelen, en
     * `channel.unsubscribe()` bij het verlaten van het scherm.
     */
    fun openBerichtenKanaal(gesprekId: String): Pair<io.github.jan.supabase.realtime.RealtimeChannel, Flow<PostgresAction.Insert>> {
        val channel = SupabaseManager.client.channel("chat-$gesprekId")
        val flow = channel.postgresChangeFlow<PostgresAction.Insert>(schema = "public") {
            table = "chat_berichten"
            filter(FilterOperation("gesprek_id", FilterOperator.EQ, gesprekId))
        }
        return channel to flow
    }
}
