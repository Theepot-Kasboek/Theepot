package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.storage.storage
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.models.BibliotheekActiviteit
import nl.bsodetheepot.mobile.data.models.LocatieToegangRow
import nl.bsodetheepot.mobile.data.models.Locatie
import nl.bsodetheepot.mobile.data.models.LocatieService
import nl.bsodetheepot.mobile.data.models.Toegang
import nl.bsodetheepot.mobile.data.models.WeekActiviteit
import nl.bsodetheepot.mobile.data.models.WeekActiviteitType
import nl.bsodetheepot.mobile.data.models.WeekGroep
import nl.bsodetheepot.mobile.data.models.WeekPlanning
import java.time.LocalDate
import java.util.UUID

/**
 * Spiegelt app/weekplanningen/page.tsx. Lezen mag iedereen met toegang tot de
 * pagina; de schrijffuncties worden door het scherm alleen aangeboden aan
 * gebruikers met `pagina_weekplanningen == BEWERKEN`. Groepsbeheer zit
 * bovendien achter het recht `weekplanning_groepen_beheren`.
 */
object WeekplanningenService {
    suspend fun toegankelijkeLocaties(magAllesZien: Boolean, locatieToegang: List<LocatieToegangRow>): List<Locatie> {
        val alle = LocatieService.actieveLocaties()
        if (magAllesZien) return alle
        val toegestaneNamen = locatieToegang
            .filter { it.locatieType == "weekplanningen" && it.toegang != Toegang.GEEN }
            .map { it.locatieNaam }
            .toSet()
        return alle.filter { it.naam in toegestaneNamen }
    }

    // ─── Groepen ────────────────────────────────────────────────────────────

    suspend fun groepen(locatieNaam: String): List<WeekGroep> =
        SupabaseManager.client.postgrest["week_groepen"]
            .select {
                filter { eq("locatie_naam", locatieNaam) }
                order("volgorde", Order.ASCENDING)
                order("naam", Order.ASCENDING)
            }
            .decodeList()

    @Serializable
    private data class GroepInsert(
        val locatie_naam: String,
        val naam: String,
        val volgorde: Int,
        val aangemaakt_door: String?,
    )

    suspend fun maakGroep(locatieNaam: String, naam: String, volgorde: Int, aangemaaktDoor: String?): WeekGroep =
        SupabaseManager.client.postgrest["week_groepen"]
            .insert(GroepInsert(locatieNaam, naam, volgorde, aangemaaktDoor)) { select() }
            .decodeSingle()

    @Serializable
    private data class GroepUpdate(val naam: String)

    suspend fun hernoemGroep(id: String, naam: String) {
        SupabaseManager.client.postgrest["week_groepen"]
            .update(GroepUpdate(naam)) { filter { eq("id", id) } }
    }

    /** Verwijdert ook alle planningen van die groep (foreign key met cascade). */
    suspend fun verwijderGroep(id: String) {
        SupabaseManager.client.postgrest["week_groepen"]
            .delete { filter { eq("id", id) } }
    }

    // ─── Planning lezen ─────────────────────────────────────────────────────

    suspend fun planning(locatieNaam: String, weekStart: LocalDate, groepId: String?): Pair<WeekPlanning, List<WeekActiviteit>>? {
        val weekStartStr = DateUtils.toDateStr(DateUtils.maandaagVanWeek(weekStart))
        val planning = runCatching {
            SupabaseManager.client.postgrest["week_planningen"]
                .select {
                    filter {
                        eq("locatie_naam", locatieNaam)
                        eq("week_start", weekStartStr)
                        if (groepId != null) eq("groep_id", groepId) else exact("groep_id", null)
                    }
                }
                .decodeSingle<WeekPlanning>()
        }.getOrNull() ?: return null

        val activiteiten = SupabaseManager.client.postgrest["week_activiteiten"]
            .select { filter { eq("planning_id", planning.id) } }
            .decodeList<WeekActiviteit>()

        return planning to activiteiten
    }

    // ─── Planning schrijven ─────────────────────────────────────────────────

    @Serializable
    private data class PlanningInsert(
        val locatie_naam: String,
        val week_start: String,
        val groep_id: String?,
        val thema: String?,
        val aangemaakt_door: String?,
    )

