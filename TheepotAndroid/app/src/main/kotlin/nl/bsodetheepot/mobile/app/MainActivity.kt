package nl.bsodetheepot.mobile.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.nav.TheepotApp
import nl.bsodetheepot.mobile.ui.theme.TheepotTheme

class MainActivity : ComponentActivity() {
    private val session: SessionViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TheepotTheme {
                TheepotApp(session = session)
            }
        }
    }
}
