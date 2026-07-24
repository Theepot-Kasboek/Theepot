import Foundation

enum PrikbordPrioriteit: String, Codable, CaseIterable {
    case normaal, belangrijk, urgent

    var label: String {
        switch self {
        case .normaal: return "Normaal"
        case .belangrijk: return "Belangrijk"
        case .urgent: return "Urgent"
        }
    }
}

/// Tabel `prikbord_berichten`.
struct PrikbordBericht: Codable, Identifiable {
    let id: String
    var locatieNaam: String
    var titel: String
    var inhoud: String
    var prioriteit: PrikbordPrioriteit
    var aangemaaktDoor: String?
    let aangemaaktOp: String
    var verloopdatum: String?
    var gelezenDoor: [String]?
    let profielen: NaamOnly?

    enum CodingKeys: String, CodingKey {
        case id
        case locatieNaam = "locatie_naam"
        case titel, inhoud, prioriteit
        case aangemaaktDoor = "aangemaakt_door"
        case aangemaaktOp = "aangemaakt_op"
        case verloopdatum
        case gelezenDoor = "gelezen_door"
        case profielen
    }

    var auteurNaam: String { profielen?.naam ?? "Onbekend" }

    var isVerlopen: Bool {
        guard let verloopdatum, let datum = ISO8601DateFormatter.theepot.date(from: verloopdatum) ?? DateFormatter.theepotDate.date(from: verloopdatum) else {
            return false
        }
        return datum < Date()
    }
}

struct NaamOnly: Codable {
    let naam: String
}

extension ISO8601DateFormatter {
    static let theepot = ISO8601DateFormatter()
}

extension DateFormatter {
    static let theepotDate: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "Europe/Amsterdam")
        return f
    }()
}
