import SwiftUI

/// `nil` = nog aan het laden of geen toegang (widget wordt dan sowieso niet
/// getoond door DashboardHomeView), `0` = geen ongelezen berichten.
struct MededelingenWidgetContent: View {
    let aantal: Int?

    var body: some View {
        if let aantal {
            if aantal == 0 {
                Text("Geen nieuwe mededelingen")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            } else {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(aantal)")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(Color.theepotGroenDonker)
                    Text(aantal == 1 ? "ongelezen" : "ongelezen")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
            }
        } else {
            ProgressView()
        }
    }
}
