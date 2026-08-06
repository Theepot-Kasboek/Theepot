package nl.bsodetheepot.mobile.ui.screens.agenda

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.ui.unit.IntrinsicSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
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
import androidx.compose.ui.window.Dialog
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.AgendaAfspraak
import nl.bsodetheepot.mobile.data.models.AgendaHerinneringOptie
import nl.bsodetheepot.mobile.data.models.AgendaKalender
import nl.bsodetheepot.mobile.data.models.Toegang
import nl.bsodetheepot.mobile.data.push.MeldingRouter
import nl.bsodetheepot.mobile.data.services.AgendaService
import nl.bsodetheepot.mobile.data.services.DateUtils
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.components.DropdownVeld
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenDonker
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/**
 * Spiegelt app/agenda/page.tsx (lijstweergave — geen maand/week/dag-grid,
 * dat past niet goed op een telefoonscherm). Toont aankomende afspraken uit
 * alle zichtbare kalenders, gegroepeerd per dag.
 */
@Composable
fun AgendaScreen(session: SessionViewModel) {
    var kalenders by remember { mutableStateOf<List<AgendaKalender>>(emptyList()) }
    var afspraken by remember { mutableStateOf<List<AgendaAfspraak>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var foutmelding by remember { mutableStateOf<String?>(null) }
    var toonNieuw by remember { mutableStateOf(false) }
    var bewerkAfspraak by remember { mutableStateOf<AgendaAfspraak?>(null) }
    val scope = rememberCoroutineScope()
    val profiel by session.profiel.collectAsState()
    val rechten by session.rechten.collectAsState()
    val gewenstAfspraakId by MeldingRouter.gewenstAfspraakId.collectAsState()

    val magZien = session.isSuperadmin || rechten.paginaAgenda == Toegang.LEZEN || rechten.paginaAgenda == Toegang.BEWERKEN
    val magBewerken = session.isSuperadmin || rechten.paginaAgenda == Toegang.BEWERKEN
    val magAllePersoonlijkZien = session.magAllesZien && (session.isSuperadmin || rechten.agendaPersoneelInzien)
    val magAlgemeenBewerken = session.isSuperadmin || rechten.agendaAlgemeenBewerken

    val bewerkbareKalenders = kalenders.filter { it.eigenaarId == profiel?.id || (it.type == "algemeen" && magAlgemeenBewerken) }
    val eigenKalender = kalenders.firstOrNull { it.isPersoonlijk && it.eigenaarId == profiel?.id }

    suspend fun laad() {
        val profielId = profiel?.id ?: return
        isLoading = true
        try {
            kalenders = AgendaService.kalenders(profielId, session.magAllesZien, magAllePersoonlijkZien)
            afspraken = AgendaService.afspraken(kalenders.map { it.id })
            foutmelding = null
        } catch (e: Exception) {
            foutmelding = "Agenda kon niet worden geladen."
        }
        isLoading = false
    }

    LaunchedEffect(Unit) { if (magZien) laad() }

    LaunchedEffect(gewenstAfspraakId) {
        val afspraakId = gewenstAfspraakId ?: return@LaunchedEffect
        afspraken.firstOrNull { it.id == afspraakId }?.let { afspraak ->
            if (magBewerken && bewerkbareKalenders.any { it.id == afspraak.kalenderId }) {
                bewerkAfspraak = afspraak
            }
        }
        MeldingRouter.verwerktAfspraak()
    }

    val vandaag = DateUtils.vandaag()
    val komende = afspraken
        .filter { (it.startInstant ?: Instant.MIN).atZone(DateUtils.amsterdam).toLocalDate() >= vandaag }
        .sortedBy { it.startInstant }
    val gegroepeerd = komende.groupBy { (it.startInstant ?: Instant.now()).atZone(DateUtils.amsterdam).toLocalDate() }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Agenda") }) },
        floatingActionButton = {
            if (magZien && magBewerken) {
                FloatingActionButton(onClick = { toonNieuw = true }, containerColor = TheepotGroenDonker) {
                    Icon(Icons.Filled.Add, contentDescription = "Nieuwe afspraak")
                }
            }
        },
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            when {
                !magZien -> Text("Je hebt geen toegang tot de agenda.", Modifier.align(Alignment.Center).padding(24.dp))
                isLoading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                foutmelding != null -> Text(foutmelding.orEmpty(), Modifier.align(Alignment.Center))
                komende.isEmpty() -> Text("Geen aankomende afspraken", Modifier.align(Alignment.Center))
                else -> LazyColumn {
                    gegroepeerd.keys.sorted().forEach { dag ->
                        item(key = "kop-$dag") { DagKop(dag) }
                        items(gegroepeerd.getValue(dag), key = { it.id }) { afspraak ->
                            AgendaRow(
                                afspraak = afspraak,
                                kalender = kalenders.firstOrNull { it.id == afspraak.kalenderId },
                                modifier = Modifier.clickable {
                                    if (magBewerken && bewerkbareKalenders.any { it.id == afspraak.kalenderId }) {
                                        bewerkAfspraak = afspraak
                                    }
                                },
                            )
                        }
                    }
                }
            }
        }
    }

    if (toonNieuw) {
        AgendaFormDialog(
            bestaand = null,
            kalenders = bewerkbareKalenders,
            standaardKalenderId = eigenKalender?.id,
            profielId = profiel?.id,
            onDismiss = { toonNieuw = false },
            onKlaar = { scope.launch { laad() } },
        )
    }
    bewerkAfspraak?.let { afspraak ->
        AgendaFormDialog(
            bestaand = afspraak,
            kalenders = bewerkbareKalenders,
            standaardKalenderId = eigenKalender?.id,
            profielId = profiel?.id,
            onDismiss = { bewerkAfspraak = null },
            onKlaar = { scope.launch { laad() } },
        )
    }
}

