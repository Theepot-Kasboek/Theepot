import Foundation

/// Spiegelt app/taken/page.tsx. Privacy per account is client-side (eigenaar_id
/// filter), niet via RLS — zelfde patroon overnemen.
enum TakenService {
    static func lijsten(eigenaarId: String) async throws -> [TodoLijst] {
        try await SupabaseManager.client
            .from("todo_lijsten")
            .select()
            .eq("eigenaar_id", value: eigenaarId)
            .order("volgorde")
            .execute()
            .value
    }

    static func maakLijst(naam: String, kleur: String, type: TodoLijstType, eigenaarId: String, volgorde: Int) async throws -> TodoLijst {
        struct Insert: Encodable {
            let naam: String; let kleur: String; let type: String; let eigenaar_id: String; let volgorde: Int
        }
        return try await SupabaseManager.client
            .from("todo_lijsten")
            .insert(Insert(naam: naam, kleur: kleur, type: type.rawValue, eigenaar_id: eigenaarId, volgorde: volgorde))
            .select()
            .single()
            .execute()
            .value
    }

    static func verwijderLijst(id: String) async throws {
        try await SupabaseManager.client.from("todo_lijsten").delete().eq("id", value: id).execute()
    }

    static func taken(lijstIds: [String]) async throws -> [TodoTaak] {
        guard !lijstIds.isEmpty else { return [] }
        return try await SupabaseManager.client
            .from("todo_taken")
            .select()
            .in("lijst_id", values: lijstIds)
            .execute()
            .value
    }

    static func maakTaak(lijstId: String, titel: String, volgorde: Int) async throws -> TodoTaak {
        struct Insert: Encodable { let lijst_id: String; let titel: String; let volgorde: Int }
        return try await SupabaseManager.client
            .from("todo_taken")
            .insert(Insert(lijst_id: lijstId, titel: titel, volgorde: volgorde))
            .select()
            .single()
            .execute()
            .value
    }

    static func toggleVoltooid(id: String, voltooid: Bool) async throws {
        struct Update: Encodable { let voltooid: Bool; let voltooid_op: String? }
        try await SupabaseManager.client
            .from("todo_taken")
            .update(Update(voltooid: voltooid, voltooid_op: voltooid ? ISO8601DateFormatter().string(from: Date()) : nil))
            .eq("id", value: id)
            .execute()
    }

    static func werkTitelNotitieBij(id: String, titel: String, notitie: String?) async throws {
        struct Update: Encodable { let titel: String; let notitie: String? }
        try await SupabaseManager.client.from("todo_taken").update(Update(titel: titel, notitie: notitie)).eq("id", value: id).execute()
    }

    static func werkPrioriteitBij(id: String, prioriteit: Prioriteit) async throws {
        struct Update: Encodable { let prioriteit: Int }
        try await SupabaseManager.client.from("todo_taken").update(Update(prioriteit: prioriteit.rawValue)).eq("id", value: id).execute()
    }

    static func werkVervaldatumBij(id: String, vervaldatum: String?) async throws {
        struct Update: Encodable { let vervaldatum: String? }
        try await SupabaseManager.client.from("todo_taken").update(Update(vervaldatum: vervaldatum)).eq("id", value: id).execute()
    }

    static func werkLijstBij(id: String, lijstId: String) async throws {
        struct Update: Encodable { let lijst_id: String }
        try await SupabaseManager.client.from("todo_taken").update(Update(lijst_id: lijstId)).eq("id", value: id).execute()
    }

    static func verwijderTaak(id: String) async throws {
        try await SupabaseManager.client.from("todo_taken").delete().eq("id", value: id).execute()
    }

    static func notities(lijstIds: [String]) async throws -> [Notitie] {
        guard !lijstIds.isEmpty else { return [] }
        return try await SupabaseManager.client
            .from("notities")
            .select()
            .in("lijst_id", values: lijstIds)
            .order("volgorde")
            .execute()
            .value
    }

    static func maakNotitie(lijstId: String, volgorde: Int) async throws -> Notitie {
        struct Insert: Encodable { let lijst_id: String; let titel: String; let inhoud: String; let kleur: String; let volgorde: Int }
        return try await SupabaseManager.client
            .from("notities")
            .insert(Insert(lijst_id: lijstId, titel: "Nieuwe notitie", inhoud: "", kleur: "#ffffff", volgorde: volgorde))
            .select()
            .single()
            .execute()
            .value
    }

    static func slaNotitieOp(id: String, titel: String, inhoud: String, kleur: String) async throws {
        struct Update: Encodable { let titel: String; let inhoud: String; let kleur: String; let bijgewerkt_op: String }
        try await SupabaseManager.client
            .from("notities")
            .update(Update(titel: titel.isEmpty ? "Nieuwe notitie" : titel, inhoud: inhoud, kleur: kleur, bijgewerkt_op: ISO8601DateFormatter().string(from: Date())))
            .eq("id", value: id)
            .execute()
    }

    static func verwijderNotitie(id: String) async throws {
        try await SupabaseManager.client.from("notities").delete().eq("id", value: id).execute()
    }
}
