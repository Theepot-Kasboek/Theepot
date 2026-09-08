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

    static func voegToe(locatieNaam: String, periode: String, type: KasboekType, bedrag: Double, categorie: String?, datum: String?, omschrijving: String?, aangemaaktDoor: String, bonnetjeData: Data?, bonnetjeBestandsnaam: String?) async throws {
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
            let datum: String?
            let omschrijving: String?
            let bedrag: Double
            let type: String
            let aangemaakt_door: String
            let locatie: String
            let bonnetje_pad: String?
        }
        try await SupabaseManager.client
            .from("kasboek_entries")
            .insert(Insert(periode: periode, categorie: categorie, datum: datum, omschrijving: omschrijving, bedrag: bedrag, type: type.rawValue, aangemaakt_door: aangemaaktDoor, locatie: locatieNaam, bonnetje_pad: bonnetjePad))
            .execute()
    }

    /// Publiceer- of verberg-status van een locatie/maand ophalen (nil = nog geen rij, dus niet gepubliceerd).
    static func periodeStatus(locatieNaam: String, periode: String) async throws -> Bool {
        struct Rij: Decodable { let gepubliceerd: Bool }
        let rijen: [Rij] = try await SupabaseManager.client
            .from("kasboek_periode_status")
            .select("gepubliceerd")
            .eq("locatie_naam", value: locatieNaam)
            .eq("periode", value: periode)
            .execute()
            .value
        return rijen.first?.gepubliceerd ?? false
    }

    static func togglePubliceer(locatieNaam: String, periode: String, nieuweWaarde: Bool, doorNaam: String?) async throws {
        struct Upsert: Encodable {
            let locatie_naam: String
            let periode: String
            let gepubliceerd: Bool
            let gepubliceerd_op: String?
            let gepubliceerd_door: String?
        }
        try await SupabaseManager.client
            .from("kasboek_periode_status")
            .upsert(
                Upsert(
                    locatie_naam: locatieNaam,
                    periode: periode,
                    gepubliceerd: nieuweWaarde,
                    gepubliceerd_op: nieuweWaarde ? ISO8601DateFormatter().string(from: Date()) : nil,
                    gepubliceerd_door: doorNaam
                ),
                onConflict: "locatie_naam,periode"
            )
            .execute()
    }

    /// Past een bestaande boeking aan. Een vervangen of verwijderd bonnetje wordt pas
    /// uit de opslag gehaald nadat de boeking succesvol is bijgewerkt.
    static func werkBij(entry: KasboekEntry, type: KasboekType, bedrag: Double, categorie: String?, datum: String?, omschrijving: String?, nieuwBonnetje: Data?, bonnetjeVerwijderen: Bool) async throws {
        var bonnetjePad = entry.bonnetjePad
        if let data = nieuwBonnetje {
            let pad = "\(entry.locatie)/\(entry.periode)/\(Int(Date().timeIntervalSince1970 * 1000))_bonnetje.jpg"
            try await SupabaseManager.client.storage
                .from("bonnetjes")
                .upload(pad, data: data, options: FileOptions(contentType: "image/jpeg"))
            bonnetjePad = pad
        } else if bonnetjeVerwijderen {
            bonnetjePad = nil
        }

        struct Update: Encodable {
            let type: String
            let bedrag: Double
            let categorie: String?
            let datum: String?
            let omschrijving: String?
            let bonnetjePad: String?

            enum CodingKeys: String, CodingKey {
                case type, bedrag, categorie, datum, omschrijving
                case bonnetjePad = "bonnetje_pad"
            }

            /// Handmatig coderen omdat de standaard Codable-synthese nil-velden weglaat;
            /// een leeggemaakt veld moet juist expliciet als null naar de database.
            func encode(to encoder: Encoder) throws {
                var container = encoder.container(keyedBy: CodingKeys.self)
                try container.encode(type, forKey: .type)
                try container.encode(bedrag, forKey: .bedrag)
                if let categorie { try container.encode(categorie, forKey: .categorie) } else { try container.encodeNil(forKey: .categorie) }
                if let datum { try container.encode(datum, forKey: .datum) } else { try container.encodeNil(forKey: .datum) }
                if let omschrijving { try container.encode(omschrijving, forKey: .omschrijving) } else { try container.encodeNil(forKey: .omschrijving) }
                if let bonnetjePad { try container.encode(bonnetjePad, forKey: .bonnetjePad) } else { try container.encodeNil(forKey: .bonnetjePad) }
            }
        }

        try await SupabaseManager.client
            .from("kasboek_entries")
            .update(Update(type: type.rawValue, bedrag: bedrag, categorie: categorie, datum: datum, omschrijving: omschrijving, bonnetjePad: bonnetjePad))
            .eq("id", value: entry.id)
            .execute()

        if let oudPad = entry.bonnetjePad, oudPad != bonnetjePad {
            _ = try? await SupabaseManager.client.storage.from("bonnetjes").remove(paths: [oudPad])
        }
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
