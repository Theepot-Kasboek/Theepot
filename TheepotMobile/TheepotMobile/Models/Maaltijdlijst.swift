import Foundation

enum Dag: String, Codable, CaseIterable {
    case maandag, dinsdag, woensdag, donderdag, vrijdag

    var label: String { rawValue.capitalized }
}

/// Tabel `maaltijd_standaard_kinderen`.
struct StandaardKind: Codable, Identifiable {
    let id: String
    let locatieId: String
    let naam: String
    let bijzonderheden: String?
    let dag: Dag
    let volgorde: Int

    enum CodingKeys: String, CodingKey {
        case id
        case locatieId = "locatie_id"
        case naam, bijzonderheden, dag, volgorde
    }
}

/// Tabel `maaltijd_weken`.
struct MaaltijdWeek: Codable, Identifiable {
    let id: String
    let locatieId: String
    var maand: String
    let weekStart: String

    enum CodingKeys: String, CodingKey {
        case id
        case locatieId = "locatie_id"
        case maand
        case weekStart = "week_start"
    }
}

/// Tabel `maaltijd_registraties` — hier wordt "meegegeten" (aanwezig) getoggeld.
struct MaaltijdRegistratie: Codable, Identifiable {
    let id: String
    let weekId: String
    let dag: Dag
    var naam: String
    var bijzonderheden: String?
    var watGegeten: String?
    var aanwezig: Bool
    var isExtra: Bool
    var volgorde: Int

    enum CodingKeys: String, CodingKey {
        case id
        case weekId = "week_id"
        case dag, naam, bijzonderheden
        case watGegeten = "wat_gegeten"
        case aanwezig
        case isExtra = "is_extra"
        case volgorde
    }
}

/// Tabel `maaltijd_locaties`.
struct MaaltijdLocatie: Codable, Identifiable, Hashable {
    let id: String
    let naam: String
    let actief: Bool
}
