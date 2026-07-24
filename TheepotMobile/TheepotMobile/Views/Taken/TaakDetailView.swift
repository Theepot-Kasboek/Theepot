import SwiftUI

struct TaakDetailView: View {
    let taak: TodoTaak
    let onKlaar: () async -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var titel: String
    @State private var notitie: String
    @State private var prioriteit: Prioriteit
    @State private var heeftVervaldatum: Bool
    @State private var vervaldatum: Date

    init(taak: TodoTaak, onKlaar: @escaping () async -> Void) {
        self.taak = taak
        self.onKlaar = onKlaar
        _titel = State(initialValue: taak.titel)
        _notitie = State(initialValue: taak.notitie ?? "")
        _prioriteit = State(initialValue: taak.prioriteit)
        _heeftVervaldatum = State(initialValue: taak.vervaldatum != nil)
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        _vervaldatum = State(initialValue: taak.vervaldatum.flatMap { f.date(from: $0) } ?? Date())
    }

    var body: some View {
        Form {
            Section("Taak") {
                TextField("Titel", text: $titel)
                    .onSubmit { Task { await slaTitelNotitieOp() } }
                TextField("Notitie", text: $notitie, axis: .vertical)
                    .lineLimit(3...6)
            }
            Section("Details") {
                Picker("Prioriteit", selection: $prioriteit) {
                    ForEach(Prioriteit.allCases, id: \.self) { Text($0.label).tag($0) }
                }
                Toggle("Vervaldatum", isOn: $heeftVervaldatum)
                if heeftVervaldatum {
                    DatePicker("Datum", selection: $vervaldatum, displayedComponents: .date)
                }
            }
            Section {
                Button("Verwijderen", role: .destructive) {
                    Task {
                        try? await TakenService.verwijderTaak(id: taak.id)
                        await onKlaar()
                        dismiss()
                    }
                }
            }
        }
        .navigationTitle("Taak")
        .onDisappear { Task { await slaTitelNotitieOp() } }
        .onChange(of: prioriteit) { _, nieuw in Task { try? await TakenService.werkPrioriteitBij(id: taak.id, prioriteit: nieuw) } }
        .onChange(of: heeftVervaldatum) { _, aan in Task { await slaVervaldatumOp(aan: aan) } }
        .onChange(of: vervaldatum) { _, _ in if heeftVervaldatum { Task { await slaVervaldatumOp(aan: true) } } }
    }

    private func slaTitelNotitieOp() async {
        guard !titel.isEmpty else { return }
        try? await TakenService.werkTitelNotitieBij(id: taak.id, titel: titel, notitie: notitie.isEmpty ? nil : notitie)
        await onKlaar()
    }

    private func slaVervaldatumOp(aan: Bool) async {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        try? await TakenService.werkVervaldatumBij(id: taak.id, vervaldatum: aan ? f.string(from: vervaldatum) : nil)
        await onKlaar()
    }
}
