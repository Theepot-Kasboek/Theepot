package nl.bsodetheepot.mobile.ui.screens.dashboard.widgets

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.style.TextOverflow
import nl.bsodetheepot.mobile.data.models.Dag
import nl.bsodetheepot.mobile.data.services.DateUtils
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenDonker

/**
 * `null` = geen toegankelijke locatie met maaltijdlijst; lege lijst = niemand
 * vandaag aanwezig, weekend, of nog geen week aangemaakt voor die locatie.
 */
@Composable
fun MaaltijdlijstWidget(namen: List<String>?) {
    if (namen == null) {
        Text("Geen toegang", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    if (namen.isEmpty()) {
        val isWeekend = Dag.vanWeekdag(DateUtils.vandaag()) == null
        Text(
            if (isWeekend) "Geen meeneemdag in het weekend" else "Niemand eet vandaag mee",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        return
    }
    Column {
        Row(verticalAlignment = Alignment.Bottom) {
            Text("${namen.size}", style = MaterialTheme.typography.headlineMedium, color = TheepotGroenDonker)
            Text(" eet vandaag mee", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(
            namen.joinToString(", "),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
