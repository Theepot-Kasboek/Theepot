import SwiftUI

/// Elke module is een volwaardige pagina in de tabbalk — géén sheets meer, want
/// een sheet is op een iPad een klein zwevend venster in plaats van het volledige
/// scherm. Rechten/locatietoegang bepalen per module wat zichtbaar/bewerkbaar is
/// (zie SessionStore + AuthProvider.tsx).
private enum HoofdTab: Int, CaseIterable, Identifiable {
    case meldingen, chat, taken, kasboek, maaltijdlijst, vakantie, weekplanning, kilometers, account

    var id: Int { rawValue }

    /// Kort label voor onder het icoon; `volledigeTitel` is voor VoiceOver.
    var titel: String {
        switch self {
        case .meldingen: return "Meldingen"
        case .chat: return "Chat"
        case .taken: return "Taken"
        case .kasboek: return "Kasboek"
        case .maaltijdlijst: return "Maaltijden"
        case .vakantie: return "Vakantie"
        case .weekplanning: return "Weekplan"
        case .kilometers: return "Kilometers"
        case .account: return "Account"
        }
    }

    var volledigeTitel: String {
        switch self {
        case .maaltijdlijst: return "Maaltijdlijst"
        case .vakantie: return "Vakantieplanningen"
        case .weekplanning: return "Weekplanningen"
        case .kilometers: return "Kilometerstanden"
        default: return titel
        }
    }

    var icoon: String {
        switch self {
        case .meldingen: return "pin"
        case .chat: return "bubble.left.and.bubble.right"
        case .taken: return "checklist"
        case .kasboek: return "eurosign.circle"
        case .maaltijdlijst: return "fork.knife.circle"
        case .vakantie: return "sun.max"
        case .weekplanning: return "calendar.circle"
        case .kilometers: return "car"
        case .account: return "person.crop.circle"
        }
    }

    var icoonGevuld: String {
        switch self {
        case .meldingen: return "pin.fill"
        case .chat: return "bubble.left.and.bubble.right.fill"
        case .taken: return "checklist.checked"
        case .kasboek: return "eurosign.circle.fill"
        case .maaltijdlijst: return "fork.knife.circle.fill"
        case .vakantie: return "sun.max.fill"
        case .weekplanning: return "calendar.circle.fill"
        case .kilometers: return "car.fill"
        case .account: return "person.crop.circle.fill"
        }
    }
}

struct DashboardView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var meldingRouter: MeldingRouter
    @State private var tab: HoofdTab = .meldingen

    private let barOnderrand: CGFloat = 10

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                switch tab {
                case .meldingen: PrikbordView()
                case .chat: ChatListView()
                case .taken: TakenView()
                case .kasboek: KasboekView()
                case .maaltijdlijst: MaaltijdlijstView()
                case .vakantie: VakantieplanningenView()
                case .weekplanning: WeekplanningenView()
                case .kilometers: KilometerstandenView()
                case .account: AccountView()
                }
            }
            .safeAreaInset(edge: .bottom) {
                Color.clear.frame(height: TheepotTabBar.hoogte + barOnderrand)
            }

            TheepotTabBar(selectie: $tab)
                .frame(maxWidth: 760)
                .padding(.horizontal, 14)
                .padding(.bottom, barOnderrand)
        }
        // Tik op een chat-pushmelding: naar de chattab, ChatListView pakt de
        // rest van de deeplink (openen van het juiste gesprek) zelf op.
        .onChange(of: meldingRouter.gewenstGesprekId) { _, gesprekId in
            if gesprekId != nil { tab = .chat }
        }
    }
}

/// Zwevende, glazen tabbalk (ultraThinMaterial + capsule) met een zachte
/// groene "pill" achter het actieve item — de "liquid glass" look.
///
/// De knoppen verdelen de beschikbare breedte zodra alle negen modules passen
/// (iPad); op een smaller scherm houden ze hun minimumbreedte en schuift de balk
/// zijwaarts, zodat icoon én tekst altijd leesbaar blijven.
private struct TheepotTabBar: View {
    @Binding var selectie: HoofdTab
    @Namespace private var animatie
    @State private var balkBreedte: CGFloat = 0

    static let hoogte: CGFloat = 68
    private static let minKnopBreedte: CGFloat = 76
    private static let binnenPadding: CGFloat = 6
    private static let knopSpatie: CGFloat = 2

    private var knopBreedte: CGFloat {
        let aantal = CGFloat(HoofdTab.allCases.count)
        let beschikbaar = balkBreedte - Self.binnenPadding * 2 - Self.knopSpatie * (aantal - 1)
        guard beschikbaar > 0 else { return Self.minKnopBreedte }
        return max(Self.minKnopBreedte, beschikbaar / aantal)
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Self.knopSpatie) {
                    ForEach(HoofdTab.allCases) { tab in
                        tabKnop(tab)
                            .frame(width: knopBreedte)
                            .id(tab)
                    }
                }
                .padding(Self.binnenPadding)
            }
            // Niet laten meeveren als alles al past — dat voelt op een iPad als
            // een bug in plaats van als een scrollbare balk.
            .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
            .background(
                GeometryReader { geo in
                    Color.clear.preference(key: BalkBreedteKey.self, value: geo.size.width)
                }
            )
            .onPreferenceChange(BalkBreedteKey.self) { balkBreedte = $0 }
            .frame(height: Self.hoogte)
            .background(.ultraThinMaterial, in: Capsule())
            .clipShape(Capsule())
            .overlay(
                Capsule().strokeBorder(Color.white.opacity(0.4), lineWidth: 0.75)
            )
            .shadow(color: .black.opacity(0.14), radius: 18, x: 0, y: 8)
            .onChange(of: selectie) { _, nieuw in
                // Houd de actieve tab in beeld als de balk zijwaarts schuift.
                withAnimation(.easeInOut(duration: 0.25)) {
                    proxy.scrollTo(nieuw, anchor: .center)
                }
            }
            .onAppear {
                // Ook bij het openen moet de actieve tab meteen in beeld staan;
                // één runloop later, want direct bij onAppear staat de layout
                // er nog niet en doet scrollTo niets.
                DispatchQueue.main.async {
                    proxy.scrollTo(selectie, anchor: .center)
                }
            }
        }
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
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
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
        .accessibilityLabel(tab.volledigeTitel)
    }
}

private struct BalkBreedteKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

/// Accountpagina: profiel, e-mail en uitloggen. Stond eerder onderaan het
/// "Meer"-scherm, dat met de volledige tabbalk is vervallen.
private struct AccountView: View {
    @EnvironmentObject var session: SessionStore

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

                Section("Account") {
                    if let profiel = session.profiel {
                        LabeledContent("E-mail", value: profiel.email)
                    }
                    Button("Uitloggen", role: .destructive) {
                        Task { await session.signOut() }
                    }
                }
            }
            .navigationTitle("Account")
        }
    }
}
