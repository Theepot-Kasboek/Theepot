import Foundation

/// Tabel `week_groepen`. Per locatie kun je eigen groepen aanmaken (bijv. "4+"
/// en "8+"); elke groep heeft haar eigen weekplanning. Een planning zonder
/// `groepId` is de algemene planning van de locatie.
struct WeekGroep: Codable, Identifiable, Hashable {
    let id: String
    let locatieNaam: String
    var naam: String
    var volgorde: Int

    enum CodingKeys: String, CodingKey {
        case id
        case locatieNaam = "locatie_naam"
        case naam, volgorde
    }
}

/// Keuze in de groepskiezer: "Algemeen" (geen groep) of een echte groep.
enum WeekGroepKeuze: Hashable {
    case algemeen
    case groep(WeekGroep)

    var id: String? {
        switch self {
        case .algemeen: return nil
        case .groep(let g): return g.id
        }
    }

    var label: String {
        switch self {
        case .algemeen: return "Algemeen"
        case .groep(let g): return g.naam
        }
    }
}

/// Tabel `week_planningen`. Sleutel is (locatie_naam, week_start, groep_id).
struct WeekPlanning: Codable, Identifiable {
    let id: String
    let locatieNaam: String
    let weekStart: String
    var groepId: String?
    var thema: String?

    enum CodingKeys: String, CodingKey {
        case id
        case locatieNaam = "locatie_naam"
        case weekStart = "week_start"
        case groepId = "groep_id"
        case thema
    }
}

enum WeekActiviteitType: String, Codable, CaseIterable {
    case knutsel
    case koolBak = "kook_bak"
    case groepsspel

    var label: String {
        switch self {
        case .knutsel: return "Knutsel"
        case .koolBak: return "Koken / Bakken"
        case .groepsspel: return "Groepsspel"
        }
    }

    var symbool: String {
        switch self {
        case .knutsel: return "scissors"
        case .koolBak: return "frying.pan"
        case .groepsspel: return "person.3.fill"
        }
    }
}

/// Tabel `week_activiteiten`.
struct WeekActiviteit: Codable, Identifiable {
    let id: String
    let planningId: String
    let type: WeekActiviteitType
    let naam: String
    let beschrijving: String?
    let materialen: [String]?
    let activiteitId: String?
    var afbeeldingUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case planningId = "planning_id"
        case type, naam, beschrijving, materialen
        case activiteitId = "activiteit_id"
        case afbeeldingUrl = "afbeelding_url"
    }
}
