package nl.bsodetheepot.mobile.data.push

import android.content.Context
import android.os.Build
import com.google.firebase.messaging.FirebaseMessaging
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.tasks.await
import nl.bsodetheepot.mobile.data.models.PushApparaat
import nl.bsodetheepot.mobile.data.services.SupabaseManager

/**
 * Beheert het FCM-devicetoken en de rij in `push_apparaten`. Analoog aan
 * PushService.swift, maar dan de Android-kant.
 *
 * LET OP: het exacte upsert-argument-formaat van supabase-kt kan per
 * pakketversie verschillen — controleer dit tegen de geïnstalleerde versie
 * (bom:3.6.0 in app/build.gradle.kts) als de build hierop faalt.
 */
object PushService {
    /** Haalt (of genereert) het FCM-token op en koppelt het aan dit profiel. */
    suspend fun registreerEnSync(context: Context, profielId: String) {
        PushOpslag.bewaarProfielId(context, profielId)
        val token = runCatching { FirebaseMessaging.getInstance().token.await() }.getOrNull() ?: return
        PushOpslag.bewaarToken(context, token)
        syncToken(context, profielId, token)
    }

    /** Aangeroepen vanuit registreerEnSync, en vanuit TheepotMessagingService.onNewToken. */
    suspend fun syncToken(context: Context, profielId: String, token: String) {
        val apparaat = PushApparaat(
            profielId = profielId,
            token = token,
            bundelId = context.packageName,
            appVersie = runCatching {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0).versionName
            }.getOrNull(),
            apparaatNaam = "${Build.MANUFACTURER} ${Build.MODEL}",
        )
        runCatching {
            SupabaseManager.client.postgrest["push_apparaten"].upsert(apparaat) { onConflict = "token" }
        }
    }

    /**
     * Verwijdert de rij bij uitloggen. Bewust géén FCM-tokendeletion — het
     * token blijft geldig en moet werken voor de volgende gebruiker die op
     * dit toestel inlogt.
     */
    suspend fun afmelden(context: Context) {
        val token = PushOpslag.token(context)
        if (token != null) {
            runCatching {
                SupabaseManager.client.postgrest["push_apparaten"].delete { filter { eq("token", token) } }
            }
        }
        PushOpslag.bewaarProfielId(context, null)
    }
}
