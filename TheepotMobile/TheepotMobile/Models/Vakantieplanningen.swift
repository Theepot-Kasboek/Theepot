import Foundation

/// Tabel `vakantie_planningen`.
struct VakantiePlanning: Codable, Identifiable, Hashable {
    let id: String
    let naam: String
    var vakantie: String
    var thema: String?
    let startDatum: String
    let eindDatum: String
    var gepubliceerd: Bool
    var startDatumNoord: String?
    var eindDatumNoord: String?

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

/// Tabel `activiteiten` — de activiteitenbibliotheek. Alleen gebruikt om een
/// bestaande activiteit in een vakantieplanning te kunnen zetten; geen eigen
/// scherm in de iOS-app.
struct BibliotheekActiviteit: Decodable, Identifiable, Hashable {
    let id: String
    let naam: String
    let categorie: String
    let thema: [String]
    let tijdsduur: Int?
    let materialen: [String]?
    let beschrijving: String?

    /// `thema` staat in de database soms als losse tekst, soms als array
    /// (zie app/activiteiten/page.tsx) — hier altijd genormaliseerd tot een lijst.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        naam = try c.decode(String.self, forKey: .naam)
        categorie = try c.decode(String.self, forKey: .categorie)
        tijdsduur = try c.decodeIfPresent(Int.self, forKey: .tijdsduur)
        materialen = try c.decodeIfPresent([String].self, forKey: .materialen)
        beschrijving = try c.decodeIfPresent(String.self, forKey: .beschrijving)

        if let lijst = try? c.decodeIfPresent([String].self, forKey: .thema) {
            thema = lijst
        } else if let tekst = try? c.decodeIfPresent(String.self, forKey: .thema) {
            thema = [tekst]
        } else {
            thema = []
        }
    }

    enum CodingKeys: String, CodingKey {
        case id, naam, categorie, thema, tijdsduur, materialen, beschrijving
    }
}
