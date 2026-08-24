import SwiftUI
import PhotosUI

struct WeekplanningenView: View {
    @EnvironmentObject var session: SessionStore
    @State private var locaties: [Locatie] = []
    @State private var actieveLocatie: Locatie?
    @State private var groepen: [WeekGroep] = []
    @State private var actieveGroepId: String?
    @State private var weekStart = Date()
    @State private var planning: WeekPlanning?
    @State private var activiteiten: [WeekActiviteit] = []
    @State private var isLoading = true
    @State private var themaBewerken = false
    @State private var themaInvoer = ""
    @State private var formContext: WeekActiviteitFormContext?
    @State private var groepenBeheer = false

    private var magBewerken: Bool {
        session.isSuperadmin || session.rechten.paginaWeekplanningen == .bewerken
    }
    private var magGroepenBeheren: Bool {
        session.isSuperadmin || (session.rechten.paginaWeekplanningen == .bewerken && session.rechten.weekplanningGroepenBeheren)
    }

    private var actieveGroep: WeekGroep? {
        groepen.first { $0.id == actieveGroepId }
    }

    // Slot 1 is knutsel óf koken/bakken, slot 2 het groepsspel — zoals de webapp.
    private var knutselAct: WeekActiviteit? { activiteiten.first { $0.type == .knutsel } }
    private var kookAct: WeekActiviteit? { activiteiten.first { $0.type == .koolBak } }
    private var groepsspelAct: WeekActiviteit? { activiteiten.first { $0.type == .groepsspel } }
    private var slot1Type: WeekActiviteitType { (kookAct != nil && knutselAct == nil) ? .koolBak : .knutsel }
    private var slot1Act: WeekActiviteit? { knutselAct ?? kookAct }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if !locaties.isEmpty {
                    kiezers
                }

