import SwiftUI
import PhotosUI
import Supabase

struct ChatDetailView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var meldingRouter: MeldingRouter
    let gesprek: ChatGesprek

    @State private var berichten: [ChatBericht] = []
    @State private var nieuwBericht = ""
    @State private var fotoItem: PhotosPickerItem?
    @State private var bezig = false
    @State private var channel: RealtimeChannelV2?

    var body: some View {
        VStack {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        ForEach(berichten) { bericht in
                            ChatBerichtRow(bericht: bericht, isEigen: bericht.afzenderId == session.profiel?.id.uuidString.lowercased())
                                .id(bericht.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: berichten) { _, nieuw in
                    if let laatste = nieuw.last {
                        withAnimation { proxy.scrollTo(laatste.id, anchor: .bottom) }
                    }
                }
            }

            HStack(spacing: 10) {
                PhotosPicker(selection: $fotoItem, matching: .any(of: [.images])) {
                    Image(systemName: "paperclip")
                        .foregroundStyle(Color.theepotGroenDonker)
                }
                TextField("Bericht...", text: $nieuwBericht, axis: .vertical)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(.secondarySystemBackground), in: Capsule())
                Button {
                    Task { await verstuur() }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Color.theepotGroen)
                }
                .disabled(nieuwBericht.trimmingCharacters(in: .whitespaces).isEmpty || bezig)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial)
        }
        .navigationTitle(gesprek.naam)
        .navigationBarTitleDisplayMode(.inline)
        .theepotAchtergrond()
        .task {
            meldingRouter.actiefGesprekId = gesprek.id
            await laad()
            channel = ChatService.abonneerOpBerichten(gesprekId: gesprek.id) {
                Task { await laad() }
            }
        }
        .onDisappear {
            if meldingRouter.actiefGesprekId == gesprek.id { meldingRouter.actiefGesprekId = nil }
            Task { await channel?.unsubscribe() }
        }
        .onChange(of: fotoItem) { _, item in
            Task { await verstuurFoto(item) }
        }
    }

    private func laad() async {
        berichten = (try? await ChatService.berichten(gesprekId: gesprek.id)) ?? []
        guard let profielId = session.profiel?.id.uuidString.lowercased() else { return }
        var werdOngelezenBerichtGelezen = false
        for bericht in berichten where bericht.afzenderId != profielId && !(bericht.gelezenDoor ?? []).contains(profielId) {
            try? await ChatService.markeerGelezen(bericht: bericht, profielId: profielId)
            werdOngelezenBerichtGelezen = true
        }
        // Alleen de badge verversen als er ook echt iets als gelezen is gemarkeerd
        // (anders draait dit onnodig bij elke realtime-update in dit gesprek).
        if werdOngelezenBerichtGelezen {
            await PushService.shared.werkBadgeBij(profielId: profielId)
        }
    }

    private func verstuur() async {
        guard let profielId = session.profiel?.id.uuidString.lowercased() else { return }
        let tekst = nieuwBericht.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !tekst.isEmpty else { return }
        bezig = true
        defer { bezig = false }
        nieuwBericht = ""
        try? await ChatService.verstuurTekst(gesprekId: gesprek.id, afzenderId: profielId, tekst: tekst)
        await laad()
    }

    private func verstuurFoto(_ item: PhotosPickerItem?) async {
        guard let item, let profielId = session.profiel?.id.uuidString.lowercased() else { return }
        guard let data = try? await item.loadTransferable(type: Data.self) else { return }
        bezig = true
        defer { bezig = false; fotoItem = nil }
        try? await ChatService.verstuurBestand(gesprekId: gesprek.id, afzenderId: profielId, data: data, bestandsnaam: "foto_\(Int(Date().timeIntervalSince1970)).jpg", mimeType: "image/jpeg")
        await laad()
    }
}

private struct ChatBerichtRow: View {
    let bericht: ChatBericht
    let isEigen: Bool

    var body: some View {
        HStack {
            if isEigen { Spacer() }
            VStack(alignment: isEigen ? .trailing : .leading, spacing: 2) {
                if bericht.isBestand {
                    Label(bericht.bestandNaam ?? "Bestand", systemImage: "paperclip")
                        .font(.subheadline)
                } else {
                    Text(bericht.inhoud)
                }
                if isEigen && (bericht.gelezenDoor?.count ?? 0) > 1 {
                    Text("Gelezen").font(.caption2).foregroundStyle(.secondary)
                }
            }
            .padding(10)
            .background(isEigen ? Color.theepotGroen.opacity(0.22) : Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            if !isEigen { Spacer() }
        }
    }
}
