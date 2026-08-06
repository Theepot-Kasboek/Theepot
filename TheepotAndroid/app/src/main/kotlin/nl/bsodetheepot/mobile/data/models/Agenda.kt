package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.Instant

/** Spiegelt de `Kalender`/`Afspraak`-interfaces in app/agenda/page.tsx. Tabel `agenda_kalenders`. */
@Serializable
data class AgendaKalender(
    val id: String,
    val naam: String,
    val type: String, // "persoonlijk" | "algemeen"
    @SerialName("eigenaar_id") val eigenaarId: String? = null,
    val kleur: String,
    @SerialName("herinnering_dagen") val herinneringDagen: Int? = null,
) {
    val isPersoonlijk: Boolean get() = type == "persoonlijk"
}

/**
 * Tabel `agenda_afspraken`. `herinneringMinuten`: null = gebruik
 * kalenderinstelling, 0 = geen herinnering, >0 = minuten vóór start_tijd.
 */
@Serializable
data class AgendaAfspraak(
    val id: String,
    @SerialName("kalender_id") val kalenderId: String,
    val titel: String,
    val beschrijving: String? = null,
    @SerialName("start_tijd") val startTijd: String,
    @SerialName("eind_tijd") val eindTijd: String,
    @SerialName("hele_dag") val heleDag: Boolean,
    @SerialName("aangemaakt_door") val aangemaaktDoor: String? = null,
    @SerialName("herinnering_minuten") val herinneringMinuten: Int? = null,
) {
    val startInstant: Instant? get() = runCatching { Instant.parse(startTijd) }.getOrNull()
    val eindInstant: Instant? get() = runCatching { Instant.parse(eindTijd) }.getOrNull()
}

enum class AgendaHerinneringOptie(val minuten: Int?, val label: String) {
    KALENDER_DEFAULT(null, "Gebruik kalenderinstelling"),
    GEEN(0, "Geen herinnering"),
    VIJFTIEN_MINUTEN(15, "15 minuten van tevoren"),
    EEN_UUR(60, "1 uur van tevoren"),
    EEN_DAG(1440, "1 dag van tevoren"),
    TWEE_DAGEN(2880, "2 dagen van tevoren"),
    EEN_WEEK(10080, "1 week van tevoren");

    companion object {
        fun van(waarde: Int?): AgendaHerinneringOptie =
            entries.firstOrNull { it.minuten == waarde } ?: KALENDER_DEFAULT
    }
}
