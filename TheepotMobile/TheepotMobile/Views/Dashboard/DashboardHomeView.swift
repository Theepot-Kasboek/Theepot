import SwiftUI

/// Openingsscherm: samenvattingskaarten (widgets) die de gebruiker zelf mag
/// herschikken. Volgorde wordt bewaard in Supabase (`dashboard_voorkeuren`),
/// dus hetzelfde op elk apparaat van deze gebruiker.
struct DashboardHomeView: View {
    @EnvironmentObject var session: SessionStore
    @StateObject private var vm = DashboardViewModel()
    @Binding var tab: HoofdTab

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView()
                } else {
                    GeometryReader { geo in
                        let layout = WidgetGridLayout(schermBreedte: geo.size.width)
                        ScrollView {
                            LazyVGrid(columns: layout.rasterKolommen, alignment: .leading, spacing: WidgetGridLayout.kaartTussenruimte) {
                                ForEach(vm.widgetVolgorde) { id in
                                    widgetKaart(voor: id)
                                        .draggable(id.rawValue) {
                                            widgetKaart(voor: id)
                                                .frame(width: layout.kaartBreedte)
                                                .opacity(0.85)
                                        }
                                        .dropDestination(for: String.self) { items, _ in
                                            guard let gesleeptRawValue = items.first,
                                                  let gesleept = DashboardWidgetId(rawValue: gesleeptRawValue) else { return false }
                                            plaats(gesleept, voor: id)
                                            Task { await bewaarVolgorde() }
                                            return true
                                        }
                                }
                            }
                            .padding(WidgetGridLayout.buitenMarge)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
            }
            .theepotAchtergrond()
            .navigationTitle("Home")
            .refreshable { await vm.laad(session: session) }
        }
        .task { await vm.laad(session: session) }
    }

    private func plaats(_ gesleept: DashboardWidgetId, voor doel: DashboardWidgetId) {
        guard gesleept != doel,
              let vanIndex = vm.widgetVolgorde.firstIndex(of: gesleept),
              let naarIndex = vm.widgetVolgorde.firstIndex(of: doel) else { return }
        withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
            vm.widgetVolgorde.move(fromOffsets: IndexSet(integer: vanIndex), toOffset: naarIndex > vanIndex ? naarIndex + 1 : naarIndex)
        }
    }

    private func bewaarVolgorde() async {
        guard let profielId = session.profiel?.id.uuidString.lowercased() else { return }
        await vm.opSleepEinde(nieuweVolgorde: vm.widgetVolgorde, profielId: profielId)
    }

    @ViewBuilder
    private func widgetKaart(voor id: DashboardWidgetId) -> some View {
        WidgetCard(titel: titel(voor: id), icoon: icoon(voor: id)) {
            switch id {
            case .mededelingen:
                MededelingenWidgetContent(aantal: vm.mededelingenAantal)
            case .kasboek:
                KasboekWidgetContent(dagenTotDeadline: vm.kasboekDagenTotDeadline)
            case .kilometers:
                KilometersWidgetContent(status: vm.kilometersStatus)
            case .maaltijdlijst:
                MaaltijdlijstWidgetContent(namen: vm.maaltijdlijstVandaag)
            case .taken:
                TakenWidgetContent(aantal: vm.takenOpenAantal)
            }
        }
        .onTapGesture {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.82)) {
                tab = doelTab(voor: id)
            }
        }
    }

    private func titel(voor id: DashboardWidgetId) -> String {
        switch id {
        case .mededelingen: return "Mededelingen"
        case .kasboek: return "Kasboek"
        case .kilometers: return "Kilometerstanden"
        case .maaltijdlijst: return "Wie eet er mee"
        case .taken: return "Taken"
        }
    }

    private func icoon(voor id: DashboardWidgetId) -> String {
        switch id {
        case .mededelingen: return "pin.fill"
        case .kasboek: return "eurosign.circle.fill"
        case .kilometers: return "car.fill"
        case .maaltijdlijst: return "fork.knife.circle.fill"
        case .taken: return "checklist"
        }
    }

    private func doelTab(voor id: DashboardWidgetId) -> HoofdTab {
        switch id {
        case .mededelingen: return .meldingen
        case .kasboek: return .kasboek
        case .kilometers: return .kilometers
        case .maaltijdlijst: return .maaltijdlijst
        case .taken: return .taken
        }
    }
}

/// Kolomberekening op basis van de werkelijke schermbreedte (net als
/// `PlanningLayout` in VakantieplanningenView.swift) — bewust géén
/// horizontalSizeClass, want een iPad in portret is net zo breed als
/// sommige iPads in landschap.
struct WidgetGridLayout {
    let inhoudBreedte: CGFloat

    static let buitenMarge: CGFloat = 16
    static let kaartTussenruimte: CGFloat = 12
    private static let minKaartBreedte: CGFloat = 340

