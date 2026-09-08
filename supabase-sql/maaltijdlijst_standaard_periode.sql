-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Standaard eters bij de maaltijdlijst: vanaf nu kun je per standaard kind
-- een "vanaf"- en/of "tot"-datum instellen, zodat een kind niet oneindig
-- op de lijst blijft staan. Bij het aanmaken van een nieuwe week wordt
-- alleen meegenomen wie op de weekstart-datum binnen die periode valt.
-- Beide velden zijn optioneel: leeg = geen begin- of eindgrens.

alter table maaltijd_standaard_kinderen
  add column if not exists vanaf_datum date,
  add column if not exists tot_datum date;
