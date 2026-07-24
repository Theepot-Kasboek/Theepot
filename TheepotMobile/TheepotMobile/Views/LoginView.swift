import SwiftUI

struct LoginView: View {
    @EnvironmentObject var session: SessionStore
    @State private var email = ""
    @State private var wachtwoord = ""
    @FocusState private var focus: Veld?

    private enum Veld { case email, wachtwoord }

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                VStack(spacing: 14) {
                    Image("Logo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 96, height: 96)
                        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                        .shadow(color: Color.theepotGroenDonkerder.opacity(0.25), radius: 14, x: 0, y: 8)

                    VStack(spacing: 2) {
                        Text("De Theepot")
                            .font(.title2.bold())
                        Text("Kinderopvang")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.top, 32)

                VStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("E-mail")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        TextField("naam@bsodetheepot.nl", text: $email)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.emailAddress)
                            .focused($focus, equals: .email)
                            .submitLabel(.next)
                            .onSubmit { focus = .wachtwoord }
                            .padding(12)
                            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Wachtwoord")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        SecureField("••••••••", text: $wachtwoord)
                            .focused($focus, equals: .wachtwoord)
                            .submitLabel(.go)
                            .onSubmit { Task { await session.signIn(email: email, password: wachtwoord) } }
                            .padding(12)
                            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
                .theepotGlasKaart(hoekradius: 20, padding: 16)

                if let error = session.errorMessage {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    focus = nil
                    Task { await session.signIn(email: email, password: wachtwoord) }
                } label: {
                    if session.isLoading {
                        ProgressView().tint(.white)
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Inloggen")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(.vertical, 4)
                .buttonStyle(.borderedProminent)
                .tint(.theepotGroen)
                .controlSize(.large)
                .disabled(email.isEmpty || wachtwoord.isEmpty || session.isLoading)
            }
            .padding(24)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
        .theepotAchtergrond()
        .scrollDismissesKeyboard(.interactively)
    }
}
