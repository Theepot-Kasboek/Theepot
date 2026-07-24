package nl.bsodetheepot.mobile.ui.screens.taken

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.Notitie
import nl.bsodetheepot.mobile.data.models.TodoLijst
import nl.bsodetheepot.mobile.data.services.TakenService

@Composable
fun NotitieMapScreen(lijst: TodoLijst, onTerug: () -> Unit) {
    var notities by remember { mutableStateOf<List<Notitie>>(emptyList()) }
    var openNotitie by remember { mutableStateOf<Notitie?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun laad() {
        notities = runCatching { TakenService.notities(listOf(lijst.id)) }.getOrDefault(emptyList())
    }

    LaunchedEffect(lijst.id) { laad() }

    openNotitie?.let { notitie ->
        NotitieEditorScreen(notitie = notitie, onTerug = { openNotitie = null; scope.launch { laad() } })
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(lijst.naam) },
                navigationIcon = { IconButton(onClick = onTerug) { Icon(Icons.Filled.ArrowBack, contentDescription = "Terug") } },
                actions = {
                    IconButton(onClick = {
                        scope.launch {
                            runCatching { TakenService.maakNotitie(lijst.id, notities.size) }
                            laad()
                        }
                    }) { Icon(Icons.Filled.Add, contentDescription = "Nieuwe notitie") }
                },
            )
        },
    ) { padding ->
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.padding(padding).fillMaxSize().padding(8.dp),
        ) {
            items(notities, key = { it.id }) { notitie ->
                val achtergrond = runCatching { Color(android.graphics.Color.parseColor(notitie.kleur)) }.getOrDefault(MaterialTheme.colorScheme.surfaceVariant)
                Column(
                    modifier = Modifier
                        .padding(6.dp)
                        .aspectRatio(1f)
                        .background(achtergrond, RoundedCornerShape(12.dp))
                        .clickable { openNotitie = notitie }
                        .padding(10.dp),
                ) {
                    Text(notitie.titel, style = MaterialTheme.typography.titleSmall, maxLines = 1)
                    Text(notitie.inhoud, style = MaterialTheme.typography.bodySmall, maxLines = 4)
                }
            }
        }
    }
}
