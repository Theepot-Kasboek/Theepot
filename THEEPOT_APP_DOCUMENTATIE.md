# De Theepot Dashboard — Technische Documentatie

## Over het programma

Een intern beheerprogramma voor BSO De Theepot (kinderopvang), gebouwd als webapplicatie. Het programma wordt gebruikt door medewerkers, leidinggevenden en directie van meerdere locaties.

**Live URL:** Vercel (privé, interne tool)  
**GitHub:** `github.com/Theepot-Kasboek/Theepot.git`  
**Superadmin:** `rooster@bsodetheepot.nl`

---

## Tech Stack (webversie)

| Laag | Technologie |
|------|-------------|
| Framework | Next.js 14.2.3 (App Router) |
| Taal | TypeScript |
| Styling | Tailwind CSS + inline styles |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Hosting | Vercel |
| PDF export | jsPDF |
| Fonts | Sora (headers), DM Sans (body) |

---

## Authenticatie & Rollen

Supabase Auth (email + wachtwoord). Vier rollen:

| Rol | Rechten |
|-----|---------|
| `superadmin` | Volledige toegang tot alles |
| `directie` | Ziet alle locaties, leesrecht op meeste pagina's |
| `leidinggevende` | Ziet alle locaties, beperkt bewerken |
| `locatie` | Alleen toegewezen locaties, ingesteld via rechtenbeheer |

Rechten worden opgeslagen in de `rechten` tabel en `locatie_toegang` tabel. Superadmin en directie/leidinggevende zien automatisch alle locaties zonder handmatige instelling.

---

## Locaties

De BSO heeft meerdere locaties:
- BSO Brede
- BSO Giraf
- BSO Lisse
- BSO Reiger
- BSO SDO
- BSO Vosse
- KDV de Theetuin
- SLS Giraf
- SLS Raam

Elke medewerker krijgt per module (kasboek, maaltijdlijst, weekplanningen, gesprekken, brandoefening) toegang tot specifieke locaties.

---

## Modules / Pagina's

### 1. Dashboard
- Weekagenda (persoonlijk + gedeeld)
- Weekplanning widget (huidige week, per locatie)
- Snelkoppelingen (aanpasbaar per gebruiker)

### 2. Kasboek
- Inkomsten/uitgaven per locatie per maand
- Categorieën beheer
- Bonnetjes uploaden (JPG, PNG, HEIC → auto-convert naar JPEG)
- PDF export
- Locatietoegang per medewerker

### 3. Maaltijdlijst
- Kinderen per dag per locatie bijhouden
- "Meegegeten" vinkjes
- Standaard kinderen per dag instellen
- PDF export (staand/liggend)
- Kinderen verwijderen per dag

### 4. 10-minutengesprekken
- Mentormappen per locatie (aangemaakt door superadmin)
- Accordion-formulier met 7 velden:
  - Overgang van school naar De Theepot
  - Contact met Pedagogisch professional
  - Contact met andere kinderen
  - Speelt graag met… en is goed in…
  - Wij stimuleren, werken aan…
  - Aandachtspunten / bijzonderheden
  - Evaluatie van het gesprek
- PDF export met De Theepot branding + handtekeningregel
- Instelling: auto-verwijder na PDF export
- Locatietoegang per medewerker

### 5. Vakantieplanningen
- Planningen per vakantie (Herfst, Kerst, Mei, Zomer etc. + eigen types)
- Per week, per dag (ma-vr), per categorie activiteiten
- Activiteiten handmatig of uit bibliotheek importeren
- JSON import per dag
- Thema per planning (wijzigbaar)
- Publiceer systeem (superadmin publiceert, locaties zien gepubliceerde planningen)
- PDF export
- Weken toevoegen/verwijderen

### 6. Weekplanningen
- Per locatie, per week
- Twee slots: Knutsel (wissel naar Koken/Bakken) + Groepsspel
- Weekthema instellen
- Activiteiten handmatig of uit bibliotheek
- Bekijk-modal voor volledige beschrijving
- PDF export
- Locatietoegang per medewerker

