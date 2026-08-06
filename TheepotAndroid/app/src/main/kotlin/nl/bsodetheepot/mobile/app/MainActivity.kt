package nl.bsodetheepot.mobile.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.core.content.ContextCompat
import nl.bsodetheepot.mobile.data.push.Meldingen
import nl.bsodetheepot.mobile.data.push.MeldingRouter
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.nav.TheepotApp
import nl.bsodetheepot.mobile.ui.theme.TheepotTheme

class MainActivity : ComponentActivity() {
    private val session: SessionViewModel by viewModels()

    private val meldingToestemming = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Meldingen.maakKanalenAan(applicationContext)
        vraagMeldingToestemmingIndienNodig()
        verwerkDeeplink(intent)

        setContent {
            TheepotTheme {
                TheepotApp(session = session)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        verwerkDeeplink(intent)
    }

    /** Android 13+ vereist expliciete toestemming voor pushmeldingen. */
    private fun vraagMeldingToestemmingIndienNodig() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val heeftToestemming = ContextCompat.checkSelfPermission(
            this, Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
        if (!heeftToestemming) meldingToestemming.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    /** Tik op een pushmelding (of cold start via de intent-extra's) → naar het juiste gesprek/afspraak. */
    private fun verwerkDeeplink(intent: Intent?) {
        val type = intent?.getStringExtra("type")
        val gesprekId = intent?.getStringExtra("gesprek_id")
        val afspraakId = intent?.getStringExtra("afspraak_id")
        if (type == "chat" && gesprekId != null) MeldingRouter.open(gesprekId)
        if (type == "agenda" && afspraakId != null) MeldingRouter.openAfspraak(afspraakId)
    }
}
