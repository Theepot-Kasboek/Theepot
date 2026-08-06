package nl.bsodetheepot.mobile.ui.screens.dashboard.widgets

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenDonker

/** Dagen tot de 1e van de volgende maand — de vaste kasboek-deadline. */
@Composable
fun KasboekWidget(dagenTotDeadline: Int?) {
    if (dagenTotDeadline == null) {
        CircularProgressIndicator(modifier = Modifier.size(20.dp))
        return
    }
    val kleur = when {
        dagenTotDeadline <= 3 -> Color(0xFFEF4444)
        dagenTotDeadline <= 7 -> Color(0xFFF59E0B)
        else -> TheepotGroenDonker
    }
    Row(verticalAlignment = Alignment.Bottom) {
        Text("$dagenTotDeadline", style = MaterialTheme.typography.headlineMedium, color = kleur)
        Text(
            if (dagenTotDeadline == 1) " dag te gaan" else " dagen te gaan",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
