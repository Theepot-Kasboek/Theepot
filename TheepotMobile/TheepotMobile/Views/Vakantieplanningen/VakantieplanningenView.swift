import SwiftUI
import PhotosUI
import UIKit

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
    @State private var nieuwePlanningModal = false

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
                                    .contextMenu {
                                        if magBewerken {
                                            Button {
                                                Task { await togglePubliceer(planning) }
                                            } label: {
                                                Label(planning.gepubliceerd ? "Verbergen" : "Publiceren", systemImage: planning.gepubliceerd ? "eye.slash" : "paperplane")
                                            }
                                            Button(role: .destructive) {
                                                Task { await verwijderPlanning(planning) }
                                            } label: {
                                                Label("Verwijderen", systemImage: "trash")
                                            }
                                        }
                                    }
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
            .toolbar {
                if magBewerken {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { nieuwePlanningModal = true } label: {
                            Image(systemName: "plus.circle.fill")
                                .foregroundStyle(Color.theepotGroen)
                        }
                    }
                }
            }
            .navigationDestination(for: VakantiePlanning.self) { planning in
                VakantiePlanningDetailView(planning: planning)
            }
            .sheet(isPresented: $nieuwePlanningModal) {
                NieuwePlanningFormView { nieuw in
                    await laad()
                    nieuwePlanningModal = false
                    _ = nieuw
                }
            }
        }
        .task { await laad() }
    }

    private func laad() async {
        planningen = (try? await VakantieplanningenService.planningen(magOnepubliceerdeZien: magBewerken)) ?? []
        isLoading = false
    }

    private func togglePubliceer(_ planning: VakantiePlanning) async {
        try? await VakantieplanningenService.togglePubliceer(id: planning.id, huidig: planning.gepubliceerd)
        await laad()
    }

    private func verwijderPlanning(_ planning: VakantiePlanning) async {
        try? await VakantieplanningenService.verwijderPlanning(id: planning.id)
        await laad()
    }
}

// ─── Nieuwe planning aanmaken ───────────────────────────────────────────────

private struct NieuwePlanningFormView: View {
    @EnvironmentObject var session: SessionStore
    @Environment(\.dismiss) private var dismiss
    let onOpgeslagen: (VakantiePlanning) async -> Void

    @State private var naam = ""
    @State private var vakantie = STANDAARD_VAKANTIES.last ?? ""
    @State private var thema = ""
    @State private var startDatum = Date()
    @State private var eindDatum = Date()
    @State private var bezig = false

    private var geldig: Bool { !naam.trimmingCharacters(in: .whitespaces).isEmpty && !thema.trimmingCharacters(in: .whitespaces).isEmpty }

    var body: some View {
        NavigationStack {
            Form {
                Section("Planning") {
                    TextField("Naam (bijv. Zomervakantie 2026)", text: $naam)
                    Picker("Vakantie", selection: $vakantie) {
                        ForEach(STANDAARD_VAKANTIES, id: \.self) { Text($0).tag($0) }
                    }
                    TextField("Thema (bijv. Jungle, Ruimte...)", text: $thema)
                }
                Section("Periode") {
                    DatePicker("Startdatum", selection: $startDatum, displayedComponents: .date)
                    DatePicker("Einddatum", selection: $eindDatum, in: startDatum..., displayedComponents: .date)
                }
            }
            .navigationTitle("Nieuwe planning")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Aanmaken") { Task { await opslaan() } }
                        .disabled(!geldig || bezig)
                }
            }
        }
    }

    private func opslaan() async {
        guard let profielId = session.profiel?.id.uuidString.lowercased() else { return }
        bezig = true
        defer { bezig = false }
        do {
            let nieuw = try await VakantieplanningenService.maakPlanning(
                naam: naam.trimmingCharacters(in: .whitespaces),
                vakantie: vakantie,
                thema: thema.trimmingCharacters(in: .whitespaces),
                startDatum: isoDatum(startDatum),
                eindDatum: isoDatum(eindDatum),
                aangemaaktDoor: profielId
            )
            await onOpgeslagen(nieuw)
        } catch {}
    }
}

private let STANDAARD_VAKANTIES = ["Herfstvakantie", "Kerstvakantie", "Voorjaarsvakantie", "Meivakantie", "Zomervakantie"]

