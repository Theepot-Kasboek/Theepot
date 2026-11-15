# Voorstel: eigen (lokale) database voor het Theepot-dashboard

**Opgesteld door:** Lucas Molenkamp (De Molen Software)
**Datum:** 22 september 2026
**Doel van dit document:** een volledig en eerlijk overzicht geven van de mogelijkheid om de database van het Theepot-dashboard (medewerker-, kind- en financiële gegevens) niet langer bij een externe cloudpartij te laten draaien, maar op eigen infrastructuur. Dit document dient als basis voor besluitvorming door de directie van De Theepot.

---

## 1. Huidige situatie

Het Theepot-dashboard draait op:
- **Applicatie (code):** gehost bij Vercel.
- **Database:** Supabase (PostgreSQL), een managed cloud-databasedienst met datacenter in de EU (Frankfurt).
- **Bestanden/foto's:** Supabase Storage, zelfde partij.

Supabase is een Amerikaans bedrijf. De data zelf staat fysiek in de EU, en er kan een verwerkersovereenkomst (DPA) met Supabase worden afgesloten. Dit is op dit moment AVG-technisch een geldige en gangbare constructie — veel Nederlandse organisaties werken zo. Het punt van aandacht is niet dat het nu onveilig of illegaal is, maar dat er:
- een externe, Amerikaanse partij als **sub-verwerker** in de keten zit;
- maandelijkse kosten aan een derde partij zijn verbonden die meegroeien met gebruik;
- geen volledige controle is over waar en hoe de data precies wordt opgeslagen en beheerd.

## 2. Wat wordt voorgesteld

De database (en optioneel de bestandsopslag) verplaatsen naar **eigen beheerde infrastructuur**, zodat De Molen Software / De Theepot zelf de enige partij is die toegang heeft tot de onderliggende data, zonder tussenkomst van een Amerikaanse cloudpartij.

Er zijn twee varianten die serieus zijn overwogen. Dit document beschrijft beide eerlijk, met een advies aan het eind.

### Variant A — Self-hosted database op een gehuurde server in een Europees datacenter (VPS)
De open-source versie van Supabase (dezelfde software, gratis te gebruiken) draait dan op een gehuurde virtuele server bij een Europese provider (bijvoorbeeld Hetzner in Duitsland). De data staat dus nog steeds in een professioneel datacenter, maar zonder Amerikaanse partij ertussen, en met een verwerkersovereenkomst die De Molen Software zelf met de klant (De Theepot) kan afsluiten.

**Kosten indicatie:** €10–€30 per maand voor de server, geen andere kosten.

**Voordelen:**
- Professioneel datacenter: stroomvoorziening, internetverbinding, brandveiligheid, fysieke beveiliging zijn daar geregeld door de provider, niet door ons.
- Volledige controle over de data, geen Amerikaanse sub-verwerker.
- Eenvoudiger schaalbaar (server is met een paar klikken te vergroten).

**Nadelen:**
- Beheer (updates, beveiligingspatches, monitoring) ligt bij De Molen Software.
- Nog steeds afhankelijk van een derde partij voor de fysieke server (al is dat alleen hosting, geen toegang tot data-inhoud).

### Variant B — Eigen mini-pc op locatie (bijvoorbeeld kantoor De Theepot of bij De Molen Software)
De database draait op een fysiek apparaat dat De Molen Software zelf bezit en beheert. Dit apparaat kan tegelijk ook andere taken uitvoeren, zoals een **Nextcloud-omgeving** (vervanger van Google Drive voor documentenopslag) en de bestaande automatiseringen (bijvoorbeeld het automatisch verwerken van inkomende e-mail naar taken).

**Kosten indicatie:** eenmalig €300–€800 voor een geschikte mini-pc (afhankelijk van specificaties), geen maandelijkse hostingkosten. Wel bijkomende kosten voor externe back-upopslag (zie hieronder), circa €5–€10 per maand.

**Voordelen:**
- Geen enkele derde partij heeft nog toegang tot waar de data staat.
- Eenmalige aanschafkosten in plaats van doorlopende maandelijkse kosten.
- Kan gecombineerd worden met andere nuttige diensten (Nextcloud, automatiseringen) op dezelfde machine.

