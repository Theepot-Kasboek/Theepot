-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Takenlijst van medewerkeraccounts laten invullen door leidinggevenden:
-- 1. Elke medewerker (profiel) kan aan een locatie gekoppeld worden.
-- 2. Rechtenbeheer > Locatietoegang kan per leidinggevende aanvinken tot welke
--    locatie(s) diegene toegang heeft voor het beheren van taken (locatie_type = 'taken').
--    (Hergebruikt de al bestaande tabel `locatie_toegang`, geen nieuwe tabel nodig.)

alter table profielen
  add column if not exists locatie_naam text;
