package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class VoertuigType {
    @SerialName("auto") AUTO,
    @SerialName("bus") BUS,
}

@Serializable
enum class RegelmaatEenheid {
    @SerialName("week") WEEK,
    @SerialName("maand") MAAND,
    @SerialName("kwartaal") KWARTAAL,
}

/** Tabel `km_voertuigen`. */
@Serializable
data class KmVoertuig(
    val id: String,
    val kenteken: String,
    val type: VoertuigType,
    val omschrijving: String? = null,
    val actief: Boolean = true,
    @SerialName("regelmaat_aantal") val regelmaatAantal: Int = 1,
    @SerialName("regelmaat_eenheid") val regelmaatEenheid: RegelmaatEenheid = RegelmaatEenheid.MAAND,
) {
    val label: String get() = "$kenteken (${if (type == VoertuigType.BUS) "Bus" else "Auto"})"
}

/** Tabel `km_registraties`. */
@Serializable
data class KmRegistratie(
    val id: String,
    @SerialName("voertuig_id") val voertuigId: String,
    val kilometerstand: Int,
    val datum: String,
    val notitie: String? = null,
    @SerialName("ingevoerd_door") val ingevoerdDoor: String? = null,
)
