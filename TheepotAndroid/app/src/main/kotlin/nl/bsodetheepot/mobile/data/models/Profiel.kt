package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Spiegelt de `profielen`-tabel en het `Rol`-type uit lib/supabase.ts. */
@Serializable
enum class Rol {
    @SerialName("superadmin") SUPERADMIN,
    @SerialName("directie") DIRECTIE,
    @SerialName("leidinggevende") LEIDINGGEVENDE,
    @SerialName("locatie") LOCATIE;

    val label: String
        get() = when (this) {
            SUPERADMIN -> "Superadmin"
            DIRECTIE -> "Directie"
            LEIDINGGEVENDE -> "Leidinggevende"
            LOCATIE -> "Locatie"
        }
}

@Serializable
data class Profiel(
    val id: String,
    val email: String,
    val naam: String,
    val rol: Rol,
    val actief: Boolean,
    @SerialName("aangemaakt_op") val aangemaaktOp: String,
)
