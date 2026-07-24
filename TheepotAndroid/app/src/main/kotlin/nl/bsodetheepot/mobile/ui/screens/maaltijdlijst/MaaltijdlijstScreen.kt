package nl.bsodetheepot.mobile.ui.screens.maaltijdlijst

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import nl.bsodetheepot.mobile.data.models.Dag
import nl.bsodetheepot.mobile.data.models.MaaltijdLocatie
import nl.bsodetheepot.mobile.data.models.MaaltijdRegistratie
import nl.bsodetheepot.mobile.data.models.MaaltijdStandaardKind
import nl.bsodetheepot.mobile.data.models.Toegang
import nl.bsodetheepot.mobile.data.services.DateUtils
import nl.bsodetheepot.mobile.data.services.MaaltijdlijstService
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.components.DropdownVeld
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenDonker

@Composable
fun MaaltijdlijstScreen(session: SessionViewModel, onTerug: (() -> Unit)? = null) {
    var locaties by remember { mutableStateOf<List<MaaltijdLocatie>>(emptyList()) }
    var actieveLocatie by remember { mutableStateOf<MaaltijdLocatie?>(null) }
    var weekStart by remember { mutableStateOf(DateUtils.maandaagVanWeek(DateUtils.vandaag())) }
    var registraties by remember { mutableStateOf<List<MaaltijdRegistratie>>(emptyList()) }
    var extraDialoogDag by remember { mutableStateOf<Dag?>(null) }
    var detailsRegistratie by remember { mutableStateOf<MaaltijdRegistratie?>(null) }
    var toonStandaardBeheer by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val alle = runCatching { MaaltijdlijstService.actieveLocaties() }.getOrDefault(emptyList())
        val toegankelijk = alle.filter { session.toegang(it.naam, "maaltijdlijst") != Toegang.GEEN }
        locaties = toegankelijk
        actieveLocatie = toegankelijk.firstOrNull()
    }

    suspend fun laad() {
        val loc = actieveLocatie ?: return
        registraties = runCatching { MaaltijdlijstService.registraties(loc.id, weekStart) }.getOrDefault(emptyList())
    }

    LaunchedEffect(actieveLocatie, weekStart) { laad() }

    val magBewerken = actieveLocatie?.let { session.toegang(it.naam, "maaltijdlijst") == Toegang.BEWERKEN } ?: false

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Maaltijdlijst") },
                navigationIcon = {
                    onTerug?.let {
                        IconButton(onClick = it) { Icon(Icons.Filled.ArrowBack, contentDescription = "Terug") }
                    }
                },
                actions = {
                    if (magBewerken && actieveLocatie != null) {
                        IconButton(onClick = { toonStandaardBeheer = true }) {
                            Icon(Icons.Filled.Settings, contentDescription = "Standaard kinderen")
                        }
                    }
                },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (locaties.size > 1) {
                DropdownVeld(
                    label = "Locatie",
                    huidigeTekst = actieveLocatie?.naam ?: "",
                    opties = locaties.map { l -> l.naam to { actieveLocatie = l } },
                    modifier = Modifier.padding(16.dp, 8.dp),
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center, modifier = Modifier.fillMaxWidth()) {
                IconButton(onClick = { weekStart = weekStart.minusWeeks(1) }) { Icon(Icons.Filled.ChevronLeft, contentDescription = "Vorige week") }
                Text("${DateUtils.toDateStr(weekStart)} t/m ${DateUtils.toDateStr(weekStart.plusDays(4))}", style = MaterialTheme.typography.titleSmall)
                IconButton(onClick = { weekStart = weekStart.plusWeeks(1) }) { Icon(Icons.Filled.ChevronRight, contentDescription = "Volgende week") }
            }

            LazyColumn {
                Dag.entries.forEach { dag ->
                    val vanDeDag = registraties.filter { it.dag == dag }.sortedBy { it.volgorde }
                    item {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth().padding(16.dp, 12.dp, 8.dp, 4.dp),
                        ) {
                            Text(dag.label, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                            if (magBewerken) {
                                IconButton(onClick = { extraDialoogDag = dag }) {
                                    Icon(Icons.Filled.PersonAdd, contentDescription = "Extra kind toevoegen")
                                }
                            }
                        }
                    }
                    if (vanDeDag.isEmpty()) {
                        item {
                            Text(
                                "Geen kinderen",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(16.dp, 0.dp),
                            )
                        }
                    } else {
                        items(vanDeDag, key = { it.id }) { reg ->
                            ListItem(
                                headlineContent = {
                                    Row {
                                        Text(reg.naam)
                                        if (reg.isExtra) {
                                            Text(
                                                "  extra",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = TheepotGroenDonker,
                                            )
                                        }
                                    }
                                },
                                supportingContent = {
                                    Column {
                                        Text(reg.bijzonderheden ?: "Geen bijzonderheden", style = MaterialTheme.typography.bodySmall)
                                        Text(
                                            reg.watGegeten?.let { "Gegeten: $it" } ?: "Nog niet ingevuld wat gegeten",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                },
                                leadingContent = {
                                    Icon(
                                        if (reg.aanwezig) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
                                        contentDescription = "Meegegeten",
                                        tint = if (reg.aanwezig) TheepotGroenDonker else Color.Gray,
                                        modifier = Modifier.clickable(enabled = magBewerken) {
                                            scope.launch {
                                                runCatching { MaaltijdlijstService.toggleAanwezig(reg.id, !reg.aanwezig) }
                                                laad()
                                            }
                                        },
                                    )
                                },
                                trailingContent = if (magBewerken) {
                                    {
                                        Row {
                                            IconButton(onClick = { detailsRegistratie = reg }) {
                                                Icon(Icons.Filled.Edit, contentDescription = "Bewerken")
                                            }
                                            IconButton(onClick = {
                                                scope.launch {
                                                    runCatching { MaaltijdlijstService.verwijderRegistratie(reg.id) }
                                                    laad()
                                                }
                                            }) {
                                                Icon(Icons.Filled.Delete, contentDescription = "Verwijderen")
                                            }
                                        }
                                    }
                                } else null,
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }
            }
        }
    }

    extraDialoogDag?.let { dag ->
        ExtraKindDialog(
            dag = dag,
            onDismiss = { extraDialoogDag = null },
            onOpslaan = { naam, bijzonderheden ->
                scope.launch {
                    val loc = actieveLocatie
                    if (loc != null) {
                        val weekId = runCatching { MaaltijdlijstService.weekId(loc.id, weekStart) }.getOrNull()
                        if (weekId != null) {
                            val volgorde = registraties.count { it.dag == dag }
                            runCatching { MaaltijdlijstService.voegExtraKindToe(weekId, dag, naam, bijzonderheden, volgorde) }
                        }
                    }
                    extraDialoogDag = null
                    laad()
                }
            },
        )
    }

    detailsRegistratie?.let { reg ->
        DetailsDialog(
            registratie = reg,
            onDismiss = { detailsRegistratie = null },
            onOpslaan = { bijzonderheden, watGegeten ->
                scope.launch {
                    runCatching { MaaltijdlijstService.updateDetails(reg.id, bijzonderheden, watGegeten) }
                    detailsRegistratie = null
                    laad()
                }
            },
        )
    }

    if (toonStandaardBeheer && actieveLocatie != null) {
        StandaardKinderenDialog(
            locatie = actieveLocatie!!,
            onDismiss = { toonStandaardBeheer = false },
        )
    }
}

@Composable
private fun ExtraKindDialog(dag: Dag, onDismiss: () -> Unit, onOpslaan: (String, String?) -> Unit) {
    var naam by remember { mutableStateOf("") }
    var bijzonderheden by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Extra kind — ${dag.label}") },
        text = {
            Column {
                OutlinedTextField(value = naam, onValueChange = { naam = it }, label = { Text("Naam kind") })
                Spacer(Modifier.padding(4.dp))
                OutlinedTextField(value = bijzonderheden, onValueChange = { bijzonderheden = it }, label = { Text("Bijzonderheden / allergie") })
            }
        },
        confirmButton = {
            TextButton(onClick = { if (naam.isNotBlank()) onOpslaan(naam.trim(), bijzonderheden.trim().ifBlank { null }) }, enabled = naam.isNotBlank()) {
                Text("Toevoegen")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuleren") } },
    )
}

@Composable
private fun DetailsDialog(registratie: MaaltijdRegistratie, onDismiss: () -> Unit, onOpslaan: (String?, String?) -> Unit) {
    var bijzonderheden by remember { mutableStateOf(registratie.bijzonderheden ?: "") }
    var watGegeten by remember { mutableStateOf(registratie.watGegeten ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(registratie.naam) },
        text = {
            Column {
                OutlinedTextField(value = bijzonderheden, onValueChange = { bijzonderheden = it }, label = { Text("Bijzonderheden / allergie") })
                Spacer(Modifier.padding(4.dp))
                OutlinedTextField(value = watGegeten, onValueChange = { watGegeten = it }, label = { Text("Wat gegeten?") })
            }
        },
        confirmButton = {
            TextButton(onClick = { onOpslaan(bijzonderheden.trim().ifBlank { null }, watGegeten.trim().ifBlank { null }) }) {
                Text("Opslaan")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuleren") } },
    )
}

@Composable
private fun StandaardKinderenDialog(locatie: MaaltijdLocatie, onDismiss: () -> Unit) {
    var kinderen by remember { mutableStateOf<List<MaaltijdStandaardKind>>(emptyList()) }
    var actieveDag by remember { mutableStateOf(Dag.MAANDAG) }
    var naam by remember { mutableStateOf("") }
    var bijzonderheden by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    suspend fun laad() {
        kinderen = runCatching { MaaltijdlijstService.standaardKinderen(locatie.id) }.getOrDefault(emptyList())
    }

    LaunchedEffect(Unit) { laad() }

    val vanDeDag = kinderen.filter { it.dag == actieveDag }.sortedBy { it.volgorde }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Standaard kinderen — ${locatie.naam}") },
        text = {
            Column {
                Text(
                    "Standaard kinderen worden automatisch ingevuld als je een nieuwe week opent.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.padding(4.dp))
                TabRow(selectedTabIndex = Dag.entries.indexOf(actieveDag)) {
                    Dag.entries.forEach { dag ->
                        Tab(
                            selected = actieveDag == dag,
                            onClick = { actieveDag = dag },
                            text = { Text(dag.label.take(2)) },
                        )
                    }
                }
                Spacer(Modifier.padding(4.dp))

                if (vanDeDag.isEmpty()) {
                    Text(
                        "Geen standaard kinderen voor ${actieveDag.label}.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                } else {
                    Column {
                        vanDeDag.forEach { kind ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(kind.naam, style = MaterialTheme.typography.bodyMedium)
                                    kind.bijzonderheden?.let {
                                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                IconButton(onClick = {
                                    scope.launch {
                                        runCatching { MaaltijdlijstService.verwijderStandaardKind(kind.id) }
                                        laad()
                                    }
                                }) {
                                    Icon(Icons.Filled.Delete, contentDescription = "Verwijderen")
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.padding(6.dp))
                OutlinedTextField(value = naam, onValueChange = { naam = it }, label = { Text("Naam kind") })
                Spacer(Modifier.padding(4.dp))
                OutlinedTextField(value = bijzonderheden, onValueChange = { bijzonderheden = it }, label = { Text("Bijzonderheden / allergie") })
                Spacer(Modifier.padding(4.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(
                        enabled = naam.isNotBlank(),
                        onClick = {
                            scope.launch {
                                val volgorde = vanDeDag.size
                                runCatching {
                                    MaaltijdlijstService.voegStandaardKindToe(locatie.id, naam.trim(), bijzonderheden.trim().ifBlank { null }, actieveDag, volgorde)
                                }
                                naam = ""
                                bijzonderheden = ""
                                laad()
                            }
                        },
                    ) {
                        Text("Toevoegen aan ${actieveDag.label}")
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Sluiten") } },
    )
}
