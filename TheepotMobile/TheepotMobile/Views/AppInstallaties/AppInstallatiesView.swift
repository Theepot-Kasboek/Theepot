import SwiftUI

/// Spiegelt app/app-installaties/page.tsx: versiegeschiedenis + apparaten per
/// platform, alleen zichtbaar voor superadmins (zie AccountView).
struct AppInstallatiesView: View {
    @State private var versies: [AppVersie] = []
    @State private var installaties: [AppInstallatie] = []
    @State private var isLoading = true
    @State private var versieModal: VersieModalState?
    @State private var apparaatModal: ApparaatModalState?

    enum VersieModalState: Identifiable { case nieuw, bewerk(AppVersie)
        var id: String { if case .bewerk(let v) = self { return v.id }; return "nieuw" }
    }
    enum ApparaatModalState: Identifiable { case nieuw, bewerk(AppInstallatie)
        var id: String { if case .bewerk(let a) = self { return a.id }; return "nieuw" }
    }

    var body: some View {
        Group {
            if isLoading {
                    ProgressView()
                } else {
                    List {
                        Section {
                            ForEach(AppPlatform.allCases, id: \.self) { platform in
                                let rij = versies.filter { $0.platform == platform }
                                if !rij.isEmpty {
                                    DisclosureGroup("\(platform.label) (\(rij.count))") {
                                        ForEach(rij) { versie in
                                            VersieRow(versie: versie)
                                                .contentShape(Rectangle())
                                                .onTapGesture { versieModal = .bewerk(versie) }
                                                .swipeActions {
                                                    Button("Verwijderen", role: .destructive) {
                                                        Task { await verwijderVersie(versie) }
                                                    }
                                                }
                                        }
                                    }
                                }
                            }
                            if versies.isEmpty {
                                Text("Nog geen versies geregistreerd").foregroundStyle(.secondary)
                            }
                        } header: {
                            HStack {
                                Text("Versiegeschiedenis")
                                Spacer()
                                Button { versieModal = .nieuw } label: {
                                    Label("Toevoegen", systemImage: "plus.circle.fill")
                                }
                            }
                        }

                        Section {
                            ForEach(AppPlatform.allCases, id: \.self) { platform in
                                let rij = installaties.filter { $0.platform == platform }
                                if !rij.isEmpty {
                                    DisclosureGroup("\(platform.label) (\(rij.count))") {
                                        ForEach(rij) { apparaat in
                                            ApparaatRow(apparaat: apparaat, versieLabel: versieLabel(apparaat.versieId))
                                                .contentShape(Rectangle())
                                                .onTapGesture { apparaatModal = .bewerk(apparaat) }
                                                .swipeActions {
                                                    Button("Verwijderen", role: .destructive) {
                                                        Task { await verwijderApparaat(apparaat) }
                                                    }
                                                }
                                        }
                                    }
                                }
                            }
                            if installaties.isEmpty {
                                Text("Nog geen apparaten geregistreerd").foregroundStyle(.secondary)
                            }
                        } header: {
                            HStack {
                                Text("Apparaten")
                                Spacer()
                                Button { apparaatModal = .nieuw } label: {
                                    Label("Toevoegen", systemImage: "plus.circle.fill")
                                }
                            }
                        }
                    }
                    .refreshable { await laad() }
                    // Deze pagina wordt via een NavigationLink doorgeduwd vanuit
                    // AccountView, waardoor de .safeAreaInset die DashboardView
                    // instelt voor de zwevende tabbalk hier niet doorwerkt — reserveer
                    // de ruimte daarom hier opnieuw (zelfde maat als TheepotTabBar.hoogte
                    // + barOnderrand in DashboardView.swift).
                    .safeAreaInset(edge: .bottom) {
                        Color.clear.frame(height: 78)
                    }
                }
            }
            .navigationTitle("App-installaties")
            .sheet(item: $versieModal) { state in
                VersieFormView(bestaand: bestaandeVersie(state)) { await laad() }
            }
        .sheet(item: $apparaatModal) { state in
            ApparaatFormView(bestaand: bestaandApparaat(state), versies: versies) { await laad() }
        }
        .task { await laad() }
    }

    private func bestaandeVersie(_ state: VersieModalState) -> AppVersie? {
        if case .bewerk(let v) = state { return v }
        return nil
    }

