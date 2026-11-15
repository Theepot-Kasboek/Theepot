package nl.bsodetheepot.mobile.ui.screens.vakantieplanningen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.TableChart
import androidx.compose.material.icons.filled.Description
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import nl.bsodetheepot.mobile.data.models.Dag
import nl.bsodetheepot.mobile.data.models.Toegang
import nl.bsodetheepot.mobile.data.models.VakantieActiviteit
import nl.bsodetheepot.mobile.data.models.VakantiePlanning
import nl.bsodetheepot.mobile.data.models.VakantieWeek
import nl.bsodetheepot.mobile.data.services.DateUtils
import nl.bsodetheepot.mobile.data.services.VakantieplanningenService
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.theme.TheepotGroen
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenDonker
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenTekst
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun VakantieplanningenScreen(session: SessionViewModel, onTerug: (() -> Unit)? = null) {
    var planningen by remember { mutableStateOf<List<VakantiePlanning>>(emptyList()) }
    var open by remember { mutableStateOf<VakantiePlanning?>(null) }
    val rechten by session.rechten.collectAsState()
    val magOngepubliceerdeZien = session.isSuperadmin || rechten.paginaVakantieplanningen == Toegang.BEWERKEN

    LaunchedEffect(Unit) {
        planningen = runCatching { VakantieplanningenService.planningen(magOngepubliceerdeZien) }.getOrDefault(emptyList())
    }

    open?.let { planning ->
        VakantiePlanningDetail(planning = planning, onTerug = { open = null })
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Vakantieplanningen") },
                navigationIcon = {
                    onTerug?.let {
                        IconButton(onClick = it) { Icon(Icons.Filled.ArrowBack, contentDescription = "Terug") }
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).fillMaxSize()) {
            items(planningen, key = { it.id }) { planning ->
                ListItem(
                    headlineContent = { Text(planning.naam) },
                    supportingContent = { Text(planning.vakantie) },
                    modifier = Modifier.fillMaxWidth().clickable { open = planning },
                )
            }
        }
    }
}

/** De twee weergaven van een week, gespiegeld op de iOS-app. */
private enum class Weergave(val icoon: androidx.compose.ui.graphics.vector.ImageVector) {
    OVERZICHT(Icons.Filled.TableChart),
    DOCUMENT(Icons.Filled.Description),
}

@Composable
private fun VakantiePlanningDetail(planning: VakantiePlanning, onTerug: () -> Unit) {
    var weken by remember { mutableStateOf<List<VakantieWeek>>(emptyList()) }
    var activiteiten by remember { mutableStateOf<List<VakantieActiviteit>>(emptyList()) }
    var actieveWeekId by remember { mutableStateOf<String?>(null) }
    var weergave by remember { mutableStateOf(Weergave.OVERZICHT) }
    var dagFilter by remember { mutableStateOf<Dag?>(null) }
    var popupFoto by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(planning.id) {
        weken = runCatching { VakantieplanningenService.weken(planning.id) }.getOrDefault(emptyList())
        val ruw = runCatching { VakantieplanningenService.activiteiten(weken.map { it.id }) }.getOrDefault(emptyList())
        activiteiten = runCatching { VakantieplanningenService.metBibliotheekFotos(ruw) }.getOrDefault(ruw)
        if (actieveWeekId == null) actieveWeekId = weken.firstOrNull()?.id
    }

    val actieveWeek = weken.firstOrNull { it.id == actieveWeekId }

    /** Vanuit het overzicht op een activiteit tikken springt naar die dag in de documentweergave. */
    fun springNaarDocument(activiteit: VakantieActiviteit) {
        weergave = Weergave.DOCUMENT
        dagFilter = activiteit.dag
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(planning.naam) },
                navigationIcon = { IconButton(onClick = onTerug) { Icon(Icons.Filled.ArrowBack, contentDescription = "Terug") } },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (weken.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Nog geen weken", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                return@Scaffold
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier.weight(1f).horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    weken.forEach { week ->
                        FilterChip(
                            selected = week.id == actieveWeekId,
                            onClick = { actieveWeekId = week.id },
                            label = { Text("Week ${week.weekNummer} — ${week.naam}") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = TheepotGroen,
                                selectedLabelColor = Color.White,
                            ),
                        )
                    }
                }
                WeergaveToggle(weergave = weergave, onWeergave = { weergave = it })
            }

            actieveWeek?.let { week ->
                when (weergave) {
                    Weergave.OVERZICHT -> WeekOverzichtTabel(
                        activiteiten = activiteiten.filter { it.weekId == week.id },
                        onKies = ::springNaarDocument,
                    )
                    Weergave.DOCUMENT -> WeekDocument(
                        planning = planning,
                        week = week,
                        activiteiten = activiteiten.filter { it.weekId == week.id },
                        dagFilter = dagFilter,
                        onDagFilter = { dagFilter = it },
                        onFoto = { popupFoto = it },
                    )
                }
            }
        }
    }

    popupFoto?.let { url ->
        FotoPopup(url = url, onSluit = { popupFoto = null })
    }
}

