import Foundation
import Supabase

/// Spiegelt lib/evenementen.ts. Zelfde open toegangsmodel als de webapp: RLS
/// staat uit op deze tabellen, autorisatie gebeurt via `pagina_evenementen`.
enum EvenementenService {
    // MARK: Evenementen

    static func evenementen() async throws -> [Evenement] {
        try await SupabaseManager.client
            .from("evenementen")
            .select("*, evenement_aanmeldingen(count)")
            .order("sluit_aanmelden_op", ascending: false)
            .execute()
            .value
    }

    static func evenement(id: String) async throws -> Evenement {
        try await SupabaseManager.client
            .from("evenementen")
            .select("*, evenement_aanmeldingen(count)")
            .eq("id", value: id)
            .single()
            .execute()
            .value
    }

    struct EvenementInvoer: Encodable {
        let titel: String
        let omschrijving: String?
        let locatie: String?
        let datum: String?
        let sluit_aanmelden_op: String
        let max_aanmeldingen: Int?
    }

    static func maakAan(_ invoer: EvenementInvoer, aangemaaktDoor: String) async throws -> Evenement {
        struct Insert: Encodable {
            let titel: String
            let omschrijving: String?
            let locatie: String?
            let datum: String?
            let sluit_aanmelden_op: String
            let max_aanmeldingen: Int?
            let aangemaakt_door: String?
        }
        let rij = Insert(
            titel: invoer.titel, omschrijving: invoer.omschrijving, locatie: invoer.locatie,
            datum: invoer.datum, sluit_aanmelden_op: invoer.sluit_aanmelden_op,
            max_aanmeldingen: invoer.max_aanmeldingen,
            aangemaakt_door: aangemaaktDoor.isEmpty ? nil : aangemaaktDoor
        )
        return try await SupabaseManager.client
            .from("evenementen")
            .insert(rij)
            .select()
            .single()
            .execute()
            .value
    }

    /// Bewerken van titel/omschrijving/locatie/datum/sluiting/max. `null`-waarden
    /// worden expliciet meegestuurd zodat een veld ook leeggemaakt kan worden.
    static func werkBij(id: String, _ invoer: EvenementInvoer) async throws {
        struct Update: Encodable {
            let invoer: EvenementInvoer
            let bijgewerkt_op: String
            enum Sleutel: String, CodingKey {
                case titel, omschrijving, locatie, datum, sluit_aanmelden_op, max_aanmeldingen, bijgewerkt_op
            }
            func encode(to encoder: Encoder) throws {
                var c = encoder.container(keyedBy: Sleutel.self)
                try c.encode(invoer.titel, forKey: .titel)
                try c.encode(invoer.omschrijving, forKey: .omschrijving)
                try c.encode(invoer.locatie, forKey: .locatie)
                try c.encode(invoer.datum, forKey: .datum)
                try c.encode(invoer.sluit_aanmelden_op, forKey: .sluit_aanmelden_op)
                try c.encode(invoer.max_aanmeldingen, forKey: .max_aanmeldingen)
                try c.encode(bijgewerkt_op, forKey: .bijgewerkt_op)
            }
        }
        try await SupabaseManager.client
            .from("evenementen")
            .update(Update(invoer: invoer, bijgewerkt_op: Tijdstempel.tekst(Date())))
            .eq("id", value: id)
            .execute()
    }

    static func zetStatus(id: String, status: String) async throws {
        struct Update: Encodable { let status: String; let bijgewerkt_op: String }
        try await SupabaseManager.client
            .from("evenementen")
            .update(Update(status: status, bijgewerkt_op: Tijdstempel.tekst(Date())))
            .eq("id", value: id)
            .execute()
    }