    private func bestaandApparaat(_ state: ApparaatModalState) -> AppInstallatie? {
        if case .bewerk(let a) = state { return a }
        return nil
    }

    private func versieLabel(_ versieId: String?) -> String {
        versies.first { $0.id == versieId }?.versie ?? "—"
    }

    private func laad() async {
        isLoading = true
        async let v = try? AppInstallatiesService.versies()
        async let i = try? AppInstallatiesService.installaties()
        versies = await v ?? []
        installaties = await i ?? []
        isLoading = false
    }

    private func verwijderVersie(_ versie: AppVersie) async {
        try? await AppInstallatiesService.verwijderVersie(id: versie.id)
        await laad()
    }

    private func verwijderApparaat(_ apparaat: AppInstallatie) async {
        try? await AppInstallatiesService.verwijderApparaat(id: apparaat.id)
        await laad()
    }
}

private struct VersieRow: View {
    let versie: AppVersie

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("versie \(versie.versie)").font(.headline)
            Text("Uitgebracht op \(Datum.weergave(versie.uitgebrachtOp))")
                .font(.caption).foregroundStyle(.secondary)
            if let wijzigingen = versie.wijzigingen, !wijzigingen.isEmpty {
                Text(wijzigingen).font(.footnote).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

private struct ApparaatRow: View {
    let apparaat: AppInstallatie
    let versieLabel: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(apparaat.apparaatNaam).font(.headline)
            if apparaat.nietGeinstalleerd {
                Text("niet geïnstalleerd")
                    .font(.caption).foregroundStyle(.red)
            } else {
                Text("versie \(versieLabel) · geïnstalleerd \(Datum.weergave(apparaat.geinstalleerdOp))")
                    .font(.caption).foregroundStyle(.secondary)
            }
            if let notitie = apparaat.notitie, !notitie.isEmpty {
                Text("📝 \(notitie)").font(.footnote).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

/// Kleine datumhelper, lokaal aan dit scherm zodat `yyyy-MM-dd`-strings uit
/// Supabase consistent omgezet worden naar Date en terug (zelfde formaat als
/// de webapp gebruikt voor date-only kolommen).
private enum Datum {
    static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "Europe/Amsterdam")
        return f
    }()

    static let weergaveFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .long
        f.locale = Locale(identifier: "nl_NL")
        return f
    }()

    static func vandaag() -> String { formatter.string(from: Date()) }

    static func date(van tekst: String) -> Date { formatter.date(from: tekst) ?? Date() }

    static func tekst(van datum: Date) -> String { formatter.string(from: datum) }

    static func weergave(_ tekst: String) -> String {
        guard let datum = formatter.date(from: tekst) else { return tekst }
        return weergaveFormatter.string(from: datum)
    }
}

private struct VersieFormView: View {
    @Environment(\.dismiss) private var dismiss
    let bestaand: AppVersie?
    let onKlaar: () async -> Void

    @State private var platform: AppPlatform = .android
    @State private var versienummer = ""
    @State private var wijzigingen = ""
    @State private var uitgebrachtOp = Date()
    @State private var bezig = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Platform") {
                    Picker("Platform", selection: $platform) {
                        ForEach(AppPlatform.allCases, id: \.self) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }
                Section("Versie") {
                    TextField("Versienummer, bijv. 1.2", text: $versienummer)
                    DatePicker("Uitgebracht op", selection: $uitgebrachtOp, displayedComponents: .date)
                }
                Section("Wijzigingen (optioneel)") {
                    TextField("Wat is er veranderd?", text: $wijzigingen, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle(bestaand == nil ? "Versie toevoegen" : "Versie bewerken")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Opslaan") { Task { await opslaan() } }
                        .disabled(versienummer.trimmingCharacters(in: .whitespaces).isEmpty || bezig)
                }
            }
        }
        .task {
            if let bestaand {
                platform = bestaand.platform
                versienummer = bestaand.versie
                wijzigingen = bestaand.wijzigingen ?? ""
                uitgebrachtOp = Datum.date(van: bestaand.uitgebrachtOp)
            }
        }
    }

    private func opslaan() async {
        bezig = true
        defer { bezig = false }
        let naam = versienummer.trimmingCharacters(in: .whitespaces)
        let notitie = wijzigingen.trimmingCharacters(in: .whitespaces)
        do {
            if let bestaand {
                try await AppInstallatiesService.werkVersieBij(id: bestaand.id, platform: platform, versie: naam, wijzigingen: notitie.isEmpty ? nil : notitie, uitgebrachtOp: Datum.tekst(van: uitgebrachtOp))
            } else {
                try await AppInstallatiesService.maakVersieAan(platform: platform, versie: naam, wijzigingen: notitie.isEmpty ? nil : notitie, uitgebrachtOp: Datum.tekst(van: uitgebrachtOp))
            }
            await onKlaar()
            dismiss()
        } catch {}
    }
}

