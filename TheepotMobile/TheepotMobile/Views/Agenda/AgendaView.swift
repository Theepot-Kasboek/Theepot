import SwiftUI

/// Spiegelt app/agenda/page.tsx (lijstweergave — geen maand/week/dag-grid,
/// dat past niet goed op een telefoonscherm). Toont aankomende afspraken uit
/// alle zichtbare kalenders, gegroepeerd per dag.
struct AgendaView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var meldingRouter: MeldingRouter

    @State private var kalenders: [AgendaKalender] = []
    @State private var afspraken: [AgendaAfspraak] = []
    @State private var isLoading = true
    @State private var foutmelding: String?
    @State private var toonNieuw = false
    @State private var bewerkAfspraak: AgendaAfspraak?

    private var magZien: Bool {
        session.isSuperadmin || session.rechten.paginaAgenda == .lezen || session.rechten.paginaAgenda == .bewerken
    }

    private var magBewerken: Bool {
        session.isSuperadmin || session.rechten.paginaAgenda == .bewerken
    }

    private var magAllePersoonlijkZien: Bool {
        session.magAllesZien && (session.isSuperadmin || session.rechten.agendaPersoneelInzien)
    }

    /// Kalenders waarin de gebruiker mag schrijven: eigen kalender, of
    /// algemene kalenders met het recht `agenda_algemeen_bewerken`.
    private var bewerkbareKalenders: [AgendaKalender] {
        let profielId = session.profiel?.id.uuidString.lowercased()
        let magAlgemeenBewerken = session.isSuperadmin || session.rechten.agendaAlgemeenBewerken
        return kalenders.filter { $0.eigenaarId == profielId || ($0.type == "algemeen" && magAlgemeenBewerken) }
    }

    private var eigenKalender: AgendaKalender? {
        let profielId = session.profiel?.id.uuidString.lowercased()
        return kalenders.first { $0.isPersoonlijk && $0.eigenaarId == profielId }
    }

    private var komendeAfspraken: [AgendaAfspraak] {
        let vandaag = Calendar.current.startOfDay(for: Date())
        return afspraken
            .filter { ($0.startDatum ?? .distantPast) >= vandaag }
            .sorted { ($0.startDatum ?? .distantPast) < ($1.startDatum ?? .distantPast) }
    }

    private var gegroepeerd: [(dag: Date, afspraken: [AgendaAfspraak])] {
        let cal = Calendar.current
        var groepen: [Date: [AgendaAfspraak]] = [:]
        for a in komendeAfspraken {
            let dag = cal.startOfDay(for: a.startDatum ?? Date())
            groepen[dag, default: []].append(a)
        }
        return groepen.keys.sorted().map { ($0, groepen[$0] ?? []) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if !magZien {
                    ContentUnavailableView("Geen toegang", systemImage: "calendar.badge.exclamationmark")
                } else if isLoading {
                    ProgressView()
                } else if let foutmelding {
                    ContentUnavailableView(foutmelding, systemImage: "exclamationmark.triangle")
                } else if komendeAfspraken.isEmpty {
                    ContentUnavailableView("Geen aankomende afspraken", systemImage: "calendar")
                } else {
                    List {
                        ForEach(gegroepeerd, id: \.dag) { groep in
                            Section(dagLabel(groep.dag)) {
                                ForEach(groep.afspraken) { afspraak in
                                    AgendaRow(afspraak: afspraak, kalender: kalender(voor: afspraak))
                                        .contentShape(Rectangle())
                                        .onTapGesture {
                                            if magBewerken && bewerkbareKalenders.contains(where: { $0.id == afspraak.kalenderId }) {
                                                bewerkAfspraak = afspraak
                                            }
                                        }
                                }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                    .refreshable { await laad() }
                }
            }
            .navigationTitle("Agenda")
            .toolbar {
                if magZien && magBewerken {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { toonNieuw = true } label: {
                            Image(systemName: "plus.circle.fill")
                                .foregroundStyle(Color.theepotGroen)
                        }
                    }
                }
            }
            .sheet(isPresented: $toonNieuw) {
                AgendaAfspraakFormView(bestaand: nil, kalenders: bewerkbareKalenders, standaardKalenderId: eigenKalender?.id) { await laad() }
            }
            .sheet(item: $bewerkAfspraak) { afspraak in
                AgendaAfspraakFormView(bestaand: afspraak, kalenders: bewerkbareKalenders, standaardKalenderId: eigenKalender?.id) { await laad() }
            }
        }
        .task { await laad() }
        .onChange(of: meldingRouter.gewenstAfspraakId) { _, afspraakId in
            guard let afspraakId else { return }
            if let afspraak = afspraken.first(where: { $0.id == afspraakId }) {
                if magBewerken && bewerkbareKalenders.contains(where: { $0.id == afspraak.kalenderId }) {
                    bewerkAfspraak = afspraak
                }
            }
            meldingRouter.verwerktAfspraak()
        }
    }

    private func kalender(voor afspraak: AgendaAfspraak) -> AgendaKalender? {
        kalenders.first { $0.id == afspraak.kalenderId }
    }

    private func dagLabel(_ dag: Date) -> String {
        if Calendar.current.isDateInToday(dag) { return "Vandaag" }
        if Calendar.current.isDateInTomorrow(dag) { return "Morgen" }
        let f = DateFormatter()
        f.locale = Locale(identifier: "nl_NL")
        f.setLocalizedDateFormatFromTemplate("EEEE d MMMM")
        return f.string(from: dag).capitalized
    }

    private func laad() async {
        guard magZien, let profielId = session.profiel?.id.uuidString.lowercased() else { isLoading = false; return }
        isLoading = true
        do {
            kalenders = try await AgendaService.kalenders(
                profielId: profielId,
                magAlleKalendersZien: session.magAllesZien,
                magAllePersoonlijkZien: magAllePersoonlijkZien
            )
            afspraken = try await AgendaService.afspraken(kalenderIds: kalenders.map(\.id))
            foutmelding = nil
        } catch {
            foutmelding = "Agenda kon niet worden geladen."
        }
        isLoading = false
    }
}

