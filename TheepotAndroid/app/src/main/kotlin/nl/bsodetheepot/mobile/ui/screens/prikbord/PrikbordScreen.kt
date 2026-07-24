package nl.bsodetheepot.mobile.ui.screens.prikbord

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
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
import nl.bsodetheepot.mobile.data.models.Locatie
import nl.bsodetheepot.mobile.data.models.LocatieService
import nl.bsodetheepot.mobile.data.models.PrikbordBericht
import nl.bsodetheepot.mobile.data.models.PrikbordPrioriteit
import nl.bsodetheepot.mobile.data.services.PrikbordService
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.components.DropdownVeld
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenDonker

@Composable
fun PrikbordScreen(session: SessionViewModel) {
    var berichten by remember { mutableStateOf<List<PrikbordBericht>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var foutmelding by remember { mutableStateOf<String?>(null) }
    var toonNieuw by remember { mutableStateOf(false) }
    var bewerkBericht by remember { mutableStateOf<PrikbordBericht?>(null) }
    val scope = rememberCoroutineScope()
    val profiel by session.profiel.collectAsState()
    val rechten by session.rechten.collectAsState()

    val magToevoegen = session.isSuperadmin || rechten.prikbordToevoegen
    val magAllesBewerken = session.isSuperadmin || rechten.paginaPrikbord == nl.bsodetheepot.mobile.data.models.Toegang.BEWERKEN

    suspend fun laad() {
        isLoading = true
        try {
            berichten = PrikbordService.berichten()
            foutmelding = null
        } catch (e: Exception) {
            foutmelding = "Meldingen konden niet worden geladen."
        }
        isLoading = false
    }

    LaunchedEffect(Unit) { laad() }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Meldingen") }) },
        floatingActionButton = {
            if (magToevoegen) {
                FloatingActionButton(onClick = { toonNieuw = true }, containerColor = TheepotGroenDonker) {
                    Icon(Icons.Filled.Add, contentDescription = "Nieuwe melding")
                }
            }
        },
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            when {
                isLoading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                foutmelding != null -> Text(foutmelding.orEmpty(), Modifier.align(Alignment.Center))
                berichten.isEmpty() -> Text("Geen meldingen", Modifier.align(Alignment.Center))
                else -> LazyColumn {
                    items(berichten, key = { it.id }) { bericht ->
                        PrikbordRow(
                            bericht = bericht,
                            modifier = Modifier.clickable {
                                scope.launch {
                                    profiel?.id?.let { PrikbordService.markeerGelezen(bericht, it) }
                                }
                                if (magAllesBewerken || bericht.aangemaaktDoor == profiel?.id) {
                                    bewerkBericht = bericht
                                }
                            },
                        )
                    }
                }
            }
        }
    }

    if (toonNieuw) {
        PrikbordFormDialog(
            bestaand = null,
            session = session,
            onDismiss = { toonNieuw = false },
            onKlaar = { scope.launch { laad() } },
        )
    }
    bewerkBericht?.let { bericht ->
        PrikbordFormDialog(
            bestaand = bericht,
            session = session,
            onDismiss = { bewerkBericht = null },
            onKlaar = { scope.launch { laad() } },
        )
    }
}

@Composable
private fun PrikbordRow(bericht: PrikbordBericht, modifier: Modifier = Modifier) {
    val kleur = when (bericht.prioriteit) {
        PrikbordPrioriteit.URGENT -> Color(0xFFDC2626)
        PrikbordPrioriteit.BELANGRIJK -> Color(0xFFF97316)
        PrikbordPrioriteit.NORMAAL -> TheepotGroenDonker
    }
    Column(modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text(bericht.titel, style = MaterialTheme.typography.titleMedium)
            Box(
                modifier = Modifier
                    .background(kleur.copy(alpha = 0.15f), RoundedCornerShape(50))
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            ) {
                Text(bericht.prioriteit.label, color = kleur, style = MaterialTheme.typography.labelSmall)
            }
        }
        Text(bericht.inhoud, style = MaterialTheme.typography.bodyMedium, color = Color.Gray, maxLines = 3)
        Text("${bericht.auteurNaam} · ${bericht.locatieNaam}", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
    }
}

@Composable
private fun PrikbordFormDialog(
    bestaand: PrikbordBericht?,
    session: SessionViewModel,
    onDismiss: () -> Unit,
    onKlaar: () -> Unit,
) {
    var titel by remember { mutableStateOf(bestaand?.titel ?: "") }
    var inhoud by remember { mutableStateOf(bestaand?.inhoud ?: "") }
    var prioriteit by remember { mutableStateOf(bestaand?.prioriteit ?: PrikbordPrioriteit.NORMAAL) }
    var locatieNaam by remember { mutableStateOf(bestaand?.locatieNaam ?: "alle") }
    var locaties by remember { mutableStateOf<List<Locatie>>(emptyList()) }
    var bezig by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        locaties = runCatching { LocatieService.actieveLocaties() }.getOrDefault(emptyList())
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (bestaand == null) "Nieuwe melding" else "Melding bewerken") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = titel, onValueChange = { titel = it }, label = { Text("Titel") })
                OutlinedTextField(value = inhoud, onValueChange = { inhoud = it }, label = { Text("Inhoud") }, minLines = 3)

                DropdownVeld(
                    label = "Prioriteit",
                    huidigeTekst = prioriteit.label,
                    opties = PrikbordPrioriteit.entries.map { p -> p.label to { prioriteit = p } },
                )

                DropdownVeld(
                    label = "Locatie",
                    huidigeTekst = if (locatieNaam == "alle") "Alle locaties" else locatieNaam,
                    opties = listOf("Alle locaties" to { locatieNaam = "alle" }) +
                        locaties.map { l -> l.naam to { locatieNaam = l.naam } },
                )

                if (bestaand != null) {
                    TextButton(onClick = {
                        scope.launch {
                            runCatching { PrikbordService.verwijder(bestaand.id) }
                            onKlaar()
                            onDismiss()
                        }
                    }) {
                        Text("Verwijderen", color = MaterialTheme.colorScheme.error)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                enabled = titel.isNotBlank() && inhoud.isNotBlank() && !bezig,
                onClick = {
                    bezig = true
                    scope.launch {
                        runCatching {
                            if (bestaand != null) {
                                PrikbordService.werkBij(bestaand.id, titel, inhoud, prioriteit, locatieNaam, null)
                            } else {
                                session.profiel.value?.id?.let { profielId ->
                                    PrikbordService.maakAan(locatieNaam, titel, inhoud, prioriteit, null, profielId)
                                }
                            }
                        }
                        bezig = false
                        onKlaar()
                        onDismiss()
                    }
                },
            ) { Text("Opslaan") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuleren") } },
    )
}
