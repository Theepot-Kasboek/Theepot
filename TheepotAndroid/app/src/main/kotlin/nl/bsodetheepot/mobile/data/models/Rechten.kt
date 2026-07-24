package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Spiegelt `Toegang`/`Rechten`/`LocatieToegang` uit components/AuthProvider.tsx. */
@Serializable
enum class Toegang {
    @SerialName("geen") GEEN,
    @SerialName("lezen") LEZEN,
    @SerialName("bewerken") BEWERKEN,
}

@Serializable
data class LocatieToegangRow(
    @SerialName("locatie_naam") val locatieNaam: String,
    @SerialName("locatie_type") val locatieType: String,
    val toegang: Toegang,
)

@Serializable
data class Rechten(
    @SerialName("pagina_kasboek") val paginaKasboek: Toegang = Toegang.GEEN,
    @SerialName("pagina_vakantieplanningen") val paginaVakantieplanningen: Toegang = Toegang.GEEN,
    @SerialName("pagina_chat") val paginaChat: Toegang = Toegang.GEEN,
    @SerialName("pagina_prikbord") val paginaPrikbord: Toegang = Toegang.GEEN,
    @SerialName("pagina_maaltijdlijst") val paginaMaaltijdlijst: Toegang = Toegang.GEEN,
    @SerialName("pagina_weekplanningen") val paginaWeekplanningen: Toegang = Toegang.GEEN,
    @SerialName("pagina_gesprekken") val paginaGesprekken: Toegang = Toegang.GEEN,
    @SerialName("prikbord_toevoegen") val prikbordToevoegen: Boolean = false,
    @SerialName("chat_starten") val chatStarten: Boolean = false,
) {
    companion object {
        val SUPERADMIN = Rechten(
            paginaKasboek = Toegang.BEWERKEN,
            paginaVakantieplanningen = Toegang.BEWERKEN,
            paginaChat = Toegang.BEWERKEN,
            paginaPrikbord = Toegang.BEWERKEN,
            paginaMaaltijdlijst = Toegang.BEWERKEN,
            paginaWeekplanningen = Toegang.BEWERKEN,
            paginaGesprekken = Toegang.BEWERKEN,
            prikbordToevoegen = true,
            chatStarten = true,
        )
        val GEEN = Rechten()
    }
}
