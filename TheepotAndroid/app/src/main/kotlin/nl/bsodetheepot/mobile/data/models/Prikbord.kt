package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.services.DateUtils
import java.time.Instant

@Serializable
enum class PrikbordPrioriteit {
    @SerialName("normaal") NORMAAL,
    @SerialName("belangrijk") BELANGRIJK,
    @SerialName("urgent") URGENT;

    val label: String
        get() = when (this) {
            NORMAAL -> "Normaal"
            BELANGRIJK -> "Belangrijk"
            URGENT -> "Urgent"
        }
}

@Serializable
data class NaamOnly(val naam: String)

/** Tabel `prikbord_berichten`. */
@Serializable
data class PrikbordBericht(
    val id: String,
    @SerialName("locatie_naam") val locatieNaam: String,
    val titel: String,
    val inhoud: String,
    val prioriteit: PrikbordPrioriteit,
    @SerialName("aangemaakt_door") val aangemaaktDoor: String? = null,
    @SerialName("aangemaakt_op") val aangemaaktOp: String,
    val verloopdatum: String? = null,
    @SerialName("gelezen_door") val gelezenDoor: List<String>? = null,
    val profielen: NaamOnly? = null,
) {
    val auteurNaam: String get() = profielen?.naam ?: "Onbekend"

    val isVerlopen: Boolean
        get() {
            val v = verloopdatum ?: return false
            val datum = runCatching { Instant.parse(v) }.getOrNull()
                ?: DateUtils.parseDateStr(v)?.atStartOfDay(DateUtils.amsterdam)?.toInstant()
                ?: return false
            return datum.isBefore(Instant.now())
        }
}