    /**
     * Maakt de planning aan als die er nog niet is — spiegelt `zorgVoorPlanning`
     * in de webapp, zodat een lege week pas een rij krijgt zodra je iets invult.
     */
    suspend fun zorgVoorPlanning(
        bestaand: WeekPlanning?,
        locatieNaam: String,
        weekStart: LocalDate,
        groepId: String?,
        thema: String,
        aangemaaktDoor: String?,
    ): WeekPlanning {
        if (bestaand != null) return bestaand
        return SupabaseManager.client.postgrest["week_planningen"]
            .insert(
                PlanningInsert(
                    locatie_naam = locatieNaam,
                    week_start = DateUtils.toDateStr(DateUtils.maandaagVanWeek(weekStart)),
                    groep_id = groepId,
                    thema = thema.ifBlank { null },
                    aangemaakt_door = aangemaaktDoor,
                ),
            ) { select() }
            .decodeSingle()
    }

    @Serializable
    private data class ThemaUpdate(val thema: String?)

    suspend fun werkBijThema(planningId: String, thema: String) {
        SupabaseManager.client.postgrest["week_planningen"]
            .update(ThemaUpdate(thema.ifBlank { null })) { filter { eq("id", planningId) } }
    }

    // ─── Activiteiten ───────────────────────────────────────────────────────

    /**
     * Koppeling met de activiteitenbibliotheek (tabel `activiteiten`), net als bij
     * de vakantieplanningen: alleen om een bestaande activiteit over te nemen,
     * geen apart scherm.
     */
    suspend fun bibliotheekActiviteiten(): List<BibliotheekActiviteit> =
        SupabaseManager.client.postgrest["activiteiten"]
            .select(Columns.list("id", "naam", "categorie", "materialen", "beschrijving")) {
                order("naam", Order.ASCENDING)
            }
            .decodeList()

    @Serializable
    private data class ActiviteitInsert(
        val planning_id: String,
        val type: String,
        val naam: String,
        val beschrijving: String?,
        val materialen: List<String>,
        val activiteit_id: String?,
        val afbeelding_url: String?,
    )

    @Serializable
    private data class ActiviteitUpdate(
        val type: String,
        val naam: String,
        val beschrijving: String?,
        val materialen: List<String>,
        val activiteit_id: String?,
        val afbeelding_url: String?,
    )

    /**
     * Eén activiteit per type per planning, precies zoals de webapp: bestaat het
     * type al, dan wordt die rij bijgewerkt.
     */
    suspend fun slaActiviteitOp(
        planningId: String,
        bestaand: WeekActiviteit?,
        type: WeekActiviteitType,
        naam: String,
        beschrijving: String?,
        materialen: List<String>,
        activiteitId: String?,
        afbeelding: ByteArray?,
    ) {
        var afbeeldingUrl = bestaand?.afbeeldingUrl
        if (afbeelding != null) afbeeldingUrl = uploadAfbeelding(afbeelding)

        if (bestaand != null) {
            SupabaseManager.client.postgrest["week_activiteiten"].update(
                ActiviteitUpdate(type.dbWaarde, naam, beschrijving, materialen, activiteitId, afbeeldingUrl),
            ) {
                filter { eq("id", bestaand.id) }
            }
        } else {
            SupabaseManager.client.postgrest["week_activiteiten"].insert(
                ActiviteitInsert(planningId, type.dbWaarde, naam, beschrijving, materialen, activiteitId, afbeeldingUrl),
            )
        }
    }

    suspend fun verwijderActiviteit(id: String) {
        SupabaseManager.client.postgrest["week_activiteiten"]
            .delete { filter { eq("id", id) } }
    }

    /**
     * Zelfde als de webapp: de foto gaat naar de gedeelde bucket en de publieke
     * URL komt in `afbeelding_url` van de weekactiviteit te staan. De foto van
     * een bibliotheekactiviteit blijft ongemoeid.
     */
    private suspend fun uploadAfbeelding(data: ByteArray): String {
        val pad = "week-activiteit-${UUID.randomUUID()}.jpg"
        SupabaseManager.client.storage["activiteit-afbeeldingen"].upload(pad, data) { upsert = true }
        return SupabaseManager.client.storage["activiteit-afbeeldingen"].publicUrl(pad)
    }
}