private func isoDatum(_ datum: Date) -> String {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    f.timeZone = TimeZone(identifier: "UTC")
    return f.string(from: datum)
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
    @EnvironmentObject var session: SessionStore
    @Environment(\.dismiss) private var dismiss
    @State var planning: VakantiePlanning
    @State private var weken: [VakantieWeek] = []
    @State private var activiteiten: [VakantieActiviteit] = []
    @State private var actieveWeekId: String?
    @State private var actieveRegio: Regio = .midden
    @State private var weergave: Weergave = .overzicht
    @State private var dagFilter: Dag?
    @State private var isLoading = true
    @State private var popupFoto: FotoItem?
    @State private var detailActiviteit: VakantieActiviteit?
    @State private var instellingenModal = false
    @State private var nieuweWeekModal = false
    @State private var activiteitFormContext: ActiviteitFormContext?

    private var magBewerken: Bool {
        session.isSuperadmin || session.rechten.paginaVakantieplanningen == .bewerken
    }

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
                    if magBewerken {
                        ContentUnavailableView {
                            Label("Nog geen weken", systemImage: "calendar")
                        } description: {
                            Text("Voeg een eerste week toe om activiteiten te kunnen plannen.")
                        } actions: {
                            Button("Week toevoegen") { nieuweWeekModal = true }
                                .buttonStyle(.borderedProminent)
                                .tint(Color.theepotGroen)
                        }
                    } else {
                        ContentUnavailableView("Nog geen weken", systemImage: "calendar")
                    }
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
        .toolbar {
            if magBewerken {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await togglePubliceer() }
                    } label: {
                        Image(systemName: planning.gepubliceerd ? "eye.slash" : "paperplane.fill")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { instellingenModal = true } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
        }
        .task { await laad() }
        .sheet(isPresented: $instellingenModal) {
            PlanningInstellingenFormView(planning: planning) { bijgewerkt in
                if let bijgewerkt {
                    planning = bijgewerkt
                    instellingenModal = false
                } else {
                    // Verwijderd — terug naar het overzicht.
                    dismiss()
                }
            }
        }
        .sheet(isPresented: $nieuweWeekModal) {
            NieuweWeekFormView(planningId: planning.id, volgendWeekNr: weken.count + 1) {
                nieuweWeekModal = false
                Task { await laad() }
            }
        }
        .sheet(item: $activiteitFormContext) { context in
            ActiviteitFormView(context: context) {
                activiteitFormContext = nil
                Task { await laadActiviteiten() }
            }
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
                    .contextMenu {
                        if magBewerken {
                            Button(role: .destructive) {
                                Task { await verwijderWeek(week) }
                            } label: {
                                Label("Week verwijderen", systemImage: "trash")
                            }
                        }
                    }
                }
                if magBewerken {
                    Button {
                        nieuweWeekModal = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundStyle(Color.theepotGroen)
                    }
                    .padding(.leading, 2)
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

    /// Donkere "linktabel"-stijl, gespiegeld op de kop-tabel bovenaan de
    /// documentweergave op het web: groene dagkop met onderstreepte titel,
    /// daaronder de activiteiten als onderstreepte groene "hyperlinks" op een
    /// donkere balk. Elke rij is minimaal 44pt hoog zodat hij op iPhone én
    /// iPad met de vinger makkelijk te raken is (Apple's tikdoel-richtlijn).
    private func dagKolom(week: VakantieWeek, dag: Dag, breedte: CGFloat?, ruim: Bool) -> some View {
        let dagActiviteiten = activiteiten
            .filter { $0.weekId == week.id && $0.dag == dag }
            .sorted { $0.volgorde < $1.volgorde }

        return VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 2) {
                Text(dag.label)
                    .font(ruim ? .headline : .subheadline.weight(.bold))
                    .underline()
                Text(dagDatumStr(week: week, dag: dag))
                    .font(ruim ? .caption : .caption2)
                    .opacity(0.85)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, ruim ? 14 : 10).padding(.vertical, ruim ? 12 : 10)
            .background(Color.theepotGroen)

            if dagActiviteiten.isEmpty && !magBewerken {
                Text("—")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, ruim ? 14 : 10).padding(.vertical, 12)
                    .background(Color.black.opacity(0.85))
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(dagActiviteiten.enumerated()), id: \.element.id) { index, activiteit in
                        Button {
                            if magBewerken {
                                activiteitFormContext = ActiviteitFormContext(weekId: week.id, dag: dag, activiteit: activiteit)
                            } else {
                                detailActiviteit = activiteit
                            }
                        } label: {
                            HStack(spacing: 6) {
                                if activiteit.afbeeldingPad != nil {
                                    Image(systemName: "photo.fill")
                                        .font(.system(size: ruim ? 11 : 9))
                                        .foregroundStyle(Color.theepotGroenTekst)
                                }
                                Text(activiteit.naam)
                                    .font(ruim ? .subheadline.weight(.semibold) : .caption.weight(.semibold))
                                    .underline()
                                    .foregroundStyle(Color.theepotGroenTekst)
                                    .multilineTextAlignment(.leading)
                                Spacer(minLength: 0)
                            }
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            .padding(.horizontal, ruim ? 14 : 10).padding(.vertical, 8)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .background(index.isMultiple(of: 2) ? Color.black.opacity(0.85) : Color.black.opacity(0.7))
                        .contextMenu {
                            if magBewerken {
                                Button(role: .destructive) {
                                    Task { await verwijderActiviteit(activiteit) }
                                } label: {
                                    Label("Verwijderen", systemImage: "trash")
                                }
                            }
                        }
                    }
                    if magBewerken {
                        Button {
                            activiteitFormContext = ActiviteitFormContext(weekId: week.id, dag: dag, activiteit: nil)
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "plus")
                                Text("Activiteit")
                            }
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.theepotGroenTekst)
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            .padding(.horizontal, ruim ? 14 : 10).padding(.vertical, 8)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .background(dagActiviteiten.count.isMultiple(of: 2) ? Color.black.opacity(0.85) : Color.black.opacity(0.7))
                    }
                }
            }
        }
        .frame(width: breedte, alignment: .leading)
        .frame(maxWidth: breedte == nil ? .infinity : nil)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
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
                if !dagActiviteiten.isEmpty || magBewerken {
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
                        onTap: {
                            if magBewerken {
                                activiteitFormContext = ActiviteitFormContext(weekId: week.id, dag: dag, activiteit: activiteit)
                            } else {
                                detailActiviteit = activiteit
                            }
                        }
                    ) { url in
                        popupFoto = FotoItem(url: url)
                    }
                    .contextMenu {
                        if magBewerken {
                            Button(role: .destructive) {
                                Task { await verwijderActiviteit(activiteit) }
                            } label: {
                                Label("Verwijderen", systemImage: "trash")
                            }
                        }
                    }
                }
                if magBewerken {
                    Button {
                        activiteitFormContext = ActiviteitFormContext(weekId: week.id, dag: dag, activiteit: nil)
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: "plus.circle")
                                .font(.title2)
                            Text("Activiteit toevoegen")
                                .font(.caption.weight(.semibold))
                        }
                        .foregroundStyle(Color.theepotGroenTekst)
                        .frame(width: layout.kaartBreedte, height: 90)
                        .background(Color(.tertiarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.theepotGroen.opacity(0.4), style: StrokeStyle(lineWidth: 1.5, dash: [5])))
                    }
                    .buttonStyle(.plain)
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

    // ─── Data laden en schrijfacties (alleen voor gebruikers met bewerkrecht) ─

    private func laad() async {
        weken = (try? await VakantieplanningenService.weken(planningId: planning.id)) ?? []
        if actieveWeekId == nil || !weken.contains(where: { $0.id == actieveWeekId }) {
            actieveWeekId = weken.first?.id
        }
        await laadActiviteiten()
        isLoading = false
    }

    private func laadActiviteiten() async {
        let ruw = (try? await VakantieplanningenService.activiteiten(weekIds: weken.map(\.id))) ?? []
        activiteiten = await VakantieplanningenService.metBibliotheekFotos(ruw)
    }

    private func togglePubliceer() async {
        try? await VakantieplanningenService.togglePubliceer(id: planning.id, huidig: planning.gepubliceerd)
        planning.gepubliceerd.toggle()
    }

    private func verwijderWeek(_ week: VakantieWeek) async {
        try? await VakantieplanningenService.verwijderWeek(id: week.id)
        await laad()
    }

    private func verwijderActiviteit(_ activiteit: VakantieActiviteit) async {
        try? await VakantieplanningenService.verwijderActiviteit(id: activiteit.id)
        await laadActiviteiten()
    }
}

