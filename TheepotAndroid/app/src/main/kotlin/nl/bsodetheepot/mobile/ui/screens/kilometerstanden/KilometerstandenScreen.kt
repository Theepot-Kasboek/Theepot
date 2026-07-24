package nl.bsodetheepot.mobile.ui.screens.kilometerstanden

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.KmVoertuig
import nl.bsodetheepot.mobile.data.services.DateUtils
import nl.bsodetheepot.mobile.data.services.KilometerstandenService
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.components.DropdownVeld

@Composable
fun KilometerstandenScreen(session: SessionViewModel, onTerug: (() -> Unit)? = null) {
    var voertuigen by remember { mutableStateOf<List<KmVoertuig>>(emptyList()) }
    var gekozenVoertuig by remember { mutableStateOf<KmVoertuig?>(null) }
    var laatsteStand by remember { mutableStateOf<Int?>(null) }
    var nieuweStand by remember { mutableStateOf("") }
    var datum by remember { mutableStateOf(DateUtils.toDateStr(DateUtils.vandaag())) }
    var notitie by remember { mutableStateOf("") }
    var foutmelding by remember { mutableStateOf<String?>(null) }
    var succesmelding by remember { mutableStateOf<String?>(null) }
    var bezig by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val profiel by session.profiel.collectAsState()

    LaunchedEffect(Unit) {
        voertuigen = runCatching { KilometerstandenService.voertuigen() }.getOrDefault(emptyList())
        gekozenVoertuig = voertuigen.firstOrNull()
    }

    LaunchedEffect(gekozenVoertuig) {
        laatsteStand = gekozenVoertuig?.let { runCatching { KilometerstandenService.laatsteStand(it.id) }.getOrNull() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Kilometerstanden") },
                navigationIcon = {
                    onTerug?.let {
                        IconButton(onClick = it) { Icon(Icons.Filled.ArrowBack, contentDescription = "Terug") }
                    }
                },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            DropdownVeld(
                label = "Voertuig",
                huidigeTekst = gekozenVoertuig?.label ?: "",
                opties = voertuigen.map { v -> v.label to { gekozenVoertuig = v } },
            )
            Text(
                laatsteStand?.let { "Laatste bekende stand: $it km" } ?: "Nog geen registraties bekend",
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray,
            )

            Text("Nieuwe stand", style = MaterialTheme.typography.titleSmall)
            OutlinedTextField(
                value = nieuweStand,
                onValueChange = { nieuweStand = it.filter { c -> c.isDigit() } },
                label = { Text("Kilometerstand") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = datum,
                onValueChange = { datum = it },
                label = { Text("Datum (jjjj-mm-dd)") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = notitie,
                onValueChange = { notitie = it },
                label = { Text("Notitie (optioneel)") },
                modifier = Modifier.fillMaxWidth(),
            )

            foutmelding?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            succesmelding?.let { Text(it, color = androidx.compose.ui.graphics.Color(0xFF2E7D32), style = MaterialTheme.typography.bodySmall) }

            Button(
                enabled = gekozenVoertuig != null && nieuweStand.isNotBlank() && !bezig,
                onClick = {
                    val voertuig = gekozenVoertuig ?: return@Button
                    val standInt = nieuweStand.toIntOrNull() ?: return@Button
                    bezig = true
                    foutmelding = null
                    succesmelding = null
                    scope.launch {
                        runCatching {
                            KilometerstandenService.voegToe(voertuig.id, standInt, datum, notitie.ifBlank { null }, profiel?.id)
                        }.onSuccess {
                            succesmelding = "Stand opgeslagen."
                            nieuweStand = ""
                            notitie = ""
                            laatsteStand = runCatching { KilometerstandenService.laatsteStand(voertuig.id) }.getOrNull()
                        }.onFailure { e ->
                            foutmelding = e.message ?: "Opslaan mislukt."
                        }
                        bezig = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Opslaan") }
        }
    }
}