    init(schermBreedte: CGFloat) {
        inhoudBreedte = max(0, schermBreedte - Self.buitenMarge * 2)
    }

    /// iPhone: altijd 1 kolom. iPad: doorlopend grid van 2 kolommen zodra het past.
    var kolommen: Int {
        let passend = Int((inhoudBreedte + Self.kaartTussenruimte) / (Self.minKaartBreedte + Self.kaartTussenruimte))
        return min(2, max(1, passend))
    }

    var kaartBreedte: CGFloat {
        let tussenruimte = Self.kaartTussenruimte * CGFloat(kolommen - 1)
        return max(0, (inhoudBreedte - tussenruimte) / CGFloat(kolommen))
    }

    var rasterKolommen: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: Self.kaartTussenruimte), count: kolommen)
    }
}

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var isLoading = true
    @Published var widgetVolgorde: [DashboardWidgetId] = []
    @Published var mededelingenAantal: Int?
    @Published var kasboekDagenTotDeadline: Int?
    @Published var kilometersStatus: KilometerstandenService.KilometersDashboardStatus?
    @Published var maaltijdlijstVandaag: [String]?
    @Published var takenOpenAantal: Int?

    func laad(session: SessionStore) async {
        defer { isLoading = false }
        guard let profiel = session.profiel else { return }
        let profielId = profiel.id.uuidString.lowercased()

        async let voorkeurenTask = DashboardService.laadVoorkeuren(profielId: profielId)
        async let mededelingenTask = mededelingenAantal(session: session)
        async let kilometersTask = kilometersSamenvatting()
        async let maaltijdTask = maaltijdVandaag(session: session)
        async let takenTask = takenOpenTellen(profielId: profielId)

        let (voorkeuren, mededelingen, km, maaltijd, taken) = await (voorkeurenTask, mededelingenTask, kilometersTask, maaltijdTask, takenTask)

        self.mededelingenAantal = mededelingen
        self.kasboekDagenTotDeadline = kasboekDeadline()
        self.kilometersStatus = km
        self.maaltijdlijstVandaag = maaltijd
        self.takenOpenAantal = taken

        let toegestaan = toegestaneWidgets(session: session)
        self.widgetVolgorde = samengesteldeDashboardVolgorde(opgeslagen: voorkeuren, toegestaan: toegestaan)
    }

    /// Enige schrijfmoment naar Supabase: bij loslaten van een sleepactie
    /// (niet tijdens het slepen zelf). Volgorde staat al lokaal (optimistic UI).
    func opSleepEinde(nieuweVolgorde: [DashboardWidgetId], profielId: String) async {
        widgetVolgorde = nieuweVolgorde
        try? await DashboardService.bewaarVolgorde(profielId: profielId, volgorde: nieuweVolgorde.map(\.rawValue))
    }

    private func toegestaneWidgets(session: SessionStore) -> Set<DashboardWidgetId> {
        var toegestaan: Set<DashboardWidgetId> = [.kilometers, .taken] // geen apart recht in Rechten-model
        if session.rechten.paginaPrikbord != .geen { toegestaan.insert(.mededelingen) }
        if session.rechten.paginaKasboek != .geen { toegestaan.insert(.kasboek) }
        if session.rechten.paginaMaaltijdlijst != .geen { toegestaan.insert(.maaltijdlijst) }
        return toegestaan
    }

    private func mededelingenAantal(session: SessionStore) async -> Int? {
        guard session.rechten.paginaPrikbord != .geen else { return nil }
        return try? await PrikbordService.ongelezenAantal(session: session)
    }

    /// Dagen tot de 1e van de volgende maand — de vaste kasboek-deadline.
    private func kasboekDeadline() -> Int {
        var kal = Calendar(identifier: .gregorian)
        kal.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        let vandaag = kal.startOfDay(for: Date())
        var comp = kal.dateComponents([.year, .month], from: vandaag)
        comp.month = (comp.month ?? 1) + 1
        comp.day = 1
        guard let eersteVanVolgendeMaand = kal.date(from: comp) else { return 0 }
        return kal.dateComponents([.day], from: vandaag, to: eersteVanVolgendeMaand).day ?? 0
    }

    private func kilometersSamenvatting() async -> KilometerstandenService.KilometersDashboardStatus? {
        try? await KilometerstandenService.samenvatting()
    }

    private func maaltijdVandaag(session: SessionStore) async -> [String]? {
        try? await MaaltijdlijstService.namenVandaag(session: session)
    }

    private func takenOpenTellen(profielId: String) async -> Int? {
        guard let lijsten = try? await TakenService.lijsten(eigenaarId: profielId) else { return nil }
        guard let taken = try? await TakenService.taken(lijstIds: lijsten.map(\.id)) else { return nil }
        return taken.filter { !$0.voltooid }.count
    }
}
