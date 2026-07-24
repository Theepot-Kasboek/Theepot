import SwiftUI

struct KasboekView: View {
    @EnvironmentObject var session: SessionStore
    @State private var locaties: [Locatie] = []
    @State private var actieveLocatie: Locatie?
    @State private var maand = Date()
    @State private var entries: [KasboekEntry] = []
    @State private var beginsaldo: Double = 0
    @State private var isLoading = true
    @State private var toonNieuw = false

    private var periode: String { KasboekService.periodeSleutel(maand) }

    private var toegankelijkeLocaties: [Locatie] {
        locaties.filter { session.toegang(voorLocatie: $0.naam, locatieType: "kasboek") != .geen }
    }

    private var magBewerken: Bool {
        guard let actieveLocatie else { return false }
        return session.toegang(voorLocatie: actieveLocatie.naam, locatieType: "kasboek") == .bewerken
    }

    private var inkomsten: Double { entries.filter { $0.type == .inkomst }.reduce(0) { $0 + $1.bedrag } }
    private var uitgaven: Double { entries.filter { $0.type == .uitgave }.reduce(0) { $0 + $1.bedrag } }
    private var eindsaldo: Double { beginsaldo + inkomsten - uitgaven }

    var body: some View {
        NavigationStack {
            VStack {
                if !toegankelijkeLocaties.isEmpty {
                    Picker("Locatie", selection: $actieveLocatie) {
                        ForEach(toegankelijkeLocaties) { (locatie: Locatie) in
                            Text(locatie.naam).tag(Optional(locatie))
                        }
                    }
                    .pickerStyle(.menu)

                    HStack {
                        Button { wijzigMaand(-1) } label: { Image(systemName: "chevron.left") }
                        Spacer()
                        Text(maandLabel).font(.headline)
                        Spacer()
                        Button { wijzigMaand(1) } label: { Image(systemName: "chevron.right") }
                    }
                    .padding(.horizontal)

                    HStack(spacing: 10) {
                        SaldoTegel(titel: "Beginsaldo", bedrag: beginsaldo, kleur: .secondary)
                        SaldoTegel(titel: "Inkomsten", bedrag: inkomsten, kleur: .theepotGroenDonker)
                        SaldoTegel(titel: "Uitgaven", bedrag: uitgaven, kleur: .red)
                        SaldoTegel(titel: "Eindsaldo", bedrag: eindsaldo, kleur: .primary)
                    }
                    .padding(.horizontal)
                    .padding(.top, 4)
                }

                if isLoading {
                    ProgressView()
                    Spacer()
                } else if entries.isEmpty {
                    ContentUnavailableView("Geen boekingen", systemImage: "eurosign.circle")
                } else {
                    List(entries) { entry in
                        KasboekRow(entry: entry)
                    }
                    .listStyle(.insetGrouped)
                    .refreshable { await laad() }
                }
            }
            .navigationTitle("Kasboek")
            .toolbar {
                if magBewerken {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { toonNieuw = true } label: {
                            Image(systemName: "plus.circle.fill")
                                .foregroundStyle(Color.theepotGroen)
                        }
                    }
                }
            }
            .sheet(isPresented: $toonNieuw) {
                if let actieveLocatie {
                    NieuweBoekingView(locatieNaam: actieveLocatie.naam, periode: periode) { await laad() }
                }
            }
        }
        .task { await laadLocaties() }
        .onChange(of: actieveLocatie) { _, _ in Task { await laad() } }
        .onChange(of: maand) { _, _ in Task { await laad() } }
    }

    private var maandLabel: String {
        let f = DateFormatter()
        f.dateFormat = "LLLL yyyy"
        f.locale = Locale(identifier: "nl_NL")
        return f.string(from: maand).capitalized
    }

    private func wijzigMaand(_ delta: Int) {
        maand = Calendar.current.date(byAdding: .month, value: delta, to: maand) ?? maand
    }

    private func laadLocaties() async {
        locaties = (try? await LocatieService.actieveLocaties()) ?? []
        actieveLocatie = toegankelijkeLocaties.first
        await laad()
    }

    private func laad() async {
        guard let actieveLocatie else { isLoading = false; return }
        isLoading = true
        entries = (try? await KasboekService.entries(locatieNaam: actieveLocatie.naam, periode: periode)) ?? []
        beginsaldo = (try? await KasboekService.beginsaldo(locatieNaam: actieveLocatie.naam, voorPeriode: periode)) ?? 0
        isLoading = false
    }
}

