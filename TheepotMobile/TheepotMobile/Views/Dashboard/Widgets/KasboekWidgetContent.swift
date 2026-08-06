import SwiftUI

/// Dagen tot de 1e van de volgende maand — de vaste kasboek-deadline.
struct KasboekWidgetContent: View {
    let dagenTotDeadline: Int?

    var body: some View {
        if let dagenTotDeadline {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(dagenTotDeadline)")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(kleur)
                Text(dagenTotDeadline == 1 ? "dag te gaan" : "dagen te gaan")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            }
        } else {
            ProgressView()
        }
    }

    private var kleur: Color {
        guard let dagenTotDeadline else { return .primary }
        if dagenTotDeadline <= 3 { return Color(hex: "EF4444") }
        if dagenTotDeadline <= 7 { return Color(hex: "F59E0B") }
        return .theepotGroenDonker
    }
}
