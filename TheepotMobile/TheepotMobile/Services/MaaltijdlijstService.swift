import Foundation
import Supabase

/// Spiegelt app/maaltijdlijst/page.tsx. iOS heeft hier alleen "aanwezig"
/// (meegegeten) toggelen nodig; standaard-kinderenbeheer hoort niet in scope.
enum MaaltijdlijstService {
    static func maandaagVanWeek(_ datum: Date) -> Date {
        var cal = Calendar(identifier: .iso8601)
        cal.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        let start = cal.dateInterval(of: .weekOfYear, for: datum)?.start ?? datum
        return cal.startOfDay(for: start)
    }

    static func toDateStr(_ datum: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "Europe/Amsterdam")
        return f.string(from: datum)
    }

    static func actieveLocaties() async throws -> [MaaltijdLocatie] {
        try await SupabaseManager.client
            .from("maaltijd_locaties")
            .select()
            .eq("actief", value: true)
            .order("naam")
            .execute()
            .value
    }

    /// Haalt registraties op voor locatie+week. Maakt de week + registraties aan
    /// (gekopieerd van standaard_kinderen) als deze nog niet bestaat, net als de webapp.
    static func registraties(locatieId: String, weekStart: Date) async throws -> [MaaltijdRegistratie] {
        let weekStartStr = toDateStr(maandaagVanWeek(weekStart))

        let bestaandeWeek: MaaltijdWeek? = try? await SupabaseManager.client
            .from("maaltijd_weken")
            .select()
            .eq("locatie_id", value: locatieId)
            .eq("week_start", value: weekStartStr)
            .single()
            .execute()
            .value

        let week: MaaltijdWeek
        if let bestaandeWeek {
            week = bestaandeWeek
        } else {
            let standaard: [StandaardKind] = try await SupabaseManager.client
                .from("maaltijd_standaard_kinderen")
                .select()
                .eq("locatie_id", value: locatieId)
                .execute()
                .value

            struct WeekInsert: Encodable {
                let locatie_id: String
                let maand: String
                let week_start: String
            }
            week = try await SupabaseManager.client
                .from("maaltijd_weken")
                .insert(WeekInsert(locatie_id: locatieId, maand: maandLabel(weekStartStr), week_start: weekStartStr))
                .select()
                .single()
                .execute()
                .value

            if !standaard.isEmpty {
                struct RegistratieInsert: Encodable {
                    let week_id: String
                    let dag: String
                    let naam: String
                    let bijzonderheden: String?
                    let aanwezig: Bool
                    let is_extra: Bool
                    let volgorde: Int
                }
                let inserts = standaard.map {
                    RegistratieInsert(week_id: week.id, dag: $0.dag.rawValue, naam: $0.naam, bijzonderheden: $0.bijzonderheden, aanwezig: true, is_extra: false, volgorde: $0.volgorde)
                }
                try await SupabaseManager.client.from("maaltijd_registraties").insert(inserts).execute()
            }
        }

        return try await SupabaseManager.client
            .from("maaltijd_registraties")
            .select()
            .eq("week_id", value: week.id)
            .order("volgorde")
            .execute()
            .value
    }

    static func toggleAanwezig(registratieId: String, nieuweWaarde: Bool) async throws {
        struct Update: Encodable { let aanwezig: Bool }
        try await SupabaseManager.client
            .from("maaltijd_registraties")
            .update(Update(aanwezig: nieuweWaarde))
            .eq("id", value: registratieId)
            .execute()
    }

    private static func maandLabel(_ weekStart: String) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        guard let datum = f.date(from: weekStart) else { return weekStart }
        let out = DateFormatter()
        out.dateFormat = "LLLL yyyy"
        out.locale = Locale(identifier: "nl_NL")
        return out.string(from: datum)
    }
}
