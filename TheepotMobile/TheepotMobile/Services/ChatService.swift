import Foundation
import Supabase

/// Spiegelt app/chat/page.tsx.
enum ChatService {
    /// Gesprekken waar de gebruiker deelnemer van is.
    static func gesprekken(profielId: String) async throws -> [ChatGesprek] {
        struct Rij: Decodable { let gesprek_id: String }
        let rijen: [Rij] = try await SupabaseManager.client
            .from("chat_deelnemers")
            .select("gesprek_id")
            .eq("profiel_id", value: profielId)
            .execute()
            .value

        let ids = rijen.map(\.gesprek_id)
        guard !ids.isEmpty else { return [] }

        let gesprekken: [ChatGesprek] = try await SupabaseManager.client
            .from("chat_gesprekken")
            .select()
            .in("id", values: ids)
            .order("laatste_bericht_op", ascending: false)
            .execute()
            .value
        return gesprekken
    }

    static func deelnemers(gesprekId: String) async throws -> [ChatDeelnemer] {
        try await SupabaseManager.client
            .from("chat_deelnemers")
            .select("*, profiel:profielen(*)")
            .eq("gesprek_id", value: gesprekId)
            .execute()
            .value
    }

    static func alleProfielen() async throws -> [Profiel] {
        try await SupabaseManager.client
            .from("profielen")
            .select()
            .execute()
            .value
    }

    static func berichten(gesprekId: String) async throws -> [ChatBericht] {
        try await SupabaseManager.client
            .from("chat_berichten")
            .select()
            .eq("gesprek_id", value: gesprekId)
            .order("verstuurd_op")
            .execute()
            .value
    }

    static func markeerGelezen(bericht: ChatBericht, profielId: String) async throws {
        var gelezen = bericht.gelezenDoor ?? []
        gelezen.append(profielId)
        struct Update: Encodable { let gelezen_door: [String] }
        try await SupabaseManager.client
            .from("chat_berichten")
            .update(Update(gelezen_door: gelezen))
            .eq("id", value: bericht.id)
            .execute()
    }

    static func verstuurTekst(gesprekId: String, afzenderId: String, tekst: String) async throws {
        struct Insert: Encodable {
            let gesprek_id: String
            let afzender_id: String
            let inhoud: String
            let gelezen_door: [String]
        }
        try await SupabaseManager.client
            .from("chat_berichten")
            .insert(Insert(gesprek_id: gesprekId, afzender_id: afzenderId, inhoud: tekst, gelezen_door: [afzenderId]))
            .execute()
        try await bumpLaatsteBericht(gesprekId: gesprekId)
    }

    /// Upload een bestand naar bucket `chat-bestanden` en verstuurt het als bericht.
    /// Padpatroon spiegelt de webapp: chat/{gesprek_id}/{timestamp}_{bestandsnaam}.
    static func verstuurBestand(gesprekId: String, afzenderId: String, data: Data, bestandsnaam: String, mimeType: String) async throws {
        let veiligeNaam = bestandsnaam.replacingOccurrences(of: "[^a-zA-Z0-9._-]", with: "_", options: .regularExpression)
        let pad = "chat/\(gesprekId)/\(Int(Date().timeIntervalSince1970 * 1000))_\(veiligeNaam)"

        try await SupabaseManager.client.storage
            .from("chat-bestanden")
            .upload(pad, data: data, options: FileOptions(contentType: mimeType))

        struct Insert: Encodable {
            let gesprek_id: String
            let afzender_id: String
            let inhoud: String
            let gelezen_door: [String]
            let bericht_type: String
            let bestand_pad: String
            let bestand_naam: String
            let bestand_type: String
        }
        try await SupabaseManager.client
            .from("chat_berichten")
            .insert(Insert(gesprek_id: gesprekId, afzender_id: afzenderId, inhoud: bestandsnaam, gelezen_door: [afzenderId], bericht_type: "bestand", bestand_pad: pad, bestand_naam: bestandsnaam, bestand_type: mimeType))
            .execute()
        try await bumpLaatsteBericht(gesprekId: gesprekId)
    }

    static func downloadBestand(pad: String) async throws -> Data {
        try await SupabaseManager.client.storage
            .from("chat-bestanden")
            .download(path: pad)
    }

    private static func bumpLaatsteBericht(gesprekId: String) async throws {
        struct Update: Encodable { let laatste_bericht_op: String }
        try await SupabaseManager.client
            .from("chat_gesprekken")
            .update(Update(laatste_bericht_op: ISO8601DateFormatter().string(from: Date())))
            .eq("id", value: gesprekId)
            .execute()
    }

    static func nieuwGesprek(naam: String, type: ChatType, deelnemerIds: [String]) async throws -> ChatGesprek {
        struct Insert: Encodable { let naam: String; let type: String }
        let gesprek: ChatGesprek = try await SupabaseManager.client
            .from("chat_gesprekken")
            .insert(Insert(naam: naam, type: type.rawValue))
            .select()
            .single()
            .execute()
            .value

        struct DeelnemerInsert: Encodable { let gesprek_id: String; let profiel_id: String }
        try await SupabaseManager.client
            .from("chat_deelnemers")
            .insert(deelnemerIds.map { DeelnemerInsert(gesprek_id: gesprek.id, profiel_id: $0) })
            .execute()

        return gesprek
    }

    /// Live-abonnement op nieuwe berichten in een gesprek (alleen INSERT, net als de webapp).
    static func abonneerOpBerichten(gesprekId: String, onInsert: @escaping () -> Void) -> RealtimeChannelV2 {
        let channel = SupabaseManager.client.realtimeV2.channel("chat-\(gesprekId)")
        Task {
            let changes = channel.postgresChange(InsertAction.self, schema: "public", table: "chat_berichten", filter: "gesprek_id=eq.\(gesprekId)")
            await channel.subscribe()
            for await _ in changes {
                onInsert()
            }
        }
        return channel
    }
}
