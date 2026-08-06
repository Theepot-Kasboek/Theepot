package nl.bsodetheepot.mobile.ui.screens.dashboard

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.EuroSymbol
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.DashboardWidgetId
import nl.bsodetheepot.mobile.data.models.Toegang
import nl.bsodetheepot.mobile.data.models.samengesteldeDashboardVolgorde
import nl.bsodetheepot.mobile.data.services.DashboardService
import nl.bsodetheepot.mobile.data.services.KilometersDashboardStatus
import nl.bsodetheepot.mobile.data.services.KilometerstandenService
import nl.bsodetheepot.mobile.data.services.MaaltijdlijstService
import nl.bsodetheepot.mobile.data.services.PrikbordService
import nl.bsodetheepot.mobile.data.services.TakenService
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.screens.dashboard.widgets.KasboekWidget
import nl.bsodetheepot.mobile.ui.screens.dashboard.widgets.KilometersWidget
import nl.bsodetheepot.mobile.ui.screens.dashboard.widgets.MaaltijdlijstWidget
import nl.bsodetheepot.mobile.ui.screens.dashboard.widgets.MededelingenWidget
import nl.bsodetheepot.mobile.ui.screens.dashboard.widgets.TakenWidget
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/** Minimum kaartbreedte in dp — bepaalt of het 1 of 2 kolommen worden (net als iOS' WidgetGridLayout). */
private const val MIN_KAART_BREEDTE_DP = 340
private const val BUITEN_MARGE_DP = 32

/**
 * Openingsscherm: samenvattingskaarten (widgets) die de gebruiker zelf mag
 * herschikken. Volgorde wordt bewaard in Supabase (`dashboard_voorkeuren`),
 * dus hetzelfde op elk apparaat van deze gebruiker (ook op iOS).
 */
@Composable
fun DashboardHomeScreen(session: SessionViewModel, naarTab: (HoofdTab) -> Unit) {
    var isLoading by remember { mutableStateOf(true) }
    val widgetVolgorde = remember { mutableStateListOf<DashboardWidgetId>() }
    var mededelingenAantal by remember { mutableStateOf<Int?>(null) }
    var kasboekDagenTotDeadline by remember { mutableStateOf<Int?>(null) }
    var kilometersStatus by remember { mutableStateOf<KilometersDashboardStatus?>(null) }
    var maaltijdlijstVandaag by remember { mutableStateOf<List<String>?>(null) }
    var takenOpenAantal by remember { mutableStateOf<Int?>(null) }

    val profiel by session.profiel.collectAsState()
    val rechten by session.rechten.collectAsState()
    val scope = rememberCoroutineScope()

    suspend fun laad() {
        val profielId = profiel?.id ?: return
        isLoading = true

        coroutineScope {
            val voorkeurenD = async { DashboardService.laadVoorkeuren(profielId) }
            val mededelingenD = async {
                if (rechten.paginaPrikbord == Toegang.GEEN) null
                else runCatching { PrikbordService.ongelezenAantal(session) }.getOrNull()
            }
            val kmD = async { runCatching { KilometerstandenService.samenvatting() }.getOrNull() }
            val maaltijdD = async { runCatching { MaaltijdlijstService.namenVandaag(session) }.getOrNull() }
            val takenD = async {
                runCatching {
                    val lijsten = TakenService.lijsten(profielId)
                    TakenService.taken(lijsten.map { it.id }).count { !it.voltooid }
                }.getOrNull()
            }

            val resultaten = awaitAll(voorkeurenD, mededelingenD, kmD, maaltijdD, takenD)
            @Suppress("UNCHECKED_CAST")
            val voorkeuren = resultaten[0] as List<String>
            mededelingenAantal = resultaten[1] as Int?
            kasboekDagenTotDeadline = kasboekDeadline()
            kilometersStatus = resultaten[2] as KilometersDashboardStatus?
            maaltijdlijstVandaag = resultaten[3] as List<String>?
            takenOpenAantal = resultaten[4] as Int?

            val toegestaan = toegestaneWidgets(rechten)
            val volgorde = samengesteldeDashboardVolgorde(voorkeuren, toegestaan)
            widgetVolgorde.clear()
            widgetVolgorde.addAll(volgorde)
        }
        isLoading = false
    }

    LaunchedEffect(profiel?.id) { laad() }

    val breedteDp = LocalConfiguration.current.screenWidthDp
    val kolommen = ((breedteDp - BUITEN_MARGE_DP) / MIN_KAART_BREEDTE_DP).coerceIn(1, 2)

    Scaffold(topBar = { TopAppBar(title = { Text("Home") }) }) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (isLoading) {
                CircularProgressIndicator(Modifier.align(Alignment.Center))
            } else {
                DragReorderGrid(
                    items = widgetVolgorde,
                    columns = kolommen,
                    key = { it },
                    onReorderEnd = { nieuweVolgorde ->
                        scope.launch {
                            val profielId = profiel?.id ?: return@launch
                            DashboardService.bewaarVolgorde(profielId, nieuweVolgorde.map { it.id })
                        }
                    },
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                ) { id ->
                    WidgetCard(titel = titelVoor(id), icoon = icoonVoor(id), onClick = { naarTab(doelTabVoor(id)) }) {
                        when (id) {
                            DashboardWidgetId.MEDEDELINGEN -> MededelingenWidget(mededelingenAantal)
                            DashboardWidgetId.KASBOEK -> KasboekWidget(kasboekDagenTotDeadline)
                            DashboardWidgetId.KILOMETERS -> KilometersWidget(kilometersStatus)
                            DashboardWidgetId.MAALTIJDLIJST -> MaaltijdlijstWidget(maaltijdlijstVandaag)
                            DashboardWidgetId.TAKEN -> TakenWidget(takenOpenAantal)
                        }
                    }
                }
            }
        }
    }
}

