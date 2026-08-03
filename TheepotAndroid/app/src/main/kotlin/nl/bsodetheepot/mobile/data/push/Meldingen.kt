package nl.bsodetheepot.mobile.data.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import nl.bsodetheepot.mobile.R

object Meldingen {
    const val CHAT_KANAAL_ID = "chat_meldingen"

    /** Idempotent: mag bij elke app-start opnieuw aangeroepen worden. */
    fun maakKanalenAan(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val kanaal = NotificationChannel(
            CHAT_KANAAL_ID,
            context.getString(R.string.notificatiekanaal_chat_naam),
            NotificationManager.IMPORTANCE_HIGH,
        )
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(kanaal)
    }
}
