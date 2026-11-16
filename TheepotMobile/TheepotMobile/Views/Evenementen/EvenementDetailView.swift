import SwiftUI
import UIKit

/// Spiegelt app/evenementen/[id]/page.tsx: aanmeldlink kopiëren/delen,
/// aanmeldingen inzien (zoeken, sorteren, filteren op keuzevelden), handmatig
/// aanmelden, aanmeldingen verwijderen, aanvullende velden beheren, annuleren/
/// heractiveren en exporteren (CSV).
struct EvenementDetailView: View {
    @EnvironmentObject var session: SessionStore
    let evenementId: String
    /// Laat het overzicht verversen (aantallen/status) na een wijziging.
    let onGewijzigd: () async -> Void

    @State private var evenement: Evenement?
    @State private var aanmeldingen: [EvenementAanmelding] = []
    @State private var velden: [EvenementVeld] = []
    @State private var antwoorden: [String: [String: String]] = [:]
    @State private var isLoading = true
    @State private var foutmelding: String?
    @State private var melding: EvenementMelding?

    @State private var zoekterm = ""
    @State private var sortering: Sortering = .datumNieuw
    @State private var veldFilters: [String: Set<String>] = [:]

    @State private var toonHandmatig = false
    @State private var toonVelden = false
    @State private var toonBewerken = false
    @State private var bekijkAanmelding: EvenementAanmelding?
    @State private var teVerwijderenAanmelding: EvenementAanmelding?
    @State private var bevestigVerwijderEvenement = false
    @State private var exportBestand: ExportBestand?
    @Environment(\.dismiss) private var dismiss

    enum Sortering: String, CaseIterable, Identifiable {
        case datumNieuw, datumOud, naamAZ, naamZA
        var id: String { rawValue }
        var label: String {
            switch self {
            case .datumNieuw: return "Nieuwste eerst"
            case .datumOud: return "Oudste eerst"
            case .naamAZ: return "Naam A-Z"
            case .naamZA: return "Naam Z-A"
            }
        }
    }

    private var magBewerken: Bool {
        session.isSuperadmin || session.rechten.paginaEvenementen == .bewerken
    }

    private var keuzeVelden: [EvenementVeld] { velden.filter(\.isKeuze) }

    private var filtersActief: Bool {
        !zoekterm.trimmingCharacters(in: .whitespaces).isEmpty || veldFilters.values.contains { !$0.isEmpty }
    }

    private var zichtbareAanmeldingen: [EvenementAanmelding] {
        let zoek = zoekterm.trimmingCharacters(in: .whitespaces).lowercased()
        return aanmeldingen
            .filter { a in
                if !zoek.isEmpty && !(a.naam ?? "").lowercased().contains(zoek) && !a.email.lowercased().contains(zoek) {
                    return false
                }
                return keuzeVelden.allSatisfy { v in
                    let selectie = veldFilters[v.id] ?? []
                    if selectie.isEmpty { return true }
                    let gekozen = Meerkeuze.opties(antwoorden[a.id]?[v.id] ?? "")
                    return gekozen.contains { selectie.contains($0) }
                }
            }
            .sorted { a, b in
                switch sortering {
                case .naamAZ: return (a.naam ?? "").localizedStandardCompare(b.naam ?? "") == .orderedAscending
                case .naamZA: return (a.naam ?? "").localizedStandardCompare(b.naam ?? "") == .orderedDescending
                case .datumOud: return (a.aangemeldDatum ?? .distantPast) < (b.aangemeldDatum ?? .distantPast)
                case .datumNieuw: return (a.aangemeldDatum ?? .distantPast) > (b.aangemeldDatum ?? .distantPast)
                }
            }
    }