private struct AgendaRow: View {
    let afspraak: AgendaAfspraak
    let kalender: AgendaKalender?

    private var kleur: Color {
        guard let hex = kalender?.kleur else { return .theepotGroenDonker }
        return Color(hex: hex)
    }

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 2).fill(kleur).frame(width: 4)
            VStack(alignment: .leading, spacing: 4) {
                Text(afspraak.titel).font(.headline)
                Text(tijdLabel).font(.subheadline).foregroundStyle(.secondary)
                if let naam = kalender?.naam {
                    Text(naam).font(.caption).foregroundStyle(.tertiary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var tijdLabel: String {
        if afspraak.heleDag { return "Hele dag" }
        guard let start = afspraak.startDatum, let eind = afspraak.eindDatum else { return "" }
        let f = DateFormatter(); f.timeStyle = .short; f.dateStyle = .none
        return "\(f.string(from: start)) – \(f.string(from: eind))"
    }
}

private struct AgendaAfspraakFormView: View {
    @EnvironmentObject var session: SessionStore
    @Environment(\.dismiss) private var dismiss
    let bestaand: AgendaAfspraak?
    let kalenders: [AgendaKalender]
    let standaardKalenderId: String?
    let onKlaar: () async -> Void

    @State private var titel: String
    @State private var beschrijving: String
    @State private var kalenderId: String
    @State private var start: Date
    @State private var eind: Date
    @State private var heleDag: Bool
    @State private var herinnering: AgendaHerinneringOptie
    @State private var bezig = false

    init(bestaand: AgendaAfspraak?, kalenders: [AgendaKalender], standaardKalenderId: String?, onKlaar: @escaping () async -> Void) {
        self.bestaand = bestaand
        self.kalenders = kalenders
        self.standaardKalenderId = standaardKalenderId
        self.onKlaar = onKlaar

        let nu = Date()
        let straks = Calendar.current.date(byAdding: .hour, value: 1, to: nu) ?? nu

        _titel = State(initialValue: bestaand?.titel ?? "")
        _beschrijving = State(initialValue: bestaand?.beschrijving ?? "")
        _kalenderId = State(initialValue: bestaand?.kalenderId ?? standaardKalenderId ?? kalenders.first?.id ?? "")
        _start = State(initialValue: bestaand?.startDatum ?? nu)
        _eind = State(initialValue: bestaand?.eindDatum ?? straks)
        _heleDag = State(initialValue: bestaand?.heleDag ?? false)
        _herinnering = State(initialValue: AgendaHerinneringOptie.van(bestaand?.herinneringMinuten))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Afspraak") {
                    TextField("Titel", text: $titel)
                    TextField("Beschrijving", text: $beschrijving, axis: .vertical)
                        .lineLimit(3...6)
                }
                Section("Details") {
                    if kalenders.count > 1 {
                        Picker("Kalender", selection: $kalenderId) {
                            ForEach(kalenders) { Text($0.naam).tag($0.id) }
                        }
                    }
                    Toggle("Hele dag", isOn: $heleDag)
                    if heleDag {
                        DatePicker("Datum", selection: $start, displayedComponents: .date)
                    } else {
                        DatePicker("Begin", selection: $start, displayedComponents: [.date, .hourAndMinute])
                        DatePicker("Eind", selection: $eind, in: start..., displayedComponents: [.date, .hourAndMinute])
                    }
                }
                Section("Herinnering") {
                    Picker("Herinnering", selection: $herinnering) {
                        ForEach(AgendaHerinneringOptie.allCases) { Text($0.label).tag($0) }
                    }
                }
                if let bestaand {
                    Section {
                        Button("Verwijderen", role: .destructive) {
                            Task {
                                try? await AgendaService.verwijderAfspraak(id: bestaand.id)
                                await onKlaar()
                                dismiss()
                            }
                        }
                    }
                }
            }
            .navigationTitle(bestaand == nil ? "Nieuwe afspraak" : "Afspraak bewerken")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Opslaan") { Task { await opslaan() } }
                        .disabled(titel.isEmpty || kalenderId.isEmpty || bezig)
                }
            }
        }
    }

    private func opslaan() async {
        bezig = true
        defer { bezig = false }
        let iso = ISO8601DateFormatter.theepot
        let eindeDag = heleDag ? Calendar.current.date(bySettingHour: 23, minute: 59, second: 0, of: start) ?? start : eind
        let beginDag = heleDag ? Calendar.current.date(bySettingHour: 0, minute: 0, second: 0, of: start) ?? start : start

        do {
            if let bestaand {
                try await AgendaService.werkAfspraakBij(
                    id: bestaand.id, kalenderId: kalenderId, titel: titel,
                    beschrijving: beschrijving.isEmpty ? nil : beschrijving,
                    startTijd: iso.string(from: beginDag), eindTijd: iso.string(from: eindeDag),
                    heleDag: heleDag, herinneringMinuten: herinnering.opgeslagenWaarde
                )
            } else if let profielId = session.profiel?.id.uuidString.lowercased() {
                try await AgendaService.maakAfspraak(
                    kalenderId: kalenderId, titel: titel,
                    beschrijving: beschrijving.isEmpty ? nil : beschrijving,
                    startTijd: iso.string(from: beginDag), eindTijd: iso.string(from: eindeDag),
                    heleDag: heleDag, herinneringMinuten: herinnering.opgeslagenWaarde,
                    aangemaaktDoor: profielId
                )
            }
            await onKlaar()
            dismiss()
        } catch {}
    }
}
