package nl.bsodetheepot.mobile.ui.screens.taken

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.LijstType
import nl.bsodetheepot.mobile.data.models.TodoLijst
import nl.bsodetheepot.mobile.data.models.TodoTaak
import nl.bsodetheepot.mobile.data.services.DateUtils
import nl.bsodetheepot.mobile.data.services.TakenService
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.theme.TheepotGroen

private enum class SlimmeWeergave { ALLE, VANDAAG, GEPLAND }

@Composable
fun TakenScreen(session: SessionViewModel) {
    var lijsten by remember { mutableStateOf<List<TodoLijst>>(emptyList()) }
    var taken by remember { mutableStateOf<List<TodoTaak>>(emptyList()) }
    var gekozenLijst by remember { mutableStateOf<TodoLijst?>(null) }
    var slimmeWeergave by remember { mutableStateOf<SlimmeWeergave?>(SlimmeWeergave.ALLE) }
    var toonVoltooide by remember { mutableStateOf(false) }
    var nieuweTaakTitel by remember { mutableStateOf("") }
    var openNotitieMap by remember { mutableStateOf<TodoLijst?>(null) }
    var openTaak by remember { mutableStateOf<TodoTaak?>(null) }
    val profiel by session.profiel.collectAsState()
    val scope = rememberCoroutineScope()

    suspend fun laad() {
        val eigenaarId = profiel?.id ?: return
        lijsten = runCatching { TakenService.lijsten(eigenaarId) }.getOrDefault(emptyList())
        val takenLijstIds = lijsten.filter { it.type == LijstType.TAKEN }.map { it.id }
        taken = runCatching { TakenService.taken(takenLijstIds) }.getOrDefault(emptyList())
    }

    LaunchedEffect(profiel?.id) { laad() }

    openTaak?.let { taak ->
        TaakDetailScreen(taak = taak, onTerug = { openTaak = null; scope.launch { laad() } })
        return
    }
    openNotitieMap?.let { map ->
        NotitieMapScreen(lijst = map, onTerug = { openNotitieMap = null })
        return
    }

    val takenLijsten = lijsten.filter { it.type == LijstType.TAKEN }
    val notitieMappen = lijsten.filter { it.type == LijstType.NOTITIES }

    val gefilterd = taken.filter { taak ->
        val basis = when {
            gekozenLijst != null -> taak.lijstId == gekozenLijst!!.id
            slimmeWeergave == SlimmeWeergave.VANDAAG -> taak.isVandaag
            slimmeWeergave == SlimmeWeergave.GEPLAND -> taak.vervaldatum != null
            else -> true
        }
        basis && (toonVoltooide || !taak.voltooid)
    }.sortedWith(
        compareBy<TodoTaak> { it.voltooid }
            .thenByDescending { it.prioriteit }
            .thenBy { it.volgorde },
    )

    Scaffold(topBar = { TopAppBar(title = { Text("Taken") }) }) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).fillMaxSize()) {
            item {
                Text("Slimme weergaves", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 4.dp))
            }
            items(listOf(SlimmeWeergave.ALLE to "Alle taken", SlimmeWeergave.VANDAAG to "Vandaag", SlimmeWeergave.GEPLAND to "Gepland")) { (w, label) ->
                ListItem(
                    headlineContent = { Text(label) },
                    trailingContent = { if (slimmeWeergave == w && gekozenLijst == null) Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = TheepotGroen) },
                    modifier = Modifier.clickable { slimmeWeergave = w; gekozenLijst = null },
                )
            }

            item { Divider() }
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp, 12.dp, 16.dp, 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("Takenlijsten", style = MaterialTheme.typography.titleSmall)
                    TextButton(onClick = {
                        val eigenaarId = profiel?.id ?: return@TextButton
                        scope.launch {
                            runCatching { TakenService.maakLijst("Nieuwe lijst", "#8CC63F", LijstType.TAKEN, eigenaarId, takenLijsten.size) }
                            laad()
                        }
                    }) { Text("Nieuwe lijst") }
                }
            }
            items(takenLijsten, key = { it.id }) { lijst ->
                ListItem(
                    headlineContent = { Text(lijst.naam) },
                    trailingContent = { if (gekozenLijst?.id == lijst.id) Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = TheepotGroen) },
                    modifier = Modifier.clickable { gekozenLijst = lijst; slimmeWeergave = null },
                )
            }

            item { Divider() }
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp, 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = nieuweTaakTitel,
                        onValueChange = { nieuweTaakTitel = it },
                        placeholder = { Text("Nieuwe taak...") },
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(
                        enabled = nieuweTaakTitel.isNotBlank(),
                        onClick = {
                            val doelLijst = gekozenLijst ?: takenLijsten.firstOrNull() ?: return@TextButton
                            val titel = nieuweTaakTitel
                            nieuweTaakTitel = ""
                            scope.launch {
                                val aantal = taken.count { it.lijstId == doelLijst.id }
                                runCatching { TakenService.maakTaak(doelLijst.id, titel, aantal) }
                                laad()
                            }
                        },
                    ) { Text("Toevoegen") }
                }
            }
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp, 0.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Toon voltooide taken", style = MaterialTheme.typography.bodyMedium)
                    Switch(checked = toonVoltooide, onCheckedChange = { toonVoltooide = it })
                }
            }

            items(gefilterd, key = { it.id }) { taak ->
                ListItem(
                    headlineContent = { Text(taak.titel) },
                    leadingContent = {
                        Icon(
                            if (taak.voltooid) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
                            contentDescription = "Voltooid",
                            tint = if (taak.voltooid) TheepotGroen else Color.Gray,
                            modifier = Modifier.clickable {
                                scope.launch {
                                    runCatching { TakenService.toggleVoltooid(taak.id, !taak.voltooid) }
                                    laad()
                                }
                            },
                        )
                    },
                    modifier = Modifier.clickable { openTaak = taak },
                )
            }

            item { Divider() }
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp, 12.dp, 16.dp, 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("Notitiemappen", style = MaterialTheme.typography.titleSmall)
                    TextButton(onClick = {
                        val eigenaarId = profiel?.id ?: return@TextButton
                        scope.launch {
                            runCatching { TakenService.maakLijst("Nieuwe map", "#8CC63F", LijstType.NOTITIES, eigenaarId, notitieMappen.size) }
                            laad()
                        }
                    }) { Text("Nieuwe map") }
                }
            }
            items(notitieMappen, key = { it.id }) { map ->
                ListItem(
                    headlineContent = { Text(map.naam) },
                    leadingContent = { Icon(Icons.Filled.Folder, contentDescription = null) },
                    modifier = Modifier.clickable { openNotitieMap = map },
                )
            }
        }
    }
}