                if isLoading {
                    ProgressView()
                    Spacer()
                } else if locaties.isEmpty {
                    ContentUnavailableView("Geen locaties", systemImage: "mappin.slash", description: Text("Je hebt geen toegang tot een locatie met weekplanningen."))
                } else {
                    lijst
                }
            }
            .navigationTitle("Weekplanningen")
            .toolbar {
                if magGroepenBeheren, actieveLocatie != nil {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { groepenBeheer = true } label: { Image(systemName: "person.2.badge.gearshape") }
                            .accessibilityLabel("Groepen beheren")
                    }
                }
            }
        }
        .task { await laadLocaties() }
        .onChange(of: actieveLocatie) { _, _ in
            actieveGroepId = nil
            Task { await laadGroepen(); await laad() }
        }
        .onChange(of: actieveGroepId) { _, _ in Task { await laad() } }
        .onChange(of: weekStart) { _, _ in Task { await laad() } }
        .sheet(item: $formContext) { context in
            WeekActiviteitFormView(context: context) {
                formContext = nil
                Task { await laad() }
            }
        }
        .sheet(isPresented: $groepenBeheer) {
            WeekGroepenBeheerView(
                locatieNaam: actieveLocatie?.naam ?? "",
                groepen: groepen,
                profielId: session.profiel?.id.uuidString.lowercased()
            ) { verwijderdeGroepId in
                if let verwijderdeGroepId, verwijderdeGroepId == actieveGroepId { actieveGroepId = nil }
                Task { await laadGroepen(); await laad() }
            }
        }
    }

    // ─── Kiezers: locatie, groep en week ────────────────────────────────────

    private var kiezers: some View {
        VStack(spacing: 8) {
            Picker("Locatie", selection: $actieveLocatie) {
                ForEach(locaties) { (locatie: Locatie) in
                    Text(locatie.naam).tag(Optional(locatie))
                }
            }
            .pickerStyle(.menu)

            if !groepen.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        groepKnop(titel: "Algemeen", id: nil)
                        ForEach(groepen) { groep in
                            groepKnop(titel: groep.naam, id: groep.id)
                        }
                    }
                    .padding(.horizontal)
                }
            }

            HStack {
                Button { wijzigWeek(-1) } label: { Image(systemName: "chevron.left") }
                Spacer()
                Text(weekLabel).font(.headline)
                Spacer()
                Button { wijzigWeek(1) } label: { Image(systemName: "chevron.right") }
            }
            .padding(.horizontal)
        }
        .padding(.bottom, 8)
    }

    private func groepKnop(titel: String, id: String?) -> some View {
        let actief = actieveGroepId == id
        return Button { actieveGroepId = id } label: {
            Text(titel)
                .font(.subheadline)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(actief ? Color.theepotGroenLicht : Color(.secondarySystemBackground))
                .foregroundStyle(actief ? Color.theepotGroenTekst : Color.primary)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(actief ? Color.theepotGroen : Color.clear, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
    }

    // ─── Lijst met thema en de twee slots ───────────────────────────────────

    private var lijst: some View {
        List {
            Section("Weekthema") {
                if themaBewerken {
                    TextField("Bijv. Jungle, Ruimtevaart...", text: $themaInvoer)
                    HStack {
                        Button("Opslaan") { Task { await slaThemaOp() } }
                        Spacer()
                        Button("Annuleren", role: .cancel) { themaBewerken = false }
                    }
                } else {
                    HStack {
                        Label(planning?.thema?.isEmpty == false ? planning!.thema! : "Geen thema ingesteld", systemImage: "sparkles")
                            .foregroundStyle(planning?.thema?.isEmpty == false ? Color.theepotGroenTekst : Color.secondary)
                        if magBewerken {
                            Spacer()
                            Button(planning?.thema?.isEmpty == false ? "Wijzigen" : "Instellen") {
                                themaInvoer = planning?.thema ?? ""
                                themaBewerken = true
                            }
                            .font(.subheadline)
                        }
                    }
                }
            }

            slotSectie(type: slot1Type, activiteit: slot1Act, wisselNaar: slot1Type == .knutsel ? .koolBak : .knutsel)
            slotSectie(type: .groepsspel, activiteit: groepsspelAct, wisselNaar: nil)
        }
        .listStyle(.insetGrouped)
    }

    @ViewBuilder
    private func slotSectie(type: WeekActiviteitType, activiteit: WeekActiviteit?, wisselNaar: WeekActiviteitType?) -> some View {
        Section {
            if let activiteit {
                ActiviteitRow(activiteit: activiteit)
                if magBewerken {
                    Button("Bewerken") { opentForm(type: type, bestaand: activiteit) }
                    Button("Verwijderen", role: .destructive) { Task { await verwijderActiviteit(activiteit.id) } }
                }
            } else if magBewerken {
                Button {
                    opentForm(type: type, bestaand: nil)
                } label: {
                    Label("\(type.label) toevoegen", systemImage: "plus.circle")
                }
                if let wisselNaar {
                    Button {
                        opentForm(type: wisselNaar, bestaand: nil)
                    } label: {
                        Label("In plaats daarvan \(wisselNaar.label.lowercased())", systemImage: "arrow.left.arrow.right")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            } else {
                Text("Nog niet ingevuld").foregroundStyle(.secondary)
            }
        } header: {
            Label(type.label, systemImage: type.symbool)
        }
    }

    private func opentForm(type: WeekActiviteitType, bestaand: WeekActiviteit?) {
        guard let locatie = actieveLocatie else { return }
        formContext = WeekActiviteitFormContext(
            locatieNaam: locatie.naam,
            weekStart: weekStart,
            groepId: actieveGroepId,
            planning: planning,
            type: type,
            bestaand: bestaand,
            profielId: session.profiel?.id.uuidString.lowercased()
        )
    }

    // ─── Data ───────────────────────────────────────────────────────────────

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
        await laadGroepen()
        await laad()
    }

    private func laadGroepen() async {
        guard let actieveLocatie else { groepen = []; return }
        groepen = (try? await WeekplanningenService.groepen(locatieNaam: actieveLocatie.naam)) ?? []
        if let actieveGroepId, !groepen.contains(where: { $0.id == actieveGroepId }) {
            self.actieveGroepId = nil
        }
    }

    private func laad() async {
        guard let actieveLocatie else { isLoading = false; return }
        isLoading = true
        themaBewerken = false
        if let resultaat = try? await WeekplanningenService.planning(locatieNaam: actieveLocatie.naam, weekStart: weekStart, groepId: actieveGroepId) {
            planning = resultaat.0
            activiteiten = resultaat.1
        } else {
            planning = nil
            activiteiten = []
        }
        isLoading = false
    }

    private func slaThemaOp() async {
        guard let actieveLocatie else { return }
        let huidig = try? await WeekplanningenService.zorgVoorPlanning(
            bestaand: planning, locatieNaam: actieveLocatie.naam, weekStart: weekStart,
            groepId: actieveGroepId, thema: themaInvoer, aangemaaktDoor: session.profiel?.id.uuidString.lowercased()
        )
        if let huidig {
            try? await WeekplanningenService.werkBijThema(planningId: huidig.id, thema: themaInvoer)
        }
        themaBewerken = false
        await laad()
    }

    private func verwijderActiviteit(_ id: String) async {
        try? await WeekplanningenService.verwijderActiviteit(id: id)
        await laad()
    }
}

// ─── Activiteitrij met foto ─────────────────────────────────────────────────

private struct ActiviteitRow: View {
    let activiteit: WeekActiviteit

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let urlTekst = activiteit.afbeeldingUrl, let url = URL(string: urlTekst) {
                AsyncImage(url: url) { fase in
                    if let afbeelding = fase.image {
                        afbeelding
                            .resizable()
                            .scaledToFill()
                            .frame(height: 140)
                            .frame(maxWidth: .infinity)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .clipped()
                    }
                }
            }
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

// ─── Context voor het activiteitformulier ───────────────────────────────────

struct WeekActiviteitFormContext: Identifiable {
    let locatieNaam: String
    let weekStart: Date
    let groepId: String?
    let planning: WeekPlanning?
    let type: WeekActiviteitType
    let bestaand: WeekActiviteit?
    let profielId: String?

    var id: String { "\(bestaand?.id ?? "nieuw")-\(type.rawValue)" }
}

// ─── Activiteit toevoegen/bewerken, met koppeling aan de activiteitenbibliotheek ─

private struct WeekActiviteitFormView: View {
    @Environment(\.dismiss) private var dismiss
    let context: WeekActiviteitFormContext
    let onKlaar: () -> Void

    private enum Bron: String, CaseIterable { case handmatig = "Handmatig", bibliotheek = "Uit bibliotheek" }

    @State private var bron: Bron = .handmatig
    @State private var naam = ""
    @State private var beschrijving = ""
    @State private var materialenRaw = ""
    @State private var gekozenBibliotheekId: String?
    @State private var bibliotheek: [BibliotheekActiviteit] = []
    @State private var zoek = ""
    @State private var fotoItem: PhotosPickerItem?
    @State private var fotoPreview: Image?
    @State private var nieuweFotoData: Data?
    @State private var bezig = false
    @State private var foutmelding: String?

    private var gefilterdeBibliotheek: [BibliotheekActiviteit] {
        guard !zoek.trimmingCharacters(in: .whitespaces).isEmpty else { return bibliotheek }
        let q = zoek.lowercased()
        return bibliotheek.filter { $0.naam.lowercased().contains(q) || $0.categorie.lowercased().contains(q) }
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("Bron", selection: $bron) {
                    ForEach(Bron.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)

                if bron == .handmatig {
                    Section("Activiteit") {
                        TextField("Naam activiteit", text: $naam)
                        TextField("Benodigdheden (kommagescheiden)", text: $materialenRaw)
                        TextField("Beschrijving (optioneel)", text: $beschrijving, axis: .vertical)
                            .lineLimit(3...6)
                    }
                    Section("Voorbeeldafbeelding (optioneel)") {
                        if let fotoPreview {
                            fotoPreview
                                .resizable()
                                .scaledToFill()
                                .frame(height: 140)
                                .frame(maxWidth: .infinity)
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                .clipped()
                        } else if let urlTekst = context.bestaand?.afbeeldingUrl, let url = URL(string: urlTekst) {
                            AsyncImage(url: url) { fase in
                                if let afbeelding = fase.image {
                                    afbeelding
                                        .resizable()
                                        .scaledToFill()
                                        .frame(height: 140)
                                        .frame(maxWidth: .infinity)
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                        .clipped()
                                }
                            }
                        }
                        PhotosPicker(selection: $fotoItem, matching: .any(of: [.images])) {
                            Label(fotoPreview == nil ? "Foto kiezen" : "Foto wijzigen", systemImage: "photo")
                        }
                    }
                    if gekozenBibliotheekId != nil {
                        Section {
                            Text("Overgenomen uit de activiteitenbibliotheek. De foto blijft bij deze weekactiviteit; de bibliotheek zelf verandert niet.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    if let foutmelding {
                        Section { Text(foutmelding).font(.caption).foregroundStyle(.red) }
                    }
                } else {
                    Section {
                        TextField("Zoek op naam of categorie...", text: $zoek)
                    }
                    Section {
                        if gefilterdeBibliotheek.isEmpty {
                            Text("Geen activiteiten gevonden.").foregroundStyle(.secondary)
                        } else {
                            ForEach(gefilterdeBibliotheek) { item in
                                Button {
                                    kiesUitBibliotheek(item)
                                } label: {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.naam).foregroundStyle(.primary)
                                        Text([item.categorie, item.thema.first].compactMap { $0 }.joined(separator: " · "))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle(context.bestaand == nil ? "\(context.type.label) toevoegen" : "\(context.type.label) bewerken")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                if bron == .handmatig {
                    ToolbarItem(placement: .confirmationAction) {
                        Button(context.bestaand == nil ? "Toevoegen" : "Opslaan") { Task { await opslaan() } }
                            .disabled(naam.trimmingCharacters(in: .whitespaces).isEmpty || bezig)
                    }
                }
            }
        }
        .task { await laad() }
        .onChange(of: fotoItem) { _, nieuw in Task { await verwerkFoto(nieuw) } }
    }

    private func laad() async {
        bibliotheek = (try? await WeekplanningenService.bibliotheekActiviteiten()) ?? []
        if let bestaand = context.bestaand {
            naam = bestaand.naam
            beschrijving = bestaand.beschrijving ?? ""
            materialenRaw = (bestaand.materialen ?? []).joined(separator: ", ")
            gekozenBibliotheekId = bestaand.activiteitId
        }
    }

    private func kiesUitBibliotheek(_ item: BibliotheekActiviteit) {
        naam = item.naam
        if let beschrijvingItem = item.beschrijving, !beschrijvingItem.isEmpty { beschrijving = beschrijvingItem }
        if let materialen = item.materialen, !materialen.isEmpty { materialenRaw = materialen.joined(separator: ", ") }
        gekozenBibliotheekId = item.id
        bron = .handmatig
    }

    private func verwerkFoto(_ item: PhotosPickerItem?) async {
        guard let item, let data = try? await item.loadTransferable(type: Data.self) else { return }
        nieuweFotoData = data
        if let uiImage = UIImage(data: data) { fotoPreview = Image(uiImage: uiImage) }
    }

    private func opslaan() async {
        bezig = true
        defer { bezig = false }
        let materialen = materialenRaw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        let naamGetrimd = naam.trimmingCharacters(in: .whitespaces)
        do {
            let planning = try await WeekplanningenService.zorgVoorPlanning(
                bestaand: context.planning, locatieNaam: context.locatieNaam, weekStart: context.weekStart,
                groepId: context.groepId, thema: "", aangemaaktDoor: context.profielId
            )
            try await WeekplanningenService.slaActiviteitOp(
                planningId: planning.id,
                bestaand: context.bestaand,
                type: context.type,
                naam: naamGetrimd,
                beschrijving: beschrijving.isEmpty ? nil : beschrijving,
                materialen: materialen,
                activiteitId: gekozenBibliotheekId,
                afbeelding: nieuweFotoData,
                huidigeAfbeeldingUrl: context.bestaand?.afbeeldingUrl
            )
            onKlaar()
        } catch {
            foutmelding = "Opslaan is niet gelukt. Probeer het opnieuw."
        }
    }
}

// ─── Groepen beheren ────────────────────────────────────────────────────────

private struct WeekGroepenBeheerView: View {
    @Environment(\.dismiss) private var dismiss
    let locatieNaam: String
    let groepen: [WeekGroep]
    let profielId: String?
    /// Geeft het id van een verwijderde groep door, zodat de lijst erachter kan
    /// terugvallen op "Algemeen".
    let onGewijzigd: (String?) -> Void

    @State private var lokaleGroepen: [WeekGroep] = []
    @State private var nieuweNaam = ""
    @State private var hernoemGroep: WeekGroep?
    @State private var hernoemNaam = ""
    @State private var teVerwijderen: WeekGroep?
    @State private var foutmelding: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Elke groep heeft haar eigen weekactiviteiten en thema, bijvoorbeeld een 4+ en een 8+ groep. De planning onder \"Algemeen\" blijft bestaan voor de hele locatie.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section("Groepen — \(locatieNaam)") {
                    if lokaleGroepen.isEmpty {
                        Text("Nog geen groepen voor deze locatie.").foregroundStyle(.secondary)
                    }
                    ForEach(lokaleGroepen) { groep in
                        HStack {
                            Text(groep.naam)
                            Spacer()
                            Button("Hernoemen") {
                                hernoemGroep = groep
                                hernoemNaam = groep.naam
                            }
                            .font(.subheadline)
                        }
                        .swipeActions {
                            Button("Verwijderen", role: .destructive) { teVerwijderen = groep }
                        }
                    }
                }

                Section("Nieuwe groep") {
                    TextField("Bijv. 4+ of 8+", text: $nieuweNaam)
                    Button("Groep toevoegen") { Task { await voegToe() } }
                        .disabled(nieuweNaam.trimmingCharacters(in: .whitespaces).isEmpty)
                }

                if let foutmelding {
                    Section { Text(foutmelding).font(.caption).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Groepen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Klaar") { dismiss() } }
            }
            .alert("Groep hernoemen", isPresented: Binding(get: { hernoemGroep != nil }, set: { if !$0 { hernoemGroep = nil } })) {
                TextField("Naam", text: $hernoemNaam)
                Button("Opslaan") { Task { await hernoem() } }
                Button("Annuleren", role: .cancel) { hernoemGroep = nil }
            }
            .alert("Groep verwijderen?", isPresented: Binding(get: { teVerwijderen != nil }, set: { if !$0 { teVerwijderen = nil } })) {
                Button("Verwijderen", role: .destructive) { Task { await verwijder() } }
                Button("Annuleren", role: .cancel) { teVerwijderen = nil }
            } message: {
                Text("Alle weekplanningen van \"\(teVerwijderen?.naam ?? "")\" gaan verloren.")
            }
        }
        .onAppear { lokaleGroepen = groepen }
    }

    private func voegToe() async {
        let naam = nieuweNaam.trimmingCharacters(in: .whitespaces)
        guard !naam.isEmpty else { return }
        do {
            let groep = try await WeekplanningenService.maakGroep(locatieNaam: locatieNaam, naam: naam, volgorde: lokaleGroepen.count, aangemaaktDoor: profielId)
            lokaleGroepen.append(groep)
            nieuweNaam = ""
            foutmelding = nil
            onGewijzigd(nil)
        } catch {
            foutmelding = "Toevoegen mislukt — bestaat deze naam al?"
        }
    }

    private func hernoem() async {
        guard let groep = hernoemGroep else { return }
        let naam = hernoemNaam.trimmingCharacters(in: .whitespaces)
        hernoemGroep = nil
        guard !naam.isEmpty, naam != groep.naam else { return }
        do {
            try await WeekplanningenService.hernoemGroep(id: groep.id, naam: naam)
            if let index = lokaleGroepen.firstIndex(where: { $0.id == groep.id }) {
                lokaleGroepen[index].naam = naam
            }
            foutmelding = nil
            onGewijzigd(nil)
        } catch {
            foutmelding = "Hernoemen mislukt — bestaat deze naam al?"
        }
    }

    private func verwijder() async {
        guard let groep = teVerwijderen else { return }
        teVerwijderen = nil
        try? await WeekplanningenService.verwijderGroep(id: groep.id)
        lokaleGroepen.removeAll { $0.id == groep.id }
        onGewijzigd(groep.id)
    }
}
