package nl.bsodetheepot.mobile.data.push

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.runBlocking
import nl.bsodetheepot.mobile.R
import nl.bsodetheepot.mobile.app.MainActivity

private const val TAG = "Push"

class TheepotMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        Log.d(TAG, "FCM-registratie geslaagd, token: $token")
        PushOpslag.bewaarToken(applicationContext, token)
        val profielId = PushOpslag.profielId(applicationContext)
        if (profielId == null) {
            Log.d(TAG, "syncToken overgeslagen: nog geen profiel ingelogd")
            return
        }
        // onNewToken draait al op een achtergrondthread van FCM zelf, dus
        // blocking hier is veilig en voorkomt dat de sync verloren gaat als
        // het proces meteen daarna wordt beëindigd.
        runBlocking { PushService.syncToken(applicationContext, profielId, token) }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        Log.d(TAG, "Bericht ontvangen: ${message.data}")
        val type = message.data["type"]
        val gesprekId = message.data["gesprek_id"]
        val afspraakId = message.data["afspraak_id"]

        // Onderdrukt de melding als de gebruiker het gesprek al open heeft
        // staan — spiegelt willPresent in AppDelegate.swift (iOS).
        if (type == "chat" && gesprekId != null && gesprekId == MeldingRouter.actiefGesprekId.value) return

        val titel = message.notification?.title ?: "Theepot"
        val body = message.notification?.body ?: "Nieuw bericht"
        val kanaalId = if (type == "agenda") Meldingen.AGENDA_KANAAL_ID else Meldingen.CHAT_KANAAL_ID
        val tag = gesprekId ?: afspraakId ?: type ?: "melding"

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("type", type)
            putExtra("gesprek_id", gesprekId)
            putExtra("afspraak_id", afspraakId)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            tag.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notificatie = NotificationCompat.Builder(this, kanaalId)
            .setSmallIcon(R.drawable.ic_stat_melding)
            .setColor(ContextCompat.getColor(this, R.color.theepot_groen))
            .setContentTitle(titel)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        // tag = gesprekId/afspraakId geeft hetzelfde collapse-gedrag als
        // apns-collapse-id op iOS: eenzelfde melding vervangt de vorige.
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(tag, 0, notificatie)
    }
}
