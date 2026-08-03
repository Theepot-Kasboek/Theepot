import SwiftUI

@main
struct TheepotMobileApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var session = SessionStore()
    @StateObject private var meldingRouter = MeldingRouter()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .environmentObject(meldingRouter)
                .tint(.theepotGroen)
                .onAppear {
                    appDelegate.meldingRouter = meldingRouter
                }
        }
    }
}
