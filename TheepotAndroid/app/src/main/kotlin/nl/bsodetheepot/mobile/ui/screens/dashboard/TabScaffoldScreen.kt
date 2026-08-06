package nl.bsodetheepot.mobile.ui.screens.dashboard

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.EuroSymbol
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.push.MeldingRouter
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.screens.account.AccountScreen
import nl.bsodetheepot.mobile.ui.screens.agenda.AgendaScreen
import nl.bsodetheepot.mobile.ui.screens.chat.ChatListScreen
import nl.bsodetheepot.mobile.ui.screens.kasboek.KasboekScreen
import nl.bsodetheepot.mobile.ui.screens.kilometerstanden.KilometerstandenScreen
import nl.bsodetheepot.mobile.ui.screens.maaltijdlijst.MaaltijdlijstScreen
import nl.bsodetheepot.mobile.ui.screens.prikbord.PrikbordScreen
import nl.bsodetheepot.mobile.ui.screens.taken.TakenScreen
import nl.bsodetheepot.mobile.ui.screens.vakantieplanningen.VakantieplanningenScreen
import nl.bsodetheepot.mobile.ui.screens.weekplanningen.WeekplanningenScreen

/**
 * Elke module is een tab (index bepaald door z'n plek in [HoofdTab.entries]).
 * Voorheen hardcoded indices (1 voor chat, 2 voor agenda) voor de push-
 * deeplinks — nu via de enum, zodat een nieuwe tab die niet meer laat breken.
 */
enum class HoofdTab(val label: String, val icon: ImageVector) {
    HOME("Home", Icons.Filled.GridView),
    MELDINGEN("Meldingen", Icons.Filled.PushPin),
    CHAT("Chat", Icons.Filled.Chat),
    AGENDA("Agenda", Icons.Filled.Event),
    TAKEN("Taken", Icons.Filled.Checklist),
    KASBOEK("Kasboek", Icons.Filled.EuroSymbol),
    MAALTIJDLIJST("Maaltijdlijst", Icons.Filled.Restaurant),
    VAKANTIE("Vakantie", Icons.Filled.WbSunny),
    WEEKPLANNING("Weekplanning", Icons.Filled.CalendarToday),
    KILOMETERS("Kilometers", Icons.Filled.DirectionsCar),
    ACCOUNT("Account", Icons.Filled.AccountCircle),
}

private val tabs = HoofdTab.entries

/**
 * Eén horizontaal scrollbare tabbalk voor alle modules — swipe of scroll de
 * balk zelf naar links/rechts voor de rest van de pagina's, of swipe de
 * inhoud (HorizontalPager schuift synchroon mee met de balk).
 */
@Composable
fun TabScaffoldScreen(session: SessionViewModel) {
    val pagerState = rememberPagerState(
        initialPage = tabs.indexOf(HoofdTab.HOME),
        pageCount = { tabs.size },
    )
    val balkState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(pagerState.currentPage) {
        balkState.animateScrollToItem(maxOf(0, pagerState.currentPage - 1))
    }

    // Tik op een chat-pushmelding: naar de chattab. ChatListScreen pakt de
    // rest van de deeplink (het juiste gesprek openen) zelf op.
    val gewenstGesprekId by MeldingRouter.gewenstGesprekId.collectAsState()
    LaunchedEffect(gewenstGesprekId) {
        if (gewenstGesprekId != null) pagerState.animateScrollToPage(tabs.indexOf(HoofdTab.CHAT))
    }

    // Tik op een agenda-herinnering: naar de agendatab. AgendaScreen pakt de
    // rest van de deeplink (de juiste afspraak openen) zelf op.
    val gewenstAfspraakId by MeldingRouter.gewenstAfspraakId.collectAsState()
    LaunchedEffect(gewenstAfspraakId) {
        if (gewenstAfspraakId != null) pagerState.animateScrollToPage(tabs.indexOf(HoofdTab.AGENDA))
    }

    Scaffold(
        bottomBar = {
            Surface(tonalElevation = 3.dp) {
                LazyRow(
                    state = balkState,
                    modifier = Modifier.fillMaxWidth().navigationBarsPadding(),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp),
                ) {
                    items(tabs.size) { index ->
                        val tab = tabs[index]
                        val geselecteerd = pagerState.currentPage == index
                        val kleur = if (geselecteerd) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant

                        Column(
                            modifier = Modifier
                                .widthIn(min = 68.dp)
                                .clickable { scope.launch { pagerState.animateScrollToPage(index) } }
                                .padding(horizontal = 10.dp, vertical = 4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Icon(tab.icon, contentDescription = tab.label, tint = kleur)
                            Text(tab.label, color = kleur, style = MaterialTheme.typography.labelSmall, maxLines = 1)
                        }
                    }
                }
            }
        },
    ) { padding ->
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize().padding(padding),
        ) { page ->
            when (tabs[page]) {
                HoofdTab.HOME -> DashboardHomeScreen(session = session, naarTab = { doel ->
                    scope.launch { pagerState.animateScrollToPage(tabs.indexOf(doel)) }
                })
                HoofdTab.MELDINGEN -> PrikbordScreen(session = session)
                HoofdTab.CHAT -> ChatListScreen(session = session)
                HoofdTab.AGENDA -> AgendaScreen(session = session)
                HoofdTab.TAKEN -> TakenScreen(session = session)
                HoofdTab.KASBOEK -> KasboekScreen(session = session)
                HoofdTab.MAALTIJDLIJST -> MaaltijdlijstScreen(session = session)
                HoofdTab.VAKANTIE -> VakantieplanningenScreen(session = session)
                HoofdTab.WEEKPLANNING -> WeekplanningenScreen(session = session)
                HoofdTab.KILOMETERS -> KilometerstandenScreen(session = session)
                HoofdTab.ACCOUNT -> AccountScreen(session = session)
            }
        }
    }
}
