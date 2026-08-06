package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Tabel `dashboard_voorkeuren` — één rij per profiel, met de hele
 * widget-volgorde als array (reorder = één upsert i.p.v. N rij-updates).
 */
@Serializable
data class DashboardVoorkeurenRow(
    @SerialName("profiel_id") val profielId: String,
    @SerialName("widget_volgorde") val widgetVolgorde: List<String> = emptyList(),
)

/** Identieke lowercase-strings op iOS en Android, zodat de opgeslagen volgorde cross-platform leesbaar blijft. */
@Serializable
enum class DashboardWidgetId {
    @SerialName("mededelingen") MEDEDELINGEN,
    @SerialName("kasboek") KASBOEK,
    @SerialName("kilometers") KILOMETERS,
    @SerialName("maaltijdlijst") MAALTIJDLIJST,
    @SerialName("taken") TAKEN;

    val id: String
        get() = when (this) {
            MEDEDELINGEN -> "mededelingen"
            KASBOEK -> "kasboek"
            KILOMETERS -> "kilometers"
            MAALTIJDLIJST -> "maaltijdlijst"
            TAKEN -> "taken"
        }

    companion object {
        fun vanId(id: String): DashboardWidgetId? = entries.firstOrNull { it.id == id }
    }
}

/** Vaste standaardvolgorde. Bepaalt waar een nieuwe (of nog niet opgeslagen) widget verschijnt: altijd achteraan. */
val DASHBOARD_DEFAULT_VOLGORDE = listOf(
    DashboardWidgetId.MEDEDELINGEN,
    DashboardWidgetId.KASBOEK,
    DashboardWidgetId.KILOMETERS,
    DashboardWidgetId.MAALTIJDLIJST,
    DashboardWidgetId.TAKEN,
)

/**
 * Merget de opgeslagen volgorde met de default-volgorde: verwijdert ids die
 * niet meer bestaan of waarvoor de gebruiker geen toegang (meer) heeft, en
 * voegt ontbrekende (nieuwe) widgets achteraan toe. Puur client-side, geen
 * backend-logica nodig — zelfde uitkomst op elk platform door de gedeelde
 * default-array.
 */
fun samengesteldeDashboardVolgorde(opgeslagen: List<String>, toegestaan: Set<DashboardWidgetId>): List<DashboardWidgetId> {
    val resultaat = opgeslagen.mapNotNull { DashboardWidgetId.vanId(it) }.filter { it in toegestaan }.toMutableList()
    for (id in DASHBOARD_DEFAULT_VOLGORDE) {
        if (id in toegestaan && id !in resultaat) resultaat.add(id)
    }
    return resultaat
}
