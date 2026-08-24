package nl.bsodetheepot.mobile.ui.screens.weekplanningen

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.TabRow
import androidx.compose.material3.Tab
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.BibliotheekActiviteit
import nl.bsodetheepot.mobile.data.models.Locatie
import nl.bsodetheepot.mobile.data.models.Toegang
import nl.bsodetheepot.mobile.data.models.WeekActiviteit
import nl.bsodetheepot.mobile.data.models.WeekActiviteitType
import nl.bsodetheepot.mobile.data.models.WeekGroep
import nl.bsodetheepot.mobile.data.models.WeekPlanning
import nl.bsodetheepot.mobile.data.services.DateUtils
import nl.bsodetheepot.mobile.data.services.WeekplanningenService
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.components.DropdownVeld

@Composable
fun WeekplanningenScreen(session: SessionViewModel, onTerug: (() -> Unit)? = null) {
    var locaties by remember { mutableStateOf<List<Locatie>>(emptyList()) }
    var actieveLocatie by remember { mutableStateOf<Locatie?>(null) }
    var groepen by remember { mutableStateOf<List<WeekGroep>>(emptyList()) }
    var actieveGroepId by remember { mutableStateOf<String?>(null) }
    var weekStart by remember { mutableStateOf(DateUtils.maandaagVanWeek(DateUtils.vandaag())) }
    var planning by remember { mutableStateOf<Pair<WeekPlanning, List<WeekActiviteit>>?>(null) }
    var herlaadSleutel by remember { mutableStateOf(0) }
    var themaDialog by remember { mutableStateOf(false) }
    var formulier by remember { mutableStateOf<Pair<WeekActiviteitType, WeekActiviteit?>?>(null) }
    var groepenDialog by remember { mutableStateOf(false) }

    val locatieToegang by session.locatieToegang.collectAsState()
    val rechten by session.rechten.collectAsState()
    val profiel by session.profiel.collectAsState()
    val magBewerken = session.isSuperadmin || rechten.paginaWeekplanningen == Toegang.BEWERKEN
    val magGroepenBeheren = session.isSuperadmin ||
        (rechten.paginaWeekplanningen == Toegang.BEWERKEN && rechten.weekplanningGroepenBeheren)

    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        val toegankelijk = runCatching { WeekplanningenService.toegankelijkeLocaties(session.magAllesZien, locatieToegang) }
            .getOrDefault(emptyList())
        locaties = toegankelijk
        actieveLocatie = toegankelijk.firstOrNull()
    }

    // Groepen horen bij de locatie; bij een wissel terug naar "Algemeen".
    LaunchedEffect(actieveLocatie, herlaadSleutel) {
        val loc = actieveLocatie
        groepen = if (loc == null) emptyList() else runCatching { WeekplanningenService.groepen(loc.naam) }.getOrDefault(emptyList())
        if (actieveGroepId != null && groepen.none { it.id == actieveGroepId }) actieveGroepId = null
    }

    LaunchedEffect(actieveLocatie, weekStart, actieveGroepId, herlaadSleutel) {
        val loc = actieveLocatie ?: return@LaunchedEffect
        planning = runCatching { WeekplanningenService.planning(loc.naam, weekStart, actieveGroepId) }.getOrNull()
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
                actions = {
                    if (magGroepenBeheren && actieveLocatie != null) {
                        IconButton(onClick = { groepenDialog = true }) {
                            Icon(Icons.Filled.Groups, contentDescription = "Groepen beheren")
                        }
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState())) {
            if (locaties.size > 1) {
                DropdownVeld(
                    label = "Locatie",
                    huidigeTekst = actieveLocatie?.naam ?: "",
                    opties = locaties.map { l -> l.naam to { actieveLocatie = l } },
                    modifier = Modifier.padding(16.dp, 8.dp),
                )
            }

            if (groepen.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    FilterChip(
                        selected = actieveGroepId == null,
                        onClick = { actieveGroepId = null },
                        label = { Text("Algemeen") },
                    )
                    groepen.forEach { groep ->
                        FilterChip(
                            selected = actieveGroepId == groep.id,
                            onClick = { actieveGroepId = groep.id },
                            label = { Text(groep.naam) },
                        )
                    }
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxWidth(),
            ) {
                IconButton(onClick = { weekStart = weekStart.minusWeeks(1) }) { Icon(Icons.Filled.ChevronLeft, contentDescription = "Vorige week") }
                Text(
                    "${DateUtils.toDateStr(weekStart)} t/m ${DateUtils.toDateStr(weekStart.plusDays(4))}",
                    style = MaterialTheme.typography.titleSmall,
                )
                IconButton(onClick = { weekStart = weekStart.plusWeeks(1) }) { Icon(Icons.Filled.ChevronRight, contentDescription = "Volgende week") }
            }

            val huidige = planning
            val activiteiten = huidige?.second ?: emptyList()
            val knutsel = activiteiten.firstOrNull { it.type == WeekActiviteitType.KNUTSEL }
            val kook = activiteiten.firstOrNull { it.type == WeekActiviteitType.KOOK_BAK }
            val groepsspel = activiteiten.firstOrNull { it.type == WeekActiviteitType.GROEPSSPEL }
            // Slot 1 is knutsel óf koken/bakken, slot 2 het groepsspel — zoals de webapp.
            val slot1Type = if (kook != null && knutsel == null) WeekActiviteitType.KOOK_BAK else WeekActiviteitType.KNUTSEL
            val slot1 = knutsel ?: kook

            Column(modifier = Modifier.padding(16.dp)) {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Weekthema", style = MaterialTheme.typography.labelMedium)
                            Text(
                                huidige?.first?.thema?.takeIf { it.isNotBlank() } ?: "Geen thema ingesteld",
                                style = MaterialTheme.typography.bodyLarge,
                            )
                        }
                        if (magBewerken) {
                            TextButton(onClick = { themaDialog = true }) {
                                Text(if (huidige?.first?.thema.isNullOrBlank()) "Instellen" else "Wijzigen")
                            }
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))
                SlotKaart(
                    type = slot1Type,
                    activiteit = slot1,
                    wisselNaar = if (slot1Type == WeekActiviteitType.KNUTSEL) WeekActiviteitType.KOOK_BAK else WeekActiviteitType.KNUTSEL,
                    magBewerken = magBewerken,
                    onBewerk = { type -> formulier = type to slot1 },
                    onVerwijder = {
                        val act = slot1 ?: return@SlotKaart
                        scope.launch {
                            runCatching { WeekplanningenService.verwijderActiviteit(act.id) }
                            herlaadSleutel++
                        }
                    },
                )

                Spacer(Modifier.height(12.dp))
                SlotKaart(
                    type = WeekActiviteitType.GROEPSSPEL,
                    activiteit = groepsspel,
                    wisselNaar = null,
                    magBewerken = magBewerken,
                    onBewerk = { type -> formulier = type to groepsspel },
                    onVerwijder = {
                        val act = groepsspel ?: return@SlotKaart
                        scope.launch {
                            runCatching { WeekplanningenService.verwijderActiviteit(act.id) }
                            herlaadSleutel++
                        }
                    },
                )
            }
        }
    }

    if (themaDialog) {
        ThemaDialog(
            huidigThema = planning?.first?.thema ?: "",
            onSluit = { themaDialog = false },
            onOpslaan = { nieuwThema ->
                val loc = actieveLocatie ?: return@ThemaDialog
                scope.launch {
                    runCatching {
                        val p = WeekplanningenService.zorgVoorPlanning(
                            planning?.first, loc.naam, weekStart, actieveGroepId, nieuwThema, profiel?.id,
                        )
                        WeekplanningenService.werkBijThema(p.id, nieuwThema)
                    }.onFailure { snackbar.showSnackbar("Thema opslaan is niet gelukt.") }
                    themaDialog = false
                    herlaadSleutel++
                }
            },
        )
    }

    formulier?.let { (type, bestaand) ->
        val loc = actieveLocatie
        if (loc != null) {
            ActiviteitDialog(
                type = type,
                bestaand = bestaand,
                onSluit = { formulier = null },
                onOpslaan = { naam, beschrijving, materialen, activiteitId, foto ->
                    scope.launch {
                        runCatching {
                            val p = WeekplanningenService.zorgVoorPlanning(
                                planning?.first, loc.naam, weekStart, actieveGroepId, "", profiel?.id,
                            )
                            WeekplanningenService.slaActiviteitOp(
                                planningId = p.id,
                                bestaand = bestaand,
                                type = type,
                                naam = naam,
                                beschrijving = beschrijving,
                                materialen = materialen,
                                activiteitId = activiteitId,
                                afbeelding = foto,
                            )
                        }.onFailure { snackbar.showSnackbar("Opslaan is niet gelukt.") }
                        formulier = null
                        herlaadSleutel++
                    }
                },
            )
        }
    }

    if (groepenDialog) {
        GroepenDialog(
            locatieNaam = actieveLocatie?.naam ?: "",
            groepen = groepen,
            profielId = profiel?.id,
            onSluit = { groepenDialog = false },
            onGewijzigd = { verwijderdId ->
                if (verwijderdId != null && verwijderdId == actieveGroepId) actieveGroepId = null
                herlaadSleutel++
            },
            onFout = { melding -> scope.launch { snackbar.showSnackbar(melding) } },
        )
    }
}

