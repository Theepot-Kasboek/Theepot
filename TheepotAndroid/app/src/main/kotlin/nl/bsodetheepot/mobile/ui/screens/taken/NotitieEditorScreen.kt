package nl.bsodetheepot.mobile.ui.screens.taken

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.Notitie
import nl.bsodetheepot.mobile.data.services.TakenService

@Composable
fun NotitieEditorScreen(notitie: Notitie, onTerug: () -> Unit) {
    var titel by remember { mutableStateOf(notitie.titel) }
    var inhoud by remember { mutableStateOf(notitie.inhoud) }
    val scope = rememberCoroutineScope()

    suspend fun slaOp() {
        runCatching { TakenService.slaNotitieOp(notitie.id, titel, inhoud, notitie.kleur) }
    }

    // Debounced autosave, mirrort de 600ms debounce uit de webapp/iOS-app.
    LaunchedEffect(titel, inhoud) {
        delay(600)
        slaOp()
    }

    DisposableEffect(Unit) {
        onDispose { scope.launch { slaOp() } }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notitie") },
                navigationIcon = { IconButton(onClick = { scope.launch { slaOp() }; onTerug() }) { Icon(Icons.Filled.ArrowBack, contentDescription = "Terug") } },
                actions = {
                    IconButton(onClick = {
                        scope.launch {
                            runCatching { TakenService.verwijderNotitie(notitie.id) }
                            onTerug()
                        }
                    }) { Icon(Icons.Filled.Delete, contentDescription = "Verwijderen") }
                },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp)) {
            OutlinedTextField(
                value = titel,
                onValueChange = { titel = it },
                label = { Text("Titel") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = inhoud,
                onValueChange = { inhoud = it },
                label = { Text("Inhoud") },
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp).weight(1f),
            )
        }
    }
}
