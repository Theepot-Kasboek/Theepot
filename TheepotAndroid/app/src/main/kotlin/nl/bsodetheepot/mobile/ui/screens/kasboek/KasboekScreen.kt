package nl.bsodetheepot.mobile.ui.screens.kasboek

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
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
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.Locatie
import nl.bsodetheepot.mobile.data.models.LocatieService
import nl.bsodetheepot.mobile.data.models.KasboekEntry
import nl.bsodetheepot.mobile.data.models.KasboekType
import nl.bsodetheepot.mobile.data.models.Toegang
import nl.bsodetheepot.mobile.data.services.DateUtils
import nl.bsodetheepot.mobile.data.services.KasboekService
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.components.DropdownVeld
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenDonker
import java.io.File
import java.time.LocalDate

@Composable
fun KasboekScreen(session: SessionViewModel) {
    var locaties by remember { mutableStateOf<List<Locatie>>(emptyList()) }
    var actieveLocatie by remember { mutableStateOf<Locatie?>(null) }
    var maand by remember { mutableStateOf(DateUtils.vandaag().withDayOfMonth(1)) }
    var entries by remember { mutableStateOf<List<KasboekEntry>>(emptyList()) }
    var beginsaldo by remember { mutableStateOf(0.0) }
    var toonNieuw by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val alle = runCatching { LocatieService.actieveLocaties() }.getOrDefault(emptyList())
        val toegankelijk = alle.filter { session.toegang(it.naam, "kasboek") != Toegang.GEEN }
        locaties = toegankelijk
        actieveLocatie = toegankelijk.firstOrNull()
    }

    suspend fun laad() {
        val loc = actieveLocatie ?: return
        val periode = DateUtils.periodeSleutel(maand)
        entries = runCatching { KasboekService.entries(loc.naam, periode) }.getOrDefault(emptyList())
        beginsaldo = runCatching { KasboekService.beginsaldo(loc.naam, periode) }.getOrDefault(0.0)
    }

    LaunchedEffect(actieveLocatie, maand) { laad() }

    val magBewerken = actieveLocatie?.let { session.toegang(it.naam, "kasboek") == Toegang.BEWERKEN } ?: false
    val inkomsten = entries.filter { it.type == KasboekType.INKOMST }.sumOf { it.bedrag }
    val uitgaven = entries.filter { it.type == KasboekType.UITGAVE }.sumOf { it.bedrag }
    val eindsaldo = beginsaldo + inkomsten - uitgaven

    Scaffold(
        topBar = { TopAppBar(title = { Text("Kasboek") }) },
        floatingActionButton = {
            if (magBewerken) {
                FloatingActionButton(onClick = { toonNieuw = true }, containerColor = TheepotGroenDonker) {
                    Icon(Icons.Filled.Add, contentDescription = "Nieuwe boeking")
                }
            }
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
                IconButton(onClick = { maand = maand.minusMonths(1) }) { Icon(Icons.Filled.ChevronLeft, contentDescription = "Vorige maand") }
                Text(DateUtils.maandLabel(maand).replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.titleMedium)
                IconButton(onClick = { maand = maand.plusMonths(1) }) { Icon(Icons.Filled.ChevronRight, contentDescription = "Volgende maand") }
            }

            Row(modifier = Modifier.fillMaxWidth().padding(16.dp, 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SamenvattingTegel("Beginsaldo", beginsaldo, Color0xFF37474F, Modifier.weight(1f))
                SamenvattingTegel("Inkomsten", inkomsten, Color0xFF2E7D32, Modifier.weight(1f))
                SamenvattingTegel("Uitgaven", uitgaven, Color0xFFC62828, Modifier.weight(1f))
                SamenvattingTegel("Eindsaldo", eindsaldo, Color0xFF37474F, Modifier.weight(1f))
            }

            LazyColumn {
                items(entries, key = { it.id }) { entry ->
                    ListItem(
                        headlineContent = { Text(entry.omschrijving?.ifBlank { entry.categorie } ?: entry.categorie) },
                        supportingContent = { Text(entry.categorie) },
                        leadingContent = { if (entry.bonnetjePad != null) Icon(Icons.Filled.AttachFile, contentDescription = "Heeft bonnetje") },
                        trailingContent = {
                            val kleur = if (entry.type == KasboekType.INKOMST) TheepotGroenDonker else androidx.compose.ui.graphics.Color(0xFFC62828)
                            Text("€ ${"%.2f".format(entry.bedrag)}", color = kleur)
                        },
                    )
                }
            }
        }
    }

    if (toonNieuw && actieveLocatie != null) {
        NieuweBoekingDialog(
            locatieNaam = actieveLocatie!!.naam,
            periode = DateUtils.periodeSleutel(maand),
            aangemaaktDoor = session.profiel.collectAsState().value?.id,
            onDismiss = { toonNieuw = false },
            onOpgeslagen = { scope.launch { laad() } },
        )
    }
}

