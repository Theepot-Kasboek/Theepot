import Foundation

/// Tabel `dashboard_voorkeuren` — één rij per profiel, met de hele
/// widget-volgorde als array (reorder = één upsert i.p.v. N rij-updates).
struct DashboardVoorkeurenRow: Codable {
    let profielId: String
    var widgetVolgorde: [String]

    enum CodingKeys: String, CodingKey {
        case profielId = "profiel_id"
        case widgetVolgorde = "widget_volgorde"
    }
}

/// Identieke lowercase-strings op iOS en Android, zodat de opgeslagen
/// volgorde cross-platform leesbaar blijft.
enum DashboardWidgetId: String, CaseIterable, Codable, Identifiable {
    case mededelingen, kasboek, kilometers, maaltijdlijst, taken

    var id: String { rawValue }
}

/// Vaste standaardvolgorde. Bepaalt waar een nieuwe (of nog niet opgeslagen)
/// widget verschijnt: altijd achteraan, in deze volgorde.
let dashboardDefaultVolgorde: [DashboardWidgetId] = [.mededelingen, .kasboek, .kilometers, .maaltijdlijst, .taken]

/// Merget de opgeslagen volgorde met de default-volgorde: verwijdert ids die
/// niet meer bestaan of waarvoor de gebruiker geen toegang (meer) heeft, en
/// voegt ontbrekende (nieuwe) widgets achteraan toe. Puur client-side, geen
/// backend-logica nodig — zelfde uitkomst op elk platform door de gedeelde
/// default-array.
func samengesteldeDashboardVolgorde(opgeslagen: [String], toegestaan: Set<DashboardWidgetId>) -> [DashboardWidgetId] {
    var resultaat = opgeslagen.compactMap { DashboardWidgetId(rawValue: $0) }.filter { toegestaan.contains($0) }
    for id in dashboardDefaultVolgorde where toegestaan.contains(id) && !resultaat.contains(id) {
        resultaat.append(id)
    }
    return resultaat
}
