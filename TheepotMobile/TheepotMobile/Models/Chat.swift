import Foundation

enum ChatType: String, Codable {
    case direct, groep
}

enum BerichtType: String, Codable {
    case tekst, bestand
}

/// Tabel `chat_gesprekken`.
struct ChatGesprek: Codable, Identifiable, Hashable {
    let id: String
    var naam: String
    var type: ChatType
    var aangemaaktDoor: String?
    let aangemaaktOp: String
    var laatsteBerichtOp: String?

    enum CodingKeys: String, CodingKey {
        case id, naam, type
        case aangemaaktDoor = "aangemaakt_door"
        case aangemaaktOp = "aangemaakt_op"
        case laatsteBerichtOp = "laatste_bericht_op"
    }
}

/// Tabel `chat_deelnemers`.
struct ChatDeelnemer: Codable {
    let gesprekId: String
    let profielId: String
    let profiel: Profiel?

    enum CodingKeys: String, CodingKey {
        case gesprekId = "gesprek_id"
        case profielId = "profiel_id"
        case profiel
    }
}

/// Tabel `chat_berichten`.
struct ChatBericht: Codable, Identifiable, Hashable {
    let id: String
    let gesprekId: String
    var afzenderId: String?
    var inhoud: String
    let verstuurdOp: String
    var gelezenDoor: [String]?
    var berichtType: BerichtType?
    var bestandPad: String?
    var bestandNaam: String?
    var bestandType: String?

    enum CodingKeys: String, CodingKey {
        case id
        case gesprekId = "gesprek_id"
        case afzenderId = "afzender_id"
        case inhoud
        case verstuurdOp = "verstuurd_op"
        case gelezenDoor = "gelezen_door"
        case berichtType = "bericht_type"
        case bestandPad = "bestand_pad"
        case bestandNaam = "bestand_naam"
        case bestandType = "bestand_type"
    }

    var isBestand: Bool { berichtType == .bestand }
}
