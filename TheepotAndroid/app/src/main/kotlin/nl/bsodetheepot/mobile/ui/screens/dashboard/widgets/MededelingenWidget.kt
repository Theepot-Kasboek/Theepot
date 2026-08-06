package nl.bsodetheepot.mobile.ui.screens.dashboard.widgets

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenDonker

/** `null` = nog aan het laden of geen toegang (widget wordt dan sowieso niet getoond). */
@Composable
fun MededelingenWidget(aantal: Int?) {
    if (aantal == null) {
        CircularProgressIndicator(modifier = Modifier.size(20.dp))
        return
    }
    if (aantal == 0) {
        Text("Geen nieuwe mededelingen", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    Row(verticalAlignment = Alignment.Bottom) {
        Text("$aantal", style = MaterialTheme.typography.headlineMedium, color = TheepotGroenDonker)
        Text(" ongelezen", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
