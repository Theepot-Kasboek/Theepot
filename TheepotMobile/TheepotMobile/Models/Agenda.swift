import Foundation

/// Spiegelt de `Kalender`/`Afspraak`-interfaces in app/agenda/page.tsx.
/// Tabel `agenda_kalenders`.
struct AgendaKalender: Codable, Identifiable, Hashable {
    let id: String
    var naam: String
    var type: String   // "persoonlijk" | "algemeen"
    var eigenaarId: String?
    var kleur: String
    var herinneringDagen: Int?

    enum CodingKeys: String, CodingKey {
        case id, naam, type
        case eigenaarId = "eigenaar_id"
        case kleur
        case herinneringDagen = "herinnering_dagen"
    }

    var isPersoonlijk: Bool { type == "persoonlijk" }
}

/// Tabel `agenda_afspraken`. `herinneringMinuten`: nil = gebruik
/// kalenderinstelling, 0 = geen herinnering, >0 = minuten vóór start_tijd.
struct AgendaAfspraak: Codable, Identifiable, Hashable {
    let id: String
    var kalenderId: String
    var titel: String
    var beschrijving: String?
    var startTijd: String
    var eindTijd: String
    var heleDag: Bool
    var aangemaaktDoor: String?
    var herinneringMinuten: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case kalenderId = "kalender_id"
        case titel, beschrijving
        case startTijd = "start_tijd"
        case eindTijd = "eind_tijd"
        case heleDag = "hele_dag"
        case aangemaaktDoor = "aangemaakt_door"
        case herinneringMinuten = "herinnering_minuten"
    }

    var startDatum: Date? { ISO8601DateFormatter.theepot.date(from: startTijd) }
    var eindDatum: Date? { ISO8601DateFormatter.theepot.date(from: eindTijd) }
}

enum AgendaHerinneringOptie: Int, CaseIterable, Identifiable {
    case kalenderDefault = -1
    case geen = 0
    case vijftienMinuten = 15
    case eenUur = 60
    case eenDag = 1440
    case tweeDagen = 2880
    case eenWeek = 10080

    var id: Int { rawValue }

    var label: String {
        switch self {
        case .kalenderDefault: return "Gebruik kalenderinstelling"
        case .geen: return "Geen herinnering"
        case .vijftienMinuten: return "15 minuten van tevoren"
        case .eenUur: return "1 uur van tevoren"
        case .eenDag: return "1 dag van tevoren"
        case .tweeDagen: return "2 dagen van tevoren"
        case .eenWeek: return "1 week van tevoren"
        }
    }

    /// `nil` = gebruik kalenderinstelling (past bij `herinnering_minuten = NULL`).
    var opgeslagenWaarde: Int? { self == .kalenderDefault ? nil : rawValue }

    static func van(_ waarde: Int?) -> AgendaHerinneringOptie {
        guard let waarde else { return .kalenderDefault }
        return AgendaHerinneringOptie(rawValue: waarde) ?? .kalenderDefault
    }
}
