package nl.bsodetheepot.mobile.ui.screens.chat

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
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
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.ChatGesprek
import nl.bsodetheepot.mobile.data.models.ChatType
import nl.bsodetheepot.mobile.data.models.Profiel
import nl.bsodetheepot.mobile.data.push.MeldingRouter
import nl.bsodetheepot.mobile.data.services.ChatService
import nl.bsodetheepot.mobile.data.session.SessionViewModel

@Composable
fun ChatListScreen(session: SessionViewModel) {
    var gesprekken by remember { mutableStateOf<List<ChatGesprek>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var toonNieuw by remember { mutableStateOf(false) }
    var openGesprek by remember { mutableStateOf<ChatGesprek?>(null) }
    val scope = rememberCoroutineScope()
    val profiel by session.profiel.collectAsState()
    val rechten by session.rechten.collectAsState()
    val magStarten = session.isSuperadmin || rechten.chatStarten

    suspend fun laad() {
        val id = profiel?.id ?: return
        isLoading = true
        gesprekken = runCatching { ChatService.gesprekken(id) }.getOrDefault(emptyList())
        isLoading = false
    }

    LaunchedEffect(profiel?.id) { laad() }

    // Opent het gesprek uit een pushmelding zodra zowel de deeplink als de
    // gesprekkenlijst binnen zijn (welke van de twee het eerst klaar is, verschilt).
    val gewenstGesprekId by MeldingRouter.gewenstGesprekId.collectAsState()
    LaunchedEffect(gewenstGesprekId, gesprekken) {
        val id = gewenstGesprekId ?: return@LaunchedEffect
        val gevonden = gesprekken.firstOrNull { it.id == id } ?: return@LaunchedEffect
        openGesprek = gevonden
        MeldingRouter.verwerkt()
    }

    val huidig = openGesprek
    if (huidig != null) {
        ChatDetailScreen(session = session, gesprek = huidig, onTerug = { openGesprek = null })
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chat") },
                actions = {
                    if (magStarten) {
                        IconButton(onClick = { toonNieuw = true }) {
                            Icon(Icons.Filled.Edit, contentDescription = "Nieuw gesprek")
                        }
                    }
                },
            )
        },
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when {
                isLoading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                gesprekken.isEmpty() -> Text("Nog geen gesprekken", Modifier.align(Alignment.Center))
                else -> LazyColumn {
                    items(gesprekken, key = { it.id }) { gesprek ->
                        ListItem(
                            headlineContent = { Text(gesprek.naam) },
                            modifier = Modifier.fillMaxWidth().clickable { openGesprek = gesprek },
                        )
                    }
                }
            }
        }
    }

    if (toonNieuw) {
        NieuwGesprekDialog(
            session = session,
            onDismiss = { toonNieuw = false },
            onAangemaakt = { scope.launch { laad() } },
        )
    }
}

@Composable
private fun NieuwGesprekDialog(session: SessionViewModel, onDismiss: () -> Unit, onAangemaakt: () -> Unit) {
    var groep by remember { mutableStateOf(false) }
    var naam by remember { mutableStateOf("") }
    var profielen by remember { mutableStateOf<List<Profiel>>(emptyList()) }
    var geselecteerd by remember { mutableStateOf(setOf<String>()) }
    var bezig by remember { mutableStateOf(false) }
    val eigenProfiel by session.profiel.collectAsState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        profielen = runCatching { ChatService.alleProfielen() }.getOrDefault(emptyList())
            .filter { it.id != eigenProfiel?.id }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nieuw gesprek") },
        text = {
            Column {
                androidx.compose.foundation.layout.Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Groepsgesprek", modifier = Modifier.fillMaxWidth(0.7f))
                    Switch(checked = groep, onCheckedChange = { groep = it })
                }
                if (groep) {
                    OutlinedTextField(value = naam, onValueChange = { naam = it }, label = { Text("Naam") })
                }
                androidx.compose.foundation.lazy.LazyColumn(modifier = Modifier.padding(top = 8.dp)) {
                    items(profielen, key = { it.id }) { p ->
                        ListItem(
                            headlineContent = { Text(p.naam) },
                            trailingContent = {
                                Checkbox(
                                    checked = p.id in geselecteerd,
                                    onCheckedChange = { checked ->
                                        geselecteerd = if (checked) geselecteerd + p.id else geselecteerd - p.id
                                    },
                                )
                            },
                            modifier = Modifier.clickable {
                                geselecteerd = if (p.id in geselecteerd) geselecteerd - p.id else geselecteerd + p.id
                            },
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                enabled = geselecteerd.isNotEmpty() && !bezig,
                onClick = {
                    val eigenId = eigenProfiel?.id ?: return@Button
                    bezig = true
                    scope.launch {
                        val deelnemerIds = listOf(eigenId) + geselecteerd
                        val gekozenType = if (groep) ChatType.GROEP else ChatType.DIRECT
                        val eigenNaam = eigenProfiel?.naam ?: ""
                        val definitieveNaam = when {
                            groep && naam.isNotBlank() -> naam
                            groep -> "Groep (${deelnemerIds.size})"
                            else -> {
                                val ander = profielen.firstOrNull { it.id == geselecteerd.first() }
                                "$eigenNaam & ${ander?.naam ?: ""}"
                            }
                        }
                        runCatching { ChatService.nieuwGesprek(definitieveNaam, gekozenType, deelnemerIds) }
                        bezig = false
                        onAangemaakt()
                        onDismiss()
                    }
                },
            ) { Text("Starten") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuleren") } },
    )
}
