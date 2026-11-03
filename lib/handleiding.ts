// Inhoud van de gebruikershandleiding voor medewerkers.
// Bron: "Handleiding medewerkers (bron).html" — houd beide gelijk als er iets wijzigt.
// Tekst mag **vet** bevatten; de supportpagina rendert dat.

export type Blok =
  | { soort: 'kaarten'; kop: string; kaarten: { titel: string; tekst: string }[] }
  | { soort: 'stappen'; kop: string; stappen: string[]; chips?: string[] }
  | { soort: 'uitleg'; label: string; tekst: string }
  | { soort: 'weetje'; label: string; tekst: string }
  | { soort: 'definities'; kop: string; rijen: { naam: string; tekst: string }[] }

export interface Hoofdstuk {
  id: string
  nummer: string
  titel: string
  intro: string
  blokken: Blok[]
}

export const HANDLEIDING_VERSIE = 'versie 3 november 2026'

export const HANDLEIDING_INLEIDING =
  'Deze handleiding legt uit hoe je twaalf onderdelen van het dashboard in je dagelijkse werk gebruikt, ' +
  'en hoe de app op je telefoon werkt. Houd hem ernaast als naslagwerk.'

export const HANDLEIDING_SLOT =
  'Loopt iets anders dan hierboven beschreven, of heb je vragen? Geef dit door, zodat het dashboard ' +
  'steeds beter aansluit op het dagelijkse werk op de groep.'

