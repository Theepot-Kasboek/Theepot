import SwiftUI

/// Generieke kaart-wrapper voor een dashboard-widget: icoon + titel + eigen
/// inhoud, in de bestaande "liquid glass"-kaartstijl.
struct WidgetCard<Content: View>: View {
    let titel: String
    let icoon: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: icoon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.theepotGroenDonker)
                Text(titel)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 12))
                    .foregroundStyle(.tertiary)
                    .accessibilityLabel("Sleep om te herschikken")
            }
            content
        }
        .frame(maxWidth: .infinity, minHeight: 90, alignment: .topLeading)
        .theepotGlasKaart()
        .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}
