import Foundation

/// Gedeelde deeplink-state: AppDelegate zet `gewenstGesprekId` bij een tik op
/// een pushmelding, DashboardView/ChatListView lezen dat om naar het juiste
/// gesprek te navigeren. `actiefGesprekId` houdt bij welk gesprek open staat,
/// zodat AppDelegate de banner kan onderdrukken voor een gesprek dat je al ziet.
@MainActor
final class MeldingRouter: ObservableObject {
    @Published var gewenstGesprekId: String?
    @Published var actiefGesprekId: String?

    func open(gesprekId: String) {
        gewenstGesprekId = gesprekId
    }

    func verwerkt() {
        gewenstGesprekId = nil
    }
}
