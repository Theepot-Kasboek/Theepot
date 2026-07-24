package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import nl.bsodetheepot.mobile.data.models.LocatieToegangRow
import nl.bsodetheepot.mobile.data.models.Locatie
import nl.bsodetheepot.mobile.data.models.LocatieService
import nl.bsodetheepot.mobile.data.models.Toegang
import nl.bsodetheepot.mobile.data.models.WeekActiviteit
import nl.bsodetheepot.mobile.data.models.WeekPlanning
import java.time.LocalDate

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

    suspend fun planning(locatieNaam: String, weekStart: LocalDate): Pair<WeekPlanning, List<WeekActiviteit>>? {
        val weekStartStr = DateUtils.toDateStr(DateUtils.maandaagVanWeek(weekStart))
        val planning = runCatching {
            SupabaseManager.client.postgrest["week_planningen"]
                .select {
                    filter {
                        eq("locatie_naam", locatieNaam)
                        eq("week_start", weekStartStr)
                    }
                }
                .decodeSingle<WeekPlanning>()
        }.getOrNull() ?: return null

        val activiteiten = SupabaseManager.client.postgrest["week_activiteiten"]
            .select { filter { eq("planning_id", planning.id) } }
            .decodeList<WeekActiviteit>()

        return planning to activiteiten
    }
}
