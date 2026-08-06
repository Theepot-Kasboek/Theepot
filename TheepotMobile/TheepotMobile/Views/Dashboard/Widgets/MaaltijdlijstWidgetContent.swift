import SwiftUI

/// `nil` = geen toegankelijke locatie met maaltijdlijst; lege lijst = niemand
/// vandaag aanwezig, weekend, of nog geen week aangemaakt voor die locatie.
struct MaaltijdlijstWidgetContent: View {
    let namen: [String]?

    var body: some View {
        if let namen {
            if namen.isEmpty {
                Text(isWeekend ? "Geen meeneemdag in het weekend" : "Niemand eet vandaag mee")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(namen.count)")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(Color.theepotGroenDonker)
                        + Text(" eet vandaag mee")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                    Text(namen.joined(separator: ", "))
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
        } else {
            Text("Geen toegang")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
        }
    }

    private var isWeekend: Bool {
        Dag.vanWeekdag(Date()) == nil
    }
}
