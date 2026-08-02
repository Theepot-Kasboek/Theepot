import SwiftUI

/// Alle layoutkeuzes in dit scherm komen uit de werkelijk beschikbare breedte,
/// niet uit de oriëntatie of de size class. Een iPad in portret is namelijk net
/// zo breed als sommige iPads in landschap, en met een oriëntatiecheck kreeg je
/// daar onnodig één kolom met schermbrede foto's. Zo vult de planning het hele
/// scherm op de iPad mini (744pt), de 10.9" (820pt) en liggend (1133/1180pt),
/// terwijl de iPhone-weergave ongewijzigd blijft.
struct PlanningLayout {
    /// Breedte die de inhoud werkelijk mag gebruiken (buitenmarge er al af).
    let inhoudBreedte: CGFloat

    static let buitenMarge: CGFloat = 16
    static let kaartTussenruimte: CGFloat = 12
    /// Smaller dan dit wordt een activiteitkaart onleesbaar, dus dan liever
    /// één kolom minder.
    private static let minKaartBreedte: CGFloat = 330

    init(schermBreedte: CGFloat) {
        inhoudBreedte = max(0, schermBreedte - PlanningLayout.buitenMarge * 2)
    }

    /// Zoveel kaarten naast elkaar als er passen; boven de vier wordt het een
    /// onrustige muur van tegels.
    var kolommen: Int {
        let passend = Int((inhoudBreedte + Self.kaartTussenruimte) / (Self.minKaartBreedte + Self.kaartTussenruimte))
        return min(4, max(1, passend))
    }

    var kaartBreedte: CGFloat {
        let tussenruimte = Self.kaartTussenruimte * CGFloat(kolommen - 1)
        return max(0, (inhoudBreedte - tussenruimte) / CGFloat(kolommen))
    }

    var rasterKolommen: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: Self.kaartTussenruimte), count: kolommen)
    }

    /// iPhone-formaat: koppen en tekst blijven klein, ook al is een kaart
    /// schermbreed.
    var compactScherm: Bool { inhoudBreedte < 600 }

    /// De vijf dagkolommen passen alleen zonder horizontaal scrollen als elke
    /// kolom nog een activiteitnaam kwijt kan.
    var weekTabelPastVolledig: Bool { inhoudBreedte >= 700 }

    /// Pas boven deze breedte is er ruimte voor royale koppen en padding in de
    /// weektabel; een iPad in portret zit daar nog onder.
    var ruimeWeekTabel: Bool { inhoudBreedte >= 900 }

    var kopFont: Font { compactScherm ? .title3.weight(.bold) : .title.weight(.bold) }
    var subKopFont: Font { compactScherm ? .footnote : .body }
    var dagKopFont: Font { compactScherm ? .headline : .title3.weight(.bold) }
    var sectieSpatie: CGFloat { compactScherm ? 16 : 22 }
}

/// Spiegelt de "document weergave" van app/vakantieplanningen/page.tsx: per week
/// de dagen met activiteiten, inclusief foto's — zodat dit er hetzelfde uitziet
/// als het dashboard op het web.
struct VakantieplanningenView: View {
    @EnvironmentObject var session: SessionStore
    @State private var planningen: [VakantiePlanning] = []
    @State private var isLoading = true

    private var magBewerken: Bool {
        session.isSuperadmin || session.rechten.paginaVakantieplanningen == .bewerken
    }