/// Context voor het activiteit-formulier: welke week/dag een nieuwe activiteit
/// krijgt, of welke bestaande activiteit wordt bewerkt.
private struct ActiviteitFormContext: Identifiable {
    let weekId: String
    let dag: Dag
    let activiteit: VakantieActiviteit?
    var id: String { activiteit?.id ?? "nieuw-\(weekId)-\(dag.rawValue)" }
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

// ─── Instellingen: thema/vakantie/regio Noord bewerken + planning verwijderen ─

private struct PlanningInstellingenFormView: View {
    @Environment(\.dismiss) private var dismiss
    let planning: VakantiePlanning
    /// `nil` betekent dat de planning is verwijderd; anders de bijgewerkte planning.
    let onKlaar: (VakantiePlanning?) -> Void

    @State private var vakantie: String
    @State private var thema: String
    @State private var regioNoordAan: Bool
    @State private var startNoord = Date()
    @State private var eindNoord = Date()
    @State private var bezig = false

    init(planning: VakantiePlanning, onKlaar: @escaping (VakantiePlanning?) -> Void) {
        self.planning = planning
        self.onKlaar = onKlaar
        _vakantie = State(initialValue: planning.vakantie)
        _thema = State(initialValue: planning.thema ?? "")
        _regioNoordAan = State(initialValue: planning.startDatumNoord != nil)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Vakantie & thema") {
                    Picker("Vakantie", selection: $vakantie) {
                        ForEach(STANDAARD_VAKANTIES, id: \.self) { Text($0).tag($0) }
                        if !STANDAARD_VAKANTIES.contains(vakantie) { Text(vakantie).tag(vakantie) }
                    }
                    TextField("Thema", text: $thema)
                }
                Section("Lisse / Hillegom (Midden)") {
                    LabeledContent("Startdatum", value: fmtDatum(planning.startDatum))
                    LabeledContent("Einddatum", value: fmtDatum(planning.eindDatum))
                }
                Section {
                    Toggle("Lisserbroek valt in een andere week", isOn: $regioNoordAan.animation())
                    if regioNoordAan {
                        DatePicker("Startdatum Noord", selection: $startNoord, displayedComponents: .date)
                        DatePicker("Einddatum Noord", selection: $eindNoord, in: startNoord..., displayedComponents: .date)
                    }
                } header: {
                    Text("Lisserbroek (Noord)")
                } footer: {
                    Text("Alleen invullen als de vakantie op een andere week valt.")
                }
                Section {
                    Button(planning.gepubliceerd ? "Verbergen" : "Publiceren") {
                        Task { await togglePubliceer() }
                    }
                    Button("Planning verwijderen", role: .destructive) {
                        Task { await verwijderen() }
                    }
                }
            }
            .navigationTitle("Instellingen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Opslaan") { Task { await opslaan() } }
                        .disabled(thema.trimmingCharacters(in: .whitespaces).isEmpty || bezig)
                }
            }
        }
        .task {
            if let bestaand = planning.startDatumNoord, let datum = isoNaarDatum(bestaand) { startNoord = datum }
            if let bestaand = planning.eindDatumNoord, let datum = isoNaarDatum(bestaand) { eindNoord = datum }
        }
    }

    private func opslaan() async {
        bezig = true
        defer { bezig = false }
        let startNoordStr = regioNoordAan ? isoDatum(startNoord) : nil
        let eindNoordStr = regioNoordAan ? isoDatum(eindNoord) : nil
        do {
            try await VakantieplanningenService.werkBijInstellingen(id: planning.id, thema: thema.trimmingCharacters(in: .whitespaces), vakantie: vakantie, startNoord: startNoordStr, eindNoord: eindNoordStr)
            var bijgewerkt = planning
            bijgewerkt.thema = thema.trimmingCharacters(in: .whitespaces)
            bijgewerkt.vakantie = vakantie
            bijgewerkt.startDatumNoord = startNoordStr
            bijgewerkt.eindDatumNoord = eindNoordStr
            onKlaar(bijgewerkt)
        } catch {}
    }

    private func togglePubliceer() async {
        try? await VakantieplanningenService.togglePubliceer(id: planning.id, huidig: planning.gepubliceerd)
        var bijgewerkt = planning
        bijgewerkt.gepubliceerd.toggle()
        onKlaar(bijgewerkt)
    }

    private func verwijderen() async {
        try? await VakantieplanningenService.verwijderPlanning(id: planning.id)
        onKlaar(nil)
    }
}