    var body: some View {
        Group {
            if isLoading && evenement == nil {
                ProgressView()
            } else if let evenement {
                inhoud(evenement)
            } else {
                ContentUnavailableView {
                    Label(foutmelding ?? "Evenement niet gevonden", systemImage: "calendar.badge.exclamationmark")
                } actions: {
                    Button("Opnieuw proberen") { Task { await laad() } }
                }
            }
        }
        .theepotAchtergrond()
        .navigationTitle(evenement?.titel ?? "Evenement")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let evenement {
                ToolbarItem(placement: .topBarTrailing) { actieMenu(evenement) }
            }
        }
        .sheet(isPresented: $toonHandmatig) {
            if let evenement {
                HandmatigAanmeldenView(evenement: evenement, velden: velden, huidigAantal: aanmeldingen.count) { bijgewerkt in
                    await laad()
                    await onGewijzigd()
                    melding = .succes(bijgewerkt ? "Aanmelding bijgewerkt" : "Aanmelding toegevoegd")
                }
            }
        }
        .sheet(isPresented: $toonVelden) {
            if let evenement {
                VeldenBeherenView(evenementId: evenement.id, velden: $velden)
            }
        }
        .sheet(isPresented: $toonBewerken) {
            if let evenement {
                EvenementFormView(bestaand: evenement) { _ in
                    await laad()
                    await onGewijzigd()
                    melding = .succes("Evenement opgeslagen")
                }
            }
        }
        .sheet(item: $bekijkAanmelding) { a in
            AanmeldingDetailView(aanmelding: a, velden: velden, antwoorden: antwoorden[a.id] ?? [:], magBewerken: magBewerken) {
                // Eerst de sheet laten sluiten, anders verschijnt de bevestiging niet.
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) { teVerwijderenAanmelding = a }
            }
        }
        .sheet(item: $exportBestand) { bestand in
            DeelSheet(items: [bestand.url])
                .presentationDetents([.medium, .large])
        }
        .confirmationDialog(
            "Deze aanmelding verwijderen?",
            isPresented: Binding(get: { teVerwijderenAanmelding != nil }, set: { if !$0 { teVerwijderenAanmelding = nil } }),
            titleVisibility: .visible,
            presenting: teVerwijderenAanmelding
        ) { a in
            Button("Verwijderen", role: .destructive) { Task { await verwijderAanmelding(a) } }
            Button("Annuleren", role: .cancel) {}
        } message: { a in
            Text("\(a.naam ?? a.email) wordt van de aanmeldlijst gehaald.")
        }
        .confirmationDialog("Evenement verwijderen?", isPresented: $bevestigVerwijderEvenement, titleVisibility: .visible) {
            Button("Verwijderen", role: .destructive) { Task { await verwijderEvenement() } }
            Button("Annuleren", role: .cancel) {}
        } message: {
            Text("Alle aanmeldingen gaan hiermee ook verloren.")
        }
        .evenementMelding($melding)
        .task { await laad() }
    }

    // MARK: Inhoud

    @ViewBuilder
    private func inhoud(_ evenement: Evenement) -> some View {
        let badge = evenement.badge(aantal: aanmeldingen.count)
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(evenement.titel).font(.title3.bold())
                        Spacer(minLength: 6)
                        EvenementBadgeView(badge: badge)
                    }
                    if let omschrijving = evenement.omschrijving, !omschrijving.isEmpty {
                        Text(omschrijving).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
                if let d = evenement.evenementDatum {
                    LabeledContent("Datum", value: Tijdstempel.weergave(d))
                }
                if let loc = evenement.locatie, !loc.isEmpty {
                    LabeledContent("Locatie", value: loc)
                }
                LabeledContent("Sluit aanmelden op", value: Tijdstempel.weergave(evenement.sluitDatum))
                LabeledContent("Aanmeldingen", value: aantalTekst(aanmeldingen.count, max: evenement.maxAanmeldingen))
            }

            Section("Aanmeldlink") {
                Button {
                    melding = EvenementLink.kopieer(evenementId: evenement.id)
                } label: {
                    Label("Kopieer aanmeldlink", systemImage: "link")
                }
                if let url = EvenementenService.aanmeldLink(evenementId: evenement.id) {
                    ShareLink(item: url, subject: Text(evenement.titel), message: Text("Meld je aan voor \(evenement.titel)")) {
                        Label("Deel aanmeldlink", systemImage: "square.and.arrow.up")
                    }
                    Link(destination: url) {
                        Label("Open aanmeldpagina", systemImage: "safari")
                    }
                }
            }
            .tint(.theepotGroenDonker)

            if magBewerken {
                Section("Beheer") {
                    Button { toonHandmatig = true } label: {
                        Label("Handmatig aanmelden", systemImage: "person.badge.plus")
                    }
                    Button { toonVelden = true } label: {
                        Label("Velden beheren", systemImage: "slider.horizontal.3")
                    }
                }
                .tint(.theepotGroenDonker)
            }

            aanmeldingenSectie
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .searchable(text: $zoekterm, placement: .navigationBarDrawer(displayMode: .automatic), prompt: "Zoek op naam of e-mail")
        .refreshable { await laad() }
    }

    @ViewBuilder
    private var aanmeldingenSectie: some View {
        let zichtbaar = zichtbareAanmeldingen
        Section {
            if aanmeldingen.count > 0 {
                filterBalk
            }
            if aanmeldingen.isEmpty {
                VStack(spacing: 4) {
                    Text("Nog geen aanmeldingen").font(.subheadline.weight(.semibold))
                    Text("Deel de aanmeldlink om aanmeldingen te ontvangen.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            } else if zichtbaar.isEmpty {
                VStack(spacing: 4) {
                    Text("Geen aanmeldingen gevonden").font(.subheadline.weight(.semibold))
                    Text("Pas je zoekopdracht of filters aan.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            } else {
                ForEach(zichtbaar) { a in
                    Button { bekijkAanmelding = a } label: {
                        AanmeldingRij(aanmelding: a, velden: velden, antwoorden: antwoorden[a.id] ?? [:])
                    }
                    .buttonStyle(.plain)
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        if magBewerken {
                            Button(role: .destructive) { teVerwijderenAanmelding = a } label: {
                                Label("Verwijderen", systemImage: "trash")
                            }
                        }
                    }
                    .contextMenu {
                        Button {
                            UIPasteboard.general.string = a.email
                            melding = .succes("E-mailadres gekopieerd")
                        } label: { Label("Kopieer e-mailadres", systemImage: "doc.on.doc") }
                        if let mail = URL(string: "mailto:\(a.email)") {
                            Link(destination: mail) { Label("Stuur e-mail", systemImage: "envelope") }
                        }
                        if magBewerken {
                            Button(role: .destructive) { teVerwijderenAanmelding = a } label: {
                                Label("Verwijderen", systemImage: "trash")
                            }
                        }
                    }
                }
            }
        } header: {
            HStack {
                Text(filtersActief
                     ? "\(zichtbaar.count) van \(aanmeldingen.count) aanmelding\(aanmeldingen.count == 1 ? "" : "en")"
                     : "\(aanmeldingen.count) aanmelding\(aanmeldingen.count == 1 ? "" : "en")")
                Spacer()
                if !aanmeldingen.isEmpty {
                    Menu {
                        Button { exporteerVolledig() } label: { Label("Exporteer lijst (CSV)", systemImage: "tablecells") }
                        Button { exporteerEmails() } label: { Label("Exporteer e-mails", systemImage: "envelope") }
                        Button {
                            UIPasteboard.general.string = aanmeldingen.map(\.email).joined(separator: "; ")
                            melding = .succes("Alle e-mailadressen gekopieerd")
                        } label: { Label("Kopieer alle e-mailadressen", systemImage: "doc.on.doc") }
                    } label: {
                        Label("Exporteer", systemImage: "square.and.arrow.down")
                            .font(.caption.weight(.semibold))
                            .textCase(nil)
                    }
                    .tint(.theepotGroenDonker)
                }
            }
        }
    }

    private var filterBalk: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Menu {
                    Picker("Sortering", selection: $sortering) {
                        ForEach(Sortering.allCases) { Text($0.label).tag($0) }
                    }
                } label: {
                    filterChip(sortering.label, icoon: "arrow.up.arrow.down", actief: false)
                }
                ForEach(keuzeVelden) { v in
                    let selectie = veldFilters[v.id] ?? []
                    Menu {
                        ForEach(v.opties ?? [], id: \.self) { optie in
                            Button {
                                var nieuw = selectie
                                if nieuw.contains(optie) { nieuw.remove(optie) } else { nieuw.insert(optie) }
                                veldFilters[v.id] = nieuw
                            } label: {
                                if selectie.contains(optie) {
                                    Label(optie, systemImage: "checkmark")
                                } else {
                                    Text(optie)
                                }
                            }
                        }
                    } label: {
                        filterChip(selectie.isEmpty ? v.label : "\(v.label) (\(selectie.count))", icoon: "line.3.horizontal.decrease", actief: !selectie.isEmpty)
                    }
                    .menuActionDismissBehavior(.disabled)
                }
                if filtersActief {
                    Button {
                        zoekterm = ""
                        veldFilters = [:]
                    } label: {
                        filterChip("Wis filters", icoon: "xmark", actief: false)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 2)
        }
        .listRowInsets(EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12))
    }

    private func filterChip(_ tekst: String, icoon: String, actief: Bool) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icoon)
            Text(tekst).lineLimit(1)
        }
        .font(.caption.weight(.semibold))
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(actief ? Color.theepotGroen.opacity(0.2) : Color(.tertiarySystemFill), in: Capsule())
        .foregroundStyle(actief ? Color.theepotGroenTekst : Color.primary)
    }

    private func actieMenu(_ evenement: Evenement) -> some View {
        Menu {
            Button { melding = EvenementLink.kopieer(evenementId: evenement.id) } label: {
                Label("Kopieer aanmeldlink", systemImage: "link")
            }
            if magBewerken {
                Button { toonHandmatig = true } label: { Label("Handmatig aanmelden", systemImage: "person.badge.plus") }
                Button { toonVelden = true } label: { Label("Velden beheren", systemImage: "slider.horizontal.3") }
                Button { toonBewerken = true } label: { Label("Evenement bewerken", systemImage: "pencil") }
                Divider()
                Button { Task { await wisselStatus(evenement) } } label: {
                    if evenement.isActief {
                        Label("Evenement annuleren", systemImage: "xmark.circle")
                    } else {
                        Label("Heractiveren", systemImage: "arrow.uturn.backward.circle")
                    }
                }
                Button(role: .destructive) { bevestigVerwijderEvenement = true } label: {
                    Label("Evenement verwijderen", systemImage: "trash")
                }
            }
        } label: {
            Image(systemName: "ellipsis.circle")
                .foregroundStyle(Color.theepotGroenDonker)
        }
        .accessibilityLabel("Acties")
    }

    private func aantalTekst(_ aantal: Int, max: Int?) -> String {
        if let max { return "\(aantal) / \(max)" }
        return "\(aantal)"
    }

    // MARK: Acties

    private func laad() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let e = EvenementenService.evenement(id: evenementId)
            async let a = EvenementenService.aanmeldingen(evenementId: evenementId)
            async let v = EvenementenService.velden(evenementId: evenementId)
            let (ev, aan, vel) = try await (e, a, v)
            evenement = ev
            aanmeldingen = aan
            velden = vel
            antwoorden = (try? await EvenementenService.antwoorden(aanmeldingIds: aan.map(\.id))) ?? [:]
            foutmelding = nil
        } catch {
            foutmelding = evenement == nil ? "Evenement kon niet worden geladen." : nil
            if evenement != nil { melding = .fout("Verversen mislukt") }
        }
    }

    private func wisselStatus(_ evenement: Evenement) async {
        let nieuweStatus = evenement.isActief ? "geannuleerd" : "actief"
        do {
            try await EvenementenService.zetStatus(id: evenement.id, status: nieuweStatus)
            self.evenement?.status = nieuweStatus
            melding = .succes(nieuweStatus == "geannuleerd" ? "Evenement geannuleerd" : "Evenement weer actief")
            await onGewijzigd()
        } catch {
            melding = .fout("Wijzigen mislukt: \(error.localizedDescription)")
        }
    }

    private func verwijderAanmelding(_ a: EvenementAanmelding) async {
        do {
            try await EvenementenService.verwijderAanmelding(id: a.id)
            aanmeldingen.removeAll { $0.id == a.id }
            antwoorden[a.id] = nil
            if bekijkAanmelding?.id == a.id { bekijkAanmelding = nil }
            melding = .succes("Aanmelding verwijderd")
            await onGewijzigd()
        } catch {
            melding = .fout("Verwijderen mislukt: \(error.localizedDescription)")
        }
    }

    private func verwijderEvenement() async {
        do {
            try await EvenementenService.verwijder(id: evenementId)
            await onGewijzigd()
            dismiss()
        } catch {
            melding = .fout("Verwijderen mislukt: \(error.localizedDescription)")
        }
    }

    // MARK: Export (zelfde CSV-opmaak als de webapp: ; als scheidingsteken)

    private var titelSlug: String {
        let basis = (evenement?.titel ?? "evenement").lowercased()
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "nl_NL"))
        let delen = basis.components(separatedBy: CharacterSet.alphanumerics.inverted).filter { !$0.isEmpty }
        return delen.isEmpty ? "evenement" : delen.joined(separator: "-")
    }

    private var vandaag: String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    private func exporteerVolledig() {
        let kop = ["Naam", "E-mail", "Aangemeld op"] + velden.map(\.label)
        let rijen = aanmeldingen.map { a in
            [a.naam ?? "", a.email, Tijdstempel.weergave(a.aangemeldDatum)] + velden.map { antwoorden[a.id]?[$0.id] ?? "" }
        }
        schrijfCSV([kop] + rijen, naam: "evenement-\(titelSlug)-aanmeldingen-\(vandaag).csv")
    }

    private func exporteerEmails() {
        schrijfCSV([["E-mail"]] + aanmeldingen.map { [$0.email] }, naam: "evenement-\(titelSlug)-emails-\(vandaag).csv")
    }

    private func schrijfCSV(_ rijen: [[String]], naam: String) {
        let csv = rijen
            .map { $0.map { "\"\($0.replacingOccurrences(of: "\"", with: "\"\""))\"" }.joined(separator: ";") }
            .joined(separator: "\n")
        // BOM zodat Excel/Numbers de UTF-8 tekens (é, ë, …) goed toont.
        let inhoud = "\u{FEFF}" + csv
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(naam)
        do {
            try inhoud.write(to: url, atomically: true, encoding: .utf8)
            exportBestand = ExportBestand(url: url)
        } catch {
            melding = .fout("Exporteren mislukt: \(error.localizedDescription)")
        }
    }
}

