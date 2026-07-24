import SwiftUI

struct PrikbordView: View {
    @EnvironmentObject var session: SessionStore
    @State private var berichten: [PrikbordBericht] = []
    @State private var isLoading = true
    @State private var foutmelding: String?
    @State private var toonNieuw = false
    @State private var bewerkBericht: PrikbordBericht?

    private var magToevoegen: Bool {
        session.isSuperadmin || session.rechten.prikbordToevoegen
    }

    private var magAllesBewerken: Bool {
        session.isSuperadmin || session.rechten.paginaPrikbord == .bewerken
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if let foutmelding {
                    ContentUnavailableView(foutmelding, systemImage: "exclamationmark.triangle")
                } else if berichten.isEmpty {
                    ContentUnavailableView("Geen meldingen", systemImage: "pin.slash")
                } else {
                    List(berichten) { bericht in
                        PrikbordRow(bericht: bericht)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                Task { await markeerGelezen(bericht) }
                                if magAllesBewerken || bericht.aangemaaktDoor == session.profiel?.id.uuidString.lowercased() {
                                    bewerkBericht = bericht
                                }
                            }
                    }
                    .listStyle(.insetGrouped)
                    .refreshable { await laad() }
                }
            }
            .navigationTitle("Meldingen")
            .toolbar {
                if magToevoegen {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { toonNieuw = true } label: {
                            Image(systemName: "plus.circle.fill")
                                .foregroundStyle(Color.theepotGroen)
                        }
                    }
                }
            }
            .sheet(isPresented: $toonNieuw) {
                PrikbordFormView(bestaand: nil) { await laad() }
            }
            .sheet(item: $bewerkBericht) { bericht in
                PrikbordFormView(bestaand: bericht) { await laad() }
            }
        }
        .task { await laad() }
    }

    private func laad() async {
        isLoading = true
        do {
            berichten = try await PrikbordService.berichten()
            foutmelding = nil
        } catch {
            foutmelding = "Meldingen konden niet worden geladen."
        }
        isLoading = false
    }

    private func markeerGelezen(_ bericht: PrikbordBericht) async {
        guard let profielId = session.profiel?.id.uuidString.lowercased() else { return }
        try? await PrikbordService.markeerGelezen(bericht: bericht, profielId: profielId)
    }
}

private struct PrikbordRow: View {
    let bericht: PrikbordBericht

    var kleur: Color {
        switch bericht.prioriteit {
        case .urgent: return .red
        case .belangrijk: return .orange
        case .normaal: return .theepotGroenDonker
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(bericht.titel).font(.headline)
                Spacer()
                Text(bericht.prioriteit.label)
                    .font(.caption2.bold())
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(kleur.opacity(0.15))
                    .foregroundStyle(kleur)
                    .clipShape(Capsule())
            }
            Text(bericht.inhoud).font(.subheadline).foregroundStyle(.secondary).lineLimit(3)
            Text("\(bericht.auteurNaam) · \(bericht.locatieNaam)")
                .font(.caption).foregroundStyle(.tertiary)
        }
        .padding(.vertical, 6)
    }
}

private struct PrikbordFormView: View {
    @EnvironmentObject var session: SessionStore
    @Environment(\.dismiss) private var dismiss
    let bestaand: PrikbordBericht?
    let onKlaar: () async -> Void

    @State private var titel = ""
    @State private var inhoud = ""
    @State private var prioriteit: PrikbordPrioriteit = .normaal
    @State private var locatieNaam = "alle"
    @State private var locaties: [Locatie] = []
    @State private var bezig = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Bericht") {
                    TextField("Titel", text: $titel)
                    TextField("Inhoud", text: $inhoud, axis: .vertical)
                        .lineLimit(4...8)
                }
                Section("Details") {
                    Picker("Prioriteit", selection: $prioriteit) {
                        ForEach(PrikbordPrioriteit.allCases, id: \.self) { Text($0.label).tag($0) }
                    }
                    Picker("Locatie", selection: $locatieNaam) {
                        Text("Alle locaties").tag("alle")
                        ForEach(locaties) { Text($0.naam).tag($0.naam) }
                    }
                }
                if let bestaand {
                    Section {
                        Button("Verwijderen", role: .destructive) {
                            Task {
                                try? await PrikbordService.verwijder(id: bestaand.id)
                                await onKlaar()
                                dismiss()
                            }
                        }
                    }
                }
            }
            .navigationTitle(bestaand == nil ? "Nieuwe melding" : "Melding bewerken")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Opslaan") { Task { await opslaan() } }
                        .disabled(titel.isEmpty || inhoud.isEmpty || bezig)
                }
            }
        }
        .task {
            locaties = (try? await LocatieService.actieveLocaties()) ?? []
            if let bestaand {
                titel = bestaand.titel
                inhoud = bestaand.inhoud
                prioriteit = bestaand.prioriteit
                locatieNaam = bestaand.locatieNaam
            }
        }
    }

    private func opslaan() async {
        bezig = true
        defer { bezig = false }
        do {
            if let bestaand {
                try await PrikbordService.werkBij(id: bestaand.id, titel: titel, inhoud: inhoud, prioriteit: prioriteit, locatieNaam: locatieNaam, verloopdatum: nil)
            } else if let profielId = session.profiel?.id.uuidString.lowercased() {
                try await PrikbordService.maakAan(locatieNaam: locatieNaam, titel: titel, inhoud: inhoud, prioriteit: prioriteit, verloopdatum: nil, aangemaaktDoor: profielId)
            }
            await onKlaar()
            dismiss()
        } catch {}
    }
}
