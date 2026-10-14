package nl.bsodetheepot.mobile.ui.screens.vakantieplanningen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.AlertDialog
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import nl.bsodetheepot.mobile.data.models.Dag
import nl.bsodetheepot.mobile.data.models.Toegang
import nl.bsodetheepot.mobile.data.models.VakantieActiviteit
import nl.bsodetheepot.mobile.data.models.VakantiePlanning
import nl.bsodetheepot.mobile.data.models.VakantieWeek
import nl.bsodetheepot.mobile.data.services.VakantieplanningenService
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.theme.TheepotGroen
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenDonker
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenTekst

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

@Composable
private fun VakantiePlanningDetail(planning: VakantiePlanning, onTerug: () -> Unit) {
    var weken by remember { mutableStateOf<List<VakantieWeek>>(emptyList()) }
    var activiteiten by remember { mutableStateOf<List<VakantieActiviteit>>(emptyList()) }
    var actieveWeekId by remember { mutableStateOf<String?>(null) }
    var detailActiviteit by remember { mutableStateOf<VakantieActiviteit?>(null) }

    LaunchedEffect(planning.id) {
        weken = runCatching { VakantieplanningenService.weken(planning.id) }.getOrDefault(emptyList())
        activiteiten = runCatching { VakantieplanningenService.activiteiten(weken.map { it.id }) }.getOrDefault(emptyList())
        if (actieveWeekId == null) actieveWeekId = weken.firstOrNull()?.id
    }

    val actieveWeek = weken.firstOrNull { it.id == actieveWeekId }

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
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                    Text("Nog geen weken", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                return@Scaffold
            }

            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 10.dp),
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

            actieveWeek?.let { week ->
                Row(
                    modifier = Modifier
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp)
                        .fillMaxSize(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Dag.entries.forEach { dag ->
                        val vanDeDag = activiteiten
                            .filter { it.weekId == week.id && it.dag == dag }
                            .sortedBy { it.volgorde }
                        DagKolom(dag = dag, activiteiten = vanDeDag, onKies = { detailActiviteit = it })
                    }
                }
            }
        }
    }

    detailActiviteit?.let { activiteit ->
        AlertDialog(
            onDismissRequest = { detailActiviteit = null },
            confirmButton = { TextButton(onClick = { detailActiviteit = null }) { Text("Sluiten") } },
            title = { Text(activiteit.naam) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    activiteit.beschrijving?.let { Text(it) }
                    activiteit.categorie?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = TheepotGroenTekst) }
                    activiteit.benodigdheden?.takeIf { it.isNotEmpty() }?.let {
                        Text("Benodigdheden: ${it.joinToString(", ")}", style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
        )
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
