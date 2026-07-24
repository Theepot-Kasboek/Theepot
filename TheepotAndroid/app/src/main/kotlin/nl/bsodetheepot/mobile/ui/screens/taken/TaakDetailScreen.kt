package nl.bsodetheepot.mobile.ui.screens.taken

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.Prioriteit
import nl.bsodetheepot.mobile.data.models.TodoTaak
import nl.bsodetheepot.mobile.data.services.DateUtils
import nl.bsodetheepot.mobile.data.services.TakenService
import nl.bsodetheepot.mobile.ui.components.DropdownVeld

@Composable
fun TaakDetailScreen(taak: TodoTaak, onTerug: () -> Unit) {
    var titel by remember { mutableStateOf(taak.titel) }
    var notitie by remember { mutableStateOf(taak.notitie ?: "") }
    var prioriteit by remember { mutableStateOf(taak.prioriteitEnum) }
    var heeftVervaldatum by remember { mutableStateOf(taak.vervaldatum != null) }
    var vervaldatum by remember { mutableStateOf(taak.vervaldatum ?: DateUtils.toDateStr(DateUtils.vandaag())) }
    val scope = rememberCoroutineScope()

    suspend fun slaOp() {
        runCatching { TakenService.werkTitelNotitieBij(taak.id, titel.ifBlank { taak.titel }, notitie.ifBlank { null }) }
    }

    DisposableEffect(Unit) {
        onDispose { scope.launch { slaOp() } }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Taak") },
                navigationIcon = { IconButton(onClick = { scope.launch { slaOp() }; onTerug() }) { Icon(Icons.Filled.ArrowBack, contentDescription = "Terug") } },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedTextField(
                value = titel,
                onValueChange = { titel = it },
                label = { Text("Titel") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = notitie,
                onValueChange = { notitie = it },
                label = { Text("Notitie") },
                minLines = 4,
                modifier = Modifier.fillMaxWidth(),
            )

            DropdownVeld(
                label = "Prioriteit",
                huidigeTekst = prioriteit.label,
                opties = Prioriteit.entries.map { p ->
                    p.label to {
                        prioriteit = p
                        scope.launch { runCatching { TakenService.werkPrioriteitBij(taak.id, p.waarde) } }
                    }
                },
            )

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text("Vervaldatum")
                Switch(
                    checked = heeftVervaldatum,
                    onCheckedChange = { aan ->
                        heeftVervaldatum = aan
                        scope.launch {
                            runCatching { TakenService.werkVervaldatumBij(taak.id, if (aan) vervaldatum else null) }
                        }
                    },
                )
            }
            if (heeftVervaldatum) {
                OutlinedTextField(
                    value = vervaldatum,
                    onValueChange = {
                        vervaldatum = it
                        scope.launch { runCatching { TakenService.werkVervaldatumBij(taak.id, it) } }
                    },
                    label = { Text("Datum (jjjj-mm-dd)") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            TextButton(onClick = {
                scope.launch {
                    runCatching { TakenService.verwijderTaak(taak.id) }
                    onTerug()
                }
            }) {
                Text("Verwijderen", color = MaterialTheme.colorScheme.error)
            }
        }
    }
}
