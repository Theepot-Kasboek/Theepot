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

    /// Voor de dashboard-widget: het voertuig met de eerstvolgende deadline,
    /// over alle actieve voertuigen (geen locatie-scoping — die bestaat nergens
    /// voor kilometerstanden, ook niet in de webapp). Eén query op alle
    /// registraties i.p.v. N losse `laatsteStand`-calls.
    struct KilometersDashboardStatus {
        let voertuig: KmVoertuig
        let dagenTotDeadline: Int?
        let kleurHex: String
    }

    static func samenvatting() async throws -> KilometersDashboardStatus? {
        let voertuigen = try await voertuigen()
        guard !voertuigen.isEmpty else { return nil }

        struct Rij: Decodable { let voertuig_id: String; let datum: String }
        let regs: [Rij] = try await SupabaseManager.client
            .from("km_registraties")
            .select("voertuig_id, datum")
            .in("voertuig_id", values: voertuigen.map(\.id))
            .order("datum", ascending: false)
            .execute()
            .value

        var laatsteDatumPerVoertuig: [String: String] = [:]
        for rij in regs where laatsteDatumPerVoertuig[rij.voertuig_id] == nil {
            laatsteDatumPerVoertuig[rij.voertuig_id] = rij.datum
        }

        let statussen: [KilometersDashboardStatus] = voertuigen.map { voertuig in
            let volgende = laatsteDatumPerVoertuig[voertuig.id].flatMap { volgendeDeadline(laatsteDatum: $0, voertuig: voertuig) }
            return KilometersDashboardStatus(voertuig: voertuig, dagenTotDeadline: volgende.map(dagenTot), kleurHex: kleur(voor: volgende))
        }
        // Voertuig zonder enige registratie heeft geen deadline — negeer die voor
        // "eerstvolgende", tenzij geen enkel voertuig een deadline heeft.
        return statussen.filter { $0.dagenTotDeadline != nil }.min { $0.dagenTotDeadline! < $1.dagenTotDeadline! } ?? statussen.first
    }

    /// Identiek aan volgendeDatum() in app/kilometerstanden/page.tsx.
    private static func volgendeDeadline(laatsteDatum: String, voertuig: KmVoertuig) -> Date? {
        let parser = DateFormatter()
        parser.dateFormat = "yyyy-MM-dd"
        parser.timeZone = TimeZone(identifier: "Europe/Amsterdam")
        guard let laatste = parser.date(from: laatsteDatum) else { return nil }

        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        switch voertuig.regelmaatEenheid {
        case .week:
            return cal.date(byAdding: .day, value: 7 * voertuig.regelmaatAantal, to: laatste)
        case .kwartaal:
            return cal.date(byAdding: .month, value: 3, to: laatste) // zelfde als webapp: altijd 3 maanden, regelmaat_aantal genegeerd
        case .maand:
            return cal.date(byAdding: .month, value: voertuig.regelmaatAantal, to: laatste)
        }
    }

    private static func dagenTot(_ datum: Date) -> Int {
        Calendar.current.dateComponents([.day], from: Date(), to: datum).day ?? 0
    }

    /// Identiek aan statusKleur() in app/kilometerstanden/page.tsx.
    private static func kleur(voor datum: Date?) -> String {
        guard let datum else { return "#888" }
        let dagen = Calendar.current.dateComponents([.day], from: Date(), to: datum).day ?? 0
        if dagen < 0 { return "#EF4444" }
        if dagen < 14 { return "#F59E0B" }
        return "#8CC63F"
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
