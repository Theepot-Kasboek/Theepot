import SwiftUI

/// Spiegelt de types in lib/evenementen.ts (zie supabase-sql/evenementen.sql).
/// Tabel `evenementen`.
struct Evenement: Decodable, Identifiable, Hashable {
    let id: String
    var titel: String
    var omschrijving: String?
    var locatie: String?
    var datum: String?
    var sluitAanmeldenOp: String
    var maxAanmeldingen: Int?
    var status: String   // "actief" | "geannuleerd"
    var aangemaaktDoor: String?
    var aangemaaktOp: String?
    /// Gevuld via de embed `evenement_aanmeldingen(count)` in het overzicht;
    /// 0 als die embed niet is meegevraagd.
    var aantalAanmeldingen: Int

    enum CodingKeys: String, CodingKey {
        case id, titel, omschrijving, locatie, datum, status
        case sluitAanmeldenOp = "sluit_aanmelden_op"
        case maxAanmeldingen = "max_aanmeldingen"
        case aangemaaktDoor = "aangemaakt_door"
        case aangemaaktOp = "aangemaakt_op"
        case aanmeldingenTelling = "evenement_aanmeldingen"
    }

    private struct Telling: Decodable { let count: Int }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        titel = try c.decode(String.self, forKey: .titel)
        omschrijving = try c.decodeIfPresent(String.self, forKey: .omschrijving)
        locatie = try c.decodeIfPresent(String.self, forKey: .locatie)
        datum = try c.decodeIfPresent(String.self, forKey: .datum)
        sluitAanmeldenOp = try c.decode(String.self, forKey: .sluitAanmeldenOp)
        maxAanmeldingen = try c.decodeIfPresent(Int.self, forKey: .maxAanmeldingen)
        status = (try? c.decode(String.self, forKey: .status)) ?? "actief"
        aangemaaktDoor = try c.decodeIfPresent(String.self, forKey: .aangemaaktDoor)
        aangemaaktOp = try c.decodeIfPresent(String.self, forKey: .aangemaaktOp)
        let telling = (try? c.decodeIfPresent([Telling].self, forKey: .aanmeldingenTelling)) ?? nil
        aantalAanmeldingen = telling?.first?.count ?? 0
    }

    var isActief: Bool { status == "actief" }
    var sluitDatum: Date? { Tijdstempel.datum(sluitAanmeldenOp) }
    var evenementDatum: Date? { Tijdstempel.datum(datum) }

    /// Zelfde badge-logica als app/evenementen/page.tsx en [id]/page.tsx.
    func badge(aantal: Int) -> EvenementBadge {
        if status == "geannuleerd" { return .geannuleerd }
        if let sluit = sluitDatum, Date() > sluit { return .gesloten }
        if let max = maxAanmeldingen, aantal >= max { return .vol }
        return .open
    }
}

enum EvenementBadge {
    case open, vol, gesloten, geannuleerd

    var tekst: String {
        switch self {
        case .open: return "Open"
        case .vol: return "Vol"
        case .gesloten: return "Gesloten"
        case .geannuleerd: return "Geannuleerd"
        }
    }

    var kleur: Color {
        switch self {
        case .open: return Color(hex: "15803D")
        case .vol: return Color(hex: "92400E")
        case .gesloten: return .secondary
        case .geannuleerd: return Color(hex: "B91C1C")
        }
    }

    var achtergrond: Color {
        switch self {
        case .open: return Color(hex: "DCFCE7")
        case .vol: return Color(hex: "FEF3C7")
        case .gesloten: return Color(.systemGray5)
        case .geannuleerd: return Color(hex: "FEE2E2")
        }
    }
}

/// Tabel `evenement_aanmeldingen`.
struct EvenementAanmelding: Codable, Identifiable, Hashable {
    let id: String
    let evenementId: String
    var naam: String?
    var email: String
    var aangemeldOp: String

