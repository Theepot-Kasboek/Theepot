# Theepot Mobile — Android

Native Android-app (Kotlin + Jetpack Compose) voor De Theepot Dashboard.
Zusje van `../TheepotMobile` (de iOS-versie) — geen gedeelde code, wel dezelfde
Supabase-database en dezelfde 1-op-1 aanpak per module. Geen wrapper om de
webapp (dat is `../ios`, de Capacitor-shell).

## Build-status

`./gradlew assembleDebug` is geverifieerd (met de JBR uit Android Studio als
JDK — de systeem-Java was hier nog versie 8, terwijl AGP 8.11.1 Java 11+
vereist). De Firebase-pushcode (`data/push/`) compileert alleen als
`app/google-services.json` aanwezig is; zie "Push notificaties" hieronder.
Gebruikte Supabase Kotlin SDK: `bom:3.6.0` in `app/build.gradle.kts` — als de
API in een latere versie wijzigt, raadpleeg dan de
[supabase-kt docs](https://github.com/supabase-community/supabase-kt).

## Setup

1. Installeer [Android Studio](https://developer.android.com/studio) (bevat Gradle + Android SDK).
2. Open deze map (`TheepotAndroid/`) als project — Android Studio genereert
   automatisch de Gradle-wrapper (`gradlew`) bij de eerste sync.
3. Kopieer `app/src/main/kotlin/nl/bsodetheepot/mobile/data/services/Secrets.example.kt.txt`
   naar `Secrets.kt` in dezelfde map en vul de echte Supabase URL + anon key in
   (dezelfde als `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   uit de webapp). `Secrets.kt` staat in `.gitignore` en wordt nooit gecommit.
   (Voor lokale development is er al een `Secrets.kt` met de dev-sleutels
   ingevuld — check of die nog actueel is.)
4. Sluit een Samsung/Android-telefoon aan via USB, zet **USB-debugging** aan
   (Instellingen → Over de telefoon → 7x op buildnummer tikken → Ontwikkelaarsopties
   → USB-debugging), en kies het toestel als run-target in Android Studio (▶).

## Push notificaties (chat)

FCM v1 (Firebase Cloud Messaging), via `data/push/TheepotMessagingService.kt` +
`data/push/PushService.kt`. Het FCM-token wordt geüpsert in `push_apparaten`
(op `token`, niet `profiel_id + token`), en een tik op een melding deeplinkt
via `data/push/MeldingRouter.kt` naar het juiste gesprek. Serverkant: zie
`../supabase-sql/push_meldingen.sql`, `../app/api/push/chat/route.ts` en
`../lib/push-fcm.ts`.

Handmatige stap vóór dit werkt: een Firebase-project aanmaken met Android-app
`nl.bsodetheepot.mobile`, en het gedownloade `google-services.json` naar
`app/` kopiëren. Dit bestand mag (in tegenstelling tot `Secrets.kt`) wél
gecommit worden — het zit toch al in de APK en is niet geheim. Het echt
geheime stuk (het Firebase service-account-JSON) staat alleen in Vercel-env.

## Structuur

```
app/src/main/kotlin/nl/bsodetheepot/mobile/
  app/            — MainActivity (entry point, meldingtoestemming + deeplink)
  ui/
    theme/        — Theme.kt (merkkleuren, "liquid glass" kaartstijl), TheepotLogo
    nav/          — TheepotApp.kt (root: login vs dashboard)
    screens/      — één map per module + dashboard (bottomnav) + meer (overflow)
  data/
    models/       — data classes die de Supabase-tabellen spiegelen
    services/     — SupabaseManager, Secrets, DateUtils, één service per module
    session/      — SessionViewModel (auth + rechten, spiegelt AuthProvider.tsx)
    push/         — PushService, PushOpslag, TheepotMessagingService, Meldingen,
                    MeldingRouter (deeplink-state)
```

## Modules

Zelfde scope als de iOS-app (zie `../TheepotMobile/README.md` voor de volledige
per-module beschrijving): Meldingen (Prikbord), Chat, Taken & Notities,
Kasboek, Maaltijdlijst, Vakantieplanningen, Weekplanningen, Kilometerstanden.

Bewust weggelaten: Agenda, Activiteitenbeheer, Beleidsstukken, Nieuwsbrieven,
Brandoefening, Medewerkers, Rechtenbeheer, 10-minutengesprekken, VE Planning.

## Verschillen met de iOS-versie (bewuste vereenvoudigingen)

- **Kasboek bonnetje scannen**: iOS gebruikt VisionKit's documentscanner
  (randdetectie/bijsnijden). Android gebruikt de standaard camera-app
  (`ACTION_IMAGE_CAPTURE`) — functioneel gelijk (foto van het bonnetje wordt
  geüpload), maar zonder automatische randdetectie.
- **Vervaldatum-invoer** (Taken, Kilometerstanden): tekstveld in `jjjj-mm-dd`-
  formaat in plaats van een native datepicker-dialoog.

## Referentie

Zie `../THEEPOT_APP_DOCUMENTATIE.md` voor het volledige databaseschema,
modules en rollen (superadmin / directie / leidinggevende / locatie) van de
webapp.
