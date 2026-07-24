import Foundation

/// Spiegelt app/kilometerstanden/page.tsx — iOS mag alleen standen invullen,
/// geen voertuigbeheer.
enum KilometerstandenService {
    static func voertuigen() async throws -> [KmVoertuig] {
        try await SupabaseManager.client
            .from("km_voertuigen")
            .select()
            .eq("actief", value: true)
            .order("aangemaakt_op")
            .execute()
            .value
    }

    /// Laatste (meest recente) stand voor een voertuig, voor de validatie.
    static func laatsteStand(voertuigId: String) async throws -> Int? {
        struct Rij: Decodable { let kilometerstand: Int }
        let rij: Rij? = try? await SupabaseManager.client
            .from("km_registraties")
            .select("kilometerstand")
            .eq("voertuig_id", value: voertuigId)
            .order("datum", ascending: false)
            .limit(1)
            .single()
            .execute()
            .value
        return rij?.kilometerstand
    }

    /// Voegt een nieuwe stand toe. Gooit een fout als de stand niet hoger is dan
    /// de laatst bekende stand (zelfde validatie als de webapp).
    static func voegToe(voertuigId: String, kilometerstand: Int, datum: String, notitie: String?, ingevoerdDoor: String) async throws {
        if let laatste = try await laatsteStand(voertuigId: voertuigId), kilometerstand <= laatste {
            throw KilometerstandenFout.nietHogerDanLaatste(laatste)
        }
        struct Insert: Encodable {
            let voertuig_id: String
            let kilometerstand: Int
            let datum: String
            let notitie: String?
            let ingevoerd_door: String
        }
        try await SupabaseManager.client
            .from("km_registraties")
            .insert(Insert(voertuig_id: voertuigId, kilometerstand: kilometerstand, datum: datum, notitie: notitie, ingevoerd_door: ingevoerdDoor))
            .execute()
    }
}

enum KilometerstandenFout: LocalizedError {
    case nietHogerDanLaatste(Int)

    var errorDescription: String? {
        switch self {
        case .nietHogerDanLaatste(let laatste):
            return "De nieuwe stand moet hoger zijn dan de laatste bekende stand (\(laatste))."
        }
    }
}
