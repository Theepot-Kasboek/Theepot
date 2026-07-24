import Foundation

/// Spiegelt app/weekplanningen/page.tsx — alleen-lezen in iOS.
enum WeekplanningenService {
    static func maandaagVanWeek(_ datum: Date) -> Date {
        var cal = Calendar(identifier: .iso8601)
        cal.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        return cal.startOfDay(for: cal.dateInterval(of: .weekOfYear, for: datum)?.start ?? datum)
    }

    static func toegankelijkeLocaties(magAllesZien: Bool, locatieToegang: [LocatieToegangRow]) async throws -> [Locatie] {
        let alle = try await LocatieService.actieveLocaties()
        if magAllesZien { return alle }
        let toegestaan = Set(locatieToegang.filter { $0.locatieType == "weekplanningen" && $0.toegang != .geen }.map(\.locatieNaam))
        return alle.filter { toegestaan.contains($0.naam) }
    }

    static func planning(locatieNaam: String, weekStart: Date) async throws -> (WeekPlanning, [WeekActiviteit])? {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "Europe/Amsterdam")
        let weekStartStr = f.string(from: maandaagVanWeek(weekStart))

        let planning: WeekPlanning? = try? await SupabaseManager.client
            .from("week_planningen")
            .select()
            .eq("locatie_naam", value: locatieNaam)
            .eq("week_start", value: weekStartStr)
            .single()
            .execute()
            .value

        guard let planning else { return nil }

        let activiteiten: [WeekActiviteit] = try await SupabaseManager.client
            .from("week_activiteiten")
            .select()
            .eq("planning_id", value: planning.id)
            .execute()
            .value

        return (planning, activiteiten)
    }
}
