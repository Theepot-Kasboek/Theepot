import SwiftUI

struct NotitieMapView: View {
    let lijst: TodoLijst
    @State private var notities: [Notitie] = []
    @State private var isLoading = true

    private let kolommen = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else {
                ScrollView {
                    LazyVGrid(columns: kolommen, spacing: 12) {
                        ForEach(notities) { notitie in
                            NavigationLink {
                                NotitieEditorView(notitie: notitie) { await laad() }
                            } label: {
                                VStack(alignment: .leading) {
                                    Text(notitie.titel).font(.headline).lineLimit(1)
                                    Text(notitie.inhoud).font(.caption).lineLimit(4).foregroundStyle(.secondary)
                                }
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(notitie.kleur == "#ffffff" ? Color(.secondarySystemBackground) : Color(hex: notitie.kleur))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .foregroundStyle(.primary)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle(lijst.naam)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await nieuweNotitie() }
                } label: { Image(systemName: "plus") }
            }
        }
        .task { await laad() }
    }

    private func laad() async {
        isLoading = true
        notities = (try? await TakenService.notities(lijstIds: [lijst.id])) ?? []
        isLoading = false
    }

    private func nieuweNotitie() async {
        _ = try? await TakenService.maakNotitie(lijstId: lijst.id, volgorde: notities.count)
        await laad()
    }
}

struct NotitieEditorView: View {
    let notitie: Notitie
    let onKlaar: () async -> Void

    @State private var titel: String
    @State private var inhoud: String
    @State private var opslaanTask: Task<Void, Never>?

    init(notitie: Notitie, onKlaar: @escaping () async -> Void) {
        self.notitie = notitie
        self.onKlaar = onKlaar
        _titel = State(initialValue: notitie.titel)
        _inhoud = State(initialValue: notitie.inhoud)
    }

    var body: some View {
        Form {
            TextField("Titel", text: $titel)
                .font(.headline)
            TextEditor(text: $inhoud)
                .frame(minHeight: 200)
        }
        .navigationTitle("Notitie")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Verwijderen", role: .destructive) {
                    Task {
                        try? await TakenService.verwijderNotitie(id: notitie.id)
                        await onKlaar()
                    }
                }
            }
        }
        .onChange(of: titel) { _, _ in plan() }
        .onChange(of: inhoud) { _, _ in plan() }
        .onDisappear { opslaanTask?.cancel(); Task { await slaOp() } }
    }

    /// 600ms debounce, net als de webapp.
    private func plan() {
        opslaanTask?.cancel()
        opslaanTask = Task {
            try? await Task.sleep(nanoseconds: 600_000_000)
            guard !Task.isCancelled else { return }
            await slaOp()
        }
    }

    private func slaOp() async {
        try? await TakenService.slaNotitieOp(id: notitie.id, titel: titel, inhoud: inhoud, kleur: notitie.kleur)
        await onKlaar()
    }
}
