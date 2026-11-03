import Foundation

/// Spiegelt app/app-installaties/page.tsx.
enum AppInstallatiesService {
    static func versies() async throws -> [AppVersie] {
        try await SupabaseManager.client
            .from("app_versies")
            .select()
            .order("platform")
            .order("aangemaakt_op", ascending: false)
            .execute()
            .value
    }

    static func installaties() async throws -> [AppInstallatie] {
        try await SupabaseManager.client
            .from("app_installaties")
            .select()
            .order("apparaat_naam")
            .execute()
            .value
    }

    static func maakVersieAan(platform: AppPlatform, versie: String, wijzigingen: String?, uitgebrachtOp: String) async throws {
        struct Insert: Encodable {
            let platform: String
            let versie: String
            let wijzigingen: String?
            let uitgebracht_op: String
        }
        try await SupabaseManager.client
            .from("app_versies")
            .insert(Insert(platform: platform.rawValue, versie: versie, wijzigingen: wijzigingen, uitgebracht_op: uitgebrachtOp))
            .execute()
    }

    static func werkVersieBij(id: String, platform: AppPlatform, versie: String, wijzigingen: String?, uitgebrachtOp: String) async throws {
        struct Update: Encodable {
            let platform: String
            let versie: String
            let wijzigingen: String?
            let uitgebracht_op: String
        }
        try await SupabaseManager.client
            .from("app_versies")
            .update(Update(platform: platform.rawValue, versie: versie, wijzigingen: wijzigingen, uitgebracht_op: uitgebrachtOp))
            .eq("id", value: id)
            .execute()
    }

    static func verwijderVersie(id: String) async throws {
        try await SupabaseManager.client
            .from("app_versies")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    static func maakApparaatAan(apparaatNaam: String, platform: AppPlatform, versieId: String?, nietGeinstalleerd: Bool, notitie: String?, geinstalleerdOp: String) async throws {
        struct Insert: Encodable {
            let apparaat_naam: String
            let platform: String
            let versie_id: String?
            let niet_geinstalleerd: Bool
            let notitie: String?
            let geinstalleerd_op: String
        }
        try await SupabaseManager.client
            .from("app_installaties")
            .insert(Insert(apparaat_naam: apparaatNaam, platform: platform.rawValue, versie_id: versieId, niet_geinstalleerd: nietGeinstalleerd, notitie: notitie, geinstalleerd_op: geinstalleerdOp))
            .execute()
    }

    static func werkApparaatBij(id: String, apparaatNaam: String, platform: AppPlatform, versieId: String?, nietGeinstalleerd: Bool, notitie: String?, geinstalleerdOp: String) async throws {
        struct Update: Encodable {
            let apparaat_naam: String
            let platform: String
            let versie_id: String?
            let niet_geinstalleerd: Bool
            let notitie: String?
            let geinstalleerd_op: String
        }
        try await SupabaseManager.client
            .from("app_installaties")
            .update(Update(apparaat_naam: apparaatNaam, platform: platform.rawValue, versie_id: versieId, niet_geinstalleerd: nietGeinstalleerd, notitie: notitie, geinstalleerd_op: geinstalleerdOp))
            .eq("id", value: id)
            .execute()
    }

    static func verwijderApparaat(id: String) async throws {
        try await SupabaseManager.client
            .from("app_installaties")
            .delete()
            .eq("id", value: id)
            .execute()
    }
}