### 7. Activiteitenbeheer
- Bibliotheek van activiteiten
- Velden: naam, beschrijving, categorie, thema(s) (meerdere), leeftijd, tijdsduur, groepsgrootte, materialen, stappen, afbeelding
- Thema's als array (meerdere per activiteit)
- Filters: categorie, thema, leeftijd (4-7 / 8+), kort (≤30 min)
- Zoekfunctie
- Kopiëren als tekst of als JSON
- AI JSON import (via Claude API prompt)
- PDF export per activiteit
- Afbeeldingen uploaden (Supabase Storage: `activiteit-afbeeldingen`)

### 8. Agenda
- Maand/week/dag/lijst weergave
- Persoonlijke en gedeelde kalenders
- ICS import
- Directie/leidinggevende zien alle kalenders
- Iedereen mag eigen agenda bewerken
- Maandnaam groot naast "Agenda" in topbar

### 9. Taken & Notities
- TickTick-stijl: 3-panelen layout
- **Takenlijsten:** taken met checkbox, prioriteit (vlagjes), vervaldatum, notitie
- **Notitiemappen:** notities als kaartjes, kleurcodering, volledige editor met auto-save
- Slimme views: Alle taken, Vandaag, Gepland
- Privé per account

### 10. Chat
- Direct berichten + groepsgesprekken
- Bestanden/foto's sturen (paperclip knop)
- Gelezen-indicatoren
- Realtime (Supabase Realtime)
- Notificatiebolletje in sidebar
- Supabase Storage: `chat-bestanden`

### 11. Beleidsstukken
- Upload PDF/Word/Excel/afbeeldingen
- Categorieën: Beleid, Protocol, Handleiding, Formulier, Overig
- Zoekfunctie
- Bekijken via signed URL, downloaden
- Supabase Storage: `beleidsstukken` (private)

### 12. Nieuwsbrieven
- **Twee formats:**
  - **Weekmemo** (intern voor team): groene header met logo, sectietitels als groene balken
  - **Theepraatje** (voor ouders): grote header met logo, lichtgroene afgeronde sectietitels
- Secties toevoegen/verwijderen/herordenen
- Bullets (●, •, -, *) worden correct weergegeven in PDF
- Wisselen tussen formats in editor
- PDF export met logo ingebakken als base64