@Composable
private fun WeergaveToggle(weergave: Weergave, onWeergave: (Weergave) -> Unit) {
    Row(
        modifier = Modifier
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp))
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Weergave.entries.forEach { optie ->
            val actief = optie == weergave
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (actief) TheepotGroen else Color.Transparent)
                    .clickable { onWeergave(optie) }
                    .padding(horizontal = 10.dp, vertical = 8.dp),
            ) {
                Icon(
                    optie.icoon,
                    contentDescription = if (optie == Weergave.OVERZICHT) "Overzicht" else "Document",
                    tint = if (actief) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

// ─── Overzicht: compacte weektabel met 5 dagkolommen ────────────────────────

@Composable
private fun WeekOverzichtTabel(activiteiten: List<VakantieActiviteit>, onKies: (VakantieActiviteit) -> Unit) {
    Row(
        modifier = Modifier
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 12.dp)
            .fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Dag.entries.forEach { dag ->
            val vanDeDag = activiteiten.filter { it.dag == dag }.sortedBy { it.volgorde }
            DagKolom(dag = dag, activiteiten = vanDeDag, onKies = onKies)
        }
    }
}

/**
 * Eén dagkolom in de donkere/groene "linktabel"-stijl, gespiegeld op de
 * documentweergave van de webapp en op de iOS-app: een groene dagkop met
 * onderstreepte titel, daaronder de activiteiten als onderstreepte groene
 * "links" op een donkere, afwisselend gekleurde balk.
 */
@Composable
private fun DagKolom(dag: Dag, activiteiten: List<VakantieActiviteit>, onKies: (VakantieActiviteit) -> Unit) {
    Column(
        modifier = Modifier
            .width(170.dp)
            .clip(RoundedCornerShape(10.dp)),
    ) {
        Text(
            dag.label,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            textDecoration = TextDecoration.Underline,
            modifier = Modifier
                .fillMaxWidth()
                .background(TheepotGroenDonker)
                .padding(horizontal = 12.dp, vertical = 10.dp),
        )
        if (activiteiten.isEmpty()) {
            Text(
                "—",
                color = Color.White.copy(alpha = 0.7f),
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.85f))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            )
        } else {
            activiteiten.forEachIndexed { index, activiteit ->
                Text(
                    activiteit.naam,
                    color = TheepotGroen,
                    fontWeight = FontWeight.SemiBold,
                    textDecoration = TextDecoration.Underline,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(if (index % 2 == 0) Color.Black.copy(alpha = 0.85f) else Color.Black.copy(alpha = 0.7f))
                        .clickable { onKies(activiteit) }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                )
            }
        }
    }
}

// ─── Documentweergave: dagen onder elkaar met volledige details + foto's ───

private val dagenVolgorde = listOf(Dag.MAANDAG, Dag.DINSDAG, Dag.WOENSDAG, Dag.DONDERDAG, Dag.VRIJDAG)
private val dagDatumFormatter = DateTimeFormatter.ofPattern("d MMM", Locale("nl", "NL"))

private fun dagDatumStr(planning: VakantiePlanning, week: VakantieWeek, dag: Dag): String {
    val start = DateUtils.parseDateStr(planning.startDatum.take(10)) ?: return ""
    val eersteMaandag = DateUtils.maandaagVanWeek(start)
    val dagIndex = dagenVolgorde.indexOf(dag).takeIf { it >= 0 } ?: return ""
    val doel = eersteMaandag.plusDays(((week.weekNummer - 1) * 7 + dagIndex).toLong())
    return doel.format(dagDatumFormatter)
}

