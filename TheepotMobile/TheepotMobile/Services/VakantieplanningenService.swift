import Foundation
import Supabase

/// Spiegelt app/vakantieplanningen/page.tsx. Alleen-lezen voor wie geen bewerkrecht
/// heeft (`pagina_vakantieplanningen` != .bewerken): die gebruikers zien uitsluitend
/// gepubliceerde planningen (gepubliceerd = true) en krijgen geen van de
/// schrijffuncties hieronder aangeboden door de views.
enum VakantieplanningenService {

    // ─── Lezen ──────────────────────────────────────────────────────────────

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

    /// Koppeling met de activiteitenbibliotheek (tabel `activiteiten`) — alleen om
    /// een bestaande activiteit in de planning te kunnen zetten, geen apart scherm.
    static func bibliotheekActiviteiten() async throws -> [BibliotheekActiviteit] {
        try await SupabaseManager.client
            .from("activiteiten")
            .select("id, naam, categorie, thema, tijdsduur, materialen, beschrijving")
            .order("naam")
            .execute()
            .value
    }

    static func vakantieCategorieen() async throws -> [String] {
        struct Rij: Decodable { let naam: String }
        let rijen: [Rij] = try await SupabaseManager.client
            .from("vakantie_categorieen")
            .select("naam")
            .order("naam")
            .execute()
            .value
        let namen = rijen.map(\.naam)
        return namen.isEmpty ? ["Knutsel", "Groepsspel", "Buiten", "Koken", "Overig"] : namen
    }

    // ─── Planning: schrijven (alleen voor gebruikers met bewerkrecht) ─────────

    static func maakPlanning(naam: String, vakantie: String, thema: String, startDatum: String, eindDatum: String, aangemaaktDoor: String) async throws -> VakantiePlanning {
        struct Insert: Encodable {
            let naam: String
            let vakantie: String
            let thema: String
            let start_datum: String
            let eind_datum: String
            let gepubliceerd: Bool
            let aangemaakt_door: String
        }
        return try await SupabaseManager.client
            .from("vakantie_planningen")
            .insert(Insert(naam: naam, vakantie: vakantie, thema: thema, start_datum: startDatum, eind_datum: eindDatum, gepubliceerd: false, aangemaakt_door: aangemaaktDoor))
            .select()
            .single()
            .execute()
            .value
    }

    static func verwijderPlanning(id: String) async throws {
        try await SupabaseManager.client
            .from("vakantie_planningen")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    static func togglePubliceer(id: String, huidig: Bool) async throws {
        struct Update: Encodable { let gepubliceerd: Bool }
        try await SupabaseManager.client
            .from("vakantie_planningen")
            .update(Update(gepubliceerd: !huidig))
            .eq("id", value: id)
            .execute()
    }

    static func werkBijInstellingen(id: String, thema: String, vakantie: String, startNoord: String?, eindNoord: String?) async throws {
        struct Update: Encodable {
            let thema: String
            let vakantie: String
            let start_datum_noord: String?
            let eind_datum_noord: String?
        }
        try await SupabaseManager.client
            .from("vakantie_planningen")
            .update(Update(thema: thema, vakantie: vakantie, start_datum_noord: startNoord, eind_datum_noord: eindNoord))
            .eq("id", value: id)
            .execute()
    }

    // ─── Weken: schrijven ───────────────────────────────────────────────────

    static func maakWeek(planningId: String, weekNummer: Int, naam: String) async throws {
        struct Insert: Encodable {
            let planning_id: String
            let week_nummer: Int
            let naam: String
        }
        try await SupabaseManager.client
            .from("vakantie_weken")
            .insert(Insert(planning_id: planningId, week_nummer: weekNummer, naam: naam))
            .execute()
    }

    static func verwijderWeek(id: String) async throws {
        try await SupabaseManager.client
            .from("vakantie_weken")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    // ─── Activiteiten: schrijven, incl. koppeling met de bibliotheek ──────────

    /// `afbeelding`: nieuw gekozen foto, of `nil` om de bestaande te laten staan.
    /// Bij een bibliotheekactiviteit (`activiteitId` gezet) komt de foto in de
    /// gedeelde bucket op `activiteiten` terecht — zodat hij ook zichtbaar wordt
    /// in de bibliotheek zelf, net als op het dashboard.
    static func voegActiviteitToe(weekId: String, dag: Dag, volgorde: Int, categorie: String, naam: String, beschrijving: String?, benodigdheden: [String], activiteitId: String?, afbeelding: Data?) async throws {
        struct Insert: Encodable {
            let week_id: String
            let dag: String
            let volgorde: Int
            let categorie: String
            let naam: String
            let beschrijving: String?
            let benodigdheden: [String]
            let activiteit_id: String?
        }
        let nieuw: VakantieActiviteit = try await SupabaseManager.client
            .from("vakantie_activiteiten")
            .insert(Insert(week_id: weekId, dag: dag.rawValue, volgorde: volgorde, categorie: categorie, naam: naam, beschrijving: beschrijving, benodigdheden: benodigdheden, activiteit_id: activiteitId))
            .select()
            .single()
            .execute()
            .value

        if let afbeelding {
            try await uploadAfbeelding(afbeelding, activiteitAangemaaktId: nieuw.id, activiteitId: activiteitId)
        }
    }

    static func werkBijActiviteit(id: String, categorie: String, naam: String, beschrijving: String?, benodigdheden: [String], activiteitId: String?, afbeelding: Data?) async throws {
        struct Update: Encodable {
            let categorie: String
            let naam: String
            let beschrijving: String?
            let benodigdheden: [String]
            let activiteit_id: String?
        }
        try await SupabaseManager.client
            .from("vakantie_activiteiten")
            .update(Update(categorie: categorie, naam: naam, beschrijving: beschrijving, benodigdheden: benodigdheden, activiteit_id: activiteitId))
            .eq("id", value: id)
            .execute()

        if let afbeelding {
            try await uploadAfbeelding(afbeelding, activiteitAangemaaktId: id, activiteitId: activiteitId)
        }
    }

    static func verwijderActiviteit(id: String) async throws {
        try await SupabaseManager.client
            .from("vakantie_activiteiten")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    /// Spiegelt `uploadActiviteitAfbeelding` (lib/afbeelding-upload.ts) voor
    /// bibliotheekactiviteiten, en de inline upload in page.tsx voor handmatige.
    private static func uploadAfbeelding(_ data: Data, activiteitAangemaaktId: String, activiteitId: String?) async throws {
        if let activiteitId {
            let pad = "\(activiteitId).jpg"
            try await SupabaseManager.client.storage
                .from("activiteit-afbeeldingen")
                .upload(pad, data: data, options: FileOptions(contentType: "image/jpeg", upsert: true))
            struct Update: Encodable { let afbeelding_pad: String }
            try await SupabaseManager.client
                .from("activiteiten")
                .update(Update(afbeelding_pad: pad))
                .eq("id", value: activiteitId)
                .execute()
        } else {
            let pad = "vakantie/\(activiteitAangemaaktId).jpg"
            try await SupabaseManager.client.storage
                .from("activiteit-afbeeldingen")
                .upload(pad, data: data, options: FileOptions(contentType: "image/jpeg", upsert: true))
            struct Update: Encodable { let afbeelding_pad: String }
            try await SupabaseManager.client
                .from("vakantie_activiteiten")
                .update(Update(afbeelding_pad: pad))
                .eq("id", value: activiteitAangemaaktId)
                .execute()
        }
    }
}
