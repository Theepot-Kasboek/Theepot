# Plan: Kasboek "publiceren" wordt "afronden" (+ meldingen-systeem)

> Status: **plan compleet, nog niet gebouwd.** Alle open vragen zijn
> beantwoord (zie §5) en de brandoefening-module is toegevoegd aan de scope.
> De huidige "publiceren"-knop in het kasboek (zie `app/kasboek/page.tsx`,
> tabel `kasboek_periode_status`) bestaat al en werkt, maar wordt met dit
> plan vervangen door het "afronden"-concept hieronder — en hetzelfde
> patroon wordt ook toegepast op `app/brandoefening/page.tsx`.

## 1. Doel

Het huidige kasboek "publiceren" zorgt er alleen voor dat directie een
maand pas ziet nádat de invuller publiceert. Dat wordt uitgebreid/vervangen
door **afronden**:

- Zodra een kasboekmaand (per locatie) is **afgerond**, kan er door **niemand**
  meer iets in gewijzigd worden — ook niet door de invuller zelf.
- Een **beheerder** (rol leidinggevende, directie, of superadmin/"Admin") kan
  dit slot weer opheffen ("toezeggen") zodat er alsnog gewijzigd kan worden.
- Zodra dat gebeurt, moet er een **melding** verstuurd worden naar een
  vooraf/instelbare lijst van accounts.
- Die meldingen moeten ergens terug te vinden zijn: een nieuwe **dashboard-widget
  "Meldingen"**.

## 2. Nieuwe workflow (kasboek)

1. Invuller vult boekingen in voor een locatie + maand (zoals nu).
2. Invuller klikt op **"Afronden"** (i.p.v. de huidige "Publiceren"-knop).
   → Status van die locatie/maand wordt `afgerond`.
3. Zolang een maand `afgerond` is:
   - Geen nieuwe boekingen toevoegen.
   - Geen bestaande boekingen bewerken of verwijderen.
   - Dit geldt voor **iedereen**, inclusief de oorspronkelijke invuller en
     superadmin (tenzij expliciet heropend, zie stap 4).
   - Een kasboekmaand is **altijd** zichtbaar voor directie en leidinggevenden,
     ongeacht de status (`open` of `afgerond`). Het aparte "publiceren"-concept
     (verbergen tot publicatie) vervalt volledig en wordt vervangen door dit
     afronden-model — er is geen aparte zichtbaarheidsvlag meer nodig.
   - Zowel de invuller als beheerders (leidinggevende, directie, superadmin)
     mogen een maand afronden.
4. Als er alsnog iets gewijzigd moet worden:
   - Een **beheerder** (leidinggevende, directie of superadmin/"Admin") kan de
     maand direct heropenen via een "Heropenen"-knop — geen verzoek/
     goedkeuringsflow, de status gaat direct terug naar `open`.
5. Zodra een maand wordt **afgerond**, gaat er een **melding** naar een vooraf
   ingestelde, vaste lijst van accounts (zie §4) — bijvoorbeeld naar directie,
   zodat zij weten dat de maand klaar staat. Bij **heropenen** is géén
   melding nodig.
6. Na een wijziging kan de maand opnieuw afgerond worden (terug naar stap 2).
   Het afronden geldt uitsluitend voor de betreffende maand — andere
   (bijvoorbeeld de eerstvolgende) maanden blijven gewoon onafhankelijk
   in te vullen.

## 3. Datamodel (voorstel)

Uitbreiding van de bestaande tabel `kasboek_periode_status`
(`supabase-sql/kasboek_datum_en_publiceren.sql`):

```sql
-- status: 'open' (in bewerking) | 'afgerond' (locked)
alter table kasboek_periode_status
  add column if not exists status text not null default 'open'
  check (status in ('open', 'afgerond'));

-- wie/wanneer heropend heeft, voor een audit-trail
alter table kasboek_periode_status
  add column if not exists heropend_op timestamptz,
  add column if not exists heropend_door text;
```

De bestaande kolommen `gepubliceerd` / `gepubliceerd_op` / `gepubliceerd_door`
worden hernoemd/hergebruikt naar `afgerond` / `afgerond_op` / `afgerond_door`
(of het equivalent van de nieuwe `status`-kolom). Een apart "zichtbaar voor
directie"-gedrag is niet meer nodig: een maand is altijd zichtbaar voor
directie en leidinggevenden, ongeacht status. Het "publiceren"-concept
(inclusief de knop en de gating op zichtbaarheid) vervalt volledig.

## 4. Meldingen-systeem

Nieuw, generiek te maken (niet alleen voor kasboek — kan later voor meer
gebeurtenissen gebruikt worden):

