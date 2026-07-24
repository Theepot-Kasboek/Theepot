package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Tabel `vakantie_planningen`. */
@Serializable
data class VakantiePlanning(
    val id: String,
    val naam: String,
    val vakantie: String,
    val thema: String? = null,
    @SerialName("start_datum") val startDatum: String,
    @SerialName("eind_datum") val eindDatum: String,
    val gepubliceerd: Boolean = false,
    @SerialName("start_datum_noord") val startDatumNoord: String? = null,
    @SerialName("eind_datum_noord") val eindDatumNoord: String? = null,
)

/** Tabel `vakantie_weken`. */
@Serializable
data class VakantieWeek(
    val id: String,
    @SerialName("planning_id") val planningId: String,
    @SerialName("week_nummer") val weekNummer: Int,
    val naam: String,
)

/** Tabel `vakantie_activiteiten`. */
@Serializable
data class VakantieActiviteit(
    val id: String,
    @SerialName("week_id") val weekId: String,
    val dag: Dag,
    val volgorde: Int = 0,
    val categorie: String? = null,
    val naam: String,
    val beschrijving: String? = null,
    val benodigdheden: List<String>? = null,
    @SerialName("activiteit_id") val activiteitId: String? = null,
    @SerialName("afbeelding_pad") val afbeeldingPad: String? = null,
)
