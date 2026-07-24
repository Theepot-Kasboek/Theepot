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
    var prikbordToevoegen: Bool = false
    var chatStarten: Bool = false

    enum CodingKeys: String, CodingKey {
        case paginaKasboek = "pagina_kasboek"
        case paginaVakantieplanningen = "pagina_vakantieplanningen"
        case paginaChat = "pagina_chat"
        case paginaPrikbord = "pagina_prikbord"
        case paginaMaaltijdlijst = "pagina_maaltijdlijst"
        case paginaWeekplanningen = "pagina_weekplanningen"
        case paginaGesprekken = "pagina_gesprekken"
        case prikbordToevoegen = "prikbord_toevoegen"
        case chatStarten = "chat_starten"
    }

    static let superadmin = Rechten(
        paginaKasboek: .bewerken, paginaVakantieplanningen: .bewerken,
        paginaChat: .bewerken, paginaPrikbord: .bewerken,
        paginaMaaltijdlijst: .bewerken, paginaWeekplanningen: .bewerken,
        paginaGesprekken: .bewerken, prikbordToevoegen: true, chatStarten: true
    )

    static let geen = Rechten()
}
