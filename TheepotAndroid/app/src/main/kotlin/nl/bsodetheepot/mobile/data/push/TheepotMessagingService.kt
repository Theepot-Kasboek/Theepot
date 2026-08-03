package nl.bsodetheepot.mobile.data.push

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.runBlocking
import nl.bsodetheepot.mobile.R
import nl.bsodetheepot.mobile.app.MainActivity

class TheepotMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        PushOpslag.bewaarToken(applicationContext, token)
        val profielId = PushOpslag.profielId(applicationContext) ?: return
        // onNewToken draait al op een achtergrondthread van FCM zelf, dus
        // blocking hier is veilig en voorkomt dat de sync verloren gaat als
        // het proces meteen daarna wordt beëindigd.
        runBlocking { PushService.syncToken(applicationContext, profielId, token) }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val type = message.data["type"]
        val gesprekId = message.data["gesprek_id"]

        // Onderdrukt de melding als de gebruiker het gesprek al open heeft
        // staan — spiegelt willPresent in AppDelegate.swift (iOS).
        if (type == "chat" && gesprekId != null && gesprekId == MeldingRouter.actiefGesprekId.value) return

        val titel = message.notification?.title ?: "Theepot"
        val body = message.notification?.body ?: "Nieuw bericht"

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("type", type)
            putExtra("gesprek_id", gesprekId)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            gesprekId?.hashCode() ?: 0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notificatie = NotificationCompat.Builder(this, Meldingen.CHAT_KANAAL_ID)
            .setSmallIcon(R.drawable.ic_stat_melding)
            .setColor(ContextCompat.getColor(this, R.color.theepot_groen))
            .setContentTitle(titel)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        // tag = gesprekId geeft hetzelfde collapse-gedrag als apns-collapse-id
        // op iOS: een nieuw bericht in hetzelfde gesprek vervangt de vorige melding.
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(gesprekId ?: type ?: "melding", 0, notificatie)
    }
}