```sql
create table if not exists meldingen (
  id uuid primary key default gen_random_uuid(),
  type text not null,              -- bv. 'kasboek_afgerond'
  titel text not null,
  bericht text not null,
  context jsonb,                   -- bv. { locatie_naam, periode }
  aangemaakt_op timestamptz not null default now(),
  aangemaakt_door text
);

create table if not exists melding_ontvangers (
  id uuid primary key default gen_random_uuid(),
  melding_id uuid not null references meldingen(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  gelezen_op timestamptz
);
```

En een instelling waarmee **jij aangeeft welke accounts** meldingen van het
type `kasboek_afgerond` (en later mogelijk andere types, zoals
`brandoefening_afgerond`) horen te krijgen — bijvoorbeeld een tabel
`melding_voorkeuren (type, profiel_id)` die je beheert via een nieuw stukje
in **Rechtenbeheer** of **Instellingen**: een lijst medewerkers met een
aan/uit-vinkje per meldingtype. Dit is een vaste, vooraf ingestelde lijst —
niet iets dat je per keer opnieuw kiest bij het afronden zelf.
Bij **heropenen** wordt geen melding verstuurd.

### Dashboard-widget "Meldingen"

- Nieuwe widget in `app/page.tsx` / `components/` (zie bestaande
  widget-systeem, `dashboard_voorkeuren` tabel voor volgorde/aan-uit per
  gebruiker — zelfde patroon hergebruiken).
- Toont de ongelezen (of laatste N) meldingen voor de ingelogde gebruiker,
  met titel, bericht en tijdstip.
- Klikken op een melding markeert 'm als gelezen (`gelezen_op`) en
  linkt eventueel door naar de betreffende kasboekmaand.
- Voor de mobiele apps (iOS/Android): op termijn hetzelfde widget-concept,
  eventueel gecombineerd met de al bestaande push-notificaties
  (`push_meldingen.sql`) zodat een melding ook als pushbericht binnenkomt.

## 5. Genomen besluiten (voorheen open vragen)

1. **Heropenen: direct.** Een beheerder (leidinggevende, directie,
   superadmin) heropent een afgeronde maand direct via een
   "Heropenen"-knop — geen verzoek/goedkeuringsflow.
2. **Wie mag afronden:** zowel de invuller (huidige "mag bewerken"-rol voor
   die locatie) als beheerders.
3. **Ontvangers van de melding:** een vaste, vooraf ingestelde lijst
   accounts (via `melding_voorkeuren`), niet per keer opnieuw te kiezen.
4. **Melding bij afronden, niet bij heropenen.** Zodra een maand wordt
   afgerond gaat er een melding naar de ingestelde lijst (bv. directie:
   "maand X is afgerond"). Heropenen zelf triggert geen melding.
   Afronden geldt uitsluitend voor de betreffende maand; andere maanden
   blijven onafhankelijk gewoon in te vullen.
5. **Zichtbaarheid voor directie:** het aparte "publiceren"-concept vervalt
   volledig. Een kasboekmaand is altijd zichtbaar voor directie en
   leidinggevenden, ongeacht status (`open` of `afgerond`).
6. **Ook brandoefening:** de brandoefening-evaluatie
   (`app/brandoefening/page.tsx`) krijgt in dezelfde klap hetzelfde
   afronden+heropenen+meldingen-model als het kasboek (zie §6).

## 6. Hergebruik van bestaande code

- `app/kasboek/page.tsx`: `periodeStatus`, `togglePubliceren`,
  `isDirectieViewer`, `magPubliceren` — dit wordt de basis, met
  `gepubliceerd` (boolean) vervangen door `status` (`'open' | 'afgerond'`).
  `togglePubliceren` wordt `afronden` (voor invuller én beheerders) plus een
  nieuwe `heropenen`-actie die alleen beschikbaar is voor leidinggevende/
  directie/superadmin. `isDirectieViewer`-gating op zichtbaarheid vervalt:
  directie/leidinggevenden zien de maand altijd, ongeacht status.
- Rechtenbeheer-patroon (`app/rechten/page.tsx`, `LocatieToegang`-component)
  voor eventuele nieuwe rechten (bv. "wie mag heropenen" als dat verschilt
  van de standaard rol-indeling).
- Dashboard-widgetsysteem (`app/page.tsx`, `dashboard_voorkeuren`-tabel) als
  basis voor de nieuwe "Meldingen"-widget.
- `supabase-sql/push_meldingen.sql` als mogelijke basis om meldingen ook als
  pushbericht naar de mobiele apps te sturen.
- `app/brandoefening/page.tsx`: heeft een vergelijkbaar publiceren/
  alleen-lezen-patroon en krijgt hetzelfde `status`
  (`'open' | 'afgerond'`) + afronden/heropenen + `brandoefening_afgerond`-
  melding, analoog aan het kasboek hierboven.