**Nadelen en risico's (belangrijk om mee te wegen):**
- **Eén stroom- of internetstoring op de locatie van de mini-pc = het hele dashboard is offline** voor alle vestigingen tegelijk, totdat dit is opgelost. Er is afgesproken dat een storing van een paar uur acceptabel is; een storing van dagen (bijvoorbeeld bij hardwaredefect) is dat niet zonder reserveonderdelen of een uitwijkplan.
- Back-ups moeten **buiten het pand** (offsite, in de cloud) worden opgeslagen — anders is bij diefstal, brand of waterschade van het apparaat alle data in één keer weg, inclusief de back-ups. Dit betekent dat er alsnog een (kleine) externe cloudopslag nodig is, alleen dan puur voor versleutelde back-ups, niet voor de dagelijkse werking.
- Fysieke beveiliging (afgesloten ruimte, geen onbevoegde toegang) moet net zo serieus geregeld zijn als bij een professioneel datacenter — dit is een AVG-vereiste bij het verwerken van gegevens van kinderen.
- **Beheerdersafhankelijkheid ("bus factor"):** op dit moment is Lucas Molenkamp de enige die deze infrastructuur kan beheren en repareren bij storingen. Bij afwezigheid (ziekte, vakantie) duurt het langer voordat een storing is opgelost dan bij een professionele cloudpartij met 24/7-ondersteuning. Dit moet expliciet worden geaccepteerd door de directie, of ondervangen worden met een duidelijke uitwijk-/noodprocedure.
- Een mini-pc heeft geen ingebouwde redundantie (geen dubbele voeding, geen automatische failover naar een andere server) zoals een datacenter dat wel heeft.

## 3. Documentbeheer: Nextcloud gekoppeld aan het dashboard

Naast de database is ook gekeken naar het vervangen van Google Drive door **Nextcloud**, en die niet als los systeem naast het dashboard te laten bestaan, maar er **in** te integreren. Het gewenste eindresultaat: vanuit het Theepot-dashboard bestanden en mappen kunnen **openen, toevoegen en verwijderen**, met dezelfde rolgebaseerde rechten die het dashboard al kent (superadmin/directie/leidinggevende/locatie), én documenten (Word/Excel-achtige bestanden) direct **in de browser kunnen bewerken**, net zoals nu met Google Docs/Sheets.

### Hoe dit technisch werkt

**1. Rechten per rol op mapniveau**
Nextcloud kent gebruikers en groepen. Met de ingebouwde "Groepsmappen"-functie kan per groep (bijvoorbeeld per locatie, of per rol) worden ingesteld welke mappen zichtbaar zijn en met welke rechten (alleen lezen, of ook aanpassen/verwijderen). Deze groepen kunnen 1-op-1 worden afgestemd op de bestaande rollen in het dashboard.

**2. Bestanden openen/toevoegen/verwijderen vanuit het dashboard**
Nextcloud heeft een eigen programmeerbare interface (WebDAV en de OCS-API) waarmee de dashboard-server zelf bestanden kan opvragen, uploaden, hernoemen en verwijderen. Hiermee kan binnen het dashboard een eigen "Documenten"-module gebouwd worden — vergelijkbaar met de bestaande module voor bijlagen bij vakantieplanningen — die aan de achterkant met Nextcloud communiceert. Voor de gebruiker voelt dit aan als één programma, niet als twee losse systemen.

**3. Documenten bewerken zoals Google Docs/Sheets**
Voor het rechtstreeks bewerken van Word- en Excel-achtige bestanden in de browser (zoals nu met Google Docs/Sheets) is een aanvullende, gratis open-source component nodig: **Nextcloud Office**, gebaseerd op **Collabora Online** (of als alternatief OnlyOffice). Dit is dezelfde soort technologie die grote organisaties gebruiken als privacyvriendelijk alternatief voor Google Workspace/Microsoft 365 Online. Het maakt real-time bewerken in de browser mogelijk, met automatisch opslaan in Nextcloud — geen download/upload-stap nodig, en meerdere mensen kunnen tegelijk in hetzelfde document werken.

### Impact op de planning en hardware

