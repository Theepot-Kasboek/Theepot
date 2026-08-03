package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Tabel `push_apparaten`. Upsert gebeurt op `token` (niet `profiel_id + token`)
 * — een token identificeert een apparaat, niet een gebruiker. Zo blijft een
 * collega die op hetzelfde toestel inlogt niet de meldingen van de vorige
 * gebruiker krijgen.
 */
@Serializable
data class PushApparaat(
    @SerialName("profiel_id") val profielId: String,
    val token: String,
    val platform: String = "android",
    val omgeving: String = "productie",
    @SerialName("bundel_id") val bundelId: String? = null,
    @SerialName("app_versie") val appVersie: String? = null,
    @SerialName("apparaat_naam") val apparaatNaam: String? = null,
)
