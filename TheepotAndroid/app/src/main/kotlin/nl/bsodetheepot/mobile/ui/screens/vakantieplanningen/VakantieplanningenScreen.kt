package nl.bsodetheepot.mobile.ui.screens.vakantieplanningen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import nl.bsodetheepot.mobile.data.models.Dag
import nl.bsodetheepot.mobile.data.models.Toegang
import nl.bsodetheepot.mobile.data.models.VakantieActiviteit
import nl.bsodetheepot.mobile.data.models.VakantiePlanning
import nl.bsodetheepot.mobile.data.models.VakantieWeek
import nl.bsodetheepot.mobile.data.services.VakantieplanningenService
import nl.bsodetheepot.mobile.data.session.SessionViewModel

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

    LaunchedEffect(planning.id) {
        weken = runCatching { VakantieplanningenService.weken(planning.id) }.getOrDefault(emptyList())
        activiteiten = runCatching { VakantieplanningenService.activiteiten(weken.map { it.id }) }.getOrDefault(emptyList())
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(planning.naam) },
                navigationIcon = { IconButton(onClick = onTerug) { Icon(Icons.Filled.ArrowBack, contentDescription = "Terug") } },
            )
        },
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).fillMaxSize()) {
            weken.forEach { week ->
                item {
                    Text(week.naam, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 4.dp))
                }
                Dag.entries.forEach { dag ->
                    val vanDeDag = activiteiten.filter { it.weekId == week.id && it.dag == dag }
                    if (vanDeDag.isNotEmpty()) {
                        item { Text(dag.label, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(16.dp, 6.dp, 16.dp, 2.dp)) }
                        items(vanDeDag, key = { it.id }) { activiteit ->
                            ListItem(
                                headlineContent = { Text(activiteit.naam) },
                                supportingContent = {
                                    androidx.compose.foundation.layout.Column {
                                        activiteit.beschrijving?.let { Text(it) }
                                        activiteit.categorie?.let { Text(it, style = MaterialTheme.typography.labelSmall) }
                                    }
                                },
                            )
                        }
                    }
                }
                item { Divider() }
            }
        }
    }
}