@Composable
private fun SamenvattingTegel(label: String, bedrag: Double, kleur: androidx.compose.ui.graphics.Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall)
            Text("€ ${"%.2f".format(bedrag)}", style = MaterialTheme.typography.titleMedium, color = kleur)
        }
    }
}

private val Color0xFF2E7D32 = androidx.compose.ui.graphics.Color(0xFF2E7D32)
private val Color0xFFC62828 = androidx.compose.ui.graphics.Color(0xFFC62828)
private val Color0xFF37474F = androidx.compose.ui.graphics.Color(0xFF37474F)

@Composable
private fun NieuweBoekingDialog(
    locatieNaam: String,
    periode: String,
    aangemaaktDoor: String?,
    onDismiss: () -> Unit,
    onOpgeslagen: () -> Unit,
) {
    var type by remember { mutableStateOf(KasboekType.UITGAVE) }
    var bedragTekst by remember { mutableStateOf("") }
    var omschrijving by remember { mutableStateOf("") }
    var categorieen by remember { mutableStateOf<List<String>>(emptyList()) }
    var categorie by remember { mutableStateOf<String?>(null) }
    var bonnetjeBytes by remember { mutableStateOf<ByteArray?>(null) }
    var bezig by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var fotoUri by remember { mutableStateOf<android.net.Uri?>(null) }

    LaunchedEffect(Unit) {
        categorieen = runCatching { KasboekService.categorieen() }.getOrDefault(emptyList())
    }

    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { gelukt ->
        if (gelukt) {
            fotoUri?.let { uri ->
                bonnetjeBytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            }
        }
    }

    fun startCamera() {
        val file = File.createTempFile("bonnetje_", ".jpg", context.cacheDir)
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        fotoUri = uri
        cameraLauncher.launch(uri)
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { verleend ->
        if (verleend) startCamera()
    }

    val bedrag = bedragTekst.replace(",", ".").toDoubleOrNull()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nieuwe boeking") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KasboekType.entries.forEach { t ->
                        Button(
                            onClick = { type = t },
                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                containerColor = if (type == t) TheepotGroenDonker else MaterialTheme.colorScheme.surfaceVariant,
                            ),
                        ) { Text(if (t == KasboekType.UITGAVE) "Uitgave" else "Inkomst") }
                    }
                }
                OutlinedTextField(value = bedragTekst, onValueChange = { bedragTekst = it }, label = { Text("Bedrag") })
                OutlinedTextField(value = omschrijving, onValueChange = { omschrijving = it }, label = { Text("Omschrijving") })

                DropdownVeld(
                    label = "Categorie",
                    huidigeTekst = categorie ?: "Geen",
                    opties = listOf("Geen" to { categorie = null }) +
                        categorieen.map { c -> c to { categorie = c } },
                )

                TextButton(onClick = {
                    val heeftPermissie = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                        PackageManager.PERMISSION_GRANTED
                    if (heeftPermissie) {
                        startCamera()
                    } else {
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                }) {
                    Icon(Icons.Filled.CameraAlt, contentDescription = null)
                    Text(if (bonnetjeBytes != null) "Bonnetje vastgelegd ✓" else "Scan bonnetje")
                }
            }
        },
        confirmButton = {
            Button(
                enabled = bedrag != null && bedrag > 0 && !bezig,
                onClick = {
                    bezig = true
                    scope.launch {
                        runCatching {
                            KasboekService.voegToe(
                                locatieNaam = locatieNaam,
                                periode = periode,
                                categorie = categorie ?: "Overige kosten",
                                omschrijving = omschrijving.ifBlank { null },
                                bedrag = bedrag ?: 0.0,
                                type = type,
                                aangemaaktDoor = aangemaaktDoor,
                                bonnetjeBytes = bonnetjeBytes,
                            )
                        }
                        bezig = false
                        onOpgeslagen()
                        onDismiss()
                    }
                },
            ) { Text("Opslaan") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuleren") } },
    )
}
