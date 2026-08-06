package nl.bsodetheepot.mobile.ui.screens.dashboard

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DragHandle
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.Column
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenDonker
import nl.bsodetheepot.mobile.ui.theme.theepotGlasKaart

/** Generieke kaart-wrapper voor een dashboard-widget: icoon + titel + eigen inhoud. */
@Composable
fun WidgetCard(
    titel: String,
    icoon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .theepotGlasKaart()
            .clickable(onClick = onClick),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Icon(icoon, contentDescription = null, tint = TheepotGroenDonker, modifier = Modifier.width(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(titel, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
            Icon(Icons.Filled.DragHandle, contentDescription = "Sleep om te herschikken", tint = MaterialTheme.colorScheme.outline)
        }
        Spacer(Modifier.height(8.dp))
        content()
    }
}
