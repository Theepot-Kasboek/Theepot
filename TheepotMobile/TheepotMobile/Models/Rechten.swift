import Foundation

/// Spiegelt `Toegang`/`Rechten`/`LocatieToegang` uit components/AuthProvider.tsx.
enum Toegang: String, Codable {
    case geen, lezen, bewerken
}

struct LocatieToegangRow: Codable {
    let locatieNaam: String
    let locatieType: String
    let toegang: Toegang

    enum CodingKeys: String, CodingKey {
        case locatieNaam = "locatie_naam"
        case locatieType = "locatie_type"
        case toegang
    }
}

struct Rechten: Codable {
    var paginaKasboek: Toegang = .geen
    var paginaVakantieplanningen: Toegang = .geen
    var paginaChat: Toegang = .geen
    var paginaPrikbord: Toegang = .geen
    var paginaMaaltijdlijst: Toegang = .geen
    var paginaWeekplanningen: Toegang = .geen
    var paginaGesprekken: Toegang = .geen
    var paginaAgenda: Toegang = .geen
    var prikbordToevoegen: Bool = false
    var chatStarten: Bool = false
    var agendaAlgemeenBewerken: Bool = false
    var agendaPersoneelInzien: Bool = false
    var weekplanningGroepenBeheren: Bool = false

    enum CodingKeys: String, CodingKey {
        case paginaKasboek = "pagina_kasboek"
        case paginaVakantieplanningen = "pagina_vakantieplanningen"
        case paginaChat = "pagina_chat"
        case paginaPrikbord = "pagina_prikbord"
        case paginaMaaltijdlijst = "pagina_maaltijdlijst"
        case paginaWeekplanningen = "pagina_weekplanningen"
        case paginaGesprekken = "pagina_gesprekken"
        case paginaAgenda = "pagina_agenda"
        case prikbordToevoegen = "prikbord_toevoegen"
        case chatStarten = "chat_starten"
        case agendaAlgemeenBewerken = "agenda_algemeen_bewerken"
        case agendaPersoneelInzien = "agenda_personeel_inzien"
        case weekplanningGroepenBeheren = "weekplanning_groepen_beheren"
    }

    static let superadmin = Rechten(
        paginaKasboek: .bewerken, paginaVakantieplanningen: .bewerken,
        paginaChat: .bewerken, paginaPrikbord: .bewerken,
        paginaMaaltijdlijst: .bewerken, paginaWeekplanningen: .bewerken,
        paginaGesprekken: .bewerken, paginaAgenda: .bewerken,
        prikbordToevoegen: true, chatStarten: true,
        agendaAlgemeenBewerken: true, agendaPersoneelInzien: true,
        weekplanningGroepenBeheren: true
    )

    static let geen = Rechten()
}

/// De pagina-velden van `Rechten` die overeenkomen met een tab, gekoppeld aan de
/// sleutel van die tab (zie `HoofdTab.sleutel` in Views/DashboardView.swift).
/// Spiegelt `PAGINA_ROUTES` uit lib/paginaRechten.ts.
extension Rechten {
    var paginaToegang: [String: Toegang] {
        [
            "meldingen": paginaPrikbord,
            "chat": paginaChat,
            "agenda": paginaAgenda,
            "kasboek": paginaKasboek,
            "maaltijdlijst": paginaMaaltijdlijst,
            "vakantie": paginaVakantieplanningen,
            "weekplanning": paginaWeekplanningen,
        ]
    }

    /// Als een niet-superadmin account nog maar toegang heeft tot precies één van
    /// de hierboven gekoppelde tabs, geeft dit de sleutel van die tab terug. Zo'n
    /// account krijgt dan alleen die ene tab te zien (zie DashboardView.swift).
    func enkeleToegangTabNaam(isSuperadmin: Bool) -> String? {
        guard !isSuperadmin else { return nil }
        let toegankelijk = paginaToegang.filter { $0.value != .geen }
        return toegankelijk.count == 1 ? toegankelijk.first?.key : nil
    }
}

/// Net als `normaliseerRechten` in components/AuthProvider.tsx: kolommen die nog
/// niet in de tabel staan (een nieuw recht dat pas na een migratie bestaat) of
/// null zijn, vallen terug op "geen recht" in plaats van het hele rechtenobject
/// te laten mislukken.
extension Rechten {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func toegang(_ sleutel: CodingKeys) -> Toegang {
            (try? c.decodeIfPresent(Toegang.self, forKey: sleutel)) ?? .geen
        }
        func vlag(_ sleutel: CodingKeys) -> Bool {
            (try? c.decodeIfPresent(Bool.self, forKey: sleutel)) ?? false
        }

        self.init(
            paginaKasboek: toegang(.paginaKasboek),
            paginaVakantieplanningen: toegang(.paginaVakantieplanningen),
            paginaChat: toegang(.paginaChat),
            paginaPrikbord: toegang(.paginaPrikbord),
            paginaMaaltijdlijst: toegang(.paginaMaaltijdlijst),
            paginaWeekplanningen: toegang(.paginaWeekplanningen),
            paginaGesprekken: toegang(.paginaGesprekken),
            paginaAgenda: toegang(.paginaAgenda),
            prikbordToevoegen: vlag(.prikbordToevoegen),
            chatStarten: vlag(.chatStarten),
            agendaAlgemeenBewerken: vlag(.agendaAlgemeenBewerken),
            agendaPersoneelInzien: vlag(.agendaPersoneelInzien),
            weekplanningGroepenBeheren: vlag(.weekplanningGroepenBeheren)
        )
    }
}
