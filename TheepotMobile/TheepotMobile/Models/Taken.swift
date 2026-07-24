import Foundation

enum TodoLijstType: String, Codable {
    case taken, notities
}

/// Tabel `todo_lijsten`.
struct TodoLijst: Codable, Identifiable, Hashable {
    let id: String
    var naam: String
    var kleur: String
    let eigenaarId: String
    var volgorde: Int
    let type: TodoLijstType

    enum CodingKeys: String, CodingKey {
        case id, naam, kleur
        case eigenaarId = "eigenaar_id"
        case volgorde, type
    }
}

enum Prioriteit: Int, Codable, CaseIterable {
    case geen = 0, laag = 1, medium = 2, hoog = 3

    var label: String {
        switch self {
        case .geen: return "Geen"
        case .laag: return "Laag"
        case .medium: return "Medium"
        case .hoog: return "Hoog"
        }
    }

    var kleurHex: String {
        switch self {
        case .geen: return "#9CA3AF"
        case .laag: return "#3B82F6"
        case .medium: return "#F59E0B"
        case .hoog: return "#EF4444"
        }
    }
}

/// Tabel `todo_taken`.
struct TodoTaak: Codable, Identifiable, Hashable {
    let id: String
    let lijstId: String
    var titel: String
    var notitie: String?
    var voltooid: Bool
    var prioriteit: Prioriteit
    var vervaldatum: String?
    var volgorde: Int
    var voltooidOp: String?

    enum CodingKeys: String, CodingKey {
        case id
        case lijstId = "lijst_id"
        case titel, notitie, voltooid, prioriteit, vervaldatum, volgorde
        case voltooidOp = "voltooid_op"
    }

    var isVerlopen: Bool {
        guard !voltooid, let vervaldatum else { return false }
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        guard let datum = f.date(from: vervaldatum) else { return false }
        return datum < Calendar.current.startOfDay(for: Date())
    }

    var isVandaag: Bool {
        guard let vervaldatum else { return false }
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return vervaldatum == f.string(from: Date())
    }
}

/// Tabel `notities`.
struct Notitie: Codable, Identifiable {
    let id: String
    let lijstId: String
    var titel: String
    var inhoud: String
    var kleur: String
    var volgorde: Int
    var bijgewerktOp: String

    enum CodingKeys: String, CodingKey {
        case id
        case lijstId = "lijst_id"
        case titel, inhoud, kleur, volgorde
        case bijgewerktOp = "bijgewerkt_op"
    }
}
