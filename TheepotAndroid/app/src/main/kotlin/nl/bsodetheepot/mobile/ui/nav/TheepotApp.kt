package nl.bsodetheepot.mobile.ui.nav

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.screens.dashboard.TabScaffoldScreen
import nl.bsodetheepot.mobile.ui.screens.login.LoginScreen

/** Root van de app: kiest tussen laadscherm, inlogscherm en dashboard — spiegelt RootView.swift. */
@Composable
fun TheepotApp(session: SessionViewModel) {
    LaunchedEffect(Unit) {
        session.bootstrap()
    }

    val isLoading by session.isLoading.collectAsState()
    val profiel by session.profiel.collectAsState()

    when {
        isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        profiel != null -> TabScaffoldScreen(session = session)
        else -> LoginScreen(session = session)
    }
}
