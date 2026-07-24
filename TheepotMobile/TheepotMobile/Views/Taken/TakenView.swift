import SwiftUI

private enum SlimmeView: String, CaseIterable, Identifiable {
    case alle = "Alle taken", vandaag = "Vandaag", gepland = "Gepland"
    var id: String { rawValue }
}

struct TakenView: View {
    @EnvironmentObject var session: SessionStore
    @State private var lijsten: [TodoLijst] = []
    @State private var taken: [TodoTaak] = []
    @State private var notities: [Notitie] = []
    @State private var isLoading = true
    @State private var slimmeView: SlimmeView = .alle
    @State private var gekozenLijst: TodoLijst?
    @State private var toonVoltooid = false
    @State private var nieuweTaakTitel = ""

    private var eigenaarId: String? { session.profiel?.id.uuidString.lowercased() }
    private var takenLijsten: [TodoLijst] { lijsten.filter { $0.type == .taken } }
    private var notitieMappen: [TodoLijst] { lijsten.filter { $0.type == .notities } }

    private var zichtbareTaken: [TodoTaak] {
        var basis: [TodoTaak]
        if let gekozenLijst {
            basis = taken.filter { $0.lijstId == gekozenLijst.id }
        } else {
            switch slimmeView {
            case .alle: basis = taken
            case .vandaag: basis = taken.filter(\.isVandaag)
            case .gepland: basis = taken.filter { $0.vervaldatum != nil }
            }
        }
        if !toonVoltooid { basis = basis.filter { !$0.voltooid } }
        return basis.sorted {
            if $0.voltooid != $1.voltooid { return !$0.voltooid }
            if $0.prioriteit != $1.prioriteit { return $0.prioriteit.rawValue > $1.prioriteit.rawValue }
            return $0.volgorde < $1.volgorde
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Slimme weergaves") {
                    ForEach(SlimmeView.allCases) { view in
                        Button {
                            slimmeView = view; gekozenLijst = nil
                        } label: {
                            HStack {
                                Text(view.rawValue)
                                Spacer()
                                if gekozenLijst == nil && slimmeView == view {
                                    Image(systemName: "checkmark").foregroundStyle(.tint)
                                }
                            }
                        }
                        .foregroundStyle(.primary)
                    }
                }

                Section("Takenlijsten") {
                    ForEach(takenLijsten) { lijst in
                        lijstRij(lijst)
                    }
                    Button {
                        Task { await nieuweLijst(type: .taken) }
                    } label: { Label("Nieuwe lijst", systemImage: "plus") }
                }

                Section("Taken") {
                    HStack {
                        TextField("Nieuwe taak...", text: $nieuweTaakTitel)
                        Button("Toevoegen") { Task { await voegTaakToe() } }
                            .disabled(nieuweTaakTitel.isEmpty)
                    }
                    Toggle("Toon voltooide taken", isOn: $toonVoltooid)
                    ForEach(zichtbareTaken) { taak in
                        NavigationLink(value: taak) {
                            TaakRow(taak: taak) { Task { await toggleVoltooid(taak) } }
                        }
                    }
                }

                Section("Notitiemappen") {
                    ForEach(notitieMappen) { map in
                        NavigationLink(value: map) {
                            Label(map.naam, systemImage: "folder")
                        }
                    }
                    Button {
                        Task { await nieuweLijst(type: .notities) }
                    } label: { Label("Nieuwe map", systemImage: "plus") }
                }
            }
            .navigationTitle("Taken & Notities")
            .navigationDestination(for: TodoTaak.self) { taak in
                TaakDetailView(taak: taak) { await laad() }
            }
            .navigationDestination(for: TodoLijst.self) { lijst in
                NotitieMapView(lijst: lijst)
            }
        }
        .task { await laad() }
    }

    private func lijstRij(_ lijst: TodoLijst) -> some View {
        Button {
            gekozenLijst = lijst
        } label: {
            HStack {
                Circle().fill(Color(hex: lijst.kleur)).frame(width: 10, height: 10)
                Text(lijst.naam)
                Spacer()
                if gekozenLijst?.id == lijst.id { Image(systemName: "checkmark").foregroundStyle(.tint) }
            }
        }
        .foregroundStyle(.primary)
    }

    private func laad() async {
        guard let eigenaarId else { return }
        isLoading = true
        lijsten = (try? await TakenService.lijsten(eigenaarId: eigenaarId)) ?? []
        let takenLijstIds = lijsten.filter { $0.type == .taken }.map(\.id)
        let notitieLijstIds = lijsten.filter { $0.type == .notities }.map(\.id)
        taken = (try? await TakenService.taken(lijstIds: takenLijstIds)) ?? []
        notities = (try? await TakenService.notities(lijstIds: notitieLijstIds)) ?? []
        isLoading = false
    }

    private func nieuweLijst(type: TodoLijstType) async {
        guard let eigenaarId else { return }
        let volgorde = lijsten.filter { $0.type == type }.count
        _ = try? await TakenService.maakLijst(naam: type == .taken ? "Nieuwe lijst" : "Nieuwe map", kleur: "#8CC63F", type: type, eigenaarId: eigenaarId, volgorde: volgorde)
        await laad()
    }

    private func voegTaakToe() async {
        guard let lijst = gekozenLijst ?? takenLijsten.first, !nieuweTaakTitel.isEmpty else { return }
        let titel = nieuweTaakTitel
        nieuweTaakTitel = ""
        _ = try? await TakenService.maakTaak(lijstId: lijst.id, titel: titel, volgorde: taken.count)
        await laad()
    }

    private func toggleVoltooid(_ taak: TodoTaak) async {
        try? await TakenService.toggleVoltooid(id: taak.id, voltooid: !taak.voltooid)
        await laad()
    }
}

private struct TaakRow: View {
    let taak: TodoTaak
    let onToggle: () -> Void

    var body: some View {
        HStack {
            Button(action: onToggle) {
                Image(systemName: taak.voltooid ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(taak.voltooid ? Color.theepotGroen : .secondary)
            }
            .buttonStyle(.plain)
            VStack(alignment: .leading) {
                Text(taak.titel).strikethrough(taak.voltooid)
                if let vervaldatum = taak.vervaldatum {
                    Text(vervaldatum)
                        .font(.caption)
                        .foregroundStyle(taak.isVerlopen ? .red : .secondary)
                }
            }
            Spacer()
            if taak.prioriteit != .geen {
                Circle().fill(Color(hex: taak.prioriteit.kleurHex)).frame(width: 8, height: 8)
            }
        }
    }
}
