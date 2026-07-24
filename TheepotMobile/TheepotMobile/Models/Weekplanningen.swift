import Foundation

/// Tabel `week_planningen`. Sleutel is (locatie_naam, week_start).
struct WeekPlanning: Codable, Identifiable {
    let id: String
    let locatieNaam: String
    let weekStart: String
    var thema: String?

    enum CodingKeys: String, CodingKey {
        case id
        case locatieNaam = "locatie_naam"
        case weekStart = "week_start"
        case thema
    }
}

enum WeekActiviteitType: String, Codable {
    case knutsel
    case koolBak = "kook_bak"
    case groepsspel
}

/// Tabel `week_activiteiten`.
struct WeekActiviteit: Codable, Identifiable {
    let id: String
    let planningId: String
    let type: WeekActiviteitType
    let naam: String
    let beschrijving: String?
    let materialen: [String]?
    var afbeeldingUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case planningId = "planning_id"
        case type, naam, beschrijving, materialen
        case afbeeldingUrl = "afbeelding_url"
    }
}
