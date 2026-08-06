import Foundation

/// Spiegelt app/agenda/page.tsx (zonder ICS-import/-abonneren, dat blijft
/// een web-only functie). Zichtbaarheid van kalenders volgt dezelfde regels
/// als de webapp: eigen persoonlijke kalender + (voor bevoorrechte rollen)
/// alle personeelskalenders + algemene kalenders (rechtstreeks zichtbaar voor
/// bevoorrechte rollen, anders alleen via `agenda_gedeeld`).
enum AgendaService {
    static func kalenders(profielId: String, magAlleKalendersZien: Bool, magAllePersoonlijkZien: Bool) async throws -> [AgendaKalender] {
        var persoonlijk: [AgendaKalender] = try await SupabaseManager.client
            .from("agenda_kalenders")
            .select("*")
            .eq("type", value: "persoonlijk")
            .eq("eigenaar_id", value: profielId)
            .execute()
            .value

        if persoonlijk.isEmpty {
            // Nieuwe gebruiker zonder persoonlijke kalender: eenmalig aanmaken,
            // zelfde als bij de eerste keer dat de webagenda ooit werd geopend.
            persoonlijk = [try await maakPersoonlijkeKalender(profielId: profielId)]
        }

        var allePersoonlijk = persoonlijk
        if magAllePersoonlijkZien {
            allePersoonlijk = try await SupabaseManager.client
                .from("agenda_kalenders")
                .select("*")
                .eq("type", value: "persoonlijk")
                .execute()
                .value
        }

        var algemeen: [AgendaKalender] = []
        if magAlleKalendersZien {
            algemeen = try await SupabaseManager.client
                .from("agenda_kalenders")
                .select("*")
                .eq("type", value: "algemeen")
                .execute()
                .value
        } else {
            struct GedeeldRij: Decodable { let kalender_id: String }
            let gedeeld: [GedeeldRij] = try await SupabaseManager.client
                .from("agenda_gedeeld")
                .select("kalender_id")
                .eq("profiel_id", value: profielId)
                .execute()
                .value
            if !gedeeld.isEmpty {
                algemeen = try await SupabaseManager.client
                    .from("agenda_kalenders")
                    .select("*")
                    .in("id", values: gedeeld.map(\.kalender_id))
                    .execute()
                    .value
            }
        }

        return allePersoonlijk + algemeen
    }

    private static func maakPersoonlijkeKalender(profielId: String) async throws -> AgendaKalender {
        struct Insert: Encodable { let naam: String; let type: String; let eigenaar_id: String; let kleur: String }
        return try await SupabaseManager.client
            .from("agenda_kalenders")
            .insert(Insert(naam: "Mijn agenda", type: "persoonlijk", eigenaar_id: profielId, kleur: "#4F46E5"))
            .select()
            .single()
            .execute()
            .value
    }

    static func afspraken(kalenderIds: [String]) async throws -> [AgendaAfspraak] {
        guard !kalenderIds.isEmpty else { return [] }
        return try await SupabaseManager.client
            .from("agenda_afspraken")
            .select("*")
            .in("kalender_id", values: kalenderIds)
            .order("start_tijd")
            .execute()
            .value
    }

    static func maakAfspraak(kalenderId: String, titel: String, beschrijving: String?, startTijd: String, eindTijd: String, heleDag: Bool, herinneringMinuten: Int?, aangemaaktDoor: String) async throws {
        struct Insert: Encodable {
            let kalender_id: String, titel: String, beschrijving: String?
            let start_tijd: String, eind_tijd: String, hele_dag: Bool
            let herinnering_minuten: Int?, aangemaakt_door: String
        }
        try await SupabaseManager.client
            .from("agenda_afspraken")
            .insert(Insert(kalender_id: kalenderId, titel: titel, beschrijving: beschrijving, start_tijd: startTijd, eind_tijd: eindTijd, hele_dag: heleDag, herinnering_minuten: herinneringMinuten, aangemaakt_door: aangemaaktDoor))
            .execute()
    }

    static func werkAfspraakBij(id: String, kalenderId: String, titel: String, beschrijving: String?, startTijd: String, eindTijd: String, heleDag: Bool, herinneringMinuten: Int?) async throws {
        struct Update: Encodable {
            let kalender_id: String, titel: String, beschrijving: String?
            let start_tijd: String, eind_tijd: String, hele_dag: Bool
            let herinnering_minuten: Int?
        }
        try await SupabaseManager.client
            .from("agenda_afspraken")
            .update(Update(kalender_id: kalenderId, titel: titel, beschrijving: beschrijving, start_tijd: startTijd, eind_tijd: eindTijd, hele_dag: heleDag, herinnering_minuten: herinneringMinuten))
            .eq("id", value: id)
            .execute()
    }

    static func verwijderAfspraak(id: String) async throws {
        try await SupabaseManager.client
            .from("agenda_afspraken")
            .delete()
            .eq("id", value: id)
            .execute()
    }
}
