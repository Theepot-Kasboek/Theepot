# Theepot Mobile (iOS light versie)

Native SwiftUI-app voor De Theepot Dashboard. Geen wrapper om de webapp (dat is
`../ios`, de Capacitor-shell) — dit is een losstaande, kleinere iOS-app die
rechtstreeks met dezelfde Supabase-database praat.

## Setup

1. Installeer [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`) — al aanwezig op deze machine.
2. Vul `TheepotMobile/Services/Secrets.swift` met de echte Supabase URL + anon key
   (dezelfde als `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` uit de webapp).
   Dit bestand staat in `.gitignore` en wordt nooit gecommit.
3. Genereer/regenereer het Xcode-project na wijzigingen in `project.yml`:
   ```
   xcodegen generate
   open TheepotMobile.xcodeproj
   ```

## Status

Bouwt succesvol (geverifieerd met `xcodebuild` op de iOS Simulator, iOS 17+).
Login (Supabase Auth) + zwevende "liquid glass" tabbalk (5 hoofdmodules +
"Meer") met de merkkleur groen (`#8CC63F`, zelfde als `--primary` in
app/globals.css) en het Theepot-logo (login, "Meer"-scherm, app icon). Elke
module gespiegeld op de bijbehorende webapp-pagina inclusief
rechten/locatietoegang (`SessionStore` spiegelt `components/AuthProvider.tsx`):

- **Meldingen (Prikbord)** — volledig CRUD, leesbevestigingen, verloopdatum
- **Chat** — direct/groep, tekst + bestand/foto versturen, realtime, leesbevestigingen
- **Kasboek** — boekingen per locatie/maand toevoegen, bonnetje scannen via VisionKit
  (documentscanner) en uploaden; geen categorie-/locatiebeheer of PDF-export
- **Maaltijdlijst** — alleen "meegegeten" toggelen per kind/dag; geen kinderenbeheer
- **Vakantieplanningen** — alleen-lezen, alleen gepubliceerde plannings (tenzij bewerkrecht)
- **Weekplanningen** — alleen-lezen, weekthema + Knutsel/Koken/Bakken + Groepsspel
- **Taken & Notities** — volledige pariteit: lijsten, taken, notitiemappen met auto-save,
  slimme weergaves (Vandaag/Gepland)
- **Kilometerstanden** — alleen nieuwe stand invullen (met validatie t.o.v. laatste stand);
  geen voertuigbeheer

Niet meegenomen (bewust buiten scope): Agenda, Activiteitenbeheer, Beleidsstukken,
Nieuwsbrieven, Brandoefening, Medewerkers, Rechtenbeheer, 10-minutengesprekken, VE Planning.

## Structuur

```
TheepotMobile/
  App/            — app entry point
  Views/          — SwiftUI views, één map per module + DashboardView (tabbalk + "Meer")
  Models/         — Codable modellen die de Supabase-tabellen spiegelen
  Services/       — SupabaseManager, SessionStore (auth + rechten), één service per module
  Support/        — Theme.swift: merkkleuren, "liquid glass" kaartstijl, logo-component
  Resources/      — Info.plist, Assets.xcassets (Logo, AppIcon, AccentColor)
```

## Referentie

Zie `../THEEPOT_APP_DOCUMENTATIE.md` voor het volledige databaseschema,
modules en rollen (superadmin / directie / leidinggevende / locatie) van de
webapp.
