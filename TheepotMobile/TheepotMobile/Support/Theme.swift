import SwiftUI

/// Merkkleuren, gespiegeld op de CSS-variabelen in app/globals.css van de webapp.
extension Color {
    static let theepotGroen = Color(hex: "8CC63F")
    static let theepotGroenDonker = Color(hex: "6FA832")
    static let theepotGroenDonkerder = Color(hex: "5A9022")
    static let theepotGroenLicht = Color(hex: "EBF5D6")
    static let theepotGroenXLicht = Color(hex: "F3FAE8")
    static let theepotGroenTekst = Color(hex: "3D6B1A")

    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

/// "Liquid glass" kaartstijl: vervaagde achtergrond met een dun groen randje,
/// gebruikt voor tegels/koppen buiten standaard Lists/Forms om.
struct TheepotGlasKaart: ViewModifier {
    var hoekradius: CGFloat = 18
    var padding: CGFloat = 14

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: hoekradius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: hoekradius, style: .continuous)
                    .strokeBorder(Color.theepotGroen.opacity(0.18), lineWidth: 1)
            )
    }
}

extension View {
    func theepotGlasKaart(hoekradius: CGFloat = 18, padding: CGFloat = 14) -> some View {
        modifier(TheepotGlasKaart(hoekradius: hoekradius, padding: padding))
    }

    /// Zachte merk-achtergrond voor volledige schermen (achter Lists/Forms).
    func theepotAchtergrond() -> some View {
        background(
            LinearGradient(
                colors: [Color.theepotGroenXLicht.opacity(0.5), Color(.systemGroupedBackground)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        )
    }
}

/// Ronde app-logo, te gebruiken in headers/login.
struct TheepotLogo: View {
    var grootte: CGFloat = 56

    var body: some View {
        Image("Logo")
            .resizable()
            .scaledToFit()
            .frame(width: grootte, height: grootte)
            .clipShape(Circle())
            .overlay(Circle().strokeBorder(Color.white.opacity(0.6), lineWidth: 1.5))
            .shadow(color: .black.opacity(0.12), radius: 6, x: 0, y: 3)
    }
}
