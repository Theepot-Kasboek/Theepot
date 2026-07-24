import SwiftUI

/// Vijf hoofdmodules in een zwevende "liquid glass" tabbalk; de overige
/// light-modules + account zitten in "Meer". Rechten/locatietoegang bepalen
/// per module wat zichtbaar/bewerkbaar is (zie SessionStore + AuthProvider.tsx).
private enum HoofdTab: Int, CaseIterable, Identifiable {
    case meldingen, chat, taken, kasboek, meer

    var id: Int { rawValue }

    var titel: String {
        switch self {
        case .meldingen: return "Meldingen"
        case .chat: return "Chat"
        case .taken: return "Taken"
        case .kasboek: return "Kasboek"
        case .meer: return "Meer"
        }
    }

    var icoon: String {
        switch self {
        case .meldingen: return "pin"
        case .chat: return "bubble.left.and.bubble.right"
        case .taken: return "checklist"
        case .kasboek: return "eurosign.circle"
        case .meer: return "ellipsis.circle"
        }
    }

    var icoonGevuld: String {
        switch self {
        case .meldingen: return "pin.fill"
        case .chat: return "bubble.left.and.bubble.right.fill"
        case .taken: return "checklist.checked"
        case .kasboek: return "eurosign.circle.fill"
        case .meer: return "ellipsis.circle.fill"
        }
    }
}

struct DashboardView: View {
    @EnvironmentObject var session: SessionStore
    @State private var tab: HoofdTab = .meldingen

    private let barHoogte: CGFloat = 56
    private let barOnderrand: CGFloat = 10

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                switch tab {
                case .meldingen: PrikbordView()
                case .chat: ChatListView()
                case .taken: TakenView()
                case .kasboek: KasboekView()
                case .meer: MeerView()
                }
            }
            .safeAreaInset(edge: .bottom) {
                Color.clear.frame(height: barHoogte + barOnderrand)
            }

            TheepotTabBar(selectie: $tab)
                .frame(maxWidth: 420)
                .padding(.horizontal, 14)
                .padding(.bottom, barOnderrand)
        }
    }
}

/// Zwevende, glazen tabbalk (ultraThinMaterial + capsule) met een zachte
/// groene "pill" achter het actieve item — de "liquid glass" look.
private struct TheepotTabBar: View {
    @Binding var selectie: HoofdTab
    @Namespace private var animatie

    var body: some View {
        HStack(spacing: 2) {
            ForEach(HoofdTab.allCases) { tab in
                tabKnop(tab)
            }
        }
        .padding(6)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(
            Capsule().strokeBorder(Color.white.opacity(0.4), lineWidth: 0.75)
        )
        .shadow(color: .black.opacity(0.14), radius: 18, x: 0, y: 8)
    }

    @ViewBuilder
    private func tabKnop(_ tab: HoofdTab) -> some View {
        let isActief = selectie == tab
        let icoonNaam = isActief ? tab.icoonGevuld : tab.icoon
        let kleur: Color = isActief ? .theepotGroenDonker : .secondary

        Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.82)) {
                selectie = tab
            }
        } label: {
            VStack(spacing: 3) {
                Image(systemName: icoonNaam)
                    .font(.system(size: 19, weight: .medium))
                Text(tab.titel)
                    .font(.system(size: 10, weight: .semibold))
            }
            .foregroundStyle(kleur)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background {
                if isActief {
                    Capsule()
                        .fill(Color.theepotGroen.opacity(0.18))
                        .matchedGeometryEffect(id: "actieveTab", in: animatie)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

/// Overflow-scherm met de overige light-modules + account. Elke bestemming
/// heeft zelf al een NavigationStack, dus we presenteren ze als sheet in
/// plaats van geneste NavigationLinks (voorkomt dubbele navigatiebalken).
private enum MeerBestemming: String, Identifiable {
    case maaltijdlijst, vakantieplanningen, weekplanningen, kilometerstanden
    var id: String { rawValue }

    var titel: String {
        switch self {
        case .maaltijdlijst: return "Maaltijdlijst"
        case .vakantieplanningen: return "Vakantieplanningen"
        case .weekplanningen: return "Weekplanningen"
        case .kilometerstanden: return "Kilometerstanden"
        }
    }

    var icoon: String {
        switch self {
        case .maaltijdlijst: return "fork.knife"
        case .vakantieplanningen: return "sun.max"
        case .weekplanningen: return "calendar"
        case .kilometerstanden: return "car"
        }
    }
}

private struct MeerView: View {
    @EnvironmentObject var session: SessionStore
    @State private var bestemming: MeerBestemming?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 12) {
                        TheepotLogo(grootte: 44)
                        if let profiel = session.profiel {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(profiel.naam).font(.headline)
                                Text(profiel.rol.label)
                                    .font(.caption)
                                    .foregroundStyle(Color.theepotGroenDonker)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section("Modules") {
                    ForEach([MeerBestemming.maaltijdlijst, .vakantieplanningen, .weekplanningen, .kilometerstanden]) { item in
                        Button { bestemming = item } label: {
                            MeerRij(titel: item.titel, icoon: item.icoon)
                        }
                        .foregroundStyle(.primary)
                    }
                }

                Section("Account") {
                    if let profiel = session.profiel {
                        LabeledContent("E-mail", value: profiel.email)
                    }
                    Button("Uitloggen", role: .destructive) {
                        Task { await session.signOut() }
                    }
                }
            }
            .navigationTitle("Meer")
        }
        .sheet(item: $bestemming) { item in
            Group {
                switch item {
                case .maaltijdlijst: MaaltijdlijstView()
                case .vakantieplanningen: VakantieplanningenView()
                case .weekplanningen: WeekplanningenView()
                case .kilometerstanden: KilometerstandenView()
                }
            }
            .tint(.theepotGroen)
        }
    }
}

private struct MeerRij: View {
    let titel: String
    let icoon: String

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color.theepotGroenLicht)
                    .frame(width: 30, height: 30)
                Image(systemName: icoon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.theepotGroenTekst)
            }
            Text(titel)
        }
    }
}
