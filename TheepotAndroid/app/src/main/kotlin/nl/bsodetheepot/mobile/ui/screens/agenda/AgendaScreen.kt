package nl.bsodetheepot.mobile.ui.screens.agenda

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
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
import nl.bsodetheepot.mobile.ui.theme.TheepotGroen
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenDonker
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenXLicht
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/** Weergave-modus van de Agenda, spiegelt `Weergave` uit app/agenda/page.tsx (zonder "dag"). */
private enum class AgendaWeergave { LIJST, WEEK, MAAND }

/**
 * Spiegelt app/agenda/page.tsx: lijstweergave (komende afspraken per dag) plus
 * een week- en maandgrid. Geen minuut-precieze positionering in de weekgrid —
 * afspraken staan in het uurvak van hun start_tijd, net als de webapp.
 */
@Composable
fun AgendaScreen(session: SessionViewModel) {
    var kalenders by remember { mutableStateOf<List<AgendaKalender>>(emptyList()) }
    var afspraken by remember { mutableStateOf<List<AgendaAfspraak>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var foutmelding by remember { mutableStateOf<String?>(null) }
    var toonNieuw by remember { mutableStateOf(false) }
    var bewerkAfspraak by remember { mutableStateOf<AgendaAfspraak?>(null) }
    var weergave by remember { mutableStateOf(AgendaWeergave.LIJST) }
    var huidigeDatum by remember { mutableStateOf(DateUtils.vandaag()) }
    var nieuweAfspraakStart by remember { mutableStateOf<Instant?>(null) }
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
        .filter { it.startInstant != null }
        .filter { it.startInstant!!.atZone(DateUtils.amsterdam).toLocalDate() >= vandaag }
        .sortedBy { it.startInstant }
    val gegroepeerd = komende.groupBy { it.startInstant!!.atZone(DateUtils.amsterdam).toLocalDate() }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Agenda") }) },
        floatingActionButton = {
            if (magZien && magBewerken) {
                FloatingActionButton(
                    onClick = { nieuweAfspraakStart = null; toonNieuw = true },
                    containerColor = TheepotGroenDonker,
                ) {
                    Icon(Icons.Filled.Add, contentDescription = "Nieuwe afspraak")
                }
            }
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (magZien) {
                AgendaWeergaveToggle(weergave = weergave, onWeergave = { weergave = it })
                if (weergave != AgendaWeergave.LIJST) {
                    PeriodeNavigatie(
                        label = periodeLabel(weergave, huidigeDatum),
                        onVorige = { huidigeDatum = navigeerPeriode(weergave, huidigeDatum, -1) },
                        onVolgende = { huidigeDatum = navigeerPeriode(weergave, huidigeDatum, 1) },
                        onVandaag = { huidigeDatum = DateUtils.vandaag() },
                    )
                }
            }
            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                when {
                    !magZien -> Text("Je hebt geen toegang tot de agenda.", Modifier.align(Alignment.Center).padding(24.dp))
                    isLoading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                    foutmelding != null -> Text(foutmelding.orEmpty(), Modifier.align(Alignment.Center))
                    weergave == AgendaWeergave.MAAND -> MaandGrid(
                        datum = huidigeDatum,
                        afspraken = afspraken,
                        kalenders = kalenders,
                        onDagKlik = { dag ->
                            if (magBewerken) {
                                nieuweAfspraakStart = dag.atTime(9, 0).atZone(DateUtils.amsterdam).toInstant()
                                toonNieuw = true
                            }
                        },
                        onAfspraakKlik = { afspraak ->
                            if (magBewerken && bewerkbareKalenders.any { it.id == afspraak.kalenderId }) {
                                bewerkAfspraak = afspraak
                            }
                        },
                    )
                    weergave == AgendaWeergave.WEEK -> WeekGrid(
                        datum = huidigeDatum,
                        afspraken = afspraken,
                        kalenders = kalenders,
                        onUurKlik = { dagEnUur ->
                            if (magBewerken) {
                                nieuweAfspraakStart = dagEnUur.atZone(DateUtils.amsterdam).toInstant()
                                toonNieuw = true
                            }
                        },
                        onAfspraakKlik = { afspraak ->
                            if (magBewerken && bewerkbareKalenders.any { it.id == afspraak.kalenderId }) {
                                bewerkAfspraak = afspraak
                            }
                        },
                    )
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
    }

    if (toonNieuw) {
        AgendaFormDialog(
            bestaand = null,
            kalenders = bewerkbareKalenders,
            standaardKalenderId = eigenKalender?.id,
            profielId = profiel?.id,
            voorgevuldeStart = nieuweAfspraakStart,
            onDismiss = { toonNieuw = false; nieuweAfspraakStart = null },
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

private fun periodeLabel(weergave: AgendaWeergave, datum: LocalDate): String = when (weergave) {
    AgendaWeergave.MAAND -> datum.format(DateTimeFormatter.ofPattern("LLLL yyyy", Locale("nl", "NL"))).replaceFirstChar { it.uppercase() }
    AgendaWeergave.WEEK -> {
        val ma = DateUtils.maandaagVanWeek(datum)
        val f = DateTimeFormatter.ofPattern("d MMM", Locale("nl", "NL"))
        "${ma.format(f)} – ${ma.plusDays(6).format(f)}"
    }
    AgendaWeergave.LIJST -> ""
}

private fun navigeerPeriode(weergave: AgendaWeergave, datum: LocalDate, richting: Int): LocalDate = when (weergave) {
    AgendaWeergave.MAAND -> datum.plusMonths(richting.toLong())
    AgendaWeergave.WEEK -> datum.plusWeeks(richting.toLong())
    AgendaWeergave.LIJST -> datum
}

@Composable
private fun AgendaWeergaveToggle(weergave: AgendaWeergave, onWeergave: (AgendaWeergave) -> Unit) {
    Row(
        modifier = Modifier
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp))
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        listOf(AgendaWeergave.LIJST to "Lijst", AgendaWeergave.WEEK to "Week", AgendaWeergave.MAAND to "Maand").forEach { (optie, label) ->
            val actief = optie == weergave
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (actief) TheepotGroen else Color.Transparent)
                    .clickable { onWeergave(optie) }
                    .padding(vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label,
                    color = if (actief) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = if (actief) FontWeight.Bold else FontWeight.Normal,
                )
            }
        }
    }
}

@Composable
private fun PeriodeNavigatie(label: String, onVorige: () -> Unit, onVolgende: () -> Unit, onVandaag: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onVorige) { Icon(Icons.Filled.ChevronLeft, contentDescription = "Vorige periode") }
        Text(label, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
        IconButton(onClick = onVolgende) { Icon(Icons.Filled.ChevronRight, contentDescription = "Volgende periode") }
        TextButton(onClick = onVandaag) { Text("Vandaag") }
    }
}

