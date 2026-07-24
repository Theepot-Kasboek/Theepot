import Foundation

/// Spiegelt app/vakantieplanningen/page.tsx — alleen-lezen in iOS: niet-superadmin
/// gebruikers zien uitsluitend gepubliceerde plannings (gepubliceerd = true).
enum VakantieplanningenService {
    static func planningen(magOnepubliceerdeZien: Bool) async throws -> [VakantiePlanning] {
        var query = SupabaseManager.client
            .from("vakantie_planningen")
            .select()

        if !magOnepubliceerdeZien {
            query = query.eq("gepubliceerd", value: true)
        }

        let planningen: [VakantiePlanning] = try await query
            .order("start_datum", ascending: false)
            .execute()
            .value
        return planningen
    }

    static func weken(planningId: String) async throws -> [VakantieWeek] {
        try await SupabaseManager.client
            .from("vakantie_weken")
            .select()
            .eq("planning_id", value: planningId)
            .order("week_nummer")
            .execute()
            .value
    }

    static func activiteiten(weekIds: [String]) async throws -> [VakantieActiviteit] {
        guard !weekIds.isEmpty else { return [] }
        return try await SupabaseManager.client
            .from("vakantie_activiteiten")
            .select()
            .in("week_id", values: weekIds)
            .order("volgorde")
            .execute()
            .value
    }

    /// Spiegelt de foto-voorrangsregel in de webapp: een bibliotheekfoto (uit
    /// `activiteiten`) heeft voorrang boven de eigen `afbeelding_pad` van de activiteit.
    static func metBibliotheekFotos(_ activiteiten: [VakantieActiviteit]) async -> [VakantieActiviteit] {
        let actIds = Array(Set(activiteiten.compactMap(\.activiteitId)))
        guard !actIds.isEmpty else { return activiteiten }

        struct BibFoto: Decodable {
            let id: String
            let afbeeldingPad: String?
            enum CodingKeys: String, CodingKey {
                case id
                case afbeeldingPad = "afbeelding_pad"
            }
        }

        guard let bibFotos: [BibFoto] = try? await SupabaseManager.client
            .from("activiteiten")
            .select("id,afbeelding_pad")
            .in("id", values: actIds)
            .execute()
            .value
        else { return activiteiten }

        let fotoMap = Dictionary(uniqueKeysWithValues: bibFotos.compactMap { foto -> (String, String)? in
            guard let pad = foto.afbeeldingPad, !pad.isEmpty else { return nil }
            return (foto.id, pad)
        })

        return activiteiten.map { activiteit in
            var bijgewerkt = activiteit
            if let actId = activiteit.activiteitId, let bibliotheekPad = fotoMap[actId] {
                bijgewerkt.afbeeldingPad = bibliotheekPad
            }
            return bijgewerkt
        }
    }
}
