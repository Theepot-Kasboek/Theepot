import Foundation

/// Tabel `kasboek_locaties` — gedeelde locatielijst, hergebruikt door kasboek,
/// maaltijdlijst, prikbord en weekplanningen (net als in de webapp).
struct Locatie: Codable, Identifiable, Hashable {
    let id: String
    let naam: String
    let actief: Bool
}

enum LocatieService {
    static func actieveLocaties() async throws -> [Locatie] {
        try await SupabaseManager.client
            .from("kasboek_locaties")
            .select()
            .eq("actief", value: true)
            .order("naam")
            .execute()
            .value
    }
}
