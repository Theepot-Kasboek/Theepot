package nl.bsodetheepot.mobile.ui.screens.chat

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.InsertDriveFile
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.ChatBericht
import nl.bsodetheepot.mobile.data.models.ChatGesprek
import nl.bsodetheepot.mobile.data.services.ChatService
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.theme.TheepotGroenLicht

@Composable
fun ChatDetailScreen(session: SessionViewModel, gesprek: ChatGesprek, onTerug: () -> Unit) {
    var berichten by remember { mutableStateOf<List<ChatBericht>>(emptyList()) }
    var tekst by remember { mutableStateOf("") }
    var bezig by remember { mutableStateOf(false) }
    val profiel by session.profiel.collectAsState()
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val context = LocalContext.current

    suspend fun laad() {
        berichten = runCatching { ChatService.berichten(gesprek.id) }.getOrDefault(emptyList())
        val eigenId = profiel?.id ?: return
        berichten.filter { it.afzenderId != eigenId && eigenId !in it.gelezenDoor.orEmpty() }
            .forEach { runCatching { ChatService.markeerGelezen(it.id, it.gelezenDoor.orEmpty(), eigenId) } }
    }

    LaunchedEffect(gesprek.id) { laad() }

    LaunchedEffect(berichten.size) {
        if (berichten.isNotEmpty()) listState.animateScrollToItem(berichten.size - 1)
    }

    DisposableEffect(gesprek.id) {
        val (channel, flow) = ChatService.openBerichtenKanaal(gesprek.id)
        val job = scope.launch {
            channel.subscribe()
            flow.collect { laad() }
        }
        onDispose {
            job.cancel()
            scope.launch { runCatching { channel.unsubscribe() } }
        }
    }

    val fotoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            val eigenId = profiel?.id ?: return@rememberLauncherForActivityResult
            scope.launch {
                bezig = true
                runCatching {
                    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return@runCatching
                    ChatService.verstuurBestand(gesprek.id, eigenId, "foto_${System.currentTimeMillis() / 1000}.jpg", bytes, "image/jpeg")
                }
                bezig = false
                laad()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(gesprek.naam) },
                navigationIcon = {
                    IconButton(onClick = onTerug) { Icon(Icons.Filled.ArrowBack, contentDescription = "Terug") }
                },
            )
        },
        bottomBar = {
            Row(
                modifier = Modifier.fillMaxWidth().padding(8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                IconButton(onClick = { fotoLauncher.launch(androidx.activity.result.PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) {
                    Icon(Icons.Filled.AttachFile, contentDescription = "Bestand versturen")
                }
                OutlinedTextField(
                    value = tekst,
                    onValueChange = { tekst = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Bericht...") },
                )
                IconButton(
                    enabled = tekst.isNotBlank() && !bezig,
                    onClick = {
                        val eigenId = profiel?.id ?: return@IconButton
                        val inhoud = tekst
                        tekst = ""
                        scope.launch {
                            bezig = true
                            runCatching { ChatService.verstuurTekst(gesprek.id, eigenId, inhoud) }
                            bezig = false
                            laad()
                        }
                    },
                ) { Icon(Icons.Filled.Send, contentDescription = "Versturen") }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            LazyColumn(state = listState, modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp)) {
                items(berichten, key = { it.id }) { bericht ->
                    val isEigen = bericht.afzenderId == profiel?.id
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        horizontalArrangement = if (isEigen) Arrangement.End else Arrangement.Start,
                    ) {
                        Column(
                            modifier = Modifier
                                .background(
                                    if (isEigen) TheepotGroenLicht else MaterialTheme.colorScheme.surfaceVariant,
                                    RoundedCornerShape(14.dp),
                                )
                                .padding(10.dp),
                        ) {
                            if (bericht.isBestand) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Icon(Icons.Filled.InsertDriveFile, contentDescription = null, modifier = Modifier.padding(end = 2.dp))
                                    Text(bericht.bestandNaam ?: bericht.inhoud)
                                }
                            } else {
                                Text(bericht.inhoud)
                            }
                        }
                    }
                }
                item {
                    val laatsteVanMij = berichten.lastOrNull { it.afzenderId == profiel?.id }
                    if (laatsteVanMij != null && (laatsteVanMij.gelezenDoor?.size ?: 0) > 1) {
                        Text("Gelezen", style = MaterialTheme.typography.labelSmall, color = Color.Gray, modifier = Modifier.padding(4.dp))
                    }
                }
            }
        }
    }
}
