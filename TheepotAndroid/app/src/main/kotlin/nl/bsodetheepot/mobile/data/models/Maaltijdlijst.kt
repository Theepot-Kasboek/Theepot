package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.DayOfWeek
import java.time.LocalDate

@Serializable
enum class Dag {
    @SerialName("maandag") MAANDAG,
    @SerialName("dinsdag") DINSDAG,
    @SerialName("woensdag") WOENSDAG,
    @SerialName("donderdag") DONDERDAG,
    @SerialName("vrijdag") VRIJDAG;

    val label: String get() = name.lowercase().replaceFirstChar { it.uppercase() }

    companion object {
        /** Mapt een datum naar de bijbehorende weekdag, of `null` in het weekend. */
        fun vanWeekdag(datum: LocalDate): Dag? = when (datum.dayOfWeek) {
            DayOfWeek.MONDAY -> MAANDAG
            DayOfWeek.TUESDAY -> DINSDAG
            DayOfWeek.WEDNESDAY -> WOENSDAG
            DayOfWeek.THURSDAY -> DONDERDAG
            DayOfWeek.FRIDAY -> VRIJDAG
            else -> null
        }
    }
}

@Serializable
data class MaaltijdLocatie(val id: String, val naam: String, val actief: Boolean)

/** Tabel `maaltijd_standaard_kinderen`. */
@Serializable
data class MaaltijdStandaardKind(
    val id: String,
    @SerialName("locatie_id") val locatieId: String,
    val naam: String,
    val bijzonderheden: String? = null,
    val dag: Dag,
    val volgorde: Int,
)

/** Tabel `maaltijd_weken`. */
@Serializable
data class MaaltijdWeek(
    val id: String,
    @SerialName("locatie_id") val locatieId: String,
    val maand: String,
    @SerialName("week_start") val weekStart: String,
)

/** Tabel `maaltijd_registraties`. */
@Serializable
data class MaaltijdRegistratie(
    val id: String,
    @SerialName("week_id") val weekId: String,
    val dag: Dag,
    val naam: String,
    val bijzonderheden: String? = null,
    @SerialName("wat_gegeten") val watGegeten: String? = null,
    val aanwezig: Boolean = true,
    @SerialName("is_extra") val isExtra: Boolean = false,
    val volgorde: Int = 0,
)
