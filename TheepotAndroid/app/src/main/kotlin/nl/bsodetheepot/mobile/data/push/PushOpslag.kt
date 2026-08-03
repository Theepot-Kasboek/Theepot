package nl.bsodetheepot.mobile.data.push

import android.content.Context

/**
 * Bewaart profiel-id en FCM-token buiten de Supabase-sessie om. De
 * FirebaseMessagingService kan door Android op elk moment (ook los van een
 * actieve Activity) worden opgestart — bijvoorbeeld als Firebase besluit
 * `onNewToken` te vuren vlak na een cold start — en kan dan niet vertrouwen
 * op een al geladen SessionViewModel.
 */
object PushOpslag {
    private const val BESTAND = "push_opslag"
    private const val SLEUTEL_PROFIEL_ID = "profiel_id"
    private const val SLEUTEL_TOKEN = "fcm_token"

    private fun prefs(context: Context) =
        context.getSharedPreferences(BESTAND, Context.MODE_PRIVATE)

    fun bewaarProfielId(context: Context, profielId: String?) {
        prefs(context).edit().apply {
            if (profielId == null) remove(SLEUTEL_PROFIEL_ID) else putString(SLEUTEL_PROFIEL_ID, profielId)
        }.apply()
    }

    fun profielId(context: Context): String? = prefs(context).getString(SLEUTEL_PROFIEL_ID, null)

    fun bewaarToken(context: Context, token: String) {
        prefs(context).edit().putString(SLEUTEL_TOKEN, token).apply()
    }

    fun token(context: Context): String? = prefs(context).getString(SLEUTEL_TOKEN, null)
}
