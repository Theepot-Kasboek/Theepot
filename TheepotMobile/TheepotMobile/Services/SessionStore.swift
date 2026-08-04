import Foundation
import Supabase

/// Houdt de ingelogde gebruiker (profiel + rechten + locatietoegang) bij,
/// spiegelt components/AuthProvider.tsx. Rollen: superadmin, directie,
/// leidinggevende, locatie.
@MainActor
final class SessionStore: ObservableObject {
    @Published var profiel: Profiel?
    @Published var rechten: Rechten = .geen
    @Published var locatieToegang: [LocatieToegangRow] = []
    @Published var isLoading = true
    @Published var errorMessage: String?

    var isSuperadmin: Bool { profiel?.rol == .superadmin }

    /// Spiegelt `magAllesZien` in AuthProvider.tsx: superadmin/directie/leidinggevende
    /// zien alle locaties zonder handmatige locatie_toegang.
    var magAllesZien: Bool {
        guard let rol = profiel?.rol else { return false }
        return rol == .superadmin || rol == .directie || rol == .leidinggevende
    }

    /// Toegang tot een locatie voor een gegeven module (locatie_type), bv. "kasboek",
    /// "maaltijdlijst", "weekplanningen".
    func toegang(voorLocatie locatieNaam: String, locatieType: String) -> Toegang {
        if magAllesZien { return .bewerken }
        return locatieToegang.first {
            $0.locatieType == locatieType && $0.locatieNaam == locatieNaam
        }?.toegang ?? .geen
    }

    func bootstrap() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let session = try await SupabaseManager.client.auth.session
            await loadProfiel(userId: session.user.id)
        } catch {
            profiel = nil
        }
    }

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let session = try await SupabaseManager.client.auth.signIn(email: email, password: password)
            await loadProfiel(userId: session.user.id)
        } catch {
            errorMessage = "Inloggen mislukt. Controleer je e-mail en wachtwoord."
        }
    }

    func signOut() async {
        await PushService.shared.afmelden()
        try? await SupabaseManager.client.auth.signOut()
        profiel = nil
        rechten = .geen
        locatieToegang = []
    }

    private func loadProfiel(userId: UUID) async {
        do {
            let profiel: Profiel = try await SupabaseManager.client
                .from("profielen")
                .select()
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            self.profiel = profiel

            if profiel.rol == .superadmin {
                rechten = .superadmin
                locatieToegang = []
                await registreerVoorPush(profielId: profiel.id.uuidString.lowercased())
                return
            }

            async let accountRecht: Rechten? = try? SupabaseManager.client
                .from("rechten")
                .select()
                .eq("profiel_id", value: userId)
                .single()
                .execute()
                .value

            async let rolRecht: Rechten? = try? SupabaseManager.client
                .from("rechten")
                .select()
                .eq("rol", value: profiel.rol.rawValue)
                .single()
                .execute()
                .value

            async let ltData: [LocatieToegangRow] = (try? SupabaseManager.client
                .from("locatie_toegang")
                .select()
                .eq("profiel_id", value: userId)
                .execute()
                .value) ?? []

            let (account, rol, lt) = await (accountRecht, rolRecht, ltData)
            rechten = account ?? rol ?? .geen
            locatieToegang = lt
            await registreerVoorPush(profielId: profiel.id.uuidString.lowercased())
        } catch {
            self.profiel = nil
            self.rechten = .geen
            self.errorMessage = "Profiel kon niet worden geladen."
        }
    }

    /// Ná login (niet bij appstart) vragen we toestemming voor pushmeldingen
    /// en koppelen we een eventueel al ontvangen devicetoken aan dit profiel.
    private func registreerVoorPush(profielId: String) async {
        await PushService.shared.vraagToestemmingEnRegistreer(profielId: profielId)
        // Vangt het geval op dat het devicetoken al bekend was vóór deze login
        // (bv. app-herstart); als het token nog moet binnenkomen doet
        // `PushService.ontvangenToken` de sync zelf zodra het zover is.
        await PushService.shared.syncToken(profielId: profielId)
        await PushService.shared.werkBadgeBij(profielId: profielId)
    }
}