/** Maandgrid, mirroring `MaandWeergave` in app/agenda/page.tsx: weken op maandag, max 3 pills per dag + "+N meer". */
@Composable
private fun MaandGrid(
    datum: LocalDate,
    afspraken: List<AgendaAfspraak>,
    kalenders: List<AgendaKalender>,
    onDagKlik: (LocalDate) -> Unit,
    onAfspraakKlik: (AgendaAfspraak) -> Unit,
) {
    val vandaag = DateUtils.vandaag()
    val begin = DateUtils.startVanMaand(datum)
    val eersteDagOffset = begin.dayOfWeek.value - 1
    val cellen = buildList {
        repeat(eersteDagOffset) { add(null) }
        for (d in 0 until begin.lengthOfMonth()) add(begin.plusDays(d.toLong()))
        while (size % 7 != 0) add(null)
    }
    val afsprakenPerDag = afspraken
        .mapNotNull { a -> a.startInstant?.atZone(DateUtils.amsterdam)?.toLocalDate()?.let { it to a } }
        .groupBy({ it.first }, { it.second })

    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Row(modifier = Modifier.fillMaxWidth()) {
            listOf("Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo").forEach { label ->
                Text(
                    label,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        cellen.chunked(7).forEach { week ->
            Row(modifier = Modifier.fillMaxWidth()) {
                week.forEach { dag ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 72.dp)
                            .border(0.5.dp, MaterialTheme.colorScheme.outlineVariant)
                            .background(if (dag == vandaag) TheepotGroenXLicht else Color.Transparent)
                            .let { m -> if (dag != null) m.clickable { onDagKlik(dag) } else m }
                            .padding(4.dp),
                    ) {
                        if (dag != null) {
                            Column {
                                Box(
                                    modifier = Modifier
                                        .size(20.dp)
                                        .clip(CircleShape)
                                        .background(if (dag == vandaag) TheepotGroenDonker else Color.Transparent),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        dag.dayOfMonth.toString(),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (dag == vandaag) Color.White else MaterialTheme.colorScheme.onSurface,
                                    )
                                }
                                val vanDag = afsprakenPerDag[dag].orEmpty().sortedBy { it.startInstant }
                                vanDag.take(3).forEach { afspraak ->
                                    val kalender = kalenders.firstOrNull { it.id == afspraak.kalenderId }
                                    val kleur = runCatching { Color(android.graphics.Color.parseColor(kalender?.kleur ?: "#6FA832")) }.getOrDefault(TheepotGroenDonker)
                                    Text(
                                        afspraak.titel,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 2.dp)
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(kleur)
                                            .clickable { onAfspraakKlik(afspraak) }
                                            .padding(horizontal = 4.dp, vertical = 1.dp),
                                    )
                                }
                                if (vanDag.size > 3) {
                                    Text(
                                        "+${vanDag.size - 3} meer",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(top = 2.dp),
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Weekgrid, mirroring `WeekWeergave` in app/agenda/page.tsx: 24 uurrijen, afspraken in de cel van hun start-uur. */
@Composable
private fun WeekGrid(
    datum: LocalDate,
    afspraken: List<AgendaAfspraak>,
    kalenders: List<AgendaKalender>,
    onUurKlik: (LocalDateTime) -> Unit,
    onAfspraakKlik: (AgendaAfspraak) -> Unit,
) {
    val vandaag = DateUtils.vandaag()
    val ma = DateUtils.maandaagVanWeek(datum)
    val dagen = (0..6).map { ma.plusDays(it.toLong()) }
    val perDagEnUur = afspraken
        .mapNotNull { a -> a.startInstant?.atZone(DateUtils.amsterdam)?.let { z -> Triple(z.toLocalDate(), z.hour, a) } }
        .groupBy({ it.first to it.second }, { it.third })
    val tijdKolomBreedte = 40.dp
    val dagKolomBreedte = 110.dp
    val rijHoogte = 48.dp
    val horizontaalScrollState = rememberScrollState()

    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Spacer(Modifier.width(tijdKolomBreedte))
            Row(modifier = Modifier.horizontalScroll(horizontaalScrollState)) {
                dagen.forEach { dag ->
                    Column(
                        modifier = Modifier.width(dagKolomBreedte).padding(vertical = 4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            dag.format(DateTimeFormatter.ofPattern("EEE", Locale("nl", "NL"))).uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Box(
                            modifier = Modifier
                                .padding(top = 2.dp)
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(if (dag == vandaag) TheepotGroenDonker else Color.Transparent),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                dag.dayOfMonth.toString(),
                                style = MaterialTheme.typography.labelMedium,
                                color = if (dag == vandaag) Color.White else MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                }
            }
        }
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            Row {
                Column(modifier = Modifier.width(tijdKolomBreedte)) {
                    (0..23).forEach { uur ->
                        Box(modifier = Modifier.height(rijHoogte).fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
                            Text(
                                "%02d:00".format(uur),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                Row(modifier = Modifier.horizontalScroll(horizontaalScrollState)) {
                    dagen.forEach { dag ->
                        Column(modifier = Modifier.width(dagKolomBreedte)) {
                            (0..23).forEach { uur ->
                                val afsprakenHier = perDagEnUur[dag to uur].orEmpty()
                                Column(
                                    modifier = Modifier
                                        .height(rijHoogte)
                                        .fillMaxWidth()
                                        .border(0.5.dp, MaterialTheme.colorScheme.outlineVariant)
                                        .clickable { onUurKlik(dag.atTime(uur, 0)) }
                                        .padding(2.dp),
                                ) {
                                    afsprakenHier.forEach { afspraak ->
                                        val kalender = kalenders.firstOrNull { it.id == afspraak.kalenderId }
                                        val kleur = runCatching { Color(android.graphics.Color.parseColor(kalender?.kleur ?: "#6FA832")) }.getOrDefault(TheepotGroenDonker)
                                        Text(
                                            afspraak.titel,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color.White,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(bottom = 1.dp)
                                                .clip(RoundedCornerShape(3.dp))
                                                .background(kleur)
                                                .clickable { onAfspraakKlik(afspraak) }
                                                .padding(horizontal = 3.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
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
    voorgevuldeStart: Instant? = null,
    onDismiss: () -> Unit,
    onKlaar: () -> Unit,
) {
    val nu = voorgevuldeStart ?: Instant.now()
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
