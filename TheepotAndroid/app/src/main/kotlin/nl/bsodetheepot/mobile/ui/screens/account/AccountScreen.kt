package nl.bsodetheepot.mobile.ui.screens.account

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.theme.TheepotLogo

/** Profiel + uitloggen — spiegelt het account-gedeelte van MeerView in DashboardView.swift. */
@Composable
fun AccountScreen(session: SessionViewModel) {
    val profiel by session.profiel.collectAsState()

    Scaffold(topBar = { TopAppBar(title = { Text("Account") }) }) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                TheepotLogo(grootte = 48)
                Column {
                    Text(profiel?.naam ?: "", style = MaterialTheme.typography.titleMedium)
                    Text(profiel?.rol?.label ?: "", style = MaterialTheme.typography.bodySmall)
                }
            }

            Spacer(Modifier.padding(12.dp))

            Text(profiel?.email ?: "", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.padding(4.dp))
            OutlinedButton(onClick = { session.signOut() }) {
                Text("Uitloggen", color = MaterialTheme.colorScheme.error)
            }
        }
    }
}