private fun toegestaneWidgets(rechten: nl.bsodetheepot.mobile.data.models.Rechten): Set<DashboardWidgetId> {
    val toegestaan = mutableSetOf(DashboardWidgetId.KILOMETERS, DashboardWidgetId.TAKEN) // geen apart recht in Rechten-model
    if (rechten.paginaPrikbord != Toegang.GEEN) toegestaan.add(DashboardWidgetId.MEDEDELINGEN)
    if (rechten.paginaKasboek != Toegang.GEEN) toegestaan.add(DashboardWidgetId.KASBOEK)
    if (rechten.paginaMaaltijdlijst != Toegang.GEEN) toegestaan.add(DashboardWidgetId.MAALTIJDLIJST)
    return toegestaan
}

/** Dagen tot de 1e van de volgende maand — de vaste kasboek-deadline. */
private fun kasboekDeadline(): Int {
    val amsterdam = ZoneId.of("Europe/Amsterdam")
    val vandaag = LocalDate.now(amsterdam)
    val eersteVanVolgendeMaand = vandaag.plusMonths(1).withDayOfMonth(1)
    return ChronoUnit.DAYS.between(vandaag, eersteVanVolgendeMaand).toInt()
}

private fun titelVoor(id: DashboardWidgetId): String = when (id) {
    DashboardWidgetId.MEDEDELINGEN -> "Mededelingen"
    DashboardWidgetId.KASBOEK -> "Kasboek"
    DashboardWidgetId.KILOMETERS -> "Kilometerstanden"
    DashboardWidgetId.MAALTIJDLIJST -> "Wie eet er mee"
    DashboardWidgetId.TAKEN -> "Taken"
}

private fun icoonVoor(id: DashboardWidgetId): ImageVector = when (id) {
    DashboardWidgetId.MEDEDELINGEN -> Icons.Filled.PushPin
    DashboardWidgetId.KASBOEK -> Icons.Filled.EuroSymbol
    DashboardWidgetId.KILOMETERS -> Icons.Filled.DirectionsCar
    DashboardWidgetId.MAALTIJDLIJST -> Icons.Filled.Restaurant
    DashboardWidgetId.TAKEN -> Icons.Filled.Checklist
}

private fun doelTabVoor(id: DashboardWidgetId): HoofdTab = when (id) {
    DashboardWidgetId.MEDEDELINGEN -> HoofdTab.MELDINGEN
    DashboardWidgetId.KASBOEK -> HoofdTab.KASBOEK
    DashboardWidgetId.KILOMETERS -> HoofdTab.KILOMETERS
    DashboardWidgetId.MAALTIJDLIJST -> HoofdTab.MAALTIJDLIJST
    DashboardWidgetId.TAKEN -> HoofdTab.TAKEN
}