private struct ApparaatFormView: View {
    @Environment(\.dismiss) private var dismiss
    let bestaand: AppInstallatie?
    let versies: [AppVersie]
    let onKlaar: () async -> Void

    private static let nietGeinstalleerdTag = "__niet_geinstalleerd__"
    private static let onbekendTag = ""

    @State private var naam = ""
    @State private var platform: AppPlatform = .android
    @State private var versieKeuze = onbekendTag
    @State private var notitie = ""
    @State private var geinstalleerdOp = Date()
    @State private var bezig = false

    private var versiesVoorPlatform: [AppVersie] { versies.filter { $0.platform == platform } }
    private var isNietGeinstalleerd: Bool { versieKeuze == Self.nietGeinstalleerdTag }

    var body: some View {
        NavigationStack {
            Form {
                Section("Platform") {
                    Picker("Platform", selection: $platform) {
                        ForEach(AppPlatform.allCases, id: \.self) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: platform) { _, _ in versieKeuze = Self.onbekendTag }
                }
                Section("Apparaat") {
                    TextField("Naam, bijv. Werktelefoon Lisse", text: $naam)
                    Picker("Geïnstalleerde versie", selection: $versieKeuze) {
                        Text("— Onbekend —").tag(Self.onbekendTag)
                        Text("Niet geïnstalleerd").tag(Self.nietGeinstalleerdTag)
                        ForEach(versiesVoorPlatform) { Text($0.versie).tag($0.id) }
                    }
                }
                if !isNietGeinstalleerd {
                    Section("Datum") {
                        DatePicker("Geïnstalleerd op", selection: $geinstalleerdOp, displayedComponents: .date)
                    }
                }
                Section("Notitie (optioneel)") {
                    TextField("Bijv. beheerd door Lucas", text: $notitie)
                }
            }
            .navigationTitle(bestaand == nil ? "Apparaat toevoegen" : "Apparaat bewerken")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Opslaan") { Task { await opslaan() } }
                        .disabled(naam.trimmingCharacters(in: .whitespaces).isEmpty || bezig)
                }
            }
        }
        .task {
            if let bestaand {
                naam = bestaand.apparaatNaam
                platform = bestaand.platform
                versieKeuze = bestaand.nietGeinstalleerd ? Self.nietGeinstalleerdTag : (bestaand.versieId ?? Self.onbekendTag)
                notitie = bestaand.notitie ?? ""
                geinstalleerdOp = Datum.date(van: bestaand.geinstalleerdOp)
            }
        }
    }

    private func opslaan() async {
        bezig = true
        defer { bezig = false }
        let apparaatNaam = naam.trimmingCharacters(in: .whitespaces)
        let notitieTekst = notitie.trimmingCharacters(in: .whitespaces)
        let nietGeinstalleerd = isNietGeinstalleerd
        let versieId = nietGeinstalleerd ? nil : (versieKeuze.isEmpty ? nil : versieKeuze)
        let geinstalleerdOpTekst = Datum.tekst(van: geinstalleerdOp)
        do {
            if let bestaand {
                try await AppInstallatiesService.werkApparaatBij(id: bestaand.id, apparaatNaam: apparaatNaam, platform: platform, versieId: versieId, nietGeinstalleerd: nietGeinstalleerd, notitie: notitieTekst.isEmpty ? nil : notitieTekst, geinstalleerdOp: geinstalleerdOpTekst)
            } else {
                try await AppInstallatiesService.maakApparaatAan(apparaatNaam: apparaatNaam, platform: platform, versieId: versieId, nietGeinstalleerd: nietGeinstalleerd, notitie: notitieTekst.isEmpty ? nil : notitieTekst, geinstalleerdOp: geinstalleerdOpTekst)
            }
            await onKlaar()
            dismiss()
        } catch {}
    }
}
