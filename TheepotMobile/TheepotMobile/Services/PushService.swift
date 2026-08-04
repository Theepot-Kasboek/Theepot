import Foundation
import UIKit
import UserNotifications
import Supabase

/// Beheert het APNs-devicetoken en de rij in `push_apparaten`. Analoog aan de
/// generieke pushlaag in lib/push.ts, maar dan de registratiekant.
///
/// LET OP: het exacte upsert/rpc-argument-formaat van supabase-swift kan per
/// pakketversie verschillen — controleer dit tegen de geïnstalleerde versie
/// in project.yml (zie plan-risico's) als de build hierop faalt.
@MainActor
final class PushService {
    static let shared = PushService()
    private init() {}

    private let tokenSleutel = "push_apparaat_token"

    private var opgeslagenToken: String? {
        get { UserDefaults.standard.string(forKey: tokenSleutel) }
        set { UserDefaults.standard.set(newValue, forKey: tokenSleutel) }
    }

    /// Profiel van de huidige sessie, bewaard zodat `ontvangenToken` de sync
    /// alsnog kan starten zodra het devicetoken binnenkomt — dat gebeurt
    /// asynchroon (via AppDelegate) en vaak pas ná `syncToken(profielId:)`.
    private var actieveProfielId: String?

    private var omgeving: String {
        #if DEBUG
        return "sandbox"
        #else
        return "productie"
        #endif
    }

    /// Vraagt toestemming en registreert voor remote notifications. Wordt ná
    /// login aangeroepen (niet bij appstart) — iOS geeft maar één kans om het
    /// te vragen, dus vragen op het moment dat de gebruiker de context snapt.
    func vraagToestemmingEnRegistreer(profielId: String) async {
        actieveProfielId = profielId
        let center = UNUserNotificationCenter.current()
        do {
            let toegestaan = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            guard toegestaan else {
                print("[Push] Gebruiker heeft pushtoestemming geweigerd")
                return
            }
            print("[Push] Toestemming verleend, registreert voor remote notifications")
            UIApplication.shared.registerForRemoteNotifications()
        } catch {
            print("[Push] requestAuthorization gaf een fout: \(error.localizedDescription)")
        }
    }

    /// Aangeroepen door AppDelegate zodra het devicetoken binnenkomt. Dit
    /// gebeurt asynchroon en meestal ná `vraagToestemmingEnRegistreer` +
    /// `syncToken(profielId:)` al zijn afgerond — dus sync hier opnieuw als
    /// we een actief profiel kennen, anders blijft `push_apparaten` leeg.
    func ontvangenToken(_ token: String) async {
        opgeslagenToken = token
        if let profielId = actieveProfielId {
            await syncToken(profielId: profielId)
        }
    }

    private struct NieuwApparaat: Encodable {
        let profielId: String
        let token: String
        let platform: String
        let omgeving: String
        let bundelId: String
        let appVersie: String?
        let apparaatNaam: String

        enum CodingKeys: String, CodingKey {
            case profielId = "profiel_id"
            case token, platform, omgeving
            case bundelId = "bundel_id"
            case appVersie = "app_versie"
            case apparaatNaam = "apparaat_naam"
        }
    }

    /// Upsert op `token` (niet `profiel_id + token`) — een token identificeert
    /// een apparaat, niet een gebruiker. Zo blijven meldingen van een vorige
    /// gebruiker op hetzelfde toestel niet hangen.
    func syncToken(profielId: String) async {
        guard let token = opgeslagenToken else {
            print("[Push] syncToken overgeslagen: nog geen devicetoken ontvangen van APNs")
            return
        }
        let apparaat = NieuwApparaat(
            profielId: profielId,
            token: token,
            platform: "ios",
            omgeving: omgeving,
            bundelId: Bundle.main.bundleIdentifier ?? "nl.bsodetheepot.mobile.dev",
            appVersie: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
            apparaatNaam: await UIDevice.current.name
        )
        do {
            try await SupabaseManager.client
                .from("push_apparaten")
                .upsert(apparaat, onConflict: "token")
                .execute()
            print("[Push] Token succesvol weggeschreven naar push_apparaten voor profiel \(profielId)")
        } catch {
            print("[Push] Upsert naar push_apparaten MISLUKT: \(error)")
        }
    }

    /// Verwijdert de rij bij uitloggen. Bewust NIET
    /// `unregisterForRemoteNotifications()` — het devicetoken blijft geldig
    /// en moet werken voor de volgende gebruiker die op dit toestel inlogt.
    func afmelden() async {
        guard let token = opgeslagenToken else { return }
        do {
            try await SupabaseManager.client
                .from("push_apparaten")
                .delete()
                .eq("token", value: token)
                .execute()
        } catch {
            print("[Push] Verwijderen uit push_apparaten MISLUKT: \(error)")
        }
    }

    private struct BadgeParams: Encodable {
        let p_profiel_id: String
    }

    func werkBadgeBij(profielId: String) async {
        let aantal: Int? = try? await SupabaseManager.client
            .rpc("ongelezen_chat_aantal", params: BadgeParams(p_profiel_id: profielId))
            .execute()
            .value
        guard let aantal else { return }
        try? await UNUserNotificationCenter.current().setBadgeCount(aantal)
    }
}
