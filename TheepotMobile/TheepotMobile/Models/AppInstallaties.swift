import Foundation

/// Spiegelt app/app-installaties/page.tsx — alleen zichtbaar/bewerkbaar voor
/// superadmins (zie Sidebar.tsx, superadminOnly).
enum AppPlatform: String, Codable, CaseIterable {
    case ios, android

    var label: String { self == .ios ? "iOS" : "Android" }
}

/// Tabel `app_versies`.
struct AppVersie: Codable, Identifiable, Hashable {
    let id: String
    var platform: AppPlatform
    var versie: String
    var wijzigingen: String?
    var uitgebrachtOp: String
    let aangemaaktOp: String

    enum CodingKeys: String, CodingKey {
        case id, platform, versie, wijzigingen
        case uitgebrachtOp = "uitgebracht_op"
        case aangemaaktOp = "aangemaakt_op"
    }
}

/// Tabel `app_installaties`.
struct AppInstallatie: Codable, Identifiable, Hashable {
    let id: String
    var apparaatNaam: String
    var platform: AppPlatform
    var versieId: String?
    var nietGeinstalleerd: Bool
    var notitie: String?
    var geinstalleerdOp: String
    let aangemaaktOp: String

    enum CodingKeys: String, CodingKey {
        case id
        case apparaatNaam = "apparaat_naam"
        case platform
        case versieId = "versie_id"
        case nietGeinstalleerd = "niet_geinstalleerd"
        case notitie
        case geinstalleerdOp = "geinstalleerd_op"
        case aangemaaktOp = "aangemaakt_op"
    }
}