// ─── Slotkaart met foto ─────────────────────────────────────────────────────

@Composable
private fun SlotKaart(
    type: WeekActiviteitType,
    activiteit: WeekActiviteit?,
    wisselNaar: WeekActiviteitType?,
    magBewerken: Boolean,
    onBewerk: (WeekActiviteitType) -> Unit,
    onVerwijder: () -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(type.label, style = MaterialTheme.typography.titleSmall)

            if (activiteit == null) {
                Text(
                    "Nog niet ingevuld",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = 4.dp),
                )
                if (magBewerken) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { onBewerk(type) }) { Text("${type.label} toevoegen") }
                        if (wisselNaar != null) {
                            TextButton(onClick = { onBewerk(wisselNaar) }) { Text("Liever ${wisselNaar.label.lowercase()}") }
                        }
                    }
                }
            } else {
                activiteit.afbeeldingUrl?.takeIf { it.isNotBlank() }?.let { url ->
                    AsyncImage(
                        model = url,
                        contentDescription = activiteit.naam,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().height(140.dp).padding(vertical = 6.dp),
                    )
                }
                Text(activiteit.naam, style = MaterialTheme.typography.bodyLarge)
                activiteit.beschrijving?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium)
                }
                activiteit.materialen?.takeIf { it.isNotEmpty() }?.let {
                    Text("Materialen: ${it.joinToString(", ")}", style = MaterialTheme.typography.labelSmall)
                }
                if (magBewerken) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(onClick = { onBewerk(activiteit.type) }) { Text("Bewerken") }
                        TextButton(onClick = onVerwijder) { Text("Verwijderen") }
                    }
                }
            }
        }
    }
}

