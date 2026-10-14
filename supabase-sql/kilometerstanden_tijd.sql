-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Kilometerstanden: tijdstip van registratie opslaan naast de datum

alter table km_registraties
  add column if not exists tijd time;