    static func verwijder(id: String) async throws {
        try await SupabaseManager.client
            .from("evenementen")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    // MARK: Aanmeldingen

    static func aanmeldingen(evenementId: String) async throws -> [EvenementAanmelding] {
        try await SupabaseManager.client
            .from("evenement_aanmeldingen")
            .select()
            .eq("evenement_id", value: evenementId)
            .order("aangemeld_op", ascending: false)
            .execute()
            .value
    }

    static func verwijderAanmelding(id: String) async throws {
        try await SupabaseManager.client
            .from("evenement_aanmeldingen")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    /// Spiegelt voegAanmeldingHandmatigToe: een bestaand e-mailadres voor dit
    /// evenement wordt bijgewerkt i.p.v. een duplicaat toe te voegen.
    @discardableResult
    static func voegHandmatigToe(evenementId: String, email: String, naam: String, antwoorden: [String: String]) async throws -> Bool {
        let schoneEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let schoneNaam = naam.trimmingCharacters(in: .whitespacesAndNewlines)

        struct IdRij: Decodable { let id: String }
        let bestaand: [IdRij] = try await SupabaseManager.client
            .from("evenement_aanmeldingen")
            .select("id")
            .eq("evenement_id", value: evenementId)
            .ilike("email", pattern: schoneEmail)
            .limit(1)
            .execute()
            .value

        let aanmeldingId: String
        let bijgewerkt: Bool
        if let rij = bestaand.first {
            struct Update: Encodable { let naam: String?; let aangemeld_op: String }
            try await SupabaseManager.client
                .from("evenement_aanmeldingen")
                .update(Update(naam: schoneNaam.isEmpty ? nil : schoneNaam, aangemeld_op: Tijdstempel.tekst(Date())))
                .eq("id", value: rij.id)
                .execute()
            aanmeldingId = rij.id
            bijgewerkt = true
        } else {
            struct Insert: Encodable { let evenement_id: String; let email: String; let naam: String? }
            let nieuw: IdRij = try await SupabaseManager.client
                .from("evenement_aanmeldingen")
                .insert(Insert(evenement_id: evenementId, email: schoneEmail, naam: schoneNaam.isEmpty ? nil : schoneNaam))
                .select("id")
                .single()
                .execute()
                .value
            aanmeldingId = nieuw.id
            bijgewerkt = false
        }

        try await slaAntwoordenOp(aanmeldingId: aanmeldingId, antwoorden: antwoorden)
        return bijgewerkt
    }

    // MARK: Aanvullende velden

    static func velden(evenementId: String) async throws -> [EvenementVeld] {
        try await SupabaseManager.client
            .from("evenement_velden")
            .select()
            .eq("evenement_id", value: evenementId)
            .order("volgorde", ascending: true)
            .execute()
            .value
    }

    static func maakVeldAan(evenementId: String, label: String, type: String, opties: [String]?, meerdere: Bool, verplicht: Bool, volgorde: Int) async throws -> EvenementVeld {
        struct Insert: Encodable {
            let evenement_id: String
            let label: String
            let type: String
            let opties: [String]?
            let meerdere: Bool
            let verplicht: Bool
            let volgorde: Int
        }
        let isKeuze = type == "keuze"
        return try await SupabaseManager.client
            .from("evenement_velden")
            .insert(Insert(evenement_id: evenementId, label: label, type: type, opties: isKeuze ? opties : nil, meerdere: isKeuze && meerdere, verplicht: verplicht, volgorde: volgorde))
            .select()
            .single()
            .execute()
            .value
    }

    static func zetVeldVolgorde(id: String, volgorde: Int) async throws {
        struct Update: Encodable { let volgorde: Int }
        try await SupabaseManager.client
            .from("evenement_velden")
            .update(Update(volgorde: volgorde))
            .eq("id", value: id)
            .execute()
    }

    static func verwijderVeld(id: String) async throws {
        try await SupabaseManager.client
            .from("evenement_velden")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    // MARK: Antwoorden

    /// [aanmeldingId: [veldId: waarde]]
    static func antwoorden(aanmeldingIds: [String]) async throws -> [String: [String: String]] {
        guard !aanmeldingIds.isEmpty else { return [:] }
        struct Rij: Decodable { let aanmelding_id: String; let veld_id: String; let waarde: String? }
        let rijen: [Rij] = try await SupabaseManager.client
            .from("evenement_veld_antwoorden")
            .select("aanmelding_id, veld_id, waarde")
            .in("aanmelding_id", values: aanmeldingIds)
            .execute()
            .value
        var resultaat: [String: [String: String]] = [:]
        for rij in rijen {
            resultaat[rij.aanmelding_id, default: [:]][rij.veld_id] = rij.waarde ?? ""
        }
        return resultaat
    }

    static func slaAntwoordenOp(aanmeldingId: String, antwoorden: [String: String]) async throws {
        struct Rij: Encodable { let aanmelding_id: String; let veld_id: String; let waarde: String }
        let rijen = antwoorden
            .filter { !$0.value.isEmpty }
            .map { Rij(aanmelding_id: aanmeldingId, veld_id: $0.key, waarde: $0.value) }
        guard !rijen.isEmpty else { return }
        try await SupabaseManager.client
            .from("evenement_veld_antwoorden")
            .upsert(rijen, onConflict: "aanmelding_id,veld_id")
            .execute()
    }

    // MARK: Aanmeldlink

    /// Publieke aanmeldpagina in de webapp: `<webapp>/evenementen/<id>/aanmelden`.
    /// Het webadres staat in Info.plist (`TheepotWebappURL`, via project.yml).
    static func aanmeldLink(evenementId: String) -> URL? {
        guard let basis = AppConfig.webappURL else { return nil }
        return basis.appendingPathComponent("evenementen/\(evenementId)/aanmelden")
    }
}

/// Instellingen uit Info.plist (zie project.yml → info.properties).
enum AppConfig {
    static var webappURL: URL? {
        guard let tekst = Bundle.main.object(forInfoDictionaryKey: "TheepotWebappURL") as? String else { return nil }
        let schoon = tekst.trimmingCharacters(in: .whitespacesAndNewlines).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !schoon.isEmpty, schoon.hasPrefix("http"), let url = URL(string: schoon) else { return nil }
        return url
    }
}
