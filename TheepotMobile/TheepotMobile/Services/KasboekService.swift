import Foundation
import Supabase

/// Spiegelt app/kasboek/page.tsx (zonder categorie/locatiebeheer en PDF-export — niet nodig in iOS).
enum KasboekService {
    static func periodeSleutel(_ datum: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM"
        f.timeZone = TimeZone(identifier: "Europe/Amsterdam")
        return f.string(from: datum)
    }

    static func categorieen() async throws -> [String] {
        struct Rij: Decodable { let naam: String }
        let rijen: [Rij] = try await SupabaseManager.client
            .from("kasboek_categorieen")
            .select("naam")
            .order("naam")
            .execute()
            .value
        let namen = rijen.map(\.naam)
        return namen.isEmpty ? KasboekCategorieen.standaard : namen
    }

    static func entries(locatieNaam: String, periode: String) async throws -> [KasboekEntry] {
        try await SupabaseManager.client
            .from("kasboek_entries")
            .select()
            .eq("locatie", value: locatieNaam)
            .eq("periode", value: periode)
            .order("aangemaakt_op", ascending: false)
            .execute()
            .value
    }

    /// Som van alle boekingen uit voorgaande maanden, zodat het saldo doorloopt i.p.v. elke maand opnieuw bij nul te beginnen.
    static func beginsaldo(locatieNaam: String, voorPeriode: String) async throws -> Double {
        struct BedragRij: Decodable { let bedrag: Double; let type: String }
        let rijen: [BedragRij] = try await SupabaseManager.client
            .from("kasboek_entries")
            .select("bedrag, type")
            .eq("locatie", value: locatieNaam)
            .lt("periode", value: voorPeriode)
            .execute()
            .value
        return rijen.reduce(0) { $0 + ($1.type == "inkomst" ? $1.bedrag : -$1.bedrag) }
    }

    static func voegToe(locatieNaam: String, periode: String, type: KasboekType, bedrag: Double, categorie: String?, omschrijving: String?, aangemaaktDoor: String, bonnetjeData: Data?, bonnetjeBestandsnaam: String?) async throws {
        var bonnetjePad: String?
        if let data = bonnetjeData, let naam = bonnetjeBestandsnaam {
            let pad = "\(locatieNaam)/\(periode)/\(Int(Date().timeIntervalSince1970 * 1000))_\(naam)"
            try await SupabaseManager.client.storage
                .from("bonnetjes")
                .upload(pad, data: data, options: FileOptions(contentType: "image/jpeg"))
            bonnetjePad = pad
        }

        struct Insert: Encodable {
            let periode: String
            let categorie: String?
            let omschrijving: String?
            let bedrag: Double
            let type: String
            let aangemaakt_door: String
            let locatie: String
            let bonnetje_pad: String?
        }
        try await SupabaseManager.client
            .from("kasboek_entries")
            .insert(Insert(periode: periode, categorie: categorie, omschrijving: omschrijving, bedrag: bedrag, type: type.rawValue, aangemaakt_door: aangemaaktDoor, locatie: locatieNaam, bonnetje_pad: bonnetjePad))
            .execute()
    }

    static func verwijder(id: String) async throws {
        try await SupabaseManager.client
            .from("kasboek_entries")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    static func downloadBonnetje(pad: String) async throws -> Data {
        try await SupabaseManager.client.storage
            .from("bonnetjes")
            .download(path: pad)
    }
}