    private var zichtbarePlanningen: [VakantiePlanning] {
        magBewerken ? planningen : planningen.filter(\.gepubliceerd)
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if zichtbarePlanningen.isEmpty {
                    ContentUnavailableView("Geen planningen beschikbaar", systemImage: "sun.max")
                } else {
                    GeometryReader { geo in
                        let layout = PlanningLayout(schermBreedte: geo.size.width)
                        ScrollView {
                            LazyVGrid(columns: layout.rasterKolommen, alignment: .leading, spacing: PlanningLayout.kaartTussenruimte) {
                                ForEach(zichtbarePlanningen) { planning in
                                    NavigationLink(value: planning) {
                                        PlanningKaart(planning: planning, magBewerken: magBewerken)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(PlanningLayout.buitenMarge)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                    .theepotAchtergrond()
                }
            }
            .navigationTitle("Vakantieplanningen")
            .navigationDestination(for: VakantiePlanning.self) { planning in
                VakantiePlanningDetailView(planning: planning)
            }
        }
        .task {
            planningen = (try? await VakantieplanningenService.planningen(magOnepubliceerdeZien: magBewerken)) ?? []
            isLoading = false
        }
    }
}

// ─── Planningkaart (lijstweergave) ─────────────────────────────────────────

private struct PlanningKaart: View {
    let planning: VakantiePlanning
    let magBewerken: Bool

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.theepotGroenLicht)
                    .frame(width: 46, height: 46)
                Image(systemName: "sun.max.fill")
                    .font(.system(size: 19))
                    .foregroundStyle(Color.theepotGroenTekst)
            }
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(planning.naam).font(.headline)
                    if magBewerken {
                        Text(planning.gepubliceerd ? "Gepubliceerd" : "Concept")
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 8).padding(.vertical, 2)
                            .background(planning.gepubliceerd ? Color.theepotGroenLicht : Color(.systemGray5))
                            .foregroundStyle(planning.gepubliceerd ? Color.theepotGroenTekst : .secondary)
                            .clipShape(Capsule())
                    }
                }
                Text("\(planning.vakantie) · \(planning.thema ?? "")")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("\(fmtDatum(planning.startDatum)) – \(fmtDatum(planning.eindDatum))")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(.tertiary)
        }
        .theepotGlasKaart(hoekradius: 14, padding: 14)
    }
}

// ─── Detailweergave: weekoverzicht met foto's ──────────────────────────────

private struct VakantiePlanningDetailView: View {
    let planning: VakantiePlanning
    @State private var weken: [VakantieWeek] = []
    @State private var activiteiten: [VakantieActiviteit] = []
    @State private var actieveWeekId: String?
    @State private var actieveRegio: Regio = .midden
    @State private var weergave: Weergave = .overzicht
    @State private var dagFilter: Dag?
    @State private var isLoading = true
    @State private var popupFoto: FotoItem?
    @State private var detailActiviteit: VakantieActiviteit?

    private enum Regio { case midden, noord }
    private enum Weergave: String, CaseIterable {
        case overzicht = "Overzicht"
        case document = "Document"

        var icoon: String {
            switch self {
            case .overzicht: return "tablecells"
            case .document: return "doc.text"
            }
        }
    }

    private var actieveWeek: VakantieWeek? {
        weken.first { $0.id == actieveWeekId }
    }