// ─── Weekthema ──────────────────────────────────────────────────────────────

@Composable
private fun ThemaDialog(huidigThema: String, onSluit: () -> Unit, onOpslaan: (String) -> Unit) {
    var thema by remember { mutableStateOf(huidigThema) }
    AlertDialog(
        onDismissRequest = onSluit,
        title = { Text("Weekthema") },
        text = {
            OutlinedTextField(
                value = thema,
                onValueChange = { thema = it },
                label = { Text("Bijv. Jungle, Ruimtevaart...") },
                singleLine = true,
            )
        },
        confirmButton = { TextButton(onClick = { onOpslaan(thema.trim()) }) { Text("Opslaan") } },
        dismissButton = { TextButton(onClick = onSluit) { Text("Annuleren") } },
    )
}

// ─── Activiteit toevoegen/bewerken, met koppeling aan de activiteitenbibliotheek ─

@Composable
private fun ActiviteitDialog(
    type: WeekActiviteitType,
    bestaand: WeekActiviteit?,
    onSluit: () -> Unit,
    onOpslaan: (naam: String, beschrijving: String?, materialen: List<String>, activiteitId: String?, foto: ByteArray?) -> Unit,
) {
    val context = LocalContext.current
    var tab by remember { mutableStateOf(0) }
    var naam by remember { mutableStateOf(bestaand?.naam ?: "") }
    var beschrijving by remember { mutableStateOf(bestaand?.beschrijving ?: "") }
    var materialenRaw by remember { mutableStateOf(bestaand?.materialen?.joinToString(", ") ?: "") }
    var activiteitId by remember { mutableStateOf(bestaand?.activiteitId) }
    var bibliotheek by remember { mutableStateOf<List<BibliotheekActiviteit>>(emptyList()) }
    var zoek by remember { mutableStateOf("") }
    var fotoBytes by remember { mutableStateOf<ByteArray?>(null) }
    var fotoGekozen by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        bibliotheek = runCatching { WeekplanningenService.bibliotheekActiviteiten() }.getOrDefault(emptyList())
    }

    val fotoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            context.contentResolver.openInputStream(uri)?.use {
                fotoBytes = it.readBytes()
                fotoGekozen = true
            }
        }
    }

    val gefilterd = bibliotheek.filter {
        zoek.isBlank() ||
            it.naam.contains(zoek, ignoreCase = true) ||
            (it.categorie?.contains(zoek, ignoreCase = true) == true)
    }

    AlertDialog(
        onDismissRequest = onSluit,
        title = { Text(if (bestaand == null) "${type.label} toevoegen" else "${type.label} bewerken") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                TabRow(selectedTabIndex = tab) {
                    Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Handmatig") })
                    Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Uit bibliotheek") })
                }
                Spacer(Modifier.height(8.dp))

                if (tab == 0) {
                    OutlinedTextField(
                        value = naam,
                        onValueChange = { naam = it },
                        label = { Text("Naam activiteit") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = materialenRaw,
                        onValueChange = { materialenRaw = it },
                        label = { Text("Benodigdheden (kommagescheiden)") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = beschrijving,
                        onValueChange = { beschrijving = it },
                        label = { Text("Beschrijving (optioneel)") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    if (!fotoGekozen) {
                        bestaand?.afbeeldingUrl?.takeIf { it.isNotBlank() }?.let { url ->
                            AsyncImage(
                                model = url,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxWidth().height(120.dp),
                            )
                        }
                    }
                    TextButton(
                        onClick = {
                            fotoLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                        },
                    ) {
                        Text(if (fotoGekozen) "Foto gekozen — wijzigen" else "Voorbeeldafbeelding kiezen")
                    }
                    if (activiteitId != null) {
                        Text(
                            "Overgenomen uit de activiteitenbibliotheek. De foto blijft bij deze weekactiviteit; de bibliotheek zelf verandert niet.",
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                } else {
                    OutlinedTextField(
                        value = zoek,
                        onValueChange = { zoek = it },
                        label = { Text("Zoek op naam of categorie...") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    if (gefilterd.isEmpty()) {
                        Text("Geen activiteiten gevonden.", style = MaterialTheme.typography.bodyMedium)
                    }
                    gefilterd.take(50).forEach { item ->
                        TextButton(
                            onClick = {
                                naam = item.naam
                                item.beschrijving?.takeIf { it.isNotBlank() }?.let { beschrijving = it }
                                item.materialen?.takeIf { it.isNotEmpty() }?.let { materialenRaw = it.joinToString(", ") }
                                activiteitId = item.id
                                tab = 0
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Text(item.naam, style = MaterialTheme.typography.bodyMedium)
                                item.categorie?.let { Text(it, style = MaterialTheme.typography.labelSmall) }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = naam.isNotBlank(),
                onClick = {
                    val materialen = materialenRaw.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                    onOpslaan(naam.trim(), beschrijving.trim().ifBlank { null }, materialen, activiteitId, fotoBytes)
                },
            ) { Text(if (bestaand == null) "Toevoegen" else "Opslaan") }
        },
        dismissButton = { TextButton(onClick = onSluit) { Text("Annuleren") } },
    )
}

// ─── Groepen beheren ────────────────────────────────────────────────────────

@Composable
private fun GroepenDialog(
    locatieNaam: String,
    groepen: List<WeekGroep>,
    profielId: String?,
    onSluit: () -> Unit,
    /** Geeft het id van een verwijderde groep door, zodat het scherm erachter kan terugvallen op "Algemeen". */
    onGewijzigd: (String?) -> Unit,
    onFout: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var nieuweNaam by remember { mutableStateOf("") }
    var hernoemGroep by remember { mutableStateOf<WeekGroep?>(null) }
    var hernoemNaam by remember { mutableStateOf("") }
    var teVerwijderen by remember { mutableStateOf<WeekGroep?>(null) }

    AlertDialog(
        onDismissRequest = onSluit,
        title = { Text("Groepen — $locatieNaam") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                Text(
                    "Elke groep heeft haar eigen weekactiviteiten en thema, bijvoorbeeld een 4+ en een 8+ groep. " +
                        "De planning onder \"Algemeen\" blijft bestaan voor de hele locatie.",
                    style = MaterialTheme.typography.labelSmall,
                )
                Spacer(Modifier.height(8.dp))

                if (groepen.isEmpty()) {
                    Text("Nog geen groepen voor deze locatie.", style = MaterialTheme.typography.bodyMedium)
                }
                groepen.forEach { groep ->
                    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text(groep.naam, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                        TextButton(onClick = { hernoemGroep = groep; hernoemNaam = groep.naam }) { Text("Hernoemen") }
                        TextButton(onClick = { teVerwijderen = groep }) { Text("Verwijderen") }
                    }
                }

                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = nieuweNaam,
                    onValueChange = { nieuweNaam = it },
                    label = { Text("Nieuwe groep — bijv. 4+ of 8+") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(
                    enabled = nieuweNaam.isNotBlank(),
                    onClick = {
                        val naam = nieuweNaam.trim()
                        scope.launch {
                            runCatching {
                                WeekplanningenService.maakGroep(locatieNaam, naam, groepen.size, profielId)
                            }.onSuccess {
                                nieuweNaam = ""
                                onGewijzigd(null)
                            }.onFailure {
                                onFout("Toevoegen mislukt — bestaat deze naam al?")
                            }
                        }
                    },
                ) { Text("Groep toevoegen") }
            }
        },
        confirmButton = { TextButton(onClick = onSluit) { Text("Klaar") } },
    )

    hernoemGroep?.let { groep ->
        AlertDialog(
            onDismissRequest = { hernoemGroep = null },
            title = { Text("Groep hernoemen") },
            text = {
                OutlinedTextField(
                    value = hernoemNaam,
                    onValueChange = { hernoemNaam = it },
                    label = { Text("Naam") },
                    singleLine = true,
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    val naam = hernoemNaam.trim()
                    hernoemGroep = null
                    if (naam.isNotBlank() && naam != groep.naam) {
                        scope.launch {
                            runCatching { WeekplanningenService.hernoemGroep(groep.id, naam) }
                                .onSuccess { onGewijzigd(null) }
                                .onFailure { onFout("Hernoemen mislukt — bestaat deze naam al?") }
                        }
                    }
                }) { Text("Opslaan") }
            },
            dismissButton = { TextButton(onClick = { hernoemGroep = null }) { Text("Annuleren") } },
        )
    }

    teVerwijderen?.let { groep ->
        AlertDialog(
            onDismissRequest = { teVerwijderen = null },
            title = { Text("Groep verwijderen?") },
            text = { Text("Alle weekplanningen van \"${groep.naam}\" gaan verloren.") },
            confirmButton = {
                TextButton(onClick = {
                    teVerwijderen = null
                    scope.launch {
                        runCatching { WeekplanningenService.verwijderGroep(groep.id) }
                        onGewijzigd(groep.id)
                    }
                }) { Text("Verwijderen") }
            },
            dismissButton = { TextButton(onClick = { teVerwijderen = null }) { Text("Annuleren") } },
        )
    }
}
