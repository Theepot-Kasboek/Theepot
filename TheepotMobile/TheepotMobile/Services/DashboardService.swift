import Foundation

/// Beheert enkel de widget-volgorde-voorkeur (tabel `dashboard_voorkeuren`).
/// De widget-databerekeningen zelf blijven in hun eigen services
/// (PrikbordService, KilometerstandenService, MaaltijdlijstService, TakenService).
enum DashboardService {
    /// Geeft `[]` terug als er nog geen rij bestaat voor dit profiel (nieuwe gebruiker).
    static func laadVoorkeuren(profielId: String) async -> [String] {
        let rij: DashboardVoorkeurenRow? = try? await SupabaseManager.client
            .from("dashboard_voorkeuren")
            .select()
            .eq("profiel_id", value: profielId)
            .single()
            .execute()
            .value
        return rij?.widgetVolgorde ?? []
    }

    static func bewaarVolgorde(profielId: String, volgorde: [String]) async throws {
        struct Upsert: Encodable {
            let profiel_id: String
            let widget_volgorde: [String]
            let bijgewerkt_op: String
        }
        try await SupabaseManager.client
            .from("dashboard_voorkeuren")
            .upsert(Upsert(profiel_id: profielId, widget_volgorde: volgorde, bijgewerkt_op: ISO8601DateFormatter().string(from: Date())), onConflict: "profiel_id")
            .execute()
    }
}
