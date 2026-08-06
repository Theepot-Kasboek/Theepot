package nl.bsodetheepot.mobile.ui.screens.dashboard.widgets

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import nl.bsodetheepot.mobile.data.services.KilometersDashboardStatus

/** `null` status = geen enkel actief voertuig. */
@Composable
fun KilometersWidget(status: KilometersDashboardStatus?) {
    if (status == null) {
        Text("Geen voertuigen", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    Column {
        Text(status.voertuig.kenteken, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        val dagen = status.dagenTotDeadline
        if (dagen == null) {
            Text("Nog geen stand", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    if (dagen < 0) "Te laat" else "$dagen",
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color(android.graphics.Color.parseColor(status.kleurHex)),
                )
                if (dagen >= 0) {
                    Text(if (dagen == 1) " dag" else " dagen", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