private struct SaldoTegel: View {
    let titel: String
    let bedrag: Double
    let kleur: Color

    var body: some View {
        VStack(spacing: 3) {
            Text(titel).font(.caption).foregroundStyle(.secondary)
            Text(bedrag, format: .currency(code: "EUR")).font(.headline).foregroundStyle(kleur)
        }
        .frame(maxWidth: .infinity)
        .theepotGlasKaart(hoekradius: 12, padding: 10)
    }
}

private struct KasboekRow: View {
    let entry: KasboekEntry

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(entry.omschrijving?.isEmpty == false ? entry.omschrijving! : (entry.categorie ?? "Overig"))
                    .font(.subheadline)
                if let categorie = entry.categorie {
                    Text(categorie).font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            if entry.bonnetjePad != nil {
                Image(systemName: "paperclip").foregroundStyle(.secondary).font(.caption)
            }
            Text(entry.bedrag, format: .currency(code: "EUR"))
                .foregroundStyle(entry.type == .inkomst ? Color.theepotGroenDonker : .red)
                .fontWeight(.semibold)
        }
    }
}

private struct NieuweBoekingView: View {
    @EnvironmentObject var session: SessionStore
    @Environment(\.dismiss) private var dismiss
    let locatieNaam: String
    let periode: String
    let onKlaar: () async -> Void

    @State private var type: KasboekType = .uitgave
    @State private var bedragTekst = ""
    @State private var omschrijving = ""
    @State private var categorie: String?
    @State private var categorieen: [String] = []
    @State private var bonnetjeData: Data?
    @State private var toonScanner = false
    @State private var bezig = false

    var body: some View {
        NavigationStack {
            Form {
                Picker("Type", selection: $type) {
                    Text("Uitgave").tag(KasboekType.uitgave)
                    Text("Inkomst").tag(KasboekType.inkomst)
                }
                .pickerStyle(.segmented)

                TextField("Bedrag (€)", text: $bedragTekst)
                    .keyboardType(.decimalPad)
                TextField("Omschrijving", text: $omschrijving)
                Picker("Categorie", selection: $categorie) {
                    Text("Geen").tag(String?.none)
                    ForEach(categorieen, id: \.self) { (naam: String) in
                        Text(naam).tag(Optional(naam))
                    }
                }

                Section("Bonnetje") {
                    if bonnetjeData != nil {
                        Label("Bonnetje toegevoegd", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(Color.theepotGroenDonker)
                    }
                    Button {
                        toonScanner = true
                    } label: {
                        Label(bonnetjeData == nil ? "Scan bonnetje" : "Opnieuw scannen", systemImage: "doc.viewfinder")
                            .foregroundStyle(Color.theepotGroenDonker)
                    }
                }
            }
            .navigationTitle("Nieuwe boeking")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Opslaan") { Task { await opslaan() } }
                        .disabled(bedrag == nil || bezig)
                }
            }
            .fullScreenCover(isPresented: $toonScanner) {
                DocumentScannerView { data in bonnetjeData = data }
                    .ignoresSafeArea()
            }
        }
        .task { categorieen = (try? await KasboekService.categorieen()) ?? KasboekCategorieen.standaard }
    }

    private var bedrag: Double? {
        Double(bedragTekst.replacingOccurrences(of: ",", with: "."))
    }

    private func opslaan() async {
        guard let bedrag, let profielId = session.profiel?.id.uuidString.lowercased() else { return }
        bezig = true
        defer { bezig = false }
        try? await KasboekService.voegToe(
            locatieNaam: locatieNaam, periode: periode, type: type, bedrag: bedrag,
            categorie: categorie, omschrijving: omschrijving.isEmpty ? nil : omschrijving,
            aangemaaktDoor: profielId, bonnetjeData: bonnetjeData,
            bonnetjeBestandsnaam: bonnetjeData != nil ? "bonnetje.jpg" : nil
        )
        await onKlaar()
        dismiss()
    }
}
