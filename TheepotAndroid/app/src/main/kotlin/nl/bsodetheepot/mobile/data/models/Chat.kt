package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class ChatType {
    @SerialName("direct") DIRECT,
    @SerialName("groep") GROEP,
}

@Serializable
enum class BerichtType {
    @SerialName("tekst") TEKST,
    @SerialName("bestand") BESTAND,
}

/** Tabel `chat_gesprekken`. */
@Serializable
data class ChatGesprek(
    val id: String,
    val naam: String,
    val type: ChatType,
    @SerialName("aangemaakt_door") val aangemaaktDoor: String? = null,
    @SerialName("aangemaakt_op") val aangemaaktOp: String,
    @SerialName("laatste_bericht_op") val laatsteBerichtOp: String? = null,
)

/** Tabel `chat_deelnemers`. */
@Serializable
data class ChatDeelnemer(
    @SerialName("gesprek_id") val gesprekId: String,
    @SerialName("profiel_id") val profielId: String,
    val profiel: Profiel? = null,
)

/** Tabel `chat_berichten`. */
@Serializable
data class ChatBericht(
    val id: String,
    @SerialName("gesprek_id") val gesprekId: String,
    @SerialName("afzender_id") val afzenderId: String? = null,
    val inhoud: String,
    @SerialName("verstuurd_op") val verstuurdOp: String,
    @SerialName("gelezen_door") val gelezenDoor: List<String>? = null,
    @SerialName("bericht_type") val berichtType: BerichtType? = null,
    @SerialName("bestand_pad") val bestandPad: String? = null,
    @SerialName("bestand_naam") val bestandNaam: String? = null,
    @SerialName("bestand_type") val bestandType: String? = null,
) {
    val isBestand: Boolean get() = berichtType == BerichtType.BESTAND
}