private struct ExportBestand: Identifiable {
    let id = UUID()
    let url: URL
}

/// UIActivityViewController voor het delen/opslaan van een CSV-bestand.
private struct DeelSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

// MARK: - Aanmelding rij + detail

private struct AanmeldingRij: View {
    let aanmelding: EvenementAanmelding
    let velden: [EvenementVeld]
    let antwoorden: [String: String]

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline) {
                Text(aanmelding.naam?.isEmpty == false ? aanmelding.naam! : "—")
                    .font(.body.weight(.semibold))
                Spacer(minLength: 6)
                Text(Tijdstempel.weergave(aanmelding.aangemeldDatum))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            Text(aanmelding.email)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            let ingevuld = velden.compactMap { v -> String? in
                guard let w = antwoorden[v.id], !w.isEmpty else { return nil }
                return "\(v.label): \(w)"
            }
            if !ingevuld.isEmpty {
                Text(ingevuld.joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 2)
        .contentShape(Rectangle())
    }
}

private struct AanmeldingDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let aanmelding: EvenementAanmelding
    let velden: [EvenementVeld]
    let antwoorden: [String: String]
    let magBewerken: Bool
    let onVerwijder: () -> Void

    var body: some View {
        NavigationStack {
            List {
                Section {
                    LabeledContent("Naam", value: aanmelding.naam?.isEmpty == false ? aanmelding.naam! : "—")
                    LabeledContent("E-mail") {
                        if let mail = URL(string: "mailto:\(aanmelding.email)") {
                            Link(aanmelding.email, destination: mail)
                        } else {
                            Text(aanmelding.email)
                        }
                    }
                    LabeledContent("Aangemeld op", value: Tijdstempel.weergave(aanmelding.aangemeldDatum))
                }
                if !velden.isEmpty {
                    Section("Aanvullende velden") {
                        ForEach(velden) { v in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(v.label).font(.caption).foregroundStyle(.secondary)
                                Text(antwoorden[v.id].flatMap { $0.isEmpty ? nil : $0 } ?? "—")
                            }
                        }
                    }
                }
                if magBewerken {
                    Section {
                        Button("Aanmelding verwijderen", role: .destructive) {
                            dismiss()
                            onVerwijder()
                        }
                    }
                }
            }
            .navigationTitle("Aanmelding")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Klaar") { dismiss() } }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

// MARK: - Handmatig aanmelden

private struct HandmatigAanmeldenView: View {
    @Environment(\.dismiss) private var dismiss
    let evenement: Evenement
    let velden: [EvenementVeld]
    let huidigAantal: Int
    let onKlaar: (_ bijgewerkt: Bool) async -> Void

    @State private var naam = ""
    @State private var email = ""
    @State private var antwoorden: [String: String] = [:]
    @State private var bezig = false
    @State private var foutmelding: String?
    @State private var bevestigVol = false

    private var isVol: Bool {
        guard let max = evenement.maxAanmeldingen else { return false }
        return huidigAantal >= max
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Voor- en achternaam", text: $naam)
                        .textContentType(.name)
                    TextField("naam@voorbeeld.nl", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    Text("Naam en e-mail *")
                } footer: {
                    Text("Staat dit e-mailadres al op de lijst, dan wordt die aanmelding bijgewerkt.")
                }

                ForEach(velden) { v in
                    Section(v.label + (v.verplicht ? " *" : "")) {
                        veldInvoer(v)
                    }
                }

                if isVol {
                    Section {
                        Label("Dit evenement zit al op het maximum (\(evenement.maxAanmeldingen ?? 0)).", systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.orange)
                            .font(.subheadline)
                    }
                }
                if let foutmelding {
                    Section { Text(foutmelding).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Handmatig aanmelden")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Toevoegen") { controleerEnOpslaan() }
                        .disabled(bezig)
                }
            }
            .alert("Evenement is vol", isPresented: $bevestigVol) {
                Button("Toch toevoegen") { Task { await opslaan() } }
                Button("Annuleren", role: .cancel) {}
            } message: {
                Text("Dit evenement zit al op het maximum (\(evenement.maxAanmeldingen ?? 0)). Toch toevoegen?")
            }
        }
    }

    @ViewBuilder
    private func veldInvoer(_ v: EvenementVeld) -> some View {
        let waarde = antwoorden[v.id] ?? ""
        if v.isKeuze && v.meerdere {
            ForEach(v.opties ?? [], id: \.self) { optie in
                let aan = Meerkeuze.opties(waarde).contains(optie)
                Button {
                    antwoorden[v.id] = Meerkeuze.wissel(waarde, optie)
                } label: {
                    HStack {
                        Image(systemName: aan ? "checkmark.square.fill" : "square")
                            .foregroundStyle(aan ? Color.theepotGroenDonker : .secondary)
                        Text(optie).foregroundStyle(.primary)
                    }
                }
            }
        } else if v.isKeuze {
            Picker(v.label, selection: Binding(get: { waarde }, set: { antwoorden[v.id] = $0 })) {
                Text("Maak een keuze...").tag("")
                ForEach(v.opties ?? [], id: \.self) { Text($0).tag($0) }
            }
        } else {
            TextField(v.label, text: Binding(get: { waarde }, set: { antwoorden[v.id] = $0 }), axis: .vertical)
        }
    }

    private func controleerEnOpslaan() {
        foutmelding = nil
        if naam.trimmingCharacters(in: .whitespaces).isEmpty { foutmelding = "Vul een naam in."; return }
        let schoon = email.trimmingCharacters(in: .whitespaces)
        if schoon.isEmpty { foutmelding = "Vul een e-mailadres in."; return }
        if !schoon.contains("@") || !schoon.contains(".") { foutmelding = "Vul een geldig e-mailadres in."; return }
        for v in velden where v.verplicht {
            if (antwoorden[v.id] ?? "").trimmingCharacters(in: .whitespaces).isEmpty {
                foutmelding = "Vul \"\(v.label)\" in."
                return
            }
        }
        if isVol { bevestigVol = true; return }
        Task { await opslaan() }
    }

    private func opslaan() async {
        bezig = true
        defer { bezig = false }
        do {
            let schoneAntwoorden = antwoorden.mapValues { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            let bijgewerkt = try await EvenementenService.voegHandmatigToe(
                evenementId: evenement.id, email: email, naam: naam, antwoorden: schoneAntwoorden
            )
            dismiss()
            await onKlaar(bijgewerkt)
        } catch {
            foutmelding = "Toevoegen mislukt: \(error.localizedDescription)"
        }
    }
}