private func isoNaarDatum(_ iso: String) -> Date? {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    f.timeZone = TimeZone(identifier: "UTC")
    return f.date(from: String(iso.prefix(10)))
}

// ─── Nieuwe week toevoegen ──────────────────────────────────────────────────

private struct NieuweWeekFormView: View {
    @Environment(\.dismiss) private var dismiss
    let planningId: String
    let volgendWeekNr: Int
    let onKlaar: () -> Void

    @State private var naam = ""
    @State private var bezig = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Naam (bijv. Ridders & Kastelen)", text: $naam)
                } header: {
                    Text("Week \(volgendWeekNr)")
                }
            }
            .navigationTitle("Week toevoegen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Toevoegen") { Task { await opslaan() } }
                        .disabled(naam.trimmingCharacters(in: .whitespaces).isEmpty || bezig)
                }
            }
        }
    }

    private func opslaan() async {
        bezig = true
        defer { bezig = false }
        do {
            try await VakantieplanningenService.maakWeek(planningId: planningId, weekNummer: volgendWeekNr, naam: naam.trimmingCharacters(in: .whitespaces))
            onKlaar()
        } catch {}
    }
}

// ─── Activiteit toevoegen/bewerken, met koppeling aan de activiteitenbibliotheek ─

private struct ActiviteitFormView: View {
    @Environment(\.dismiss) private var dismiss
    let context: ActiviteitFormContext
    let onKlaar: () -> Void

