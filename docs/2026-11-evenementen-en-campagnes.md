# Campagnes & Evenementen — wijzigingen (november 2026)

Overzicht van wat er in deze sessie is aangepast, voor later referentie.

## 1. Campagnebouwer: dikte scheidingslijn

**Bestand:** `components/campagnes/CampagneBouwer.tsx`

De scheiding-blok had al een dikte- en kleurregelaar (`lijndikte`, `lijnkleur`),
maar die stonden verborgen achter de checkbox "Lijntje tonen". Nu staan Hoogte,
Dikte en Kleur altijd zichtbaar naast elkaar; Dikte/Kleur zijn uitgegrijsd
(disabled) zolang "Lijntje tonen" niet is aangevinkt.

## 2. Evenementen: zelf invulvakjes toevoegen

Beheerders kunnen per evenement eigen aanmeldvelden definiëren, naast de
standaardvelden Naam en E-mail (die altijd verplicht zijn).

**Databasetabellen** (`supabase-sql/evenementen.sql`):
- `evenement_velden` — `id`, `evenement_id`, `label`, `type` (`tekst` | `keuze`),
  `opties` (`text[]`, alleen bij `keuze`), `meerdere` (boolean, staat een
  dropdown toe als aanvinklijst met meerdere keuzes i.p.v. één), `verplicht`,
  `volgorde`.
- `evenement_veld_antwoorden` — koppelt een antwoord (`waarde`, tekst) aan een
  `aanmelding_id` + `veld_id`. Bij `meerdere` velden worden de gekozen opties
  als `"optie1, optie2"` opgeslagen.

Het SQL-bestand is idempotent (`create table if not exists`, `add column if
not exists`) — opnieuw uitvoeren in de Supabase SQL-editor is altijd veilig.

**Beheer** (`app/evenementen/[id]/page.tsx`, knop "Velden beheren"):
- Velden toevoegen (tekstveld of dropdown met komma-gescheiden opties),
  verplicht/optioneel instellen, volgorde aanpassen (omhoog/omlaag), verwijderen.
- Dropdown-velden kunnen "meerdere opties toestaan" krijgen (aanvinklijst).
- Naam en E-mail staan als vaste, niet-verwijderbare standaardvelden bovenaan,
  gemarkeerd als altijd verplicht.

**Publieke aanmeldpagina** (`app/evenementen/[id]/aanmelden/page.tsx`):
- Toont de aanvullende velden onder Naam/E-mail; dropdowns met `meerdere`
  worden als aanvinklijst getoond, anders als normale `<select>`.
- Validatie zowel client- als server-side (`app/api/evenementen/aanmelden/route.ts`):
  verplichte velden moeten ingevuld zijn, gekozen opties moeten bestaan in de
  door de beheerder ingestelde lijst.
- Tekst in de invulvakken heeft dezelfde groene kleur (`#4C7A20`) als de
  veldlabels, voor beter contrast.

**Handmatig aanmelden** (zelfde detailpagina): toont en valideert dezelfde
aanvullende velden als de publieke pagina.

**Export/overzicht**: de aanmeldingentabel toont de aanvullende velden als
extra kolommen; CSV-export (`exporteerVolledig`) neemt ze mee.

**lib/evenementen.ts** — belangrijkste nieuwe functies:
- `haalVeldenOp`, `maakVeldAan`, `wijzigVeld`, `verwijderVeld`
- `haalAntwoordenOp` (antwoorden per aanmelding ophalen)
- `slaVeldAntwoordenOp`, `wisselMeerkeuzeOptie`, `meerkeuzeOpties` (helpers
  voor het comma-separated opslaan/lezen van meerkeuze-antwoorden)

## 3. Fix: publieke aanmeldpagina kon niet scrollen

**Bestand:** `components/LayoutShell.tsx`

De publieke evenement-aanmeldpagina (`/evenementen/[id]/aanmelden`) werd per
ongeluk gewrapt in de dashboard-sidebar-layout. Die layout gebruikt
`overflow: hidden` op `.app-layout`/`.main-area` (`app/globals.css`), wat de
pagina liet afkappen zonder scroll zodra er meerdere aanvullende velden bij
een evenement stonden (goed zichtbaar op mobiel/in-app browsers zoals
WhatsApp).

Opgelost door dit route-patroon (hetzelfde als `middleware.ts` al gebruikt
voor de auth-uitzondering) ook uit te sluiten van de sidebar in `LayoutShell`.

## 4. Evenementen: zoeken, sorteren en filteren in de aanmeldingenlijst

**Bestand:** `app/evenementen/[id]/page.tsx`

Boven de aanmeldingentabel:
- **Zoeken** op naam of e-mailadres.
- **Sorteren**: Nieuwste eerst, Oudste eerst, Naam A-Z, Naam Z-A.
- **Filteren per dropdown-veld**: knop per veld opent een aanvinklijst met de
  door de beheerder ingestelde opties; werkt ook voor velden met `meerdere`
  toegestaan (antwoord bevat dan één van de geselecteerde opties).
- "Wis filters"-knop verschijnt zodra een zoekterm/filter actief is; de teller
  toont dan bijv. "3 van 12 aanmeldingen".

## Nog te doen / aandachtspunten

- Als je het SQL-script nog niet (opnieuw) hebt uitgevoerd na de toevoeging
  van de `meerdere`-kolom: doe dit via de Supabase SQL-editor met de inhoud
  van `supabase-sql/evenementen.sql`.
- CSV-export exporteert altijd de volledige lijst, niet de gefilterde/
  gezochte subset — dat is bewust zo gelaten.
