import Foundation

/// Spiegelt de `profielen`-tabel en `Rol`-type uit lib/supabase.ts.
enum Rol: String, Codable, Equatable {
    case superadmin
    case directie
    case leidinggevende
    case locatie

    var label: String {
        switch self {
        case .superadmin: return "Superadmin"
        case .directie: return "Directie"
        case .leidinggevende: return "Leidinggevende"
        case .locatie: return "Locatie"
        }
    }
}

struct Profiel: Codable, Identifiable {
    let id: UUID
    let email: String
    let naam: String
    let rol: Rol
    let actief: Bool
    let aangemaaktOp: String

    enum CodingKeys: String, CodingKey {
        case id, email, naam, rol, actief
        case aangemaaktOp = "aangemaakt_op"
    }
}