- **Bouwtijd:** dit is een nieuwe, aparte module in het dashboard (documenten openen/beheren + de editor inbedden) — realistisch een paar weken werk, los van de database-migratie zelf.
- **Extra hardware:** Collabora Online (de editor-server) heeft zelf ook rekenkracht en geheugen nodig, bovenop wat al genoemd is voor Nextcloud en de database. Reken op **minimaal 2 extra CPU-kernen en 4 GB extra RAM** die specifiek voor de editor gereserveerd zijn, meer naarmate meerdere mensen tegelijk documenten bewerken. Dit is een reden om, zeker in combinatie met Variant B (mini-pc), goed te kijken of één apparaat dit allemaal comfortabel aankan, of dat dit een reden is om de editor-functie op een tweede, licht apparaat te draaien.

## 4. Wat sowieso geregeld moet zijn (bij beide varianten)

Ongeacht welke variant gekozen wordt, gelden de volgende minimale eisen om dit verantwoord te kunnen inzetten voor gegevens van kinderen:

1. **Automatische dagelijkse back-ups**, versleuteld, opgeslagen op een andere locatie dan de database zelf.
2. **Periodiek geteste restore-procedure** — een back-up die nooit is teruggezet, is geen betrouwbare back-up.
3. **Monitoring/waarschuwing bij uitval**, zodat een storing binnen afzienbare tijd wordt opgemerkt in plaats van pas wanneer een medewerker het meldt.
4. **Beveiligde verbinding** tussen de Theepot-applicatie en de database (versleuteld verkeer, firewall, geen open toegang vanaf het internet zonder beveiliging).
5. **Actueel gehouden software** (beveiligingsupdates van het besturingssysteem en de databasesoftware).
6. Bij variant B aanvullend: **UPS (noodstroomvoorziening)** om te voorkomen dat een stroomstoring de data beschadigt, en een **afgesloten, niet publiek toegankelijke fysieke locatie**.

## 5. AVG-overweging

Belangrijk om helder te hebben richting de directie: het overstappen naar een eigen database **lost geen bestaand AVG-probleem op** — de huidige Supabase-opzet (EU-datacenter + verwerkersovereenkomst) is al toegestaan onder de AVG. Het voordeel van beide voorgestelde varianten is vooral:
- minder afhankelijkheid van een externe (Amerikaanse) partij;
- volledige eigen controle en transparantie over waar en hoe de data precies wordt verwerkt;
- eenvoudiger om als De Molen Software een eigen verwerkersovereenkomst en privacyverklaring op te stellen richting klanten, zonder een sub-verwerker te hoeven vermelden.

Het is geen wettelijke noodzaak, maar een bewuste keuze voor meer controle en minder externe afhankelijkheid.

## 6. Advies

Beide varianten zijn technisch haalbaar. De afweging is in de kern: **gemak en zekerheid (variant A, gehuurde server in EU-datacenter) versus maximale controle met meer eigen verantwoordelijkheid (variant B, eigen mini-pc)**.

Gezien het gebruik van het dashboard door meerdere vestigingen tijdens werktijd, en de gevoeligheid van kindgegevens, is variant A de veiligere keuze voor de productie-database: dezelfde mate van controle en onafhankelijkheid van Amerikaanse partijen, maar zonder de risico's van een fysiek apparaat op één locatie (stroom, internet, brand, diefstal, geen 24/7-beheer).

Variant B is wel goed te verantwoorden voor het combineren met **Nextcloud en interne automatiseringen** (documentbeheer, e-mailverwerking) — daar is een storing van een paar uur inderdaad geen probleem, zoals afgesproken. Een tussenweg is dus mogelijk: de productiedatabase op een gehuurde EU-server (variant A), en de mini-pc inzetten voor Nextcloud en automatisering (variant B), zodat een storing in het ene systeem niet het andere platlegt.

## 7. Openstaande beslispunten voor de directie

- Akkoord op het budget voor een gehuurde server (variant A) of eenmalige aanschaf van hardware (variant B)?
- Akkoord op het accepteren van het "bus factor"-risico (afhankelijkheid van één beheerder) bij variant B, of is een aanvullende afspraak nodig (bijvoorbeeld een externe partij als vangnet)?
- Wat is een acceptabele maximale uitvaltijd bij een storing, en is dat schriftelijk vast te leggen?
- Wie is eigenaar van de hardware/server-contracten: De Theepot of De Molen Software (relevant voor het verwerkersovereenkomst-traject)?
- Wordt de diepe Nextcloud-integratie (documenten openen/bewerken vanuit het dashboard, sectie 3) nu meegenomen, of eerst gestart met alleen de database-migratie en Nextcloud als los systeem?
