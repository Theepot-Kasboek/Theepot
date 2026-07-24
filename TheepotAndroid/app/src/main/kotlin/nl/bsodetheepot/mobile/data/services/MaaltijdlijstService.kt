package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.models.MaaltijdLocatie
import nl.bsodetheepot.mobile.data.models.MaaltijdRegistratie
import nl.bsodetheepot.mobile.data.models.MaaltijdStandaardKind
import java.time.LocalDate

object MaaltijdlijstService {
    suspend fun actieveLocaties(): List<MaaltijdLocatie> =
        SupabaseManager.client.postgrest["maaltijd_locaties"]
            .select {
                filter { eq("actief", true) }
                order("naam", Order.ASCENDING)
            }
            .decodeList()

    @Serializable
    private data class WeekRow(val id: String, val locatie_id: String, val maand: String, val week_start: String)

    @Serializable
    private data class WeekInsert(val locatie_id: String, val maand: String, val week_start: String)

    @Serializable
    private data class RegistratieInsert(
        val week_id: String,
        val dag: String,
        val naam: String,
        val bijzonderheden: String?,
        val aanwezig: Boolean,
        val is_extra: Boolean,
        val volgorde: Int,
    )

    /** Haalt de week op (en maakt 'm + standaardkinderen aan indien nodig), geeft het week-id terug. */
    private suspend fun ensureWeek(locatieId: String, weekStart: LocalDate): WeekRow {
        val weekStartStr = DateUtils.toDateStr(DateUtils.maandaagVanWeek(weekStart))

        val bestaandeWeek = runCatching {
            SupabaseManager.client.postgrest["maaltijd_weken"]
                .select {
                    filter {
                        eq("locatie_id", locatieId)
                        eq("week_start", weekStartStr)
                    }
                }
                .decodeSingle<WeekRow>()
        }.getOrNull()

        if (bestaandeWeek != null) return bestaandeWeek

        val standaard = runCatching {
            SupabaseManager.client.postgrest["maaltijd_standaard_kinderen"]
                .select { filter { eq("locatie_id", locatieId) } }
                .decodeList<MaaltijdStandaardKind>()
        }.getOrDefault(emptyList())

        val maandLabel = DateUtils.maandLabel(DateUtils.parseDateStr(weekStartStr) ?: weekStart)
        val nieuweWeek = SupabaseManager.client.postgrest["maaltijd_weken"]
            .insert(WeekInsert(locatieId, maandLabel, weekStartStr)) { select() }
            .decodeSingle<WeekRow>()

        if (standaard.isNotEmpty()) {
            SupabaseManager.client.postgrest["maaltijd_registraties"].insert(
                standaard.map {
                    RegistratieInsert(nieuweWeek.id, it.dag.name.lowercase(), it.naam, it.bijzonderheden, true, false, it.volgorde)
                },
            )
        }
        return nieuweWeek
    }

    suspend fun weekId(locatieId: String, weekStart: LocalDate): String = ensureWeek(locatieId, weekStart).id

    /** Haalt registraties op voor een week, en maakt de week (+ standaardkinderen) aan indien nodig. */
    suspend fun registraties(locatieId: String, weekStart: LocalDate): List<MaaltijdRegistratie> {
        val week = ensureWeek(locatieId, weekStart)
        return SupabaseManager.client.postgrest["maaltijd_registraties"]
            .select {
                filter { eq("week_id", week.id) }
                order("volgorde", Order.ASCENDING)
            }
            .decodeList()
    }

    @Serializable
    private data class AanwezigUpdate(val aanwezig: Boolean)

    suspend fun toggleAanwezig(registratieId: String, nieuweWaarde: Boolean) {
        SupabaseManager.client.postgrest["maaltijd_registraties"]
            .update(AanwezigUpdate(nieuweWaarde)) { filter { eq("id", registratieId) } }
    }

    suspend fun voegExtraKindToe(weekId: String, dag: nl.bsodetheepot.mobile.data.models.Dag, naam: String, bijzonderheden: String?, volgorde: Int): MaaltijdRegistratie =
        SupabaseManager.client.postgrest["maaltijd_registraties"]
            .insert(
                RegistratieInsert(
                    week_id = weekId,
                    dag = dag.name.lowercase(),
                    naam = naam,
                    bijzonderheden = bijzonderheden,
                    aanwezig = true,
                    is_extra = true,
                    volgorde = volgorde,
                ),
            ) { select() }
            .decodeSingle()

    suspend fun verwijderRegistratie(registratieId: String) {
        SupabaseManager.client.postgrest["maaltijd_registraties"]
            .delete { filter { eq("id", registratieId) } }
    }

    @Serializable
    private data class DetailsUpdate(val bijzonderheden: String?, val wat_gegeten: String?)

    suspend fun updateDetails(registratieId: String, bijzonderheden: String?, watGegeten: String?) {
        SupabaseManager.client.postgrest["maaltijd_registraties"]
            .update(DetailsUpdate(bijzonderheden?.takeIf { it.isNotBlank() }, watGegeten?.takeIf { it.isNotBlank() })) {
                filter { eq("id", registratieId) }
            }
    }

    suspend fun standaardKinderen(locatieId: String): List<MaaltijdStandaardKind> =
        SupabaseManager.client.postgrest["maaltijd_standaard_kinderen"]
            .select {
                filter { eq("locatie_id", locatieId) }
                order("dag", Order.ASCENDING)
                order("volgorde", Order.ASCENDING)
            }
            .decodeList()

    @Serializable
    private data class StandaardKindInsert(
        val locatie_id: String,
        val naam: String,
        val bijzonderheden: String?,
        val dag: String,
        val volgorde: Int,
    )

    suspend fun voegStandaardKindToe(locatieId: String, naam: String, bijzonderheden: String?, dag: nl.bsodetheepot.mobile.data.models.Dag, volgorde: Int): MaaltijdStandaardKind =
        SupabaseManager.client.postgrest["maaltijd_standaard_kinderen"]
            .insert(StandaardKindInsert(locatieId, naam, bijzonderheden?.takeIf { it.isNotBlank() }, dag.name.lowercase(), volgorde)) { select() }
            .decodeSingle()

    suspend fun verwijderStandaardKind(id: String) {
        SupabaseManager.client.postgrest["maaltijd_standaard_kinderen"]
            .delete { filter { eq("id", id) } }
    }
}
