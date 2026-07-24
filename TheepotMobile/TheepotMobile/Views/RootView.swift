import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: SessionStore

    var body: some View {
        Group {
            if session.isLoading {
                ProgressView()
            } else if session.profiel != nil {
                DashboardView()
            } else {
                LoginView()
            }
        }
        .task {
            await session.bootstrap()
        }
    }
}