    var body: some View {
        GeometryReader { geo in
            let layout = PlanningLayout(schermBreedte: geo.size.width)

            Group {
                if isLoading {
                    ProgressView()
                } else if weken.isEmpty {
                    ContentUnavailableView("Nog geen weken", systemImage: "calendar")
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 18) {
                            if planning.startDatumNoord != nil {
                                regioWisselaar
                            }
                            if layout.compactScherm {
                                HStack {
                                    Spacer()
                                    weergaveToggle
                                }
                                weekTabs
                            } else {
                                HStack(alignment: .top, spacing: 12) {
                                    weekTabs
                                    Spacer(minLength: 12)
                                    weergaveToggle
                                }
                            }
                            if let week = actieveWeek {
                                switch weergave {
                                case .overzicht: weekOverzichtTabel(week: week, layout: layout)
                                case .document: weekDocument(week: week, layout: layout)
                                }
                            }
                        }
                        .padding(PlanningLayout.buitenMarge)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(maxWidth: .infinity)
                    .theepotAchtergrond()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .navigationTitle(planning.naam)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            weken = (try? await VakantieplanningenService.weken(planningId: planning.id)) ?? []
            actieveWeekId = weken.first?.id
            let ruw = (try? await VakantieplanningenService.activiteiten(weekIds: weken.map(\.id))) ?? []
            activiteiten = await VakantieplanningenService.metBibliotheekFotos(ruw)
            isLoading = false
        }
        .sheet(item: $detailActiviteit) { activiteit in
            NavigationStack {
                GeometryReader { sheetGeo in
                    let sheetLayout = PlanningLayout(schermBreedte: sheetGeo.size.width)
                    ScrollView {
                        ActiviteitKaart(
                            activiteit: activiteit,
                            kaartBreedte: sheetLayout.inhoudBreedte,
                            compactScherm: sheetLayout.compactScherm,
                            onTap: {}
                        ) { url in
                            popupFoto = FotoItem(url: url)
                        }
                        .padding(PlanningLayout.buitenMarge)
                    }
                }
                .theepotAchtergrond()
                .navigationTitle(activiteit.naam)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Sluiten") { detailActiviteit = nil }
                    }
                }
            }
            .presentationDetents([.medium, .large])
        }
        .fullScreenCover(item: $popupFoto) { item in
            ZStack {
                Color.black.ignoresSafeArea()
                AsyncImage(url: item.url) { fase in
                    if case .success(let image) = fase {
                        image.resizable().scaledToFit()
                    } else {
                        ProgressView().tint(.white)
                    }
                }
                .padding()
                VStack {
                    HStack {
                        Spacer()
                        Button {
                            popupFoto = nil
                        } label: {
                            Image(systemName: "xmark")
                                .foregroundStyle(.white)
                                .padding(10)
                                .background(.ultraThinMaterial, in: Circle())
                        }
                        .padding()
                    }
                    Spacer()
                }
            }
            .onTapGesture { popupFoto = nil }
        }
    }

    private var regioWisselaar: some View {
        HStack(spacing: 8) {
            Text("Regio:").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            regioKnop("Lisse / Hillegom", regio: .midden)
            regioKnop("Lisserbroek", regio: .noord)
        }
    }

    private func regioKnop(_ titel: String, regio: Regio) -> some View {
        Button {
            actieveRegio = regio
        } label: {
            Text(titel)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(actieveRegio == regio ? Color.theepotGroen : Color(.secondarySystemBackground))
                .foregroundStyle(actieveRegio == regio ? .white : .primary)
                .clipShape(Capsule())
        }
    }

    private var weekTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(weken) { week in
                    Button {
                        actieveWeekId = week.id
                    } label: {
                        Text("Week \(week.weekNummer) — \(week.naam)")
                            .font(.subheadline.weight(.semibold))
                            .padding(.horizontal, 14).padding(.vertical, 8)
                            .background(actieveWeekId == week.id ? Color.theepotGroen : Color(.secondarySystemBackground))
                            .foregroundStyle(actieveWeekId == week.id ? .white : .primary)
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var weergaveToggle: some View {
        HStack(spacing: 2) {
            ForEach(Weergave.allCases, id: \.self) { optie in
                Button {
                    weergave = optie
                } label: {
                    Label(optie.rawValue, systemImage: optie.icoon)
                        .labelStyle(.iconOnly)
                        .font(.system(size: 14, weight: .semibold))
                        .padding(.horizontal, 10).padding(.vertical, 8)
                        .background(weergave == optie ? Color.theepotGroen : Color.clear)
                        .foregroundStyle(weergave == optie ? .white : .secondary)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
                .accessibilityLabel(optie.rawValue)
            }
        }
        .padding(3)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    // ─── Weekoverzicht: compacte tabel met 5 dagkolommen ───────────────────

    private func weekOverzichtTabel(week: VakantieWeek, layout: PlanningLayout) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Week \(week.weekNummer) — \(week.naam)").font(layout.kopFont)
                Text("\(planning.vakantie) · \(planning.thema ?? "")")
                    .font(layout.subKopFont)
                    .foregroundStyle(.secondary)
            }

            if layout.weekTabelPastVolledig {
                dagKolommen(week: week, kolomBreedte: nil, ruim: layout.ruimeWeekTabel)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    dagKolommen(week: week, kolomBreedte: 168, ruim: false)
                }
            }
        }
    }

    private func dagKolommen(week: VakantieWeek, kolomBreedte: CGFloat?, ruim: Bool) -> some View {
        HStack(alignment: .top, spacing: 8) {
            ForEach(Dag.allCases, id: \.self) { dag in
                dagKolom(week: week, dag: dag, breedte: kolomBreedte, ruim: ruim)
            }
        }
    }

    private func dagKolom(week: VakantieWeek, dag: Dag, breedte: CGFloat?, ruim: Bool) -> some View {
        let dagActiviteiten = activiteiten
            .filter { $0.weekId == week.id && $0.dag == dag }
            .sorted { $0.volgorde < $1.volgorde }

        return VStack(alignment: .leading, spacing: ruim ? 8 : 6) {
            VStack(alignment: .leading, spacing: 1) {
                Text(dag.label).font(ruim ? .headline : .subheadline.weight(.bold))
                Text(dagDatumStr(week: week, dag: dag))
                    .font(ruim ? .caption : .caption2)
                    .opacity(0.85)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, ruim ? 12 : 10).padding(.vertical, ruim ? 10 : 8)
            .background(Color.theepotGroen)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            if dagActiviteiten.isEmpty {
                Text("—")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .padding(.horizontal, 10).padding(.vertical, 8)
            } else {
                VStack(spacing: ruim ? 8 : 6) {
                    ForEach(dagActiviteiten) { activiteit in
                        Button {
                            detailActiviteit = activiteit
                        } label: {
                            HStack(spacing: 6) {
                                if activiteit.afbeeldingPad != nil {
                                    Image(systemName: "photo.fill")
                                        .font(.system(size: ruim ? 11 : 9))
                                        .foregroundStyle(Color.theepotGroenTekst)
                                }
                                Text(activiteit.naam)
                                    .font(ruim ? .subheadline.weight(.semibold) : .caption.weight(.semibold))
                                    .foregroundStyle(.primary)
                                    .multilineTextAlignment(.leading)
                                    .lineLimit(2)
                                Spacer(minLength: 0)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, ruim ? 12 : 10).padding(.vertical, ruim ? 9 : 7)
                            .background(Color(.tertiarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .frame(width: breedte, alignment: .leading)
        .frame(maxWidth: breedte == nil ? .infinity : nil)
        .padding(ruim ? 10 : 8)
        .background(Color(.secondarySystemBackground).opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    // ─── Documentweergave: dagen onder elkaar met volledige details + foto's ─

    private func weekDocument(week: VakantieWeek, layout: PlanningLayout) -> some View {
        let dagenTeTonen: [Dag] = dagFilter.map { [$0] } ?? Dag.allCases

        return VStack(alignment: .leading, spacing: layout.sectieSpatie) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Week \(week.weekNummer) — \(week.naam)").font(layout.kopFont)
                Text("\(planning.vakantie) · \(planning.thema ?? "")")
                    .font(layout.subKopFont)
                    .foregroundStyle(.secondary)
            }

            dagFilterRij

            ForEach(dagenTeTonen, id: \.self) { dag in
                let dagActiviteiten = activiteiten
                    .filter { $0.weekId == week.id && $0.dag == dag }
                    .sorted { $0.volgorde < $1.volgorde }
                if !dagActiviteiten.isEmpty {
                    dagSectie(dag: dag, week: week, activiteiten: dagActiviteiten, layout: layout)
                } else if dagFilter != nil {
                    Text("Geen activiteiten op \(dag.label.lowercased()) in deze week.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 8)
                }
            }
        }
    }

    /// Filter om in de documentweergave één specifieke dag te kunnen bekijken
    /// i.p.v. altijd alle vijf dagen onder elkaar.
    private var dagFilterRij: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                dagFilterKnop(titel: "Alle dagen", waarde: nil)
                ForEach(Dag.allCases, id: \.self) { dag in
                    dagFilterKnop(titel: dag.label, waarde: dag)
                }
            }
        }
    }

    private func dagFilterKnop(titel: String, waarde: Dag?) -> some View {
        Button {
            dagFilter = waarde
        } label: {
            Text(titel)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 12).padding(.vertical, 7)
                .background(dagFilter == waarde ? Color.theepotGroen : Color(.secondarySystemBackground))
                .foregroundStyle(dagFilter == waarde ? .white : .primary)
                .clipShape(Capsule())
        }
    }

    /// Kolomaantal, tekstgrootte en fotoplaatsing volgen de beschikbare breedte
    /// (zie PlanningLayout), zodat een iPad in portret net zo goed twee kolommen
    /// krijgt als een iPhone er één krijgt.
    private func dagSectie(dag: Dag, week: VakantieWeek, activiteiten: [VakantieActiviteit], layout: PlanningLayout) -> some View {
        VStack(alignment: .leading, spacing: layout.compactScherm ? 10 : 14) {
            HStack {
                Text(dag.label).font(layout.dagKopFont).foregroundStyle(.white)
                Spacer()
                Text(dagDatumStr(week: week, dag: dag))
                    .font(layout.compactScherm ? .caption : .subheadline)
                    .foregroundStyle(.white.opacity(0.85))
            }
            .padding(.horizontal, layout.compactScherm ? 14 : 18).padding(.vertical, layout.compactScherm ? 8 : 12)
            .background(Color.theepotGroen)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            LazyVGrid(columns: layout.rasterKolommen, alignment: .leading, spacing: PlanningLayout.kaartTussenruimte) {
                ForEach(activiteiten) { activiteit in
                    ActiviteitKaart(
                        activiteit: activiteit,
                        kaartBreedte: layout.kaartBreedte,
                        compactScherm: layout.compactScherm,
                        onTap: { detailActiviteit = activiteit }
                    ) { url in
                        popupFoto = FotoItem(url: url)
                    }
                }
            }
        }
    }

    private func dagDatumStr(week: VakantieWeek, dag: Dag) -> String {
        let isoFormatter = DateFormatter()
        isoFormatter.dateFormat = "yyyy-MM-dd"
        isoFormatter.timeZone = TimeZone(identifier: "UTC")

        let startStr = (actieveRegio == .noord ? planning.startDatumNoord : nil) ?? planning.startDatum
        guard let start = isoFormatter.date(from: String(startStr.prefix(10))) else { return "" }

        var kalender = Calendar(identifier: .gregorian)
        kalender.timeZone = TimeZone(identifier: "UTC")!

        let weekdag = kalender.component(.weekday, from: start) // 1 = zondag ... 7 = zaterdag
        let afstandTotMaandag = weekdag == 1 ? 6 : weekdag - 2
        guard let eersteMaandag = kalender.date(byAdding: .day, value: -afstandTotMaandag, to: start) else { return "" }

        let dagVolgorde: [Dag] = [.maandag, .dinsdag, .woensdag, .donderdag, .vrijdag]
        guard let dagIndex = dagVolgorde.firstIndex(of: dag) else { return "" }
        guard let doel = kalender.date(byAdding: .day, value: (week.weekNummer - 1) * 7 + dagIndex, to: eersteMaandag) else { return "" }

        let uitvoerFormatter = DateFormatter()
        uitvoerFormatter.locale = Locale(identifier: "nl_NL")
        uitvoerFormatter.dateFormat = "d MMM"
        return uitvoerFormatter.string(from: doel)
    }
}

private struct FotoItem: Identifiable {
    let id = UUID()
    let url: URL
}

// ─── Activiteitkaart met foto ──────────────────────────────────────────────

private struct ActiviteitKaart: View {
    let activiteit: VakantieActiviteit
    /// Breedte die deze kaart in het raster krijgt. Bepaalt tekstgrootte,
    /// fotoformaat en of de foto naast of boven de tekst past — de kaart weet
    /// zelf niets van apparaten of oriëntatie.
    let kaartBreedte: CGFloat
    /// Op de iPhone blijft alles compact, ook als de kaart schermbreed is.
    let compactScherm: Bool
    /// Tikken op de tekst opent de losse detailweergave van deze activiteit.
    let onTap: () -> Void
    let onFotoTap: (URL) -> Void

    private enum Schaal { case compact, normaal, ruim }

    private var schaal: Schaal {
        if compactScherm { return .compact }
        return kaartBreedte >= 520 ? .ruim : .normaal
    }

    /// Alleen op een echt brede kaart houdt de tekst naast een foto nog genoeg
    /// ruimte over; daaronder staat de foto bovenaan over de volle breedte.
    private var fotoNaastTekst: Bool { kaartBreedte >= 480 }

    private var fotoURL: URL? {
        guard let pad = activiteit.afbeeldingPad, !pad.isEmpty else { return nil }
        return Secrets.supabaseURL.appendingPathComponent("storage/v1/object/public/activiteit-afbeeldingen/\(pad)")
    }

    private var fotoZijkant: CGFloat { schaal == .ruim ? 150 : 110 }

    private var fotoBoven: CGFloat {
        switch schaal {
        case .compact: return 170
        case .normaal: return 200
        case .ruim: return 260
        }
    }

    private var titelFont: Font {
        switch schaal {
        case .compact: return .subheadline.weight(.bold)
        case .normaal: return .headline
        case .ruim: return .title2.weight(.bold)
        }
    }

    private var tekstFont: Font {
        switch schaal {
        case .compact: return .footnote
        case .normaal: return .subheadline
        case .ruim: return .body
        }
    }

    private var lijstFont: Font {
        switch schaal {
        case .compact: return .caption
        case .normaal: return .footnote
        case .ruim: return .subheadline
        }
    }

    private var labelFont: Font {
        schaal == .ruim ? .caption.weight(.bold) : .caption2.weight(.bold)
    }

    private var kaartPadding: CGFloat {
        switch schaal {
        case .compact: return 12
        case .normaal: return 14
        case .ruim: return 18
        }
    }

    private var binnenSpatie: CGFloat { schaal == .compact ? 6 : 8 }

    var body: some View {
        Group {
            if fotoNaastTekst {
                HStack(alignment: .top, spacing: schaal == .ruim ? 16 : 12) {
                    tekstBlok
                    Spacer(minLength: 0)
                    if let fotoURL {
                        fotoKnop(url: fotoURL, breedte: fotoZijkant, hoogte: fotoZijkant)
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: binnenSpatie + 4) {
                    if let fotoURL {
                        fotoKnop(url: fotoURL, breedte: nil, hoogte: fotoBoven)
                            .frame(maxWidth: .infinity)
                    }
                    tekstBlok
                }
            }
        }
        .theepotGlasKaart(hoekradius: 14, padding: kaartPadding)
    }

    private var tekstBlok: some View {
        VStack(alignment: .leading, spacing: binnenSpatie) {
            Text(activiteit.naam).font(titelFont)

            if let beschrijving = activiteit.beschrijving, !beschrijving.isEmpty {
                Text(beschrijving).font(tekstFont).foregroundStyle(.secondary)
            }

            if let benodigdheden = activiteit.benodigdheden, !benodigdheden.isEmpty {
                VStack(alignment: .leading, spacing: schaal == .compact ? 3 : 5) {
                    Text("BENODIGDHEDEN")
                        .font(labelFont)
                        .foregroundStyle(.secondary)
                    ForEach(benodigdheden, id: \.self) { item in
                        HStack(spacing: 6) {
                            Circle().fill(Color.theepotGroen).frame(width: schaal == .compact ? 5 : 6, height: schaal == .compact ? 5 : 6)
                            Text(item).font(lijstFont)
                        }
                    }
                }
                .padding(.top, 2)
            }

            Text(activiteit.categorie.uppercased())
                .font(labelFont)
                .foregroundStyle(Color.theepotGroenTekst)
                .padding(.top, 2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        .onTapGesture { onTap() }
    }

    private func fotoKnop(url: URL, breedte: CGFloat?, hoogte: CGFloat) -> some View {
        Button {
            onFotoTap(url)
        } label: {
            AsyncImage(url: url) { fase in
                switch fase {
                case .success(let image):
                    image.resizable().scaledToFill()
                case .failure:
                    Color(.systemGray5)
                default:
                    ZStack { Color(.systemGray6); ProgressView() }
                }
            }
            .frame(width: breedte, height: hoogte)
            .frame(maxWidth: breedte == nil ? .infinity : nil)
            .clipShape(RoundedRectangle(cornerRadius: schaal == .compact ? 10 : 14, style: .continuous))
            .clipped()
        }
        .buttonStyle(.plain)
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

private func fmtDatum(_ isoDatum: String) -> String {
    let inFormatter = DateFormatter()
    inFormatter.dateFormat = "yyyy-MM-dd"
    inFormatter.timeZone = TimeZone(identifier: "UTC")
    guard let datum = inFormatter.date(from: String(isoDatum.prefix(10))) else { return isoDatum }

    let uitFormatter = DateFormatter()
    uitFormatter.locale = Locale(identifier: "nl_NL")
    uitFormatter.dateFormat = "d MMMM yyyy"
    return uitFormatter.string(from: datum)
}