export const HOOFDSTUKKEN: Hoofdstuk[] = [
  {
    id: 'voordat-je-begint',
    nummer: '',
    titel: 'Voordat je begint',
    intro: 'Drie dingen om in je achterhoofd te houden bij alles wat hierna komt.',
    blokken: [
      {
        soort: 'kaarten',
        kop: 'Voordat je begint',
        kaarten: [
          {
            titel: 'Log in met je eigen account',
            tekst: 'Gebruik je normale medewerker-inlog. Wat je ziet en kunt aanpassen hangt af van jouw rol en jouw locatie(s).',
          },
          {
            titel: 'Niet elke knop staat voor iedereen aan',
            tekst: 'Sommige onderdelen zijn per locatie of per rol anders ingesteld. Mis je een knop die hier beschreven staat, geef dat gerust door.',
          },
          {
            titel: 'Vragen of onduidelijkheden?',
            tekst: 'Loopt iets niet zoals verwacht of is iets onduidelijk, geef dat door zodat het verbeterd kan worden.',
          },
        ],
      },
    ],
  },
  {
    id: 'startscherm',
    nummer: 'I',
    titel: 'Het startscherm',
    intro: 'De eerste pagina die je ziet na inloggen, opgebouwd uit widgets die je zelf naar wens indeelt.',
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Na het inloggen kom je op het dashboard: een scherm met widgets, bijvoorbeeld het prikbord, je taken, het weer of de weekagenda.',
          'Klik op "Widget toevoegen" om een blok uit de lijst toe te voegen, bijvoorbeeld Kasboek, Nieuwsbrieven of Agenda vandaag.',
          'Versleep een widget naar een andere plek om de volgorde aan te passen.',
          'Gebruik het formaat-icoon op een widget om hem groter of kleiner te maken.',
          'Wil je een widget niet meer zien? Klik op het kruisje erop; via "Widget toevoegen" zet je hem later gewoon terug.',
        ],
      },
      {
        soort: 'weetje',
        label: 'Goed om te weten',
        tekst:
          'Je indeling wordt per account op dit apparaat onthouden. Open je het dashboard op een ander ' +
          'apparaat of in een andere browser, dan zie je weer de standaardindeling totdat je die daar ook aanpast.',
      },
    ],
  },
  {
    id: 'kasboek',
    nummer: 'II',
    titel: 'Kasboek',
    intro: 'Voor het bijhouden van inkomsten en uitgaven per locatie, met bonnetjes en een maandoverzicht.',
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Open Kasboek. Bovenaan kies je de locatie waarvoor je een boeking wilt vastleggen.',
          'Klik op "Nieuwe boeking" en geef aan of het een inkomst of een uitgave is.',
          'Vul het bedrag in en kies (indien van toepassing) een categorie en een korte omschrijving.',
          'Heb je een bonnetje? Voeg de foto of pdf ervan toe bij de boeking.',
          'Sla op — de boeking verschijnt meteen in het overzicht en het saldo wordt automatisch bijgewerkt.',
          'Bovenaan staan vier bedragen: Beginsaldo, Inkomsten, Uitgaven en Eindsaldo.',
          'Blader met de pijltjes bovenaan naar een andere maand om eerdere boekingen terug te zien.',
          'Wil je een overzicht meenemen of afdrukken? Gebruik de knop "PDF" voor een export van de maand.',
          'Een boeking fout ingevoerd? Verwijder hem via het prullenbak-icoon op de rij.',
          'Is de maand compleet en gecontroleerd? Klik op "Afronden" om de maand te vergrendelen — er kan dan door niemand meer iets in gewijzigd worden.',
        ],
        chips: ['Bedrag — verplicht', 'Categorie', 'Omschrijving', 'Bonnetje (foto/pdf)'],
      },
      {
        soort: 'uitleg',
        label: 'Afronden en heropenen',
        tekst:
          'Zodra een maand is **afgerond**, staat er een duidelijke melding en kan niemand meer iets in die ' +
          'maand wijzigen — ook jij niet. Moet er toch nog iets aangepast worden, dan kan alleen een ' +
          '**beheerder** de maand via "Heropenen" weer vrijgeven.',
      },
      {
        soort: 'uitleg',
        label: 'Doorlopend saldo',
        tekst:
          'Een maand begint niet op € 0,00: het saldo loopt door. Het **beginsaldo** van een maand is het ' +
          'opgetelde saldo van alle voorgaande maanden van die locatie, en het **eindsaldo** ' +
          '(beginsaldo + inkomsten − uitgaven) is meteen het beginsaldo van de volgende maand. In de ' +
          'PDF-export staat het beginsaldo er ook bij, met de vermelding dat het van de vorige maand is overgenomen.',
      },
      {
        soort: 'weetje',
        label: 'Goed om te weten',
        tekst:
          'Zie je geen invoerformulier, maar wel een badge "Alleen lezen"? Dan heb jij voor deze locatie ' +
          'kijkrechten in plaats van bewerkrechten. Het paperclip-icoontje bij een boeking betekent ' +
          '"bonnetje aanwezig" — als medewerker kun je dat bonnetje meestal niet openen, alleen ' +
          'leiding/directie kan dat.',
      },
    ],
  },
  {
    id: 'prikbord',
    nummer: 'III',
    titel: 'Prikbord',
    intro: "Voor mededelingen aan collega's, met een prioriteit en optioneel een vervaldatum.",
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Open Prikbord om lopende mededelingen te lezen. Filter bovenaan op "Alle locaties" of je eigen locatie.',
          'Wil je zelf iets delen? Klik op "Bericht plaatsen".',
          'Vul een titel en de inhoud van je bericht in.',
          'Kies een prioriteit: normaal, belangrijk of urgent — dit bepaalt de kleur en het icoon waarmee het bericht opvalt.',
          'Kies of het bericht voor één locatie of voor alle locaties bedoeld is.',
          'Geef eventueel een vervaldatum mee, zodat het bericht daarna vanzelf verdwijnt.',
          'Wil je een eigen bericht later aanpassen of verwijderen? Dat kan altijd bij berichten die jij hebt geplaatst.',
        ],
        chips: ['Titel — verplicht', 'Inhoud — verplicht', 'Prioriteit', 'Locatie', 'Geldig tot'],
      },
      {
        soort: 'weetje',
        label: 'Goed om te weten',
        tekst:
          'Zie je geen knop "Bericht plaatsen"? Dan heb jij mogelijk geen rechten om zelf berichten te ' +
          'plaatsen. Een bericht van een collega kun je alleen bewerken of verwijderen als je daarvoor ' +
          'volledige rechten hebt.',
      },
    ],
  },
  {
    id: 'maaltijdlijst',
    nummer: 'IV',
    titel: 'Maaltijdlijst',
    intro: 'Voor het bijhouden van wie er heeft meegegeten en wat er per dag gegeten is.',
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Open Maaltijdlijst en kies je locatie. Klik op "vandaag" voor deze week.',
          'Vink per kind "meegegeten" aan zodra dat klopt.',
          'Klik op "wat gegeten" bij een kind om kort te noteren wat er is gegeten.',
          'Staat een kind er nog niet bij? Voeg het toe via het icoon boven de dag.',
          'Controleer of de bijzonderheden en allergieën bij ieder kind nog kloppen.',
        ],
      },
      {
        soort: 'stappen',
        kop: 'Standaard kinderen instellen',
        stappen: [
          'Klik rechtsboven op "Standaard kinderen", bij de locatie die je hebt gekozen.',
          'Kies bovenin de dag; maandag tot en met vrijdag hebben elk hun eigen vaste lijst. Een stipje betekent dat daar al kinderen staan.',
          'Vul onderin "Naam kind" in, en eventueel "Bijzonderheden / allergie".',
          'Klik op "Toevoegen aan …" of druk op Enter; de knop noemt de gekozen dag.',
          'Staat een kind er maar tijdelijk op? Geef bij het potloodje een datum "vanaf" en/of "tot" mee — buiten die periode wordt het kind niet meer automatisch ingevuld.',
          'Hoort een kind er niet meer bij? Klik op het kruisje achter de naam.',
          'Klaar? Klik op "Sluiten".',
        ],
      },
      {
        soort: 'uitleg',
        label: 'Vaste lijst per dag',
        tekst:
          'Zodra iemand een nieuwe week opent, worden de standaard kinderen automatisch op de juiste dagen ' +
          'ingevuld — je hoeft ze dus niet elke week opnieuw in te typen, en dat geldt ook met terugwerkende ' +
          'kracht voor weken die al bestaan. **Alleen** als een kind een "vanaf"- of "tot"-datum heeft, telt ' +
          'dat mee: buiten die periode wordt het kind in die week niet ingevuld.',
      },
      {
        soort: 'weetje',
        label: 'Goed om te weten',
        tekst:
          'Iedereen met bewerkrechten voor een locatie kan zelf kinderen toevoegen of verwijderen én de ' +
          'standaardlijst beheren. Bij "alleen lezen"-rechten staan de knoppen uit en kun je de lijst alleen bekijken.',
      },
      {
        soort: 'weetje',
        label: 'Voor leiding en directie',
        tekst:
          'Heb je de rol leidinggevende of directie? Dan heb je een extra tabblad "Maandoverzicht per ' +
          'locatie", met daarin per locatie het aantal eters van die maand. Met "Export PDF" maak je daarvan ' +
          'een overzicht voor alle locaties samen; weken die nog niet bezocht zijn, worden daarbij automatisch ' +
          'aangemaakt met de standaard eters.',
      },
    ],
  },
  {
    id: 'brandoefening',
    nummer: 'V',
    titel: 'Brandoefening',
    intro: 'Voor het registreren van brandoefeningen per week, per dag.',
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Open Brandoefening en kies links de juiste oefenweek. Nog geen week aanwezig? Maak er een aan met weeknummer en jaar.',
          'Kies rechts de dag waarop de oefening heeft plaatsgevonden (ma–vr) en klik op "Invullen".',
          "Vul het formulier in: datum, tijd, aanwezige PM'ers, aard van het incident, plek van het incident, wie er gealarmeerd zijn en hoe.",
          'Noteer eventuele bijzonderheden en een korte evaluatie, en vul in wie het formulier heeft ingevuld.',
          'Sla op — de dag krijgt daarna een vinkje in het overzicht.',
          'Wil je iets later aanpassen? Open de al ingevulde dag opnieuw via "Bewerken".',
          'Gebruik "PDF week" om de volledige week te exporteren, bijvoorbeeld voor het brandveiligheidsdossier.',
          'Is de week compleet? Klik op "Afronden" om de week te vergrendelen; alleen een beheerder kan hem daarna nog via "Heropenen" terugzetten.',
        ],
        chips: [
          'Datum & tijd',
          "Aanwezige PM'ers",
          'Aard van incident',
          'Plek van incident',
          'Gealarmeerden',
          'Manier van alarmeren',
          'Bijzonderheden',
          'Evaluatie',
          'Ingevuld door',
        ],
      },
    ],
  },
  {
    id: 'vakantieplanningen',
    nummer: 'VI',
    titel: 'Vakantieplanningen',
    intro: 'Voor de planning tijdens de schoolvakanties: een thema en activiteit per dag, met een overzicht van alle benodigdheden.',
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Open Vakantieplanningen. Heb je geen bewerkrechten, dan zie je alleen de gepubliceerde planningen; concepten staan er dan niet bij.',
          'Klik op een planning om hem te openen en kies boven aan "Document" voor de leesbare weekindeling, of "Benodigdheden" voor de verzamellijst van alles wat nodig is.',
          'Heb je bewerkrechten? Kies dan "Overzicht" om de planning te bewerken: per week — of per dag, afhankelijk van de instelling — vul je een subthema in.',
          'Is de locatie een dag gesloten tijdens de vakantie? Vink dat aan bij die dag; hij valt dan verder uit de planning.',
          'Vul per dag een activiteit in: kies uit de activiteitenbibliotheek of typ er zelf één in, en zoek eventueel via "Foto zoeken" een voorbeeldafbeelding erbij.',
          'Voeg bij een activiteit eventueel een bijlage toe, zoals een werkblad, of verwijder hem weer.',
          'Versleep een activiteit naar een andere dag om de planning te herordenen.',
          'Is de planning klaar? Klik op "Publiceren" zodat iedereen hem kan zien. Wil je hem terugzetten naar concept, klik dan op "Verbergen".',
        ],
        chips: ['Thema', 'Vakantieperiode', 'Subthema per week of per dag', 'Benodigdheden — automatisch'],
      },
      {
        soort: 'uitleg',
        label: 'Concept of gepubliceerd',
        tekst:
          'Een nieuwe planning begint als **concept** en is dan alleen zichtbaar voor wie bewerkrechten ' +
          'heeft. Pas na **publiceren** kan iedereen de planning zien — in het dashboard en in de app.',
      },
      {
        soort: 'weetje',
        label: 'Goed om te weten',
        tekst:
          'Onder "Benodigdheden" staat een automatisch samengestelde lijst van alles wat voor de hele ' +
          'planning nodig is, met de optie om alle bijlagen in één keer te downloaden. Heb je geen ' +
          'bewerkrechten, dan kun je de planning alleen bekijken.',
      },
    ],
  },
  {
    id: 'weekplanningen',
    nummer: 'VII',
    titel: 'Weekplanningen',
    intro: 'Voor het plannen van een knutsel- of kookactiviteit en een groepsspel per week — voor de hele locatie of per groep, bijvoorbeeld 4+ en 8+.',
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Open Weekplanningen, kies je locatie en navigeer naar de juiste week.',
          'Heeft de locatie aparte groepen (bijvoorbeeld 4+ en 8+)? Maak ze aan via "Groepen beheren" en kies daarna de groepstab. Elke groep heeft haar eigen thema en activiteiten; onder "Algemeen" staat de planning voor de hele locatie.',
          'Stel bovenaan een thema voor de week in, als daar één voor is.',
          'Klik op het "knutsel of kook/bak"-slot en kies een activiteit uit de bibliotheek, of vul er zelf één in.',
          'Klik op het groepsspel-slot en vul naam, beschrijving en benodigdheden in — een voorbeeldafbeelding is optioneel.',
          'Bekijk eventuele bijlagen bij een activiteit; die kun je hier alleen bekijken, niet toevoegen.',
          'Klopt een activiteit niet meer voor die week? Verwijder hem uit het slot en kies iets anders.',
          'Met "PDF" exporteer je de week die je op dat moment bekijkt. Wil je meerdere weken tegelijk? Klik op "Exporteren", kies de periode (van/tot week), eventueel alle groepen, vink de gewenste weken aan en geef aan of de foto\u2019s mee moeten in de PDF.',
        ],
      },
    ],
  },
  {
    id: 'activiteitenbeheer',
    nummer: 'VIII',
    titel: 'Activiteitenbeheer',
    intro:
      'De bibliotheek met activiteiten die je ook in weekplanningen kunt gebruiken. De AI-import knop laten we hier buiten beschouwing.',
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Open Activiteitenbeheer en zoek op naam, of filter op leeftijd (4-7 jaar / 8+ jaar), duur ("kort ≤30 min"), categorie of thema.',
          'Klik op een activiteit om de details te bekijken: beschrijving, materialen en stappen.',
          'Wil je een nieuwe activiteit toevoegen? Klik op "Toevoegen" en vul naam, beschrijving en categorie in.',
          "Vul waar relevant ook leeftijd, tijdsduur, groepsgrootte, thema's, materialen en de uitvoerstappen in.",
          'Voeg eventueel een foto toe, direct via het camera-icoon op de kaart of in het bewerkscherm.',
          'Wil je een activiteit gebruiken bij de voorbereiding? Gebruik de kaart-acties om hem als tekst te kopiëren, als PDF te exporteren, of als JSON te kopiëren.',
          'Klopt iets niet meer aan een bestaande activiteit? Open hem en pas hem aan, of verwijder hem.',
        ],
      },
    ],
  },
  {
    id: 'agenda',
    nummer: 'IX',
    titel: 'Agenda',
    intro: 'Je persoonlijke agenda, plus gedeelde/algemene kalenders.',
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Open Agenda. Kies bovenaan de weergave die je het prettigst vindt: Maand, Week, Dag of Lijst.',
          'Vink links de kalenders aan die je wilt zien, naast je eigen persoonlijke kalender.',
          'Klik op een dag of op "+" om een nieuwe afspraak te maken: titel, kalender, datum, begin- en eindtijd of "hele dag", en eventueel een beschrijving.',
          'Open een bestaande afspraak om de gegevens te bewerken of de afspraak te verwijderen.',
          'Heb je een agenda-bestand (.ics) uit een ander programma? Importeer deze om afspraken over te nemen.',
          'Let op de notificatiebanner bovenaan — die toont afspraken waarvoor een herinnering is ingesteld.',
        ],
      },
      {
        soort: 'weetje',
        label: 'Goed om te weten',
        tekst:
          'Kalenders delen en herinneringen instellen is voor medewerkers meestal niet zichtbaar; dat is ' +
          'voorbehouden aan leiding/directie.',
      },
    ],
  },
  {
    id: 'taken-notities',
    nummer: 'X',
    titel: 'Taken & Notities',
    intro: 'Je eigen persoonlijke takenlijst en notities — niemand anders ziet dit.',
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Open Taken & Notities en maak een nieuwe lijst aan: kies het type "taken" of "notities", en geef de lijst een naam en kleur.',
          'Voeg bij een takenlijst een taak toe via het invoerveld onderaan, en vink hem af zodra hij klaar is.',
          'Open een taak om een vervaldatum en prioriteit (laag/gemiddeld/hoog) mee te geven.',
          'Gebruik de sneltoetsen "Vandaag" en "Gepland" in de zijbalk om snel te zien wat er speelt.',
          'Voeg bij een notitielijst een nieuwe notitie toe: geef een titel, schrijf de inhoud, en gebruik vet/cursief/lijst waar nodig.',
          'Kies eventueel een achtergrondkleur voor de notitie om hem sneller terug te vinden.',
        ],
      },
    ],
  },
  {
    id: 'chat',
    nummer: 'XI',
    titel: 'Chat',
    intro: "Onderling chatten met collega's, individueel of in een groep.",
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Open Chat om je bestaande gesprekken te zien, met eventueel het aantal ongelezen berichten per gesprek.',
          'Heb je rechten om zelf gesprekken te starten? Klik dan op "Nieuw gesprek" en kies "Direct bericht" of "Groepsgesprek".',
          "Zoek en selecteer de collega('s) waarmee je wilt chatten; geef een groepsgesprek eventueel een naam.",
          'Typ je bericht onderaan en verstuur het.',
          'Wil je een foto of bestand delen? Gebruik het paperclip-icoon om een bijlage toe te voegen.',
          'Gebruik de zoekbalk bovenaan om snel een eerder gesprek terug te vinden.',
          'Berichten komen automatisch binnen zonder dat je de pagina hoeft te verversen; een dubbel vinkje betekent dat je bericht gelezen is.',
        ],
      },
      {
        soort: 'weetje',
        label: 'Goed om te weten',
        tekst:
          'Zie je geen knop "Nieuw gesprek"? Dan heb jij mogelijk geen recht om zelf gesprekken te starten, ' +
          'en kun je alleen reageren in bestaande gesprekken.',
      },
    ],
  },
  {
    id: 'kilometerstanden',
    nummer: 'XII',
    titel: 'Kilometerstanden',
    intro:
      "Voor het bijhouden van de kilometerstanden van de auto's en bussen, zodat je per periode ziet " +
      'hoeveel er gereden is.',
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo gebruik je het',
        stappen: [
          'Open Kilometerstanden. Links staan alle voertuigen met hun kenteken, de omschrijving en hoe vaak de stand ingevuld moet worden.',
          'Klik op een voertuig. Rechts zie je de huidige stand, hoeveel er in de laatste periode is gereden, en de hele geschiedenis.',
          'Klik op "Stand invoeren" om een nieuwe kilometerstand vast te leggen.',
          'Vul de kilometerstand in. De vorige stand staat er boven, en zodra je een hoger getal invult zie je meteen hoeveel kilometer erbij is gekomen.',
          'De datum en het tijdstip staan al op dit moment. Pas ze aan als je de stand op een ander moment hebt afgelezen.',
          'Voeg eventueel een notitie toe, bijvoorbeeld "na grote beurt" of "tankbeurt".',
          'Sla op — de stand komt bovenaan de geschiedenis te staan, met datum, tijdstip en jouw naam erbij.',
        ],
        chips: ['Kilometerstand — verplicht', 'Datum', 'Tijdstip', 'Notitie'],
      },
      {
        soort: 'uitleg',
        label: 'Het gekleurde streepje bij een voertuig',
        tekst:
          'Elk voertuig heeft een kleur die aangeeft of de stand weer ingevuld moet worden. Die wordt ' +
          'berekend vanaf de laatste registratie plus de ingestelde regelmaat (bijvoorbeeld elke maand). ' +
          '**Groen** betekent dat je nog even hebt, **oranje** dat het voertuig binnen twee weken aan de ' +
          'beurt is, en **rood** dat de datum al voorbij is — dan staat er ook "Te laat" bij het voertuig. ' +
          'Is er nog nooit een stand ingevuld, dan is er niets te berekenen en staat er "Nog geen registraties".',
      },
      {
        soort: 'weetje',
        label: 'Goed om te weten',
        tekst:
          'Een nieuwe stand moet altijd hoger zijn dan de vorige. Vul je een lager getal in, dan krijg je ' +
          'een melding en wordt er niets opgeslagen — een teller loopt immers niet terug. Voertuigen ' +
          'toevoegen, aanpassen of verwijderen, en een verkeerd ingevoerde registratie weghalen, kan ' +
          'alleen de beheerder. Zie je een fout in de lijst staan? Geef dat door.',
      },
      {
        soort: 'stappen',
        kop: 'Op de telefoon',
        stappen: [
          'Open de app en tik onderin op **Kilometers**. Staat de tab niet in beeld, veeg de balk onderin dan opzij.',
          'Kies bovenaan het voertuig. In de app staan alleen de voertuigen die actief zijn.',
          'Daaronder staat de laatst bekende stand. Vergelijk die met wat je op de teller ziet, zodat je zeker weet dat je het goede voertuig te pakken hebt.',
          'Vul bij "Kilometerstand" de nieuwe stand in — alleen cijfers, dus zonder punt of komma.',
          'Controleer de datum. Op de iPhone kies je die met de datumkiezer en staat hij al op vandaag; op Android typ je hem als jjjj-mm-dd.',
          'Controleer ook het tijdstip; dat staat al op het huidige moment.',
          'Voeg eventueel nog een notitie toe en tik op "Opslaan".',
          'Je krijgt de melding "Kilometerstand opgeslagen" te zien, en de laatst bekende stand springt naar het getal dat je net invulde. Is je stand niet hoger dan de vorige, dan verschijnt er in plaats daarvan een rode melding.',
        ],
      },
      {
        soort: 'weetje',
        label: 'Verschil met het dashboard',
        tekst:
          'In de app vul je alleen een nieuwe stand in. De geschiedenis, het aantal gereden kilometers per ' +
          'periode en de kleur die aangeeft wanneer een voertuig weer aan de beurt is, zie je in het ' +
          'dashboard in de browser.',
      },
    ],
  },
  {
    id: 'app-op-je-telefoon',
    nummer: 'XIII',
    titel: 'De app op je telefoon',
    intro:
      'Naast het dashboard in de browser is er een aparte app voor de iPhone en voor Android. Het is geen ' +
      'verkleinde website, maar een echte app met een selectie modules die je op de groep het meest nodig hebt.',
    blokken: [
      {
        soort: 'stappen',
        kop: 'Zo begin je',
        stappen: [
          'De app staat niet in de App Store of de Play Store. Wil je hem op de locatietelefoon? Neem contact op met Lucas — hij zet de app op het toestel.',
          'Log in met hetzelfde e-mailadres en wachtwoord als in het dashboard. Je hoeft geen apart account aan te maken.',
          'Je rol en je locatietoegang gelden ook in de app: je ziet dezelfde locaties, en waar je in het dashboard alleen mag kijken, kun je in de app ook niets aanpassen.',
          'Onderin staat op beide toestellen één balk met alle modules naast elkaar: Meldingen, Chat, Taken, Kasboek, Maaltijden, Vakantie, Weekplan, Kilometers en Account.',
          'Past de balk niet op je scherm? Veeg hem dan naar links of rechts om de rest te zien. De module waar je in zit schuift vanzelf in beeld.',
          'Wat je in de app invult staat direct in het dashboard, en andersom. Het is dezelfde database, geen aparte kopie die je later nog moet overzetten.',
          'Uitloggen doe je via de tab "Account", helemaal rechts in de balk.',
        ],
      },
      {
        soort: 'weetje',
        label: 'Goed om te weten',
        tekst:
          'De app is bewust een lichte versie. Agenda, Activiteitenbeheer, Beleidsstukken, Nieuwsbrieven, ' +
          'Brandoefening, Medewerkers, Rechtenbeheer, 10-minutengesprekken en VE Planning zitten er niet in — ' +
          'die gebruik je in het dashboard in de browser. Zie je een module wel staan maar kun je niets ' +
          'aanpassen, dan heb je voor die locatie kijkrechten.',
      },
      {
        soort: 'definities',
        kop: 'Wat kun je in de app',
        rijen: [
          {
            naam: 'Meldingen (Prikbord)',
            tekst:
              'Berichten lezen en zelf plaatsen, aanpassen of verwijderen, met prioriteit en verloopdatum. ' +
              'Je ziet ook wie het bericht gelezen heeft.',
          },
          {
            naam: 'Chat',
            tekst:
              "Direct- en groepsgesprekken, met tekst en met foto's of bestanden. Berichten komen live binnen " +
              'en je ziet of ze gelezen zijn.',
          },
          {
            naam: 'Taken & Notities',
            tekst:
              'Precies hetzelfde als in het dashboard: lijsten, taken met vervaldatum en prioriteit, ' +
              'notitiemappen die vanzelf opslaan, en de weergaves Vandaag en Gepland.',
          },
          {
            naam: 'Kasboek',
            tekst:
              'Boekingen toevoegen per locatie en maand, met hetzelfde doorlopende saldo als het dashboard. ' +
              'Een bonnetje fotografeer je direct: op de iPhone met de documentscanner die de randen ' +
              'automatisch bijsnijdt, op Android met de gewone camera. Categorieën, locaties en de ' +
              'PDF-export blijven in het dashboard.',
          },
          {
            naam: 'Maaltijdlijst',
            tekst:
              'Alleen "meegegeten" aan- of uitvinken per kind per dag. Kinderen toevoegen en de standaard ' +
              'kinderen instellen doe je in het dashboard.',
          },
          {
            naam: 'Vakantieplanningen',
            tekst:
              'Bekijken van de vakantieplanning per week, met thema, activiteiten en benodigdheden — op ' +
              'dezelfde manier als in het dashboard. Heb je bewerkrechten? Dan kun je de planning in de app ' +
              'ook volledig bewerken en zie je ook wat nog niet gepubliceerd is.',
          },
          {
            naam: 'Weekplanningen',
            tekst:
              'Bekijken én bijwerken: het weekthema, de knutsel-, kook- of bakactiviteit en het ' +
              'groepsspel. Heeft de locatie groepen (bijv. 4+ en 8+), dan kies je die bovenin; met ' +
              'bewerkrechten kun je ze in de app ook aanmaken. Een activiteit overnemen uit de ' +
              'activiteitenbibliotheek en een foto meesturen kan ook.',
          },
          {
            naam: 'Kilometerstanden',
            tekst:
              'Een nieuwe kilometerstand invullen bij een voertuig, met de laatst bekende stand erbij zodat ' +
              'je kunt controleren of je goed zit. De geschiedenis en het voertuigbeheer blijven in het ' +
              'dashboard. Stap voor stap staat het in hoofdstuk XII.',
          },
        ],
      },
    ],
  },
]

