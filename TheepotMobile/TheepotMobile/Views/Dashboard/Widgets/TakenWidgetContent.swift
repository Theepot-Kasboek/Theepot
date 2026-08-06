import SwiftUI

struct TakenWidgetContent: View {
    let aantal: Int?

    var body: some View {
        if let aantal {
            if aantal == 0 {
                Text("Geen open taken")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            } else {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(aantal)")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(Color.theepotGroenDonker)
                    Text(aantal == 1 ? "open taak" : "open taken")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
            }
        } else {
            ProgressView()
        }
    }
}
