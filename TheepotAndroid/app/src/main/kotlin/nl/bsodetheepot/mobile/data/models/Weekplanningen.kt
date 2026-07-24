package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class WeekActiviteitType {
    @SerialName("knutsel") KNUTSEL,
    @SerialName("kook_bak") KOOK_BAK,
    @SerialName("groepsspel") GROEPSSPEL,
}

/** Tabel `week_planningen`. */
@Serializable
data class WeekPlanning(
    val id: String,
    @SerialName("locatie_naam") val locatieNaam: String,
    @SerialName("week_start") val weekStart: String,
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
    @SerialName("afbeelding_url") val afbeeldingUrl: String? = null,
)