// MARK: - Velden beheren

private struct VeldenBeherenView: View {
    @Environment(\.dismiss) private var dismiss
    let evenementId: String
    @Binding var velden: [EvenementVeld]

    @State private var label = ""
    @State private var type = "tekst"
    @State private var opties = ""
    @State private var meerdere = false
    @State private var verplicht = false
    @State private var bezig = false
    @State private var foutmelding: String?
    @State private var teVerwijderen: EvenementVeld?
    @State private var editMode: EditMode = .inactive

    var body: some View {
        NavigationStack {
            List {
                Section("Standaardvelden") {
                    ForEach(["Naam", "E-mail"], id: \.self) { naam in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(naam).font(.subheadline.weight(.semibold))
                            Text("Tekstveld · Altijd verplicht").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }

                Section {
                    if velden.isEmpty {
                        Text("Nog geen aanvullende velden. Voeg een invulvakje of dropdown toe die bezoekers naast naam en e-mail moeten (of mogen) invullen.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    ForEach(velden) { v in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(v.label).font(.subheadline.weight(.semibold))
                            Text(v.omschrijving).font(.caption).foregroundStyle(.secondary)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) { teVerwijderen = v } label: {
                                Label("Verwijderen", systemImage: "trash")
                            }
                        }
                    }
                    .onMove(perform: verplaats)
                } header: {
                    Text("Aanvullende velden")
                } footer: {
                    if velden.count > 1 { Text("Tik op Volgorde om velden te verslepen.") }
                }

                Section("Nieuw veld") {
                    TextField("Label, bijv. Aantal personen", text: $label)
                    Picker("Type", selection: $type) {
                        Text("Tekstveld").tag("tekst")
                        Text("Dropdown (keuzemenu)").tag("keuze")
                    }
                    if type == "keuze" {
                        TextField("Opties, gescheiden door komma's", text: $opties, axis: .vertical)
                        Toggle("Meerdere opties mogen aangevinkt worden", isOn: $meerdere)
                    }
                    Toggle("Verplicht", isOn: $verplicht)
                    Button {
                        Task { await voegToe() }
                    } label: {
                        Label(bezig ? "Toevoegen..." : "Veld toevoegen", systemImage: "plus")
                    }
                    .disabled(bezig)
                    .tint(.theepotGroenDonker)
                    if let foutmelding {
                        Text(foutmelding).foregroundStyle(.red).font(.subheadline)
                    }
                }
            }
            .environment(\.editMode, $editMode)
            .navigationTitle("Aanvullende velden")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if velden.count > 1 {
                    ToolbarItem(placement: .topBarLeading) {
                        Button(editMode.isEditing ? "Gereed" : "Volgorde") {
                            withAnimation { editMode = editMode.isEditing ? .inactive : .active }
                        }
                    }
                }
                ToolbarItem(placement: .confirmationAction) { Button("Sluiten") { dismiss() } }
            }
            .confirmationDialog(
                "Dit veld verwijderen?",
                isPresented: Binding(get: { teVerwijderen != nil }, set: { if !$0 { teVerwijderen = nil } }),
                titleVisibility: .visible,
                presenting: teVerwijderen
            ) { v in
                Button("Verwijderen", role: .destructive) { Task { await verwijder(v) } }
                Button("Annuleren", role: .cancel) {}
            } message: { _ in
                Text("Eerder ingevulde antwoorden gaan hiermee ook verloren.")
            }
        }
    }

    private func voegToe() async {
        foutmelding = nil
        let schoonLabel = label.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !schoonLabel.isEmpty else { foutmelding = "Vul een label in."; return }
        let lijst = type == "keuze"
            ? opties.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
            : nil
        if type == "keuze" && (lijst ?? []).isEmpty { foutmelding = "Vul minstens één keuze-optie in."; return }

        bezig = true
        defer { bezig = false }
        do {
            let veld = try await EvenementenService.maakVeldAan(
                evenementId: evenementId, label: schoonLabel, type: type, opties: lijst,
                meerdere: meerdere, verplicht: verplicht, volgorde: velden.count
            )
            velden.append(veld)
            label = ""; type = "tekst"; opties = ""; meerdere = false; verplicht = false
        } catch {
            foutmelding = "Toevoegen mislukt: \(error.localizedDescription)"
        }
    }

    private func verplaats(van bron: IndexSet, naar doel: Int) {
        velden.move(fromOffsets: bron, toOffset: doel)
        for index in velden.indices { velden[index].volgorde = index }
        let snapshot = velden
        Task {
            do {
                try await withThrowingTaskGroup(of: Void.self) { groep in
                    for (index, veld) in snapshot.enumerated() {
                        groep.addTask { try await EvenementenService.zetVeldVolgorde(id: veld.id, volgorde: index) }
                    }
                    try await groep.waitForAll()
                }
            } catch {
                foutmelding = "Volgorde opslaan mislukt: \(error.localizedDescription)"
            }
        }
    }

    private func verwijder(_ v: EvenementVeld) async {
        do {
            try await EvenementenService.verwijderVeld(id: v.id)
            velden.removeAll { $0.id == v.id }
        } catch {
            foutmelding = "Verwijderen mislukt: \(error.localizedDescription)"
        }
    }
}
