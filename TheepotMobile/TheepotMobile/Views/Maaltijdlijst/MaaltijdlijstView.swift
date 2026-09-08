import SwiftUI

struct MaaltijdlijstView: View {
    @EnvironmentObject var session: SessionStore
    @State private var locaties: [MaaltijdLocatie] = []
    @State private var actieveLocatie: MaaltijdLocatie?
    @State private var weekStart = Date()
    @State private var registraties: [MaaltijdRegistratie] = []
    @State private var isLoading = true
    @State private var teBevestigen: MaaltijdRegistratie?

    private var toegankelijkeLocaties: [MaaltijdLocatie] {
        locaties.filter { session.toegang(voorLocatie: $0.naam, locatieType: "maaltijdlijst") != .geen }
    }

    private var magBewerken: Bool {
        guard let actieveLocatie else { return false }
        return session.toegang(voorLocatie: actieveLocatie.naam, locatieType: "maaltijdlijst") == .bewerken
    }

    var body: some View {
        NavigationStack {
            VStack {
                if !toegankelijkeLocaties.isEmpty {
                    Picker("Locatie", selection: $actieveLocatie) {
                        ForEach(toegankelijkeLocaties) { (locatie: MaaltijdLocatie) in
                            Text(locatie.naam).tag(Optional(locatie))
                        }
                    }
                    .pickerStyle(.menu)

                    HStack {
                        Button { wijzigWeek(-1) } label: { Image(systemName: "chevron.left") }
                        Spacer()
                        Text(weekLabel).font(.headline)
                        Spacer()
                        Button { wijzigWeek(1) } label: { Image(systemName: "chevron.right") }
                    }
                    .padding(.horizontal)
                }

                if isLoading {
                    ProgressView()
                    Spacer()
                } else {
                    List {
                        ForEach(Dag.allCases, id: \.self) { dag in
                            dagSectie(dag)
                        }
                    }
                    .listStyle(.insetGrouped)
                    .refreshable { await laad() }
                }
            }
            .navigationTitle("Maaltijdlijst")
        }
        .task { await laadLocaties() }
        .onChange(of: actieveLocatie) { _, _ in Task { await laad() } }
        .onChange(of: weekStart) { _, _ in Task { await laad() } }
        .alert("Niet meegegeten?", isPresented: Binding(get: { teBevestigen != nil }, set: { if !$0 { teBevestigen = nil } })) {
            Button("Niet meegegeten", role: .destructive) {
                if let registratie = teBevestigen { Task { await toggle(registratie) } }
                teBevestigen = nil
            }
            Button("Annuleren", role: .cancel) { teBevestigen = nil }
        } message: {
            Text("Weet je zeker dat \(teBevestigen?.naam ?? "dit kind") niet heeft meegegeten?")
        }
    }

    private var weekLabel: String {
        let f = DateFormatter()
        f.dateFormat = "d MMM"
        f.locale = Locale(identifier: "nl_NL")
        let maandag = MaaltijdlijstService.maandaagVanWeek(weekStart)
        let vrijdag = Calendar.current.date(byAdding: .day, value: 4, to: maandag) ?? maandag
        return "\(f.string(from: maandag)) – \(f.string(from: vrijdag))"
    }

    private func wijzigWeek(_ delta: Int) {
        weekStart = Calendar.current.date(byAdding: .weekOfYear, value: delta, to: weekStart) ?? weekStart
    }

    @ViewBuilder
    private func dagSectie(_ dag: Dag) -> some View {
        let kinderen: [MaaltijdRegistratie] = registraties
            .filter { $0.dag == dag }
            .sorted { $0.volgorde < $1.volgorde }

        if !kinderen.isEmpty {
            Section(dag.label) {
                ForEach(kinderen) { kind in
                    KindRow(registratie: kind, magBewerken: magBewerken) {
                        if kind.aanwezig {
                            // Van "meegegeten" naar "niet meegegeten": eerst bevestigen.
                            teBevestigen = kind
                        } else {
                            await toggle(kind)
                        }
                    }
                }
            }
        }
    }

    private func laadLocaties() async {
        locaties = (try? await MaaltijdlijstService.actieveLocaties()) ?? []
        actieveLocatie = toegankelijkeLocaties.first
        await laad()
    }

    private func laad() async {
        guard let actieveLocatie else { isLoading = false; return }
        isLoading = true
        registraties = (try? await MaaltijdlijstService.registraties(locatieId: actieveLocatie.id, weekStart: weekStart)) ?? []
        isLoading = false
    }

    private func toggle(_ registratie: MaaltijdRegistratie) async {
        guard let index = registraties.firstIndex(where: { $0.id == registratie.id }) else { return }
        registraties[index].aanwezig.toggle()
        try? await MaaltijdlijstService.toggleAanwezig(registratieId: registratie.id, nieuweWaarde: registraties[index].aanwezig)
    }
}

private struct KindRow: View {
    let registratie: MaaltijdRegistratie
    let magBewerken: Bool
    let onToggle: () async -> Void

    var body: some View {
        Button {
            Task { await onToggle() }
        } label: {
            HStack {
                VStack(alignment: .leading) {
                    Text(registratie.naam)
                    if let bijzonderheden = registratie.bijzonderheden, !bijzonderheden.isEmpty {
                        Text(bijzonderheden).font(.caption).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Image(systemName: registratie.aanwezig ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(registratie.aanwezig ? Color.theepotGroen : .secondary)
                    .font(.title3)
            }
        }
        .foregroundStyle(.primary)
        .disabled(!magBewerken)
    }
}