    enum CodingKeys: String, CodingKey {
        case id, naam, email
        case evenementId = "evenement_id"
        case aangemeldOp = "aangemeld_op"
    }

    var aangemeldDatum: Date? { Tijdstempel.datum(aangemeldOp) }
}

/// Tabel `evenement_velden`: extra invulvakjes (tekst) of dropdowns (keuze).
struct EvenementVeld: Codable, Identifiable, Hashable {
    let id: String
    let evenementId: String
    var label: String
    var type: String   // "tekst" | "keuze"
    var opties: [String]?
    var meerdere: Bool
    var verplicht: Bool
    var volgorde: Int

    enum CodingKeys: String, CodingKey {
        case id, label, type, opties, meerdere, verplicht, volgorde
        case evenementId = "evenement_id"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        evenementId = try c.decode(String.self, forKey: .evenementId)
        label = try c.decode(String.self, forKey: .label)
        type = (try? c.decode(String.self, forKey: .type)) ?? "tekst"
        opties = try c.decodeIfPresent([String].self, forKey: .opties)
        meerdere = (try? c.decodeIfPresent(Bool.self, forKey: .meerdere)) ?? false
        verplicht = (try? c.decodeIfPresent(Bool.self, forKey: .verplicht)) ?? false
        volgorde = (try? c.decodeIfPresent(Int.self, forKey: .volgorde)) ?? 0
    }

    var isKeuze: Bool { type == "keuze" }

    var omschrijving: String {
        let soort = isKeuze
            ? "Dropdown\(meerdere ? " (meerdere toegestaan)" : ""): \((opties ?? []).joined(separator: ", "))"
            : "Tekstveld"
        return "\(soort) · \(verplicht ? "Verplicht" : "Optioneel")"
    }
}

/// Eén opgeslagen antwoord voor een meerdere-keuze-veld bestaat uit de gekozen
/// opties gescheiden door ", " — spiegelt meerkeuzeOpties/wisselMeerkeuzeOptie.
enum Meerkeuze {
    static func opties(_ waarde: String) -> [String] {
        waarde.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }

    static func wissel(_ huidig: String, _ optie: String) -> String {
        var items = opties(huidig)
        if let idx = items.firstIndex(of: optie) { items.remove(at: idx) } else { items.append(optie) }
        return items.joined(separator: ", ")
    }
}

/// Supabase geeft timestamptz terug als ISO 8601, vaak met microseconden
/// (bv. `2026-11-16T10:00:00.123456+00:00`). ISO8601DateFormatter kan daar niet
/// altijd mee overweg, dus kappen we de fractie af op milliseconden.
enum Tijdstempel {
    private static let metFractie: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let zonderFractie = ISO8601DateFormatter()

    static func datum(_ tekst: String?) -> Date? {
        guard var tekst, !tekst.isEmpty else { return nil }
        if tekst.contains(" ") && !tekst.contains("T") { tekst = tekst.replacingOccurrences(of: " ", with: "T") }
        if let punt = tekst.firstIndex(of: ".") {
            let naPunt = tekst[tekst.index(after: punt)...]
            let cijfers = naPunt.prefix { $0.isNumber }
            let rest = naPunt.dropFirst(cijfers.count)
            let ms = String(cijfers.prefix(3)).padding(toLength: 3, withPad: "0", startingAt: 0)
            tekst = String(tekst[..<punt]) + "." + ms + rest
        }
        return metFractie.date(from: tekst) ?? zonderFractie.date(from: tekst)
    }

    static func tekst(_ datum: Date) -> String { zonderFractie.string(from: datum) }

    private static let weergaveFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "nl_NL")
        f.timeZone = TimeZone(identifier: "Europe/Amsterdam")
        f.dateStyle = .medium
        f.timeStyle = .short
        return f
    }()

    static func weergave(_ datum: Date?) -> String {
        guard let datum else { return "—" }
        return weergaveFormatter.string(from: datum)
    }
}
