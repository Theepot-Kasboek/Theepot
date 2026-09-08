-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Kasboek: datum per boeking + publiceren per locatie/periode
-- (zodat directie een kasboekmaand pas ziet nadat de invuller op "publiceren" heeft geklikt)

alter table kasboek_entries
  add column if not exists datum date;

create table if not exists kasboek_periode_status (
  id uuid primary key default gen_random_uuid(),
  locatie_naam text not null,
  periode text not null, -- formaat "YYYY-MM"
  gepubliceerd boolean not null default false,
  gepubliceerd_op timestamptz,
  gepubliceerd_door text,
  unique (locatie_naam, periode)
);

alter table kasboek_periode_status disable row level security;
