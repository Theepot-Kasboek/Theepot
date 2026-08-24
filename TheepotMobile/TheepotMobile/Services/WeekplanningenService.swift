import Foundation
import Supabase

/// Spiegelt app/weekplanningen/page.tsx. Lezen mag iedereen met toegang tot de
/// pagina; de schrijffuncties worden door de view alleen aangeboden aan
/// gebruikers met `pagina_weekplanningen == .bewerken`. Groepsbeheer zit
/// bovendien achter het recht `weekplanning_groepen_beheren`.
enum WeekplanningenService {
    static func maandaagVanWeek(_ datum: Date) -> Date {
        var cal = Calendar(identifier: .iso8601)
        cal.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        return cal.startOfDay(for: cal.dateInterval(of: .weekOfYear, for: datum)?.start ?? datum)
    }

    static func weekStartTekst(_ datum: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "Europe/Amsterdam")
        return f.string(from: maandaagVanWeek(datum))
    }

    static func toegankelijkeLocaties(magAllesZien: Bool, locatieToegang: [LocatieToegangRow]) async throws -> [Locatie] {
        let alle = try await LocatieService.actieveLocaties()
        if magAllesZien { return alle }
        let toegestaan = Set(locatieToegang.filter { $0.locatieType == "weekplanningen" && $0.toegang != .geen }.map(\.locatieNaam))
        return alle.filter { toegestaan.contains($0.naam) }
    }

    // ─── Groepen ────────────────────────────────────────────────────────────

    static func groepen(locatieNaam: String) async throws -> [WeekGroep] {
        try await SupabaseManager.client
            .from("week_groepen")
            .select()
            .eq("locatie_naam", value: locatieNaam)
            .order("volgorde")
            .order("naam")
            .execute()
            .value
    }

    static func maakGroep(locatieNaam: String, naam: String, volgorde: Int, aangemaaktDoor: String?) async throws -> WeekGroep {
        struct Insert: Encodable {
            let locatie_naam: String
            let naam: String
            let volgorde: Int
            let aangemaakt_door: String?
        }
        return try await SupabaseManager.client
            .from("week_groepen")
            .insert(Insert(locatie_naam: locatieNaam, naam: naam, volgorde: volgorde, aangemaakt_door: aangemaaktDoor))
            .select()
            .single()
            .execute()
            .value
    }

    static func hernoemGroep(id: String, naam: String) async throws {
        struct Update: Encodable { let naam: String }
        try await SupabaseManager.client
            .from("week_groepen")
            .update(Update(naam: naam))
            .eq("id", value: id)
            .execute()
    }

    /// Verwijdert ook alle planningen van die groep (foreign key met cascade).
    static func verwijderGroep(id: String) async throws {
        try await SupabaseManager.client
            .from("week_groepen")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    // ─── Planning lezen ─────────────────────────────────────────────────────

    static func planning(locatieNaam: String, weekStart: Date, groepId: String?) async throws -> (WeekPlanning, [WeekActiviteit])? {
        let weekStartStr = weekStartTekst(weekStart)

        var query = SupabaseManager.client
            .from("week_planningen")
            .select()
            .eq("locatie_naam", value: locatieNaam)
            .eq("week_start", value: weekStartStr)

        if let groepId {
            query = query.eq("groep_id", value: groepId)
        } else {
            query = query.is("groep_id", value: nil)
        }

        let planning: WeekPlanning? = try? await query.single().execute().value
        guard let planning else { return nil }

        let activiteiten: [WeekActiviteit] = try await SupabaseManager.client
            .from("week_activiteiten")
            .select()
            .eq("planning_id", value: planning.id)
            .execute()
            .value

        return (planning, activiteiten)
    }

    // ─── Planning schrijven ─────────────────────────────────────────────────

    /// Maakt de planning aan als die er nog niet is — spiegelt `zorgVoorPlanning`
    /// in de webapp, zodat een lege week pas een rij krijgt zodra je iets invult.
    static func zorgVoorPlanning(bestaand: WeekPlanning?, locatieNaam: String, weekStart: Date, groepId: String?, thema: String, aangemaaktDoor: String?) async throws -> WeekPlanning {
        if let bestaand { return bestaand }
        struct Insert: Encodable {
            let locatie_naam: String
            let week_start: String
            let groep_id: String?
            let thema: String?
            let aangemaakt_door: String?
        }
        return try await SupabaseManager.client
            .from("week_planningen")
            .insert(Insert(
                locatie_naam: locatieNaam,
                week_start: weekStartTekst(weekStart),
                groep_id: groepId,
                thema: thema.isEmpty ? nil : thema,
                aangemaakt_door: aangemaaktDoor
            ))
            .select()
            .single()
            .execute()
            .value
    }

    static func werkBijThema(planningId: String, thema: String) async throws {
        struct Update: Encodable { let thema: String? }
        try await SupabaseManager.client
            .from("week_planningen")
            .update(Update(thema: thema.isEmpty ? nil : thema))
            .eq("id", value: planningId)
            .execute()
    }

    // ─── Activiteiten ───────────────────────────────────────────────────────

    /// Koppeling met de activiteitenbibliotheek (tabel `activiteiten`), net als
    /// bij de vakantieplanningen: alleen om een bestaande activiteit over te
    /// nemen, geen apart scherm.
    static func bibliotheekActiviteiten() async throws -> [BibliotheekActiviteit] {
        try await SupabaseManager.client
            .from("activiteiten")
            .select("id, naam, categorie, thema, tijdsduur, materialen, beschrijving")
            .order("naam")
            .execute()
            .value
    }

    /// Eén activiteit per type per planning, precies zoals de webapp: bestaat het
    /// type al, dan wordt die rij bijgewerkt.
    static func slaActiviteitOp(planningId: String, bestaand: WeekActiviteit?, type: WeekActiviteitType, naam: String, beschrijving: String?, materialen: [String], activiteitId: String?, afbeelding: Data?, huidigeAfbeeldingUrl: String?) async throws {
        var afbeeldingUrl = huidigeAfbeeldingUrl
        if let afbeelding {
            afbeeldingUrl = try await uploadAfbeelding(afbeelding)
        }

        if let bestaand {
            struct Update: Encodable {
                let type: String
                let naam: String
                let beschrijving: String?
                let materialen: [String]
                let activiteit_id: String?
                let afbeelding_url: String?
            }
            try await SupabaseManager.client
                .from("week_activiteiten")
                .update(Update(type: type.rawValue, naam: naam, beschrijving: beschrijving, materialen: materialen, activiteit_id: activiteitId, afbeelding_url: afbeeldingUrl))
                .eq("id", value: bestaand.id)
                .execute()
        } else {
            struct Insert: Encodable {
                let planning_id: String
                let type: String
                let naam: String
                let beschrijving: String?
                let materialen: [String]
                let activiteit_id: String?
                let afbeelding_url: String?
            }
            try await SupabaseManager.client
                .from("week_activiteiten")
                .insert(Insert(planning_id: planningId, type: type.rawValue, naam: naam, beschrijving: beschrijving, materialen: materialen, activiteit_id: activiteitId, afbeelding_url: afbeeldingUrl))
                .execute()
        }
    }

    static func verwijderActiviteit(id: String) async throws {
        try await SupabaseManager.client
            .from("week_activiteiten")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    /// Zelfde als de webapp: de foto gaat naar de gedeelde bucket en de publieke
    /// URL komt in `afbeelding_url` van de weekactiviteit te staan. De foto van
    /// een bibliotheekactiviteit blijft ongemoeid.
    private static func uploadAfbeelding(_ data: Data) async throws -> String {
        let pad = "week-activiteit-\(UUID().uuidString).jpg"
        try await SupabaseManager.client.storage
            .from("activiteit-afbeeldingen")
            .upload(pad, data: data, options: FileOptions(contentType: "image/jpeg", upsert: true))
        return Secrets.supabaseURL
            .appendingPathComponent("storage/v1/object/public/activiteit-afbeeldingen/\(pad)")
            .absoluteString
    }
}
