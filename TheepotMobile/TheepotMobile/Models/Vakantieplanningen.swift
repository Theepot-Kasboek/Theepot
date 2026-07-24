import Foundation

/// Tabel `vakantie_planningen`.
struct VakantiePlanning: Codable, Identifiable, Hashable {
    let id: String
    let naam: String
    let vakantie: String
    var thema: String?
    let startDatum: String
    let eindDatum: String
    let gepubliceerd: Bool
    let startDatumNoord: String?
    let eindDatumNoord: String?

    enum CodingKeys: String, CodingKey {
        case id, naam, vakantie, thema
        case startDatum = "start_datum"
        case eindDatum = "eind_datum"
        case gepubliceerd
        case startDatumNoord = "start_datum_noord"
        case eindDatumNoord = "eind_datum_noord"
    }
}

/// Tabel `vakantie_weken`.
struct VakantieWeek: Codable, Identifiable, Hashable {
    let id: String
    let planningId: String
    let weekNummer: Int
    let naam: String

    enum CodingKeys: String, CodingKey {
        case id
        case planningId = "planning_id"
        case weekNummer = "week_nummer"
        case naam
    }
}

/// Tabel `vakantie_activiteiten`.
struct VakantieActiviteit: Codable, Identifiable, Hashable {
    let id: String
    let weekId: String
    let dag: Dag
    let volgorde: Int
    let categorie: String
    let naam: String
    let beschrijving: String?
    let benodigdheden: [String]?
    let activiteitId: String?
    var afbeeldingPad: String?

    enum CodingKeys: String, CodingKey {
        case id
        case weekId = "week_id"
        case dag, volgorde, categorie, naam, beschrijving, benodigdheden
        case activiteitId = "activiteit_id"
        case afbeeldingPad = "afbeelding_pad"
    }
}
