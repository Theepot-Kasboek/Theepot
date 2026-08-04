import UIKit
import UserNotifications

/// Registreert voor remote notifications en routeert meldingen naar het
/// juiste gesprek. `meldingRouter` wordt door TheepotMobileApp meteen na
/// het aanmaken gekoppeld (SwiftUI's environment bestaat nog niet op het
/// moment dat AppDelegate zelf wordt geïnitialiseerd).
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    weak var meldingRouter: MeldingRouter?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("[Push] APNs-registratie geslaagd, token: \(token)")
        Task { await PushService.shared.ontvangenToken(token) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Geen pushtoken betekent geen meldingen, de rest van de app blijft werken —
        // maar we loggen wel, anders is dit onmogelijk te diagnosticeren.
        print("[Push] APNs-registratie MISLUKT: \(error.localizedDescription)")
    }

    /// Onderdrukt de banner als de gebruiker het gesprek al open heeft staan.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let gesprekId = notification.request.content.userInfo["gesprek_id"] as? String
        if let gesprekId, let router = meldingRouter, gesprekId == router.actiefGesprekId {
            completionHandler([])
        } else {
            completionHandler([.banner, .sound, .badge])
        }
    }

    /// Tik op een melding: deeplinkt naar het gesprek. Onbekend `type` opent gewoon de app.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        if let type = userInfo["type"] as? String, type == "chat",
           let gesprekId = userInfo["gesprek_id"] as? String {
            meldingRouter?.open(gesprekId: gesprekId)
        }
        completionHandler()
    }
}
