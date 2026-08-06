package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.models.KmRegistratie
import nl.bsodetheepot.mobile.data.models.KmVoertuig
import nl.bsodetheepot.mobile.data.models.RegelmaatEenheid
import java.time.LocalDate
import java.time.ZoneId

class NietHogerDanLaatsteFout(laatste: Int) : Exception("De nieuwe stand moet hoger zijn dan de laatste bekende stand ($laatste).")

/** Voor de dashboard-widget: het voertuig met de eerstvolgende deadline. */
data class KilometersDashboardStatus(
    val voertuig: KmVoertuig,
    val dagenTotDeadline: Int?,
    val kleurHex: String,
)

object KilometerstandenService {
    suspend fun voertuigen(): List<KmVoertuig> =
        SupabaseManager.client.postgrest["km_voertuigen"]
            .select {
                filter { eq("actief", true) }
                order("aangemaakt_op", Order.ASCENDING)
            }
            .decodeList()

    /**
     * Over alle actieve voertuigen (geen locatie-scoping — die bestaat nergens
     * voor kilometerstanden, ook niet in de webapp). Eén query op alle
     * registraties i.p.v. N losse `laatsteStand`-calls.
     */
    suspend fun samenvatting(): KilometersDashboardStatus? {
        val voertuigen = voertuigen()
        if (voertuigen.isEmpty()) return null

        @Serializable
        data class Rij(val voertuig_id: String, val datum: String)

        val regs = SupabaseManager.client.postgrest["km_registraties"]
            .select {
                filter { isIn("voertuig_id", voertuigen.map { it.id }) }
                order("datum", Order.DESCENDING)
            }
            .decodeList<Rij>()

        val laatsteDatumPerVoertuig = mutableMapOf<String, String>()
        for (rij in regs) {
            laatsteDatumPerVoertuig.putIfAbsent(rij.voertuig_id, rij.datum)
        }

        val statussen = voertuigen.map { voertuig ->
            val volgende = laatsteDatumPerVoertuig[voertuig.id]?.let { volgendeDeadline(it, voertuig) }
            KilometersDashboardStatus(voertuig, volgende?.let { dagenTot(it) }, kleur(volgende))
        }
        // Voertuig zonder enige registratie heeft geen deadline — negeer die voor
        // "eerstvolgende", tenzij geen enkel voertuig een deadline heeft.
        return statussen.filter { it.dagenTotDeadline != null }.minByOrNull { it.dagenTotDeadline!! } ?: statussen.firstOrNull()
    }

    private val amsterdam = ZoneId.of("Europe/Amsterdam")

    /** Identiek aan volgendeDatum() in app/kilometerstanden/page.tsx. */
    private fun volgendeDeadline(laatsteDatum: String, voertuig: KmVoertuig): LocalDate? {
        val laatste = runCatching { LocalDate.parse(laatsteDatum) }.getOrNull() ?: return null
        return when (voertuig.regelmaatEenheid) {
            RegelmaatEenheid.WEEK -> laatste.plusWeeks(voertuig.regelmaatAantal.toLong())
            RegelmaatEenheid.KWARTAAL -> laatste.plusMonths(3) // zelfde als webapp: altijd 3 maanden, regelmaat_aantal genegeerd
            RegelmaatEenheid.MAAND -> laatste.plusMonths(voertuig.regelmaatAantal.toLong())
        }
    }

    private fun dagenTot(datum: LocalDate): Int =
        java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(amsterdam), datum).toInt()

    /** Identiek aan statusKleur() in app/kilometerstanden/page.tsx. */
    private fun kleur(datum: LocalDate?): String {
        if (datum == null) return "#888"
        val dagen = dagenTot(datum)
        return when {
            dagen < 0 -> "#EF4444"
            dagen < 14 -> "#F59E0B"
            else -> "#8CC63F"
        }
    }

    suspend fun laatsteStand(voertuigId: String): Int? = runCatching {
        SupabaseManager.client.postgrest["km_registraties"]
            .select {
                filter { eq("voertuig_id", voertuigId) }
                order("datum", Order.DESCENDING)
                limit(1)
            }
            .decodeSingle<KmRegistratie>()
            .kilometerstand
    }.getOrNull()

    @Serializable
    private data class Insert(val voertuig_id: String, val kilometerstand: Int, val datum: String, val notitie: String?, val ingevoerd_door: String?)

    suspend fun voegToe(voertuigId: String, kilometerstand: Int, datum: String, notitie: String?, ingevoerdDoor: String?) {
        val laatste = laatsteStand(voertuigId)
        if (laatste != null && kilometerstand <= laatste) {
            throw NietHogerDanLaatsteFout(laatste)
        }
        SupabaseManager.client.postgrest["km_registraties"]
            .insert(Insert(voertuigId, kilometerstand, datum, notitie, ingevoerdDoor))
    }
}
