-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Brandoefening: evaluatie publiceren naar wie er toegang toe heeft.
-- Zolang een week niet gepubliceerd is, ziet alleen wie mag bewerken hem.
-- Na publiceren mag er niks meer in gewijzigd worden.

alter table brandoefening_weken
  add column if not exists gepubliceerd boolean not null default false;
