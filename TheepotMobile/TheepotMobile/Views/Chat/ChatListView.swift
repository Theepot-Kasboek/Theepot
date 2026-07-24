import SwiftUI

struct ChatListView: View {
    @EnvironmentObject var session: SessionStore
    @State private var gesprekken: [ChatGesprek] = []
    @State private var isLoading = true
    @State private var toonNieuw = false

    private var magStarten: Bool {
        session.isSuperadmin || session.rechten.chatStarten
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if gesprekken.isEmpty {
                    ContentUnavailableView("Nog geen gesprekken", systemImage: "bubble.left.and.bubble.right")
                } else {
                    List(gesprekken) { gesprek in
                        NavigationLink(value: gesprek) {
                            HStack(spacing: 12) {
                                ZStack {
                                    Circle().fill(Color.theepotGroenLicht).frame(width: 40, height: 40)
                                    Image(systemName: gesprek.type == .groep ? "person.3.fill" : "person.fill")
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(Color.theepotGroenTekst)
                                }
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(gesprek.naam).font(.headline)
                                    Text(gesprek.type == .groep ? "Groep" : "Direct bericht")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 2)
                        }
                    }
                    .listStyle(.insetGrouped)
                    .refreshable { await laad() }
                }
            }
            .navigationTitle("Chat")
            .navigationDestination(for: ChatGesprek.self) { gesprek in
                ChatDetailView(gesprek: gesprek)
            }
            .toolbar {
                if magStarten {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { toonNieuw = true } label: {
                            Image(systemName: "square.and.pencil")
                                .foregroundStyle(Color.theepotGroen)
                        }
                    }
                }
            }
            .sheet(isPresented: $toonNieuw) {
                NieuwGesprekView { gesprek in
                    gesprekken.insert(gesprek, at: 0)
                }
            }
        }
        .task { await laad() }
    }

    private func laad() async {
        guard let profielId = session.profiel?.id.uuidString.lowercased() else { return }
        isLoading = true
        gesprekken = (try? await ChatService.gesprekken(profielId: profielId)) ?? []
        isLoading = false
    }
}

private struct NieuwGesprekView: View {
    @EnvironmentObject var session: SessionStore
    @Environment(\.dismiss) private var dismiss
    let onAangemaakt: (ChatGesprek) -> Void

    @State private var profielen: [Profiel] = []
    @State private var geselecteerd: Set<String> = []
    @State private var naam = ""
    @State private var isGroep = false
    @State private var bezig = false

    var body: some View {
        NavigationStack {
            Form {
                Toggle("Groepsgesprek", isOn: $isGroep)
                if isGroep {
                    TextField("Naam groep", text: $naam)
                }
                Section("Deelnemers") {
                    ForEach(profielen) { profiel in
                        Button {
                            if geselecteerd.contains(profiel.id.uuidString) {
                                geselecteerd.remove(profiel.id.uuidString)
                            } else {
                                geselecteerd.insert(profiel.id.uuidString)
                            }
                        } label: {
                            HStack {
                                Text(profiel.naam)
                                Spacer()
                                if geselecteerd.contains(profiel.id.uuidString) {
                                    Image(systemName: "checkmark").foregroundStyle(.tint)
                                }
                            }
                        }
                        .foregroundStyle(.primary)
                    }
                }
            }
            .navigationTitle("Nieuw gesprek")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Starten") { Task { await starten() } }
                        .disabled(geselecteerd.isEmpty || bezig)
                }
            }
        }
        .task {
            let alle = (try? await ChatService.alleProfielen()) ?? []
            profielen = alle.filter { $0.id != session.profiel?.id }
        }
    }

    private func starten() async {
        guard let eigenId = session.profiel?.id.uuidString.lowercased(), let eigenNaam = session.profiel?.naam else { return }
        bezig = true
        defer { bezig = false }

        var deelnemerIds = Array(geselecteerd)
        let gesprekNaam: String
        if isGroep {
            gesprekNaam = naam.isEmpty ? "Groep (\(deelnemerIds.count + 1))" : naam
        } else {
            let anderNaam = profielen.first { $0.id.uuidString == deelnemerIds.first }?.naam ?? "Onbekend"
            gesprekNaam = "\(eigenNaam) & \(anderNaam)"
        }
        deelnemerIds.append(eigenId)

        if let gesprek = try? await ChatService.nieuwGesprek(naam: gesprekNaam, type: isGroep ? .groep : .direct, deelnemerIds: deelnemerIds) {
            onAangemaakt(gesprek)
            dismiss()
        }
    }
}