// ─── Zoeken ───────────────────────────────────────────────────────────────────

/** Kleine letters, zonder accenten — zodat "allergieen" ook "allergieën" vindt. */
export function normaliseer(tekst: string): string {
  return tekst.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Alle doorzoekbare tekst van een hoofdstuk, in dezelfde volgorde als op het scherm. */
export function hoofdstukTekst(h: Hoofdstuk): string[] {
  const delen: string[] = [h.titel, h.intro]
  for (const blok of h.blokken) {
    switch (blok.soort) {
      case 'kaarten':
        for (const k of blok.kaarten) delen.push(k.titel, k.tekst)
        break
      case 'stappen':
        delen.push(blok.kop, ...blok.stappen, ...(blok.chips ?? []))
        break
      case 'uitleg':
      case 'weetje':
        delen.push(blok.label, blok.tekst)
        break
      case 'definities':
        delen.push(blok.kop)
        for (const r of blok.rijen) delen.push(r.naam, r.tekst)
        break
    }
  }
  return delen
}

/** Aantal keer dat de zoekterm in een hoofdstuk voorkomt. */
export function telTreffers(h: Hoofdstuk, zoekterm: string): number {
  const naald = normaliseer(zoekterm.trim())
  if (!naald) return 0
  let totaal = 0
  for (const deel of hoofdstukTekst(h)) {
    const hooiberg = normaliseer(deel.replace(/\*\*/g, ''))
    let vanaf = 0
    for (;;) {
      const i = hooiberg.indexOf(naald, vanaf)
      if (i === -1) break
      totaal++
      vanaf = i + naald.length
    }
  }
  return totaal
}