### 13. Brandoefening
- Per locatie, per week (standaard week 18 en 36)
- **Per dag (ma-vr) een formulier:**
  - Datum, tijd, aanwezige PM-ers
  - Aard incident (checkboxes: Brand, Explosie, Gevaarlijke stoffen)
  - Plek van incident
  - Gealarmeerden (checkboxes: BHV-ers, Collega's, Werkgever, Anders)
  - Manier van alarmeren
  - Bijzonderheden
  - Evaluatie
  - Ingevuld door + handtekening
- PDF export (alle 5 dagen in één document)
- Locatietoegang per medewerker

### 14. Medewerkers (superadmin only)
- Accounts aanmaken (Supabase Auth)
- Bij aanmaken: automatisch persoonlijke agenda aangemaakt
- Vier rollen

### 15. Rechtenbeheer (superadmin only)
- **Tab 1 — Per rol:** Toegang (geen/lezen/bewerken) per pagina + functies
- **Tab 2 — Per account:** Overschrijft rolrechten
- **Tab 3 — Locatietoegang:** Per medewerker per locatie voor:
  - Kasboek
  - Maaltijdlijst
  - Weekplanningen
  - 10-minutengesprekken
  - Brandoefening

---

## Database Schema (Supabase / PostgreSQL)

Alle tabellen hebben `DISABLE ROW LEVEL SECURITY`.

```sql
-- Auth & Profielen
profielen (id, email, naam, rol, actief, aangemaakt_op)
rechten (id, rol, profiel_id, pagina_*, functies als booleans)
locatie_toegang (id, profiel_id, locatie_type, locatie_naam, toegang)

-- Kasboek
kasboek_locaties, kasboek_categorieen, kasboek_entries

-- Maaltijdlijst
maaltijd_locaties, maaltijd_standaard_kinderen, maaltijd_weken, maaltijd_registraties

-- Activiteiten
activiteiten (thema TEXT[], afbeelding_pad TEXT)

-- Agenda
agenda_kalenders, agenda_gedeeld, agenda_afspraken

-- Chat
chat_gesprekken, chat_deelnemers, chat_berichten
-- chat_berichten: bericht_type, bestand_pad, bestand_naam, bestand_type

-- Vakantieplanningen
vakantie_planningen (gepubliceerd BOOLEAN)
vakantie_weken, vakantie_activiteiten (benodigdheden TEXT[])
vakantie_categorieen

-- Weekplanningen
week_planningen, week_activiteiten

-- 10-min gesprekken
gesprek_mappen, gesprek_formulieren

-- Taken & Notities
todo_lijsten (type: 'taken' | 'notities', eigenaar_id)
todo_taken (lijst_id, prioriteit, vervaldatum, voltooid)
notities (lijst_id, titel, inhoud, kleur, bijgewerkt_op)

-- Administratie
beleidsstukken
nieuwsbrieven (secties JSONB, format: 'weekmemo' | 'theepraatje')
brandoefening_weken
brandoefening_dagen (week_id, dag, datum, ...)
```

---

## Supabase Storage Buckets

| Bucket | Type | Gebruik |
|--------|------|---------|
| `bonnetjes` | Private | Kasboek bonnetjes |
| `activiteit-afbeeldingen` | Public | Activiteit voorbeeldfoto's |
| `beleidsstukken` | Private | Beleidsdocumenten |
| `chat-bestanden` | Private | Chatbijlagen |

---

## Design Systeem

| Element | Waarde |
|---------|--------|
| Primaire kleur | `#8CC63F` (De Theepot groen) |
| Donker groen | `#3D7010` |
| Dark mode achtergrond | `#1A1A1A` |
| Header font | Sora |
| Body font | DM Sans |
| Logo | JPEG, 180×180px (ingebakken als base64 in login + PDF) |

---

## API Endpoints / Integraties

- **Supabase REST API** — alle data
- **Supabase Auth** — authenticatie
- **Supabase Storage** — bestanden
- **Supabase Realtime** — chat notificaties
- **Anthropic Claude API** — activiteiten JSON genereren (via `/v1/messages`)
- **jsPDF** — PDF export client-side
- **heic2any** — HEIC foto's converteren naar JPEG

---

## Mogelijke iOS App Aanpak

### Optie 1: Native iOS (Swift/SwiftUI)
- Directe Supabase SDK voor Swift (`supabase-swift`)
- Meest performant, beste iOS integratie
- Werk: geheel opnieuw bouwen

### Optie 2: React Native
- Hergebruik van veel businesslogica uit Next.js
- Supabase JS SDK werkt ook in React Native
- Expo voor snellere ontwikkeling

### Optie 3: Progressive Web App (PWA)
- Minste werk — Next.js app uitbreiden met PWA manifest
- Werkt op iPhone via Safari "Voeg toe aan beginscherm"
- Beperkte iOS ondersteuning (geen push notificaties, geen offline)

### Optie 4: Capacitor (Ionic)
- Wikkelt de bestaande webapplicatie in een native shell
- Geeft toegang tot native functies (camera, notificaties)
- Relatief weinig extra werk

### Belangrijke vragen voor iOS:
- Welke modules zijn het meest nodig op mobiel?
- Push notificaties gewenst (chat, agenda)?
- Camera integratie (bonnetjes, activiteit foto's)?
- Offline werken gewenst?
- App Store publicatie of intern distribueren (TestFlight/MDM)?

