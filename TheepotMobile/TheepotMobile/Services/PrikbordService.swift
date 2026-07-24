import Foundation

/// Spiegelt app/prikbord/page.tsx. Zichtbaarheid/expiry wordt client-side
/// gefilterd net als in de webapp (geen server-side filter op verloopdatum).
enum PrikbordService {
    static func berichten() async throws -> [PrikbordBericht] {
        let alle: [PrikbordBericht] = try await SupabaseManager.client
            .from("prikbord_berichten")
            .select("*, profielen(naam)")
            .execute()
            .value

        let nietVerlopen = alle.filter { !$0.isVerlopen }
        // Zelfde sortering als de webapp: prioriteit (tekst, aflopend) dan datum aflopend.
        return nietVerlopen.sorted {
            if $0.prioriteit.rawValue != $1.prioriteit.rawValue {
                return $0.prioriteit.rawValue > $1.prioriteit.rawValue
            }
            return $0.aangemaaktOp > $1.aangemaaktOp
        }
    }

    static func maakAan(locatieNaam: String, titel: String, inhoud: String, prioriteit: PrikbordPrioriteit, verloopdatum: String?, aangemaaktDoor: String) async throws {
        struct Insert: Encodable {
            let locatie_naam: String
            let titel: String
            let inhoud: String
            let prioriteit: String
            let verloopdatum: String?
            let aangemaakt_door: String
        }
        try await SupabaseManager.client
            .from("prikbord_berichten")
            .insert(Insert(locatie_naam: locatieNaam, titel: titel, inhoud: inhoud, prioriteit: prioriteit.rawValue, verloopdatum: verloopdatum, aangemaakt_door: aangemaaktDoor))
            .execute()
    }

    static func werkBij(id: String, titel: String, inhoud: String, prioriteit: PrikbordPrioriteit, locatieNaam: String, verloopdatum: String?) async throws {
        struct Update: Encodable {
            let titel: String
            let inhoud: String
            let prioriteit: String
            let locatie_naam: String
            let verloopdatum: String?
        }
        try await SupabaseManager.client
            .from("prikbord_berichten")
            .update(Update(titel: titel, inhoud: inhoud, prioriteit: prioriteit.rawValue, locatie_naam: locatieNaam, verloopdatum: verloopdatum))
            .eq("id", value: id)
            .execute()
    }

    static func verwijder(id: String) async throws {
        try await SupabaseManager.client
            .from("prikbord_berichten")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    /// Markeert bericht als gelezen door de huidige gebruiker (read-then-write,
    /// net als de webapp — race-gevoelig maar consistent met bestaand gedrag).
    static func markeerGelezen(bericht: PrikbordBericht, profielId: String) async throws {
        struct Huidig: Decodable { let gelezen_door: [String]? }
        let huidig: Huidig = try await SupabaseManager.client
            .from("prikbord_berichten")
            .select("gelezen_door")
            .eq("id", value: bericht.id)
            .single()
            .execute()
            .value

        var gelezen = huidig.gelezen_door ?? []
        guard !gelezen.contains(profielId) else { return }
        gelezen.append(profielId)

        struct Update: Encodable { let gelezen_door: [String] }
        try await SupabaseManager.client
            .from("prikbord_berichten")
            .update(Update(gelezen_door: gelezen))
            .eq("id", value: bericht.id)
            .execute()
    }
}
