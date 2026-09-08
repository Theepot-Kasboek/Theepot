package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class KasboekType {
    @SerialName("inkomst") INKOMST,
    @SerialName("uitgave") UITGAVE,
}

/** Tabel `kasboek_entries`. */
@Serializable
data class KasboekEntry(
    val id: String,
    val periode: String,
    val categorie: String? = null,
    val datum: String? = null,
    val omschrijving: String? = null,
    val bedrag: Double,
    val type: KasboekType,
    @SerialName("aangemaakt_door") val aangemaaktDoor: String? = null,
    @SerialName("aangemaakt_op") val aangemaaktOp: String,
    val locatie: String,
    @SerialName("bonnetje_pad") val bonnetjePad: String? = null,
)

/** Tabel `kasboek_periode_status`: publicatiestatus per locatie/maand voor directie. */
@Serializable
data class KasboekPeriodeStatus(
    @SerialName("locatie_naam") val locatieNaam: String,
    val periode: String,
    val gepubliceerd: Boolean,
)

object KasboekCategorieen {
    val standaard = listOf("Omzet", "Inkopen", "Personeelskosten", "Overige kosten", "Materialen", "Huisvestingskosten")
}
