import SwiftUI
import UIKit

/// Spiegelt app/evenementen/page.tsx: overzicht van evenementen met een
/// publieke aanmeldlink. Detail (aanmeldingen, velden, export) staat in
/// EvenementDetailView.swift.
struct EvenementenView: View {
    @EnvironmentObject var session: SessionStore
    @State private var evenementen: [Evenement] = []
    @State private var isLoading = true
    @State private var foutmelding: String?
    @State private var toonNieuw = false
    @State private var teVerwijderen: Evenement?
    @State private var melding: EvenementMelding?
    @State private var pad = NavigationPath()

    private var magZien: Bool {
        session.isSuperadmin || session.rechten.paginaEvenementen != .geen
    }

    private var magBewerken: Bool {
        session.isSuperadmin || session.rechten.paginaEvenementen == .bewerken
    }

    var body: some View {
        NavigationStack(path: $pad) {
            Group {
                if !magZien {
                    ContentUnavailableView("Geen toegang", systemImage: "lock", description: Text("Je hebt geen rechten voor Evenementen."))
                } else if isLoading && evenementen.isEmpty {
                    ProgressView()
                } else if let foutmelding {
                    ContentUnavailableView {
                        Label(foutmelding, systemImage: "exclamationmark.triangle")
                    } actions: {
                        Button("Opnieuw proberen") { Task { await laad() } }
                    }
                } else if evenementen.isEmpty {
                    ContentUnavailableView {
                        Label("Nog geen evenementen", systemImage: "calendar.badge.plus")
                    } description: {
                        Text("Maak je eerste evenement aan.")
                    } actions: {
                        if magBewerken {
                            Button("Nieuw evenement") { toonNieuw = true }
                                .buttonStyle(.borderedProminent)
                                .tint(.theepotGroen)
                        }
                    }
                } else {
                    lijst
                }
            }
            .theepotAchtergrond()
            .navigationTitle("Evenementen")
            .navigationDestination(for: String.self) { id in
                EvenementDetailView(evenementId: id) { await laad() }
            }
            .toolbar {
                if magBewerken {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { toonNieuw = true } label: {
                            Image(systemName: "plus.circle.fill")
                                .foregroundStyle(Color.theepotGroen)
                        }
                        .accessibilityLabel("Nieuw evenement")
                    }
                }
            }
            .sheet(isPresented: $toonNieuw) {
                EvenementFormView(bestaand: nil) { nieuw in
                    await laad()
                    melding = .succes("Evenement aangemaakt")
                    if let nieuw { pad.append(nieuw.id) }
                }
            }
            .confirmationDialog(
                "Evenement verwijderen?",
                isPresented: Binding(get: { teVerwijderen != nil }, set: { if !$0 { teVerwijderen = nil } }),
                titleVisibility: .visible,
                presenting: teVerwijderen
            ) { evenement in
                Button("Verwijderen", role: .destructive) { Task { await verwijder(evenement) } }
                Button("Annuleren", role: .cancel) {}
            } message: { _ in
                Text("Alle aanmeldingen gaan hiermee ook verloren.")
            }
            .evenementMelding($melding)
        }
        .task { if magZien { await laad() } }
    }

    private var lijst: some View {
        List {
            ForEach(evenementen) { evenement in
                NavigationLink(value: evenement.id) {
                    EvenementRij(evenement: evenement)
                }
                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                    if magBewerken {
                        Button(role: .destructive) { teVerwijderen = evenement } label: {
                            Label("Verwijderen", systemImage: "trash")
                        }
                    }
                }
                .swipeActions(edge: .leading) {
                    Button { kopieerLink(evenement) } label: {
                        Label("Kopieer link", systemImage: "link")
                    }
                    .tint(.theepotGroenDonker)
                }
                .contextMenu {
                    Button { kopieerLink(evenement) } label: {
                        Label("Kopieer aanmeldlink", systemImage: "link")
                    }
                    if let url = EvenementenService.aanmeldLink(evenementId: evenement.id) {
                        ShareLink(item: url) { Label("Deel aanmeldlink", systemImage: "square.and.arrow.up") }
                    }
                    if magBewerken {
                        Button(role: .destructive) { teVerwijderen = evenement } label: {
                            Label("Verwijderen", systemImage: "trash")
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .refreshable { await laad() }
    }

    private func laad() async {
        isLoading = true
        do {
            evenementen = try await EvenementenService.evenementen()
            foutmelding = nil
        } catch {
            foutmelding = "Evenementen konden niet worden geladen."
        }
        isLoading = false
    }

    private func kopieerLink(_ evenement: Evenement) {
        melding = EvenementLink.kopieer(evenementId: evenement.id)
    }

    private func verwijder(_ evenement: Evenement) async {
        do {
            try await EvenementenService.verwijder(id: evenement.id)
            evenementen.removeAll { $0.id == evenement.id }
            melding = .succes("Evenement verwijderd")
        } catch {
            melding = .fout("Verwijderen mislukt: \(error.localizedDescription)")
        }
    }
}

private struct EvenementRij: View {
    let evenement: Evenement

    var body: some View {
        let aantal = evenement.aantalAanmeldingen
        let badge = evenement.badge(aantal: aantal)
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(evenement.titel).font(.headline)
                Spacer(minLength: 4)
                EvenementBadgeView(badge: badge)
            }
            HStack(spacing: 4) {
                Image(systemName: "person.2")
                Text(evenement.maxAanmeldingen.map { "\(aantal) / \($0) aanmeldingen" } ?? "\(aantal) aanmeldingen")
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
            Text("Sluit op \(Tijdstempel.weergave(evenement.sluitDatum))")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }
}

struct EvenementBadgeView: View {
    let badge: EvenementBadge

    var body: some View {
        Text(badge.tekst)
            .font(.caption2.bold())
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(badge.achtergrond)
            .foregroundStyle(badge.kleur)
            .clipShape(Capsule())
    }
}

// MARK: - Aanmaken / bewerken

/// Formulier voor een nieuw evenement (zelfde velden als de "Nieuw evenement"-
/// modal in de webapp) of het bewerken van een bestaand evenement.
struct EvenementFormView: View {
    @EnvironmentObject var session: SessionStore
    @Environment(\.dismiss) private var dismiss
    let bestaand: Evenement?
    let onKlaar: (Evenement?) async -> Void

    @State private var titel = ""
    @State private var omschrijving = ""
    @State private var locatie = ""
    @State private var heeftDatum = false
    @State private var datum = Date()
    @State private var sluitOp = Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date()
    @State private var heeftMax = false
    @State private var maxTekst = ""
    @State private var bezig = false
    @State private var foutmelding: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Evenement") {
                    TextField("Titel, bijv. Jaarlijkse open dag", text: $titel)
                    TextField("Omschrijving", text: $omschrijving, axis: .vertical)
                        .lineLimit(3...8)
                    TextField("Locatie", text: $locatie)
                }
                Section {
                    Toggle("Datum evenement", isOn: $heeftDatum.animation())
                    if heeftDatum {
                        DatePicker("Datum en tijd", selection: $datum)
                    }
                }
                Section {
                    DatePicker("Sluit aanmelden op", selection: $sluitOp)
                    Toggle("Maximaal aantal aanmeldingen", isOn: $heeftMax.animation())
                    if heeftMax {
                        TextField("Aantal", text: $maxTekst)
                            .keyboardType(.numberPad)
                    }
                } header: {
                    Text("Aanmelden")
                } footer: {
                    Text(heeftMax ? "Na het maximum toont de aanmeldpagina dat het evenement vol is." : "Onbeperkt aantal aanmeldingen.")
                }
                if let foutmelding {
                    Section { Text(foutmelding).foregroundStyle(.red) }
                }
            }
            .navigationTitle(bestaand == nil ? "Nieuw evenement" : "Evenement bewerken")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleren") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(bestaand == nil ? "Aanmaken" : "Opslaan") { Task { await opslaan() } }
                        .disabled(titel.trimmingCharacters(in: .whitespaces).isEmpty || bezig)
                }
            }
        }
        .onAppear(perform: vulIn)
    }

    private func vulIn() {
        guard let bestaand else { return }
        titel = bestaand.titel
        omschrijving = bestaand.omschrijving ?? ""
        locatie = bestaand.locatie ?? ""
        if let d = bestaand.evenementDatum { heeftDatum = true; datum = d }
        if let s = bestaand.sluitDatum { sluitOp = s }
        if let m = bestaand.maxAanmeldingen { heeftMax = true; maxTekst = String(m) }
    }

    private func opslaan() async {
        let schoneTitel = titel.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !schoneTitel.isEmpty else { foutmelding = "Vul een titel in."; return }
        var max: Int?
        if heeftMax {
            guard let getal = Int(maxTekst.trimmingCharacters(in: .whitespaces)), getal >= 1 else {
                foutmelding = "Vul een geldig maximum in (1 of meer)."
                return
            }
            max = getal
        }
        func leegNaarNil(_ s: String) -> String? {
            let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
            return t.isEmpty ? nil : t
        }
        let invoer = EvenementenService.EvenementInvoer(
            titel: schoneTitel,
            omschrijving: leegNaarNil(omschrijving),
            locatie: leegNaarNil(locatie),
            datum: heeftDatum ? Tijdstempel.tekst(datum) : nil,
            sluit_aanmelden_op: Tijdstempel.tekst(sluitOp),
            max_aanmeldingen: max
        )

        bezig = true
        defer { bezig = false }
        do {
            if let bestaand {
                try await EvenementenService.werkBij(id: bestaand.id, invoer)
                await onKlaar(nil)
            } else {
                let profielId = session.profiel?.id.uuidString.lowercased() ?? ""
                let nieuw = try await EvenementenService.maakAan(invoer, aangemaaktDoor: profielId)
                dismiss()
                await onKlaar(nieuw)
                return
            }
            dismiss()
        } catch {
            foutmelding = "\(bestaand == nil ? "Aanmaken" : "Opslaan") mislukt: \(error.localizedDescription)"
        }
    }
}