@Composable
private fun WeekDocument(
    planning: VakantiePlanning,
    week: VakantieWeek,
    activiteiten: List<VakantieActiviteit>,
    dagFilter: Dag?,
    onDagFilter: (Dag?) -> Unit,
    onFoto: (String) -> Unit,
) {
    val dagenTeTonen = dagFilter?.let { listOf(it) } ?: Dag.entries.toList()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 12.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Column {
            Text("Week ${week.weekNummer} — ${week.naam}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                listOfNotNull(planning.vakantie, planning.thema).joinToString(" · "),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        DagFilterRij(dagFilter = dagFilter, onDagFilter = onDagFilter)

        dagenTeTonen.forEach { dag ->
            val dagActiviteiten = activiteiten.filter { it.dag == dag }.sortedBy { it.volgorde }
            if (dagActiviteiten.isNotEmpty()) {
                DagSectie(dag = dag, week = week, planning = planning, activiteiten = dagActiviteiten, onFoto = onFoto)
            } else if (dagFilter != null) {
                Text(
                    "Geen activiteiten op ${dag.label.lowercase()} in deze week.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 8.dp),
                )
            }
        }

        Spacer(Modifier.height(24.dp))
    }
}

/** Filter om in de documentweergave één specifieke dag te kunnen bekijken i.p.v. altijd alle vijf. */
@Composable
private fun DagFilterRij(dagFilter: Dag?, onDagFilter: (Dag?) -> Unit) {
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        DagFilterKnop(titel = "Alle dagen", actief = dagFilter == null, onClick = { onDagFilter(null) })
        Dag.entries.forEach { dag ->
            DagFilterKnop(titel = dag.label, actief = dagFilter == dag, onClick = { onDagFilter(dag) })
        }
    }
}

@Composable
private fun DagFilterKnop(titel: String, actief: Boolean, onClick: () -> Unit) {
    Text(
        titel,
        color = if (actief) Color.White else MaterialTheme.colorScheme.onSurface,
        fontWeight = FontWeight.SemiBold,
        style = MaterialTheme.typography.labelMedium,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (actief) TheepotGroen else MaterialTheme.colorScheme.surfaceVariant)
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 7.dp),
    )
}

@Composable
private fun DagSectie(
    dag: Dag,
    week: VakantieWeek,
    planning: VakantiePlanning,
    activiteiten: List<VakantieActiviteit>,
    onFoto: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(TheepotGroen)
                .padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(dag.label, color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(dagDatumStr(planning, week, dag), color = Color.White.copy(alpha = 0.85f), style = MaterialTheme.typography.bodyMedium)
        }

        activiteiten.forEach { activiteit ->
            ActiviteitKaart(activiteit = activiteit, onFoto = onFoto)
        }
    }
}

@Composable
private fun ActiviteitKaart(activiteit: VakantieActiviteit, onFoto: (String) -> Unit) {
    val fotoUrl = activiteit.afbeeldingPad?.takeIf { it.isNotEmpty() }?.let { VakantieplanningenService.fotoUrl(it) }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            fotoUrl?.let { url ->
                AsyncImage(
                    model = url,
                    contentDescription = activiteit.naam,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .clickable { onFoto(url) },
                )
            }
            Text(activiteit.naam, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            activiteit.beschrijving?.takeIf { it.isNotEmpty() }?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            activiteit.benodigdheden?.takeIf { it.isNotEmpty() }?.let { lijst ->
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(
                        "BENODIGDHEDEN",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    lijst.forEach { item ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(RoundedCornerShape(50))
                                    .background(TheepotGroen),
                            )
                            Text(item, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
            activiteit.categorie?.takeIf { it.isNotEmpty() }?.let {
                Text(
                    it.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = TheepotGroenTekst,
                )
            }
        }
    }
}

@Composable
private fun FotoPopup(url: String, onSluit: () -> Unit) {
    AlertDialog(
        onDismissRequest = onSluit,
        confirmButton = {},
        text = {
            Box(contentAlignment = Alignment.TopEnd) {
                AsyncImage(
                    model = url,
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxWidth().height(400.dp),
                )
                IconButton(onClick = onSluit) {
                    Icon(Icons.Filled.Close, contentDescription = "Sluiten", tint = Color.White)
                }
            }
        },
    )
}
