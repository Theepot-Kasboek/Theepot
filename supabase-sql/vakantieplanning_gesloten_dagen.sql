-- Gesloten dagen per week voor vakantieplanningen
-- Voegt een JSON-veld toe op de week om per dag aan te geven dat de BSO
-- gesloten is (bv. tussen kerst en oud en nieuw). Op die dagen is er geen
-- programma.

alter table vakantie_weken
  add column if not exists gesloten_dagen jsonb not null default '{}'::jsonb;
