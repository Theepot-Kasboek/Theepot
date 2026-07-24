import SwiftUI

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
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(zichtbarePlanningen) { planning in
                                NavigationLink(value: planning) {
                                    PlanningKaart(planning: planning, magBewerken: magBewerken)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(16)
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
    @Environment(\.horizontalSizeClass) private var sizeClass
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

    /// Op iPad (regular width) is er genoeg ruimte om de weektabel als echte
    /// tabel met 5 vaste kolommen te tonen; op iPhone scrollt de tabel horizontaal.
    private var isIPadBreedte: Bool { sizeClass == .regular }

    /// Landscape op iPad krijgt een veel bredere inhoudskolom (meer ruimte
    /// naast elkaar); portrait blijft leesbaar-breed maar de kaarten zelf
    /// worden dan juist hoger (zie ActiviteitKaart's "groot"-formaat).
    private func inhoudMaxBreedte(liggend: Bool) -> CGFloat {
        guard isIPadBreedte else { return .infinity }
        return liggend ? 1300 : 900
    }

    private var actieveWeek: VakantieWeek? {
        weken.first { $0.id == actieveWeekId }
    }

    var body: some View {
        GeometryReader { geo in
            let liggend = geo.size.width > geo.size.height

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
                            if isIPadBreedte {
                                HStack(alignment: .top, spacing: 12) {
                                    weekTabs
                                    Spacer(minLength: 12)
                                    weergaveToggle
                                }
                            } else {
                                HStack {
                                    Spacer()
                                    weergaveToggle
                                }
                                weekTabs
                            }
                            if let week = actieveWeek {
                                switch weergave {
                                case .overzicht: weekOverzichtTabel(week: week)
                                case .document: weekDocument(week: week, liggend: liggend)
                                }
                            }
                        }
                        .padding(16)
                        .frame(maxWidth: inhoudMaxBreedte(liggend: liggend))
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
                ScrollView {
                    ActiviteitKaart(activiteit: activiteit, liggend: true, onTap: {}) { url in
                        popupFoto = FotoItem(url: url)
                    }
                    .padding(16)
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

    private func weekOverzichtTabel(week: VakantieWeek) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Week \(week.weekNummer) — \(week.naam)").font(.title3.weight(.bold))
                Text("\(planning.vakantie) · \(planning.thema ?? "")")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            if isIPadBreedte {
                dagKolommen(week: week, kolomBreedte: nil)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    dagKolommen(week: week, kolomBreedte: 168)
                }
            }
        }
    }

    private func dagKolommen(week: VakantieWeek, kolomBreedte: CGFloat?) -> some View {
        HStack(alignment: .top, spacing: 8) {
            ForEach(Dag.allCases, id: \.self) { dag in
                dagKolom(week: week, dag: dag, breedte: kolomBreedte)
            }
        }
    }

    private func dagKolom(week: VakantieWeek, dag: Dag, breedte: CGFloat?) -> some View {
        let dagActiviteiten = activiteiten
            .filter { $0.weekId == week.id && $0.dag == dag }
            .sorted { $0.volgorde < $1.volgorde }

        return VStack(alignment: .leading, spacing: isIPadBreedte ? 8 : 6) {
            VStack(alignment: .leading, spacing: 1) {
                Text(dag.label).font(isIPadBreedte ? .headline : .subheadline.weight(.bold))
                Text(dagDatumStr(week: week, dag: dag))
                    .font(isIPadBreedte ? .caption : .caption2)
                    .opacity(0.85)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, isIPadBreedte ? 12 : 10).padding(.vertical, isIPadBreedte ? 10 : 8)
            .background(Color.theepotGroen)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            if dagActiviteiten.isEmpty {
                Text("—")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .padding(.horizontal, 10).padding(.vertical, 8)
            } else {
                VStack(spacing: isIPadBreedte ? 8 : 6) {
                    ForEach(dagActiviteiten) { activiteit in
                        Button {
                            detailActiviteit = activiteit
                        } label: {
                            HStack(spacing: 6) {
                                if activiteit.afbeeldingPad != nil {
                                    Image(systemName: "photo.fill")
                                        .font(.system(size: isIPadBreedte ? 11 : 9))
                                        .foregroundStyle(Color.theepotGroenTekst)
                                }
                                Text(activiteit.naam)
                                    .font(isIPadBreedte ? .subheadline.weight(.semibold) : .caption.weight(.semibold))
                                    .foregroundStyle(.primary)
                                    .multilineTextAlignment(.leading)
                                    .lineLimit(2)
                                Spacer(minLength: 0)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, isIPadBreedte ? 12 : 10).padding(.vertical, isIPadBreedte ? 9 : 7)
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
        .padding(isIPadBreedte ? 10 : 8)
        .background(Color(.secondarySystemBackground).opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    // ─── Documentweergave: dagen onder elkaar met volledige details + foto's ─

    private func weekDocument(week: VakantieWeek, liggend: Bool) -> some View {
        let groot = isIPadBreedte
        let dagenTeTonen: [Dag] = dagFilter.map { [$0] } ?? Dag.allCases

        return VStack(alignment: .leading, spacing: groot ? 22 : 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Week \(week.weekNummer) — \(week.naam)").font(groot ? .largeTitle.weight(.bold) : .title3.weight(.bold))
                Text("\(planning.vakantie) · \(planning.thema ?? "")")
                    .font(groot ? .title3 : .footnote)
                    .foregroundStyle(.secondary)
            }

            dagFilterRij

            ForEach(dagenTeTonen, id: \.self) { dag in
                let dagActiviteiten = activiteiten
                    .filter { $0.weekId == week.id && $0.dag == dag }
                    .sorted { $0.volgorde < $1.volgorde }
                if !dagActiviteiten.isEmpty {
                    dagSectie(dag: dag, week: week, activiteiten: dagActiviteiten, liggend: liggend, groot: groot)
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

    /// Aantal kolommen voor activiteiten binnen een dag als het scherm breed
    /// genoeg is: op iPad-landscape 3 naast elkaar, op iPhone-landscape 2.
    private func kolomAantal(liggend: Bool, groot: Bool) -> Int {
        guard liggend else { return 1 }
        return groot ? 3 : 2
    }

    /// Bij landscape (breed scherm) staat de tekst naast de foto zoals in de
    /// webversie; bij portrait staat de foto groot boven de tekst — leesbaarder
    /// op een smal scherm dan een gekwetste 84pt-thumbnail naast de tekst.
    /// `groot` (iPad) schaalt lettertypes, foto's en padding nog een keer op.
    private func dagSectie(dag: Dag, week: VakantieWeek, activiteiten: [VakantieActiviteit], liggend: Bool, groot: Bool) -> some View {
        VStack(alignment: .leading, spacing: groot ? 14 : 10) {
            HStack {
                Text(dag.label).font(groot ? .title.weight(.bold) : .headline).foregroundStyle(.white)
                Spacer()
                Text(dagDatumStr(week: week, dag: dag))
                    .font(groot ? .title3 : .caption)
                    .foregroundStyle(.white.opacity(0.85))
            }
            .padding(.horizontal, groot ? 18 : 14).padding(.vertical, groot ? 12 : 8)
            .background(Color.theepotGroen)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            let kolommen = kolomAantal(liggend: liggend, groot: groot)
            if kolommen > 1 {
                let grid = Array(repeating: GridItem(.flexible(), spacing: 12), count: kolommen)
                LazyVGrid(columns: grid, alignment: .leading, spacing: 12) {
                    ForEach(activiteiten) { activiteit in
                        ActiviteitKaart(activiteit: activiteit, liggend: true, groot: groot, onTap: { detailActiviteit = activiteit }) { url in
                            popupFoto = FotoItem(url: url)
                        }
                    }
                }
            } else {
                VStack(spacing: groot ? 14 : 10) {
                    ForEach(activiteiten) { activiteit in
                        ActiviteitKaart(activiteit: activiteit, liggend: liggend, groot: groot, onTap: { detailActiviteit = activiteit }) { url in
                            popupFoto = FotoItem(url: url)
                        }
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
    /// true = breed scherm (landscape/iPad): foto naast de tekst, zoals op het web.
    /// false = smal scherm (portrait): foto groot bovenaan, tekst eronder.
    let liggend: Bool
    /// true op iPad: alles (foto, lettertypes, padding) een tandje groter.
    var groot: Bool = false
    /// Tikken op de tekst opent de losse detailweergave van deze activiteit.
    let onTap: () -> Void
    let onFotoTap: (URL) -> Void

    private var fotoURL: URL? {
        guard let pad = activiteit.afbeeldingPad, !pad.isEmpty else { return nil }
        return Secrets.supabaseURL.appendingPathComponent("storage/v1/object/public/activiteit-afbeeldingen/\(pad)")
    }

    private var fotoZijkant: CGFloat { groot ? 150 : 84 }
    private var fotoBoven: CGFloat { groot ? 300 : 170 }

    var body: some View {
        Group {
            if liggend {
                HStack(alignment: .top, spacing: groot ? 16 : 12) {
                    tekstBlok
                    Spacer(minLength: 0)
                    if let fotoURL {
                        fotoKnop(url: fotoURL, breedte: fotoZijkant, hoogte: fotoZijkant)
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: groot ? 14 : 10) {
                    if let fotoURL {
                        fotoKnop(url: fotoURL, breedte: nil, hoogte: fotoBoven)
                            .frame(maxWidth: .infinity)
                    }
                    tekstBlok
                }
            }
        }
        .theepotGlasKaart(hoekradius: 14, padding: groot ? 18 : 12)
    }

    private var tekstBlok: some View {
        VStack(alignment: .leading, spacing: groot ? 8 : 6) {
            Text(activiteit.naam).font(groot ? .title2.weight(.bold) : .subheadline.weight(.bold))

            if let beschrijving = activiteit.beschrijving, !beschrijving.isEmpty {
                Text(beschrijving).font(groot ? .body : .footnote).foregroundStyle(.secondary)
            }

            if let benodigdheden = activiteit.benodigdheden, !benodigdheden.isEmpty {
                VStack(alignment: .leading, spacing: groot ? 5 : 3) {
                    Text("BENODIGDHEDEN")
                        .font(groot ? .caption.weight(.bold) : .caption2.weight(.bold))
                        .foregroundStyle(.secondary)
                    ForEach(benodigdheden, id: \.self) { item in
                        HStack(spacing: 6) {
                            Circle().fill(Color.theepotGroen).frame(width: groot ? 6 : 5, height: groot ? 6 : 5)
                            Text(item).font(groot ? .subheadline : .caption)
                        }
                    }
                }
                .padding(.top, 2)
            }

            Text(activiteit.categorie.uppercased())
                .font(groot ? .caption.weight(.bold) : .caption2.weight(.bold))
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
            .clipShape(RoundedRectangle(cornerRadius: groot ? 14 : 10, style: .continuous))
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
