# Theepot Mobile — Android

Native Android-app (Kotlin + Jetpack Compose) voor De Theepot Dashboard.
Zusje van `../TheepotMobile` (de iOS-versie) — geen gedeelde code, wel dezelfde
Supabase-database en dezelfde 1-op-1 aanpak per module. Geen wrapper om de
webapp (dat is `../ios`, de Capacitor-shell).

## Belangrijk: nog niet build-geverifieerd

Deze code is geschreven zonder Android Studio/SDK/Gradle op de ontwikkelmachine
beschikbaar (in tegenstelling tot de iOS-app, die met `xcodebuild` geverifieerd
kon worden). De eerste build in Android Studio kan dus kleine fixes nodig
hebben — met name in de Supabase Kotlin SDK-aanroepen (`ChatService.kt`,
`KasboekService.kt`, `MaaltijdlijstService.kt`), waarvan de exacte API tussen
supabase-kt-versies weleens wijzigt. Raadpleeg bij compile-errors de
[supabase-kt docs](https://github.com/supabase-community/supabase-kt) voor de
huidige API van de gebruikte versie (`bom:2.6.0` in `app/build.gradle.kts`).

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

## Structuur

```
app/src/main/kotlin/nl/bsodetheepot/mobile/
  app/            — MainActivity (entry point)
  ui/
    theme/        — Theme.kt (merkkleuren, "liquid glass" kaartstijl), TheepotLogo
    nav/          — TheepotApp.kt (root: login vs dashboard)
    screens/      — één map per module + dashboard (bottomnav) + meer (overflow)
  data/
    models/       — data classes die de Supabase-tabellen spiegelen
    services/     — SupabaseManager, Secrets, DateUtils, één service per module
    session/      — SessionViewModel (auth + rechten, spiegelt AuthProvider.tsx)
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
