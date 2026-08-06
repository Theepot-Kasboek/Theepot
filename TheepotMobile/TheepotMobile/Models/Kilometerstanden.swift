import Foundation

enum VoertuigType: String, Codable {
    case auto, bus
}

enum RegelmaatEenheid: String, Codable {
    case week, maand, kwartaal
}

/// Tabel `km_voertuigen`.
struct KmVoertuig: Codable, Identifiable, Hashable {
    let id: String
    let kenteken: String
    let type: VoertuigType
    let omschrijving: String?
    let actief: Bool
    let regelmaatAantal: Int
    let regelmaatEenheid: RegelmaatEenheid

    enum CodingKeys: String, CodingKey {
        case id, kenteken, type, omschrijving, actief
        case regelmaatAantal = "regelmaat_aantal"
        case regelmaatEenheid = "regelmaat_eenheid"
    }
}

/// Tabel `km_registraties`.
struct KmRegistratie: Codable, Identifiable {
    let id: String
    let voertuigId: String
    var kilometerstand: Int
    var datum: String
    var notitie: String?
    let ingevoerdDoor: String?

    enum CodingKeys: String, CodingKey {
        case id
        case voertuigId = "voertuig_id"
        case kilometerstand, datum, notitie
        case ingevoerdDoor = "ingevoerd_door"
    }
}
