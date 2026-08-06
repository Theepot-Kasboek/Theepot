import SwiftUI

/// `nil` status = geen enkel voertuig aanwezig (of nog aan het laden — wordt
/// door DashboardHomeView opgevangen met een ProgressView tot vm klaar is;
/// hier alleen "geen voertuigen" als er echt niets is).
struct KilometersWidgetContent: View {
    let status: KilometerstandenService.KilometersDashboardStatus?

    var body: some View {
        if let status {
            VStack(alignment: .leading, spacing: 4) {
                Text(status.voertuig.kenteken)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.secondary)
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    if let dagen = status.dagenTotDeadline {
                        Text(dagen < 0 ? "Te laat" : "\(dagen)")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(Color(hex: status.kleurHex))
                        if dagen >= 0 {
                            Text(dagen == 1 ? "dag" : "dagen")
                                .font(.system(size: 13))
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        Text("Nog geen stand")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                }
            }
        } else {
            Text("Geen voertuigen")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
        }
    }
}
