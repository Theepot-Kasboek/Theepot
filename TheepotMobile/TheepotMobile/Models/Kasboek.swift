import Foundation

enum KasboekType: String, Codable, CaseIterable {
    case inkomst, uitgave
}

/// Tabel `kasboek_entries`.
struct KasboekEntry: Codable, Identifiable {
    let id: String
    var periode: String
    var categorie: String?
    var datum: String?
    var omschrijving: String?
    var bedrag: Double
    var type: KasboekType
    var aangemaaktDoor: String?
    let aangemaaktOp: String
    var locatie: String
    var bonnetjePad: String?

    enum CodingKeys: String, CodingKey {
        case id, periode, categorie, datum, omschrijving, bedrag, type
        case aangemaaktDoor = "aangemaakt_door"
        case aangemaaktOp = "aangemaakt_op"
        case locatie
        case bonnetjePad = "bonnetje_pad"
    }
}

/// Tabel `kasboek_periode_status`: houdt bij of het kasboek van een locatie/maand
/// al gepubliceerd is voor directie (die het pas dan te zien krijgt).
struct KasboekPeriodeStatus: Codable {
    var locatieNaam: String
    var periode: String
    var gepubliceerd: Bool

    enum CodingKeys: String, CodingKey {
        case locatieNaam = "locatie_naam"
        case periode, gepubliceerd
    }
}

enum KasboekCategorieen {
    static let standaard = ["Omzet", "Inkopen", "Personeelskosten", "Overige kosten", "Materialen", "Huisvestingskosten"]
}
