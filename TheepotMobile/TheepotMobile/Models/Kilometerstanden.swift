import Foundation

enum VoertuigType: String, Codable {
    case auto, bus
}

/// Tabel `km_voertuigen`.
struct KmVoertuig: Codable, Identifiable, Hashable {
    let id: String
    let kenteken: String
    let type: VoertuigType
    let omschrijving: String?
    let actief: Bool
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
