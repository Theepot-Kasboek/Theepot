-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Kasboek + brandoefening: "publiceren" wordt "afronden" + generiek meldingen-systeem.
--
-- Zie Theepot-kasboek-afronden-plan.md voor de volledige uitleg.
--
-- Zodra een kasboekmaand (of brandoefeningweek) is afgerond, kan niemand er meer
-- iets in wijzigen — ook de invuller en superadmin niet. Een beheerder (leiding-
-- gevende, directie, superadmin) kan de maand/week direct heropenen. Bij afronden
-- gaat er een melding naar een vooraf ingestelde lijst accounts (melding_voorkeuren).

-- ============================================================
-- A. Kasboek: periode-status
-- ============================================================

alter table kasboek_periode_status
  add column if not exists status text not null default 'open'
  check (status in ('open', 'afgerond'));

alter table kasboek_periode_status
  add column if not exists afgerond_op timestamptz,
  add column if not exists afgerond_door text,
  add column if not exists heropend_op timestamptz,
  add column if not exists heropend_door text;

-- Bestaande gepubliceerde maanden meenemen als "afgerond"
update kasboek_periode_status
  set status = 'afgerond', afgerond_op = coalesce(afgerond_op, gepubliceerd_op), afgerond_door = coalesce(afgerond_door, gepubliceerd_door)
  where gepubliceerd = true and status = 'open';

-- ============================================================
-- B. Brandoefening: week-status
-- ============================================================

alter table brandoefening_weken
  add column if not exists status text not null default 'open'
  check (status in ('open', 'afgerond'));

alter table brandoefening_weken
  add column if not exists afgerond_op timestamptz,
  add column if not exists afgerond_door text,
  add column if not exists heropend_op timestamptz,
  add column if not exists heropend_door text;

update brandoefening_weken
  set status = 'afgerond'
  where gepubliceerd = true and status = 'open';

-- ============================================================
-- C. Generiek meldingen-systeem
-- ============================================================

create table if not exists meldingen (
  id uuid primary key default gen_random_uuid(),
  type text not null,              -- bv. 'kasboek_afgerond', 'brandoefening_afgerond'
  titel text not null,
  bericht text not null,
  link text,                       -- bv. '/kasboek' om door te linken
  context jsonb,                   -- bv. { locatie_naam, periode }
  aangemaakt_op timestamptz not null default now(),
  aangemaakt_door text
);

create index if not exists meldingen_type_idx on meldingen(type);

create table if not exists melding_ontvangers (
  id uuid primary key default gen_random_uuid(),
  melding_id uuid not null references meldingen(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  gelezen_op timestamptz,
  unique (melding_id, profiel_id)
);

create index if not exists melding_ontvangers_profiel_idx on melding_ontvangers(profiel_id);

-- Vaste, vooraf ingestelde lijst: welke accounts krijgen meldingen van welk type.
-- Beheerd via Rechtenbeheer > tab "Meldingen".
create table if not exists melding_voorkeuren (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  profiel_id uuid not null references profielen(id) on delete cascade,
  unique (type, profiel_id)
);

-- Zelfde open toegangsmodel als de rest van het dashboard: autorisatie
-- gebeurt in de webapp zelf (rechten/isSuperadmin), niet via RLS.
alter table meldingen disable row level security;
alter table melding_ontvangers disable row level security;
alter table melding_voorkeuren disable row level security;
