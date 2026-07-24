import SwiftUI

struct WeekplanningenView: View {
    @EnvironmentObject var session: SessionStore
    @State private var locaties: [Locatie] = []
    @State private var actieveLocatie: Locatie?
    @State private var weekStart = Date()
    @State private var planning: WeekPlanning?
    @State private var activiteiten: [WeekActiviteit] = []
    @State private var isLoading = true

    private var knutsel: WeekActiviteit? {
        activiteiten.first { $0.type == .knutsel } ?? activiteiten.first { $0.type == .koolBak }
    }
    private var groepsspel: WeekActiviteit? { activiteiten.first { $0.type == .groepsspel } }

    var body: some View {
        NavigationStack {
            VStack {
                if !locaties.isEmpty {
                    Picker("Locatie", selection: $actieveLocatie) {
                        ForEach(locaties) { (locatie: Locatie) in
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
                } else if planning == nil {
                    ContentUnavailableView("Nog geen weekplanning", systemImage: "calendar")
                } else {
                    List {
                        if let thema = planning?.thema, !thema.isEmpty {
                            Section("Weekthema") {
                                Label(thema, systemImage: "sparkles")
                                    .foregroundStyle(Color.theepotGroenTekst)
                            }
                        }
                        if let knutsel {
                            Section("Knutsel / Koken & Bakken") { ActiviteitRow(activiteit: knutsel) }
                        }
                        if let groepsspel {
                            Section("Groepsspel") { ActiviteitRow(activiteit: groepsspel) }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Weekplanningen")
        }
        .task { await laadLocaties() }
        .onChange(of: actieveLocatie) { _, _ in Task { await laad() } }
        .onChange(of: weekStart) { _, _ in Task { await laad() } }
    }

    private var weekLabel: String {
        let f = DateFormatter()
        f.dateFormat = "d MMM"
        f.locale = Locale(identifier: "nl_NL")
        let maandag = WeekplanningenService.maandaagVanWeek(weekStart)
        let vrijdag = Calendar.current.date(byAdding: .day, value: 4, to: maandag) ?? maandag
        return "\(f.string(from: maandag)) – \(f.string(from: vrijdag))"
    }

    private func wijzigWeek(_ delta: Int) {
        weekStart = Calendar.current.date(byAdding: .weekOfYear, value: delta, to: weekStart) ?? weekStart
    }

    private func laadLocaties() async {
        locaties = (try? await WeekplanningenService.toegankelijkeLocaties(magAllesZien: session.magAllesZien, locatieToegang: session.locatieToegang)) ?? []
        actieveLocatie = locaties.first
        await laad()
    }

    private func laad() async {
        guard let actieveLocatie else { isLoading = false; return }
        isLoading = true
        if let resultaat = try? await WeekplanningenService.planning(locatieNaam: actieveLocatie.naam, weekStart: weekStart) {
            planning = resultaat.0
            activiteiten = resultaat.1
        } else {
            planning = nil
            activiteiten = []
        }
        isLoading = false
    }
}

private struct ActiviteitRow: View {
    let activiteit: WeekActiviteit

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(activiteit.naam).font(.body.bold())
            if let beschrijving = activiteit.beschrijving, !beschrijving.isEmpty {
                Text(beschrijving).font(.subheadline).foregroundStyle(.secondary)
            }
            if let materialen = activiteit.materialen, !materialen.isEmpty {
                Text("Materialen: \(materialen.joined(separator: ", "))")
                    .font(.caption).foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 2)
    }
}
