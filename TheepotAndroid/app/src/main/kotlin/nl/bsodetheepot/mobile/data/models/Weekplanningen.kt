package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class WeekActiviteitType {
    @SerialName("knutsel") KNUTSEL,
    @SerialName("kook_bak") KOOK_BAK,
    @SerialName("groepsspel") GROEPSSPEL;

    val label: String
        get() = when (this) {
            KNUTSEL -> "Knutsel"
            KOOK_BAK -> "Koken / Bakken"
            GROEPSSPEL -> "Groepsspel"
        }

    /** Waarde zoals die in de kolom `type` staat. */
    val dbWaarde: String
        get() = when (this) {
            KNUTSEL -> "knutsel"
            KOOK_BAK -> "kook_bak"
            GROEPSSPEL -> "groepsspel"
        }
}

/**
 * Tabel `week_groepen`. Per locatie kun je eigen groepen aanmaken (bijv. "4+" en
 * "8+"); elke groep heeft haar eigen weekplanning. Een planning zonder `groepId`
 * is de algemene planning van de locatie.
 */
@Serializable
data class WeekGroep(
    val id: String,
    @SerialName("locatie_naam") val locatieNaam: String,
    val naam: String,
    val volgorde: Int = 0,
)

/** Tabel `week_planningen`. Sleutel is (locatie_naam, week_start, groep_id). */
@Serializable
data class WeekPlanning(
    val id: String,
    @SerialName("locatie_naam") val locatieNaam: String,
    @SerialName("week_start") val weekStart: String,
    @SerialName("groep_id") val groepId: String? = null,
    val thema: String? = null,
)

/** Tabel `week_activiteiten`. */
@Serializable
data class WeekActiviteit(
    val id: String,
    @SerialName("planning_id") val planningId: String,
    val type: WeekActiviteitType,
    val naam: String,
    val beschrijving: String? = null,
    val materialen: List<String>? = null,
    @SerialName("activiteit_id") val activiteitId: String? = null,
    @SerialName("afbeelding_url") val afbeeldingUrl: String? = null,
)

/**
 * Tabel `activiteiten` — de activiteitenbibliotheek. Alleen gebruikt om een
 * bestaande activiteit in een weekplanning te kunnen zetten; geen eigen scherm
 * in de Android-app.
 */
@Serializable
data class BibliotheekActiviteit(
    val id: String,
    val naam: String,
    val categorie: String? = null,
    val materialen: List<String>? = null,
    val beschrijving: String? = null,
)