    private enum Bron: String, CaseIterable { case handmatig = "Handmatig", bibliotheek = "Uit bibliotheek" }

    @State private var bron: Bron = .handmatig
    @State private var naam = ""
    @State private var categorie = ""
    @State private var beschrijving = ""
    @State private var benodigdhedenRaw = ""
    @State private var gekozenBibliotheekId: String?
    @State private var categorieen: [String] = []
    @State private var bibliotheek: [BibliotheekActiviteit] = []
    @State private var zoek = ""
    @State private var fotoItem: PhotosPickerItem?
    @State private var fotoPreview: Image?
    @State private var nieuweFotoData: Data?
    @State private var bezig = false

    private var gefilterdeBibliotheek: [BibliotheekActiviteit] {
        guard !zoek.trimmingCharacters(in: .whitespaces).isEmpty else { return bibliotheek }
        let q = zoek.lowercased()
        return bibliotheek.filter { $0.naam.lowercased().contains(q) || $0.categorie.lowercased().contains(q) }
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("Bron", selection: $bron) {
                    ForEach(Bron.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)

                if bron == .handmatig {
                    Section("Activiteit") {
                        TextField("Naam activiteit", text: $naam)
                        Picker("Categorie", selection: $categorie) {
                            ForEach(categorieen, id: \.self) { Text($0).tag($0) }
                            if !categorieen.isEmpty && !categorieen.contains(categorie) && !categorie.isEmpty {
                                Text(categorie).tag(categorie)
                            }
                        }
                        TextField("Benodigdheden (kommagescheiden)", text: $benodigdhedenRaw)
                        TextField("Beschrijving (optioneel)", text: $beschrijving, axis: .vertical)
                            .lineLimit(3...6)
                    }
                    Section("Foto (optioneel)") {
                        if let fotoPreview {
                            fotoPreview
                                .resizable()
                                .scaledToFill()
                                .frame(height: 140)
                                .frame(maxWidth: .infinity)
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                .clipped()
                        }
                        PhotosPicker(selection: $fotoItem, matching: .any(of: [.images])) {
                            Label(fotoPreview == nil ? "Foto kiezen" : "Foto wijzigen", systemImage: "photo")
                        }
                    }
                    if gekozenBibliotheekId != nil {
                        Section {
                            Text("Gekoppeld aan een activiteit uit de bibliotheek. De foto wordt ook daar bijgewerkt.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    if context.activiteit != nil {
                        Section {
                            Button("Activiteit verwijderen", role: .destructive) {
                                Task { await verwijderen() }
                            }
                        }
                    }
                } else {
                    Section {
                        TextField("Zoek op naam of categorie...", text: $zoek)
                    }
                    Section {
                        if gefilterdeBibliotheek.isEmpty {
                            Text("Geen activiteiten gevonden.")
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(gefilterdeBibliotheek) { item in
                                Button {
                                    kiesUitBibliotheek(item)
                                } label: {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.naam).foregroundStyle(.primary)
                                        Text([item.categorie, item.thema.first].compactMap { $0 }.joined(separator: " · "))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle(context.activiteit == nil ? "Activiteit toevoegen — \(context.dag.label)" : "Activiteit bewerken")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                if bron == .handmatig {
                    ToolbarItem(placement: .confirmationAction) {
                        Button(context.activiteit == nil ? "Toevoegen" : "Opslaan") { Task { await opslaan() } }
                            .disabled(naam.trimmingCharacters(in: .whitespaces).isEmpty || bezig)
                    }
                }
            }
        }
        .task { await laad() }
        .onChange(of: fotoItem) { _, nieuw in
            Task { await verwerkFoto(nieuw) }
        }
    }

    private func laad() async {
        categorieen = (try? await VakantieplanningenService.vakantieCategorieen()) ?? []
        bibliotheek = (try? await VakantieplanningenService.bibliotheekActiviteiten()) ?? []

        if let bestaand = context.activiteit {
            naam = bestaand.naam
            categorie = bestaand.categorie
            beschrijving = bestaand.beschrijving ?? ""
            benodigdhedenRaw = (bestaand.benodigdheden ?? []).joined(separator: ", ")
            gekozenBibliotheekId = bestaand.activiteitId
        } else {
            categorie = categorieen.first ?? "Overig"
        }
    }

    private func kiesUitBibliotheek(_ item: BibliotheekActiviteit) {
        naam = item.naam
        categorie = item.categorie
        if let beschrijvingItem = item.beschrijving, !beschrijvingItem.isEmpty { beschrijving = beschrijvingItem }
        if let materialen = item.materialen, !materialen.isEmpty { benodigdhedenRaw = materialen.joined(separator: ", ") }
        gekozenBibliotheekId = item.id
        bron = .handmatig
    }

    private func verwerkFoto(_ item: PhotosPickerItem?) async {
        guard let item, let data = try? await item.loadTransferable(type: Data.self) else { return }
        nieuweFotoData = data
        if let uiImage = UIImage(data: data) {
            fotoPreview = Image(uiImage: uiImage)
        }
    }

    private func opslaan() async {
        bezig = true
        defer { bezig = false }
        let benodigdheden = benodigdhedenRaw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        let naamGetrimd = naam.trimmingCharacters(in: .whitespaces)
        do {
            if let bestaand = context.activiteit {
                try await VakantieplanningenService.werkBijActiviteit(
                    id: bestaand.id, categorie: categorie, naam: naamGetrimd, beschrijving: beschrijving.isEmpty ? nil : beschrijving,
                    benodigdheden: benodigdheden, activiteitId: gekozenBibliotheekId, afbeelding: nieuweFotoData
                )
            } else {
                let huidigeVolgorde = ((try? await VakantieplanningenService.activiteiten(weekIds: [context.weekId])) ?? [])
                    .filter { $0.dag == context.dag }.count
                try await VakantieplanningenService.voegActiviteitToe(
                    weekId: context.weekId, dag: context.dag, volgorde: huidigeVolgorde, categorie: categorie, naam: naamGetrimd,
                    beschrijving: beschrijving.isEmpty ? nil : beschrijving, benodigdheden: benodigdheden,
                    activiteitId: gekozenBibliotheekId, afbeelding: nieuweFotoData
                )
            }
            onKlaar()
        } catch {}
    }

    private func verwijderen() async {
        guard let bestaand = context.activiteit else { return }
        try? await VakantieplanningenService.verwijderActiviteit(id: bestaand.id)
        onKlaar()
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
