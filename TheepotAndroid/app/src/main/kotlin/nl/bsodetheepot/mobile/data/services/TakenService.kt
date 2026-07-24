package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.models.LijstType
import nl.bsodetheepot.mobile.data.models.Notitie
import nl.bsodetheepot.mobile.data.models.TodoLijst
import nl.bsodetheepot.mobile.data.models.TodoTaak

/**
 * Privacy per account wordt hier client-side afgedwongen door te filteren op
 * `eigenaar_id` — niet via RLS. Spiegelt exact dezelfde aanpak als de iOS-app.
 */
object TakenService {
    suspend fun lijsten(eigenaarId: String): List<TodoLijst> =
        SupabaseManager.client.postgrest["todo_lijsten"]
            .select {
                filter { eq("eigenaar_id", eigenaarId) }
                order("volgorde", Order.ASCENDING)
            }
            .decodeList()

    @Serializable
    private data class LijstInsert(val naam: String, val kleur: String, val eigenaar_id: String, val volgorde: Int, val type: String)

    suspend fun maakLijst(naam: String, kleur: String, type: LijstType, eigenaarId: String, volgorde: Int): TodoLijst =
        SupabaseManager.client.postgrest["todo_lijsten"]
            .insert(LijstInsert(naam, kleur, eigenaarId, volgorde, type.name.lowercase())) { select() }
            .decodeSingle()

    suspend fun verwijderLijst(id: String) {
        SupabaseManager.client.postgrest["todo_lijsten"].delete { filter { eq("id", id) } }
    }

    suspend fun taken(lijstIds: List<String>): List<TodoTaak> {
        if (lijstIds.isEmpty()) return emptyList()
        return SupabaseManager.client.postgrest["todo_taken"]
            .select { filter { isIn("lijst_id", lijstIds) } }
            .decodeList()
    }

    @Serializable
    private data class TaakInsert(val lijst_id: String, val titel: String, val volgorde: Int)

    suspend fun maakTaak(lijstId: String, titel: String, volgorde: Int): TodoTaak =
        SupabaseManager.client.postgrest["todo_taken"]
            .insert(TaakInsert(lijstId, titel, volgorde)) { select() }
            .decodeSingle()

    @Serializable
    private data class VoltooidUpdate(val voltooid: Boolean, val voltooid_op: String?)

    suspend fun toggleVoltooid(id: String, voltooid: Boolean) {
        SupabaseManager.client.postgrest["todo_taken"]
            .update(VoltooidUpdate(voltooid, if (voltooid) DateUtils.nowIso() else null)) { filter { eq("id", id) } }
    }

    @Serializable
    private data class TitelNotitieUpdate(val titel: String, val notitie: String?)

    suspend fun werkTitelNotitieBij(id: String, titel: String, notitie: String?) {
        SupabaseManager.client.postgrest["todo_taken"]
            .update(TitelNotitieUpdate(titel, notitie)) { filter { eq("id", id) } }
    }

    @Serializable
    private data class PrioriteitUpdate(val prioriteit: Int)

    suspend fun werkPrioriteitBij(id: String, prioriteit: Int) {
        SupabaseManager.client.postgrest["todo_taken"]
            .update(PrioriteitUpdate(prioriteit)) { filter { eq("id", id) } }
    }

    @Serializable
    private data class VervaldatumUpdate(val vervaldatum: String?)

    suspend fun werkVervaldatumBij(id: String, vervaldatum: String?) {
        SupabaseManager.client.postgrest["todo_taken"]
            .update(VervaldatumUpdate(vervaldatum)) { filter { eq("id", id) } }
    }

    @Serializable
    private data class LijstIdUpdate(val lijst_id: String)

    suspend fun werkLijstBij(id: String, lijstId: String) {
        SupabaseManager.client.postgrest["todo_taken"]
            .update(LijstIdUpdate(lijstId)) { filter { eq("id", id) } }
    }

    suspend fun verwijderTaak(id: String) {
        SupabaseManager.client.postgrest["todo_taken"].delete { filter { eq("id", id) } }
    }

    suspend fun notities(lijstIds: List<String>): List<Notitie> {
        if (lijstIds.isEmpty()) return emptyList()
        return SupabaseManager.client.postgrest["notities"]
            .select {
                filter { isIn("lijst_id", lijstIds) }
                order("volgorde", Order.ASCENDING)
            }
            .decodeList()
    }

    @Serializable
    private data class NotitieInsert(val lijst_id: String, val titel: String, val inhoud: String, val kleur: String, val volgorde: Int)

    suspend fun maakNotitie(lijstId: String, volgorde: Int): Notitie =
        SupabaseManager.client.postgrest["notities"]
            .insert(NotitieInsert(lijstId, "Nieuwe notitie", "", "#ffffff", volgorde)) { select() }
            .decodeSingle()

    @Serializable
    private data class NotitieUpdate(val titel: String, val inhoud: String, val kleur: String, val bijgewerkt_op: String)

    suspend fun slaNotitieOp(id: String, titel: String, inhoud: String, kleur: String) {
        val titelOk = titel.ifBlank { "Nieuwe notitie" }
        SupabaseManager.client.postgrest["notities"]
            .update(NotitieUpdate(titelOk, inhoud, kleur, DateUtils.nowIso())) { filter { eq("id", id) } }
    }

    suspend fun verwijderNotitie(id: String) {
        SupabaseManager.client.postgrest["notities"].delete { filter { eq("id", id) } }
    }
}
