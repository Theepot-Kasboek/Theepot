package nl.bsodetheepot.mobile.ui.screens.weekplanningen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import nl.bsodetheepot.mobile.data.models.Locatie
import nl.bsodetheepot.mobile.data.models.WeekActiviteit
import nl.bsodetheepot.mobile.data.models.WeekActiviteitType
import nl.bsodetheepot.mobile.data.models.WeekPlanning
import nl.bsodetheepot.mobile.data.services.DateUtils
import nl.bsodetheepot.mobile.data.services.WeekplanningenService
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.components.DropdownVeld

@Composable
fun WeekplanningenScreen(session: SessionViewModel, onTerug: (() -> Unit)? = null) {
    var locaties by remember { mutableStateOf<List<Locatie>>(emptyList()) }
    var actieveLocatie by remember { mutableStateOf<Locatie?>(null) }
    var weekStart by remember { mutableStateOf(DateUtils.maandaagVanWeek(DateUtils.vandaag())) }
    var planning by remember { mutableStateOf<Pair<WeekPlanning, List<WeekActiviteit>>?>(null) }
    val locatieToegang by session.locatieToegang.collectAsState()

    LaunchedEffect(Unit) {
        val toegankelijk = runCatching { WeekplanningenService.toegankelijkeLocaties(session.magAllesZien, locatieToegang) }.getOrDefault(emptyList())
        locaties = toegankelijk
        actieveLocatie = toegankelijk.firstOrNull()
    }

    LaunchedEffect(actieveLocatie, weekStart) {
        val loc = actieveLocatie ?: return@LaunchedEffect
        planning = runCatching { WeekplanningenService.planning(loc.naam, weekStart) }.getOrNull()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Weekplanningen") },
                navigationIcon = {
                    onTerug?.let {
                        IconButton(onClick = it) { Icon(Icons.Filled.ArrowBack, contentDescription = "Terug") }
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

            val huidige = planning
            if (huidige == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("Nog geen weekplanning") }
            } else {
                val (weekPlanning, activiteiten) = huidige
                Column(modifier = Modifier.padding(16.dp)) {
                    if (!weekPlanning.thema.isNullOrBlank()) {
                        Text("Weekthema", style = MaterialTheme.typography.titleSmall)
                        Text(weekPlanning.thema)
                        androidx.compose.foundation.layout.Spacer(Modifier.padding(6.dp))
                    }

                    val knutsel = activiteiten.firstOrNull { it.type == WeekActiviteitType.KNUTSEL }
                        ?: activiteiten.firstOrNull { it.type == WeekActiviteitType.KOOK_BAK }
                    if (knutsel != null) {
                        Text("Knutsel / Koken & Bakken", style = MaterialTheme.typography.titleSmall)
                        ActiviteitRij(knutsel)
                        androidx.compose.foundation.layout.Spacer(Modifier.padding(6.dp))
                    }

                    val groepsspel = activiteiten.firstOrNull { it.type == WeekActiviteitType.GROEPSSPEL }
                    if (groepsspel != null) {
                        Text("Groepsspel", style = MaterialTheme.typography.titleSmall)
                        ActiviteitRij(groepsspel)
                    }
                }
            }
        }
    }
}

@Composable
private fun ActiviteitRij(activiteit: WeekActiviteit) {
    Column(modifier = Modifier.padding(top = 4.dp)) {
        Text(activiteit.naam, style = MaterialTheme.typography.bodyLarge)
        activiteit.beschrijving?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
        activiteit.materialen?.takeIf { it.isNotEmpty() }?.let {
            Text("Materialen: ${it.joinToString(", ")}", style = MaterialTheme.typography.labelSmall)
        }
    }
}
