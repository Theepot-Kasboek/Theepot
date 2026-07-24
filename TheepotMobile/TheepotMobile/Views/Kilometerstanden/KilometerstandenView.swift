import SwiftUI

struct KilometerstandenView: View {
    @EnvironmentObject var session: SessionStore
    @State private var voertuigen: [KmVoertuig] = []
    @State private var gekozenVoertuig: KmVoertuig?
    @State private var kilometerstandTekst = ""
    @State private var datum = Date()
    @State private var notitie = ""
    @State private var laatsteStand: Int?
    @State private var foutmelding: String?
    @State private var succesmelding: String?
    @State private var bezig = false
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if voertuigen.isEmpty {
                    ContentUnavailableView("Geen voertuigen gevonden", systemImage: "car")
                } else {
                    Form {
                        Section("Voertuig") {
                            Picker("Voertuig", selection: $gekozenVoertuig) {
                                ForEach(voertuigen) { (voertuig: KmVoertuig) in
                                    let label = "\(voertuig.kenteken) (\(voertuig.type == .bus ? "Bus" : "Auto"))"
                                    Text(label).tag(Optional(voertuig))
                                }
                            }
                            if let laatsteStand {
                                Text("Laatste bekende stand: \(laatsteStand.formatted()) km")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        Section("Nieuwe stand") {
                            TextField("Kilometerstand", text: $kilometerstandTekst)
                                .keyboardType(.numberPad)
                            DatePicker("Datum", selection: $datum, displayedComponents: .date)
                            TextField("Notitie (optioneel)", text: $notitie)
                        }
                        if let foutmelding {
                            Text(foutmelding).foregroundStyle(.red).font(.footnote)
                        }
                        if let succesmelding {
                            Text(succesmelding).foregroundStyle(Color.theepotGroenDonker).font(.footnote)
                        }
                        Button {
                            Task { await opslaan() }
                        } label: {
                            if bezig { ProgressView() } else { Text("Opslaan").frame(maxWidth: .infinity) }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(kilometerstandTekst.isEmpty || bezig)
                    }
                }
            }
            .navigationTitle("Kilometerstanden")
        }
        .task { await laadVoertuigen() }
        .onChange(of: gekozenVoertuig) { _, _ in Task { await laadLaatsteStand() } }
    }

    private func laadVoertuigen() async {
        voertuigen = (try? await KilometerstandenService.voertuigen()) ?? []
        gekozenVoertuig = voertuigen.first
        await laadLaatsteStand()
        isLoading = false
    }

    private func laadLaatsteStand() async {
        guard let gekozenVoertuig else { return }
        laatsteStand = try? await KilometerstandenService.laatsteStand(voertuigId: gekozenVoertuig.id)
    }

    private func opslaan() async {
        guard let voertuig = gekozenVoertuig, let stand = Int(kilometerstandTekst), let profielId = session.profiel?.id.uuidString.lowercased() else { return }
        bezig = true
        foutmelding = nil
        succesmelding = nil
        defer { bezig = false }

        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        do {
            try await KilometerstandenService.voegToe(voertuigId: voertuig.id, kilometerstand: stand, datum: f.string(from: datum), notitie: notitie.isEmpty ? nil : notitie, ingevoerdDoor: profielId)
            succesmelding = "Kilometerstand opgeslagen."
            kilometerstandTekst = ""
            notitie = ""
            await laadLaatsteStand()
        } catch {
            foutmelding = error.localizedDescription
        }
    }
}
