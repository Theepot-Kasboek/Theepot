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
    val categorie: String,
    val omschrijving: String? = null,
    val bedrag: Double,
    val type: KasboekType,
    @SerialName("aangemaakt_door") val aangemaaktDoor: String? = null,
    @SerialName("aangemaakt_op") val aangemaaktOp: String,
    val locatie: String,
    @SerialName("bonnetje_pad") val bonnetjePad: String? = null,
)

object KasboekCategorieen {
    val standaard = listOf("Omzet", "Inkopen", "Personeelskosten", "Overige kosten", "Materialen", "Huisvestingskosten")
}