@Composable
private fun DagKop(dag: LocalDate) {
    val label = when (dag) {
        DateUtils.vandaag() -> "Vandaag"
        DateUtils.vandaag().plusDays(1) -> "Morgen"
        else -> dag.format(DateTimeFormatter.ofPattern("EEEE d MMMM", Locale("nl", "NL"))).replaceFirstChar { it.uppercase() }
    }
    Text(
        label,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

@Composable
private fun AgendaRow(afspraak: AgendaAfspraak, kalender: AgendaKalender?, modifier: Modifier = Modifier) {
    val kleur = runCatching { Color(android.graphics.Color.parseColor(kalender?.kleur ?: "#6FA832")) }.getOrDefault(TheepotGroenDonker)
    val tijdLabel = if (afspraak.heleDag) {
        "Hele dag"
    } else {
        val f = DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(Locale("nl", "NL"))
        val start = afspraak.startInstant?.atZone(DateUtils.amsterdam)?.toLocalTime()
        val eind = afspraak.eindInstant?.atZone(DateUtils.amsterdam)?.toLocalTime()
        if (start != null && eind != null) "${f.format(start)} – ${f.format(eind)}" else ""
    }

    Row(modifier = modifier.fillMaxWidth().height(IntrinsicSize.Min).padding(horizontal = 16.dp, vertical = 8.dp)) {
        Box(modifier = Modifier.width(4.dp).fillMaxHeight().background(kleur, RoundedCornerShape(2.dp)))
        Spacer(Modifier.width(12.dp))
        Column {
            Text(afspraak.titel, style = MaterialTheme.typography.titleMedium)
            Text(tijdLabel, style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
            kalender?.naam?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = Color.Gray) }
        }
    }
}

@Composable
private fun AgendaFormDialog(
    bestaand: AgendaAfspraak?,
    kalenders: List<AgendaKalender>,
    standaardKalenderId: String?,
    profielId: String?,
    onDismiss: () -> Unit,
    onKlaar: () -> Unit,
) {
    val nu = Instant.now()
    var titel by remember { mutableStateOf(bestaand?.titel ?: "") }
    var beschrijving by remember { mutableStateOf(bestaand?.beschrijving ?: "") }
    var kalenderId by remember { mutableStateOf(bestaand?.kalenderId ?: standaardKalenderId ?: kalenders.firstOrNull()?.id ?: "") }
    var heleDag by remember { mutableStateOf(bestaand?.heleDag ?: false) }
    var startDatum by remember { mutableStateOf((bestaand?.startInstant ?: nu).atZone(DateUtils.amsterdam).toLocalDate()) }
    var startTijd by remember { mutableStateOf((bestaand?.startInstant ?: nu).atZone(DateUtils.amsterdam).toLocalTime()) }
    var eindDatum by remember { mutableStateOf((bestaand?.eindInstant ?: nu.plusSeconds(3600)).atZone(DateUtils.amsterdam).toLocalDate()) }
    var eindTijd by remember { mutableStateOf((bestaand?.eindInstant ?: nu.plusSeconds(3600)).atZone(DateUtils.amsterdam).toLocalTime()) }
    var herinnering by remember { mutableStateOf(AgendaHerinneringOptie.van(bestaand?.herinneringMinuten)) }
    var bezig by remember { mutableStateOf(false) }
    var toonStartDatum by remember { mutableStateOf(false) }
    var toonStartTijd by remember { mutableStateOf(false) }
    var toonEindDatum by remember { mutableStateOf(false) }
    var toonEindTijd by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val datumFormatter = DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(Locale("nl", "NL"))
    val tijdFormatter = DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(Locale("nl", "NL"))

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (bestaand == null) "Nieuwe afspraak" else "Afspraak bewerken") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = titel, onValueChange = { titel = it }, label = { Text("Titel") })
                OutlinedTextField(value = beschrijving, onValueChange = { beschrijving = it }, label = { Text("Beschrijving") }, minLines = 2)

                if (kalenders.size > 1) {
                    DropdownVeld(
                        label = "Kalender",
                        huidigeTekst = kalenders.firstOrNull { it.id == kalenderId }?.naam ?: "",
                        opties = kalenders.map { k -> k.naam to { kalenderId = k.id } },
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Hele dag", modifier = Modifier.weight(1f))
                    Switch(checked = heleDag, onCheckedChange = { heleDag = it })
                }

                if (heleDag) {
                    OutlinedButton(onClick = { toonStartDatum = true }) { Text(startDatum.format(datumFormatter)) }
                } else {
                    Text("Begin", style = MaterialTheme.typography.labelMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { toonStartDatum = true }) { Text(startDatum.format(datumFormatter)) }
                        OutlinedButton(onClick = { toonStartTijd = true }) { Text(startTijd.format(tijdFormatter)) }
                    }
                    Text("Eind", style = MaterialTheme.typography.labelMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { toonEindDatum = true }) { Text(eindDatum.format(datumFormatter)) }
                        OutlinedButton(onClick = { toonEindTijd = true }) { Text(eindTijd.format(tijdFormatter)) }
                    }
                }

                DropdownVeld(
                    label = "Herinnering",
                    huidigeTekst = herinnering.label,
                    opties = AgendaHerinneringOptie.entries.map { o -> o.label to { herinnering = o } },
                )

                if (bestaand != null) {
                    TextButton(onClick = {
                        scope.launch {
                            runCatching { AgendaService.verwijderAfspraak(bestaand.id) }
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
                enabled = titel.isNotBlank() && kalenderId.isNotBlank() && !bezig,
                onClick = {
                    bezig = true
                    val startInstant = if (heleDag) startDatum.atStartOfDay(DateUtils.amsterdam).toInstant() else startDatum.atTime(startTijd).atZone(DateUtils.amsterdam).toInstant()
                    val eindInstant = if (heleDag) startDatum.atTime(23, 59).atZone(DateUtils.amsterdam).toInstant() else eindDatum.atTime(eindTijd).atZone(DateUtils.amsterdam).toInstant()
                    scope.launch {
                        runCatching {
                            if (bestaand != null) {
                                AgendaService.werkAfspraakBij(
                                    bestaand.id, kalenderId, titel, beschrijving.ifBlank { null },
                                    startInstant.toString(), eindInstant.toString(), heleDag, herinnering.minuten,
                                )
                            } else if (profielId != null) {
                                AgendaService.maakAfspraak(
                                    kalenderId, titel, beschrijving.ifBlank { null },
                                    startInstant.toString(), eindInstant.toString(), heleDag, herinnering.minuten, profielId,
                                )
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

    if (toonStartDatum) {
        DatumDialog(startDatum, onDismiss = { toonStartDatum = false }) { startDatum = it; toonStartDatum = false }
    }
    if (toonStartTijd) {
        TijdDialog(startTijd, onDismiss = { toonStartTijd = false }) { startTijd = it; toonStartTijd = false }
    }
    if (toonEindDatum) {
        DatumDialog(eindDatum, onDismiss = { toonEindDatum = false }) { eindDatum = it; toonEindDatum = false }
    }
    if (toonEindTijd) {
        TijdDialog(eindTijd, onDismiss = { toonEindTijd = false }) { eindTijd = it; toonEindTijd = false }
    }
}

@Composable
private fun DatumDialog(huidig: LocalDate, onDismiss: () -> Unit, onGekozen: (LocalDate) -> Unit) {
    val state = rememberDatePickerState(initialSelectedDateMillis = huidig.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli())
    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = {
                val millis = state.selectedDateMillis
                if (millis != null) onGekozen(Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate()) else onDismiss()
            }) { Text("OK") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuleren") } },
    ) { DatePicker(state = state) }
}

@Composable
private fun TijdDialog(huidig: LocalTime, onDismiss: () -> Unit, onGekozen: (LocalTime) -> Unit) {
    val state = rememberTimePickerState(initialHour = huidig.hour, initialMinute = huidig.minute, is24Hour = true)
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(28.dp))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            TimePicker(state = state)
            Row(modifier = Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onDismiss) { Text("Annuleren") }
                TextButton(onClick = { onGekozen(LocalTime.of(state.hour, state.minute)) }) { Text("OK") }
            }
        }
    }
}
