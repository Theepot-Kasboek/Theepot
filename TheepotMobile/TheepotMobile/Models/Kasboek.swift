import Foundation

enum KasboekType: String, Codable, CaseIterable {
    case inkomst, uitgave
}

/// Tabel `kasboek_entries`.
struct KasboekEntry: Codable, Identifiable {
    let id: String
    var periode: String
    var categorie: String?
    var omschrijving: String?
    var bedrag: Double
    var type: KasboekType
    var aangemaaktDoor: String?
    let aangemaaktOp: String
    var locatie: String
    var bonnetjePad: String?

    enum CodingKeys: String, CodingKey {
        case id, periode, categorie, omschrijving, bedrag, type
        case aangemaaktDoor = "aangemaakt_door"
        case aangemaaktOp = "aangemaakt_op"
        case locatie
        case bonnetjePad = "bonnetje_pad"
    }
}

enum KasboekCategorieen {
    static let standaard = ["Omzet", "Inkopen", "Personeelskosten", "Overige kosten", "Materialen", "Huisvestingskosten"]
}
