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
import androidx.compose.material.icons.filled.EuroSymbol
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.screens.account.AccountScreen
import nl.bsodetheepot.mobile.ui.screens.chat.ChatListScreen
import nl.bsodetheepot.mobile.ui.screens.kasboek.KasboekScreen
import nl.bsodetheepot.mobile.ui.screens.kilometerstanden.KilometerstandenScreen
import nl.bsodetheepot.mobile.ui.screens.maaltijdlijst.MaaltijdlijstScreen
import nl.bsodetheepot.mobile.ui.screens.prikbord.PrikbordScreen
import nl.bsodetheepot.mobile.ui.screens.taken.TakenScreen
import nl.bsodetheepot.mobile.ui.screens.vakantieplanningen.VakantieplanningenScreen
import nl.bsodetheepot.mobile.ui.screens.weekplanningen.WeekplanningenScreen

private data class Tab(val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab("Meldingen", Icons.Filled.PushPin),
    Tab("Chat", Icons.Filled.Chat),
    Tab("Taken", Icons.Filled.Checklist),
    Tab("Kasboek", Icons.Filled.EuroSymbol),
    Tab("Maaltijdlijst", Icons.Filled.Restaurant),
    Tab("Vakantie", Icons.Filled.WbSunny),
    Tab("Weekplanning", Icons.Filled.CalendarToday),
    Tab("Kilometers", Icons.Filled.DirectionsCar),
    Tab("Account", Icons.Filled.AccountCircle),
)

/**
 * Eén horizontaal scrollbare tabbalk voor alle modules — swipe of scroll de
 * balk zelf naar links/rechts voor de rest van de pagina's, of swipe de
 * inhoud (HorizontalPager schuift synchroon mee met de balk).
 */
@Composable
fun DashboardScreen(session: SessionViewModel) {
    val pagerState = rememberPagerState(pageCount = { tabs.size })
    val balkState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(pagerState.currentPage) {
        balkState.animateScrollToItem(maxOf(0, pagerState.currentPage - 1))
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
            when (page) {
                0 -> PrikbordScreen(session = session)
                1 -> ChatListScreen(session = session)
                2 -> TakenScreen(session = session)
                3 -> KasboekScreen(session = session)
                4 -> MaaltijdlijstScreen(session = session)
                5 -> VakantieplanningenScreen(session = session)
                6 -> WeekplanningenScreen(session = session)
                7 -> KilometerstandenScreen(session = session)
                else -> AccountScreen(session = session)
            }
        }
    }
}