// MARK: - Aanmeldlink + meldingen

enum EvenementLink {
    /// Kopieert de publieke aanmeldlink naar het klembord en geeft de melding
    /// terug die getoond moet worden.
    static func kopieer(evenementId: String) -> EvenementMelding {
        guard let url = EvenementenService.aanmeldLink(evenementId: evenementId) else {
            return .fout("Webadres van het dashboard is niet ingesteld (TheepotWebappURL in project.yml).")
        }
        UIPasteboard.general.url = url
        UIPasteboard.general.string = url.absoluteString
        return .succes("Aanmeldlink gekopieerd")
    }
}

/// Korte toast-achtige melding, het equivalent van components/Toast.tsx.
struct EvenementMelding: Equatable, Identifiable {
    let id = UUID()
    let tekst: String
    let isFout: Bool

    static func succes(_ tekst: String) -> EvenementMelding { .init(tekst: tekst, isFout: false) }
    static func fout(_ tekst: String) -> EvenementMelding { .init(tekst: tekst, isFout: true) }
}

private struct EvenementMeldingModifier: ViewModifier {
    @Binding var melding: EvenementMelding?

    func body(content: Content) -> some View {
        content
            .overlay(alignment: .top) {
                if let melding {
                    HStack(spacing: 8) {
                        Image(systemName: melding.isFout ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                            .foregroundStyle(melding.isFout ? Color.red : Color.theepotGroenDonker)
                        Text(melding.tekst)
                            .font(.subheadline.weight(.medium))
                            .multilineTextAlignment(.leading)
                    }
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(.regularMaterial, in: Capsule())
                    .shadow(color: .black.opacity(0.12), radius: 10, y: 4)
                    .padding(.top, 8)
                    .padding(.horizontal, 16)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onTapGesture { self.melding = nil }
                    .task(id: melding.id) {
                        try? await Task.sleep(nanoseconds: melding.isFout ? 4_000_000_000 : 2_200_000_000)
                        withAnimation { if self.melding?.id == melding.id { self.melding = nil } }
                    }
                }
            }
            .animation(.spring(response: 0.35, dampingFraction: 0.85), value: melding)
            .sensoryFeedback(trigger: melding) { _, nieuw in
                guard let nieuw else { return nil }
                return nieuw.isFout ? .error : .success
            }
    }
}

extension View {
    func evenementMelding(_ melding: Binding<EvenementMelding?>) -> some View {
        modifier(EvenementMeldingModifier(melding: melding))
    }
}
