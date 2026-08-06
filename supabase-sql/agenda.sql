-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Agenda-schema (kalenders/afspraken/delen) + per-afspraak herinneringen met
-- push-notificatie. De basistabellen bestonden al (aangemaakt buiten git om),
-- dit bestand legt ze alsnog vast en breidt agenda_afspraken uit.
--
-- BELANGRIJK — VOLGORDE VAN UITVOEREN:
--   1. Voer eerst "A. Tabellen" en "B. Kolommen voor herinneringen" uit.
--   2. Zet daarna pas de Vercel-kant (app/api/push/agenda) live en verifieer
--      dat /api/push/agenda bereikbaar is en PUSH_WEBHOOK_SECRET klopt.
--   3. Voer PAS DAARNA "C. Trigger-reset" en "D. pg_cron-job" uit. Zonder
--      `security definer` op de functie breekt de hele cron-run, dus bewust
--      als allerlaatste stap (zelfde reden als in push_meldingen.sql).
--
-- Vereist: pg_net- én pg_cron-extensie aanzetten (Dashboard > Database >
-- Extensions) vóórdat blok D wordt uitgevoerd. Beide zijn beschikbaar op
-- Supabase Pro.

-- ============================================================
-- A. Tabellen (bestaand schema, hier gedocumenteerd/idempotent)
-- ============================================================

create table if not exists agenda_kalenders (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  type text not null check (type in ('persoonlijk', 'algemeen')),
  eigenaar_id uuid references profielen(id) on delete cascade,
  kleur text not null default '#4F46E5',
  herinnering_dagen integer,   -- kalender-brede default, in dagen vóór start_tijd
  aangemaakt_op timestamptz not null default now()
);

create table if not exists agenda_afspraken (
  id uuid primary key default gen_random_uuid(),
  kalender_id uuid not null references agenda_kalenders(id) on delete cascade,
  titel text not null,
  beschrijving text,
  start_tijd timestamptz not null,
  eind_tijd timestamptz not null,
  hele_dag boolean not null default false,
  aangemaakt_door uuid references profielen(id) on delete set null,
  aangemaakt_op timestamptz not null default now()
);

create table if not exists agenda_gedeeld (
  kalender_id uuid not null references agenda_kalenders(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  primary key (kalender_id, profiel_id)
);

create index if not exists agenda_afspraken_kalender_id_idx on agenda_afspraken(kalender_id);
create index if not exists agenda_afspraken_start_tijd_idx on agenda_afspraken(start_tijd);
create index if not exists agenda_gedeeld_profiel_id_idx on agenda_gedeeld(profiel_id);

-- Zelfde open toegangsmodel als de rest van het dashboard: autorisatie
-- gebeurt in de webapp/apps zelf (rechten-tabel), niet via RLS.
alter table agenda_kalenders disable row level security;
alter table agenda_afspraken disable row level security;
alter table agenda_gedeeld disable row level security;

-- ============================================================
-- B. Kolommen voor per-afspraak herinneringen
-- ============================================================
-- herinnering_minuten:
--   NULL  -> gebruik de kalenderinstelling (herinnering_dagen * 1440)
--   0     -> expliciet geen herinnering voor deze afspraak
--   > 0   -> aantal minuten vóór start_tijd
-- herinnering_verzonden: voorkomt een dubbele push; wordt gereset zodra de
-- afspraak of de herinneringsinstelling wijzigt (zie trigger hieronder).

alter table agenda_afspraken
  add column if not exists herinnering_minuten integer,
  add column if not exists herinnering_verzonden boolean not null default false;

-- ============================================================
-- C. Trigger-reset — herinnering_verzonden terugzetten bij wijziging
-- ============================================================

create or replace function reset_agenda_herinnering()
returns trigger
language plpgsql
as $$
begin
  if new.start_tijd is distinct from old.start_tijd
     or new.herinnering_minuten is distinct from old.herinnering_minuten
     or new.kalender_id is distinct from old.kalender_id then
    new.herinnering_verzonden := false;
  end if;
  return new;
end;
$$;

drop trigger if exists agenda_reset_herinnering on agenda_afspraken;
create trigger agenda_reset_herinnering
  before update on agenda_afspraken
  for each row execute function reset_agenda_herinnering();

-- ============================================================
-- D. pg_cron-job — vervallen herinneringen elke minuut afvuren
-- ============================================================
-- PAS UITVOEREN NADAT VERCEL + IOS + ANDROID GEVERIFIEERD ZIJN.
-- Vervang <vercel-domein> en <PUSH_WEBHOOK_SECRET> hieronder.

create or replace function trigger_agenda_herinneringen()
returns void
language plpgsql
security definer            -- KRITIEK: zie waarschuwing bovenaan dit bestand
set search_path = public, net
as $$
declare
  rij record;
begin
  for rij in
    select a.id
    from agenda_afspraken a
    join agenda_kalenders k on k.id = a.kalender_id
    where a.herinnering_verzonden = false
      and coalesce(a.herinnering_minuten, k.herinnering_dagen * 1440) > 0
      and a.start_tijd - (coalesce(a.herinnering_minuten, k.herinnering_dagen * 1440) || ' minutes')::interval
          <= now()
      and a.start_tijd > now()   -- afspraak zelf mag niet al voorbij zijn
    for update of a skip locked
  loop
    begin
      update agenda_afspraken set herinnering_verzonden = true where id = rij.id;

      perform net.http_post(
        url := 'https://<vercel-domein>/api/push/agenda',
        body := jsonb_build_object('afspraak_id', rij.id),
        headers := jsonb_build_object('Content-Type', 'application/json',
                                       'x-theepot-push-secret', '<PUSH_WEBHOOK_SECRET>'),
        timeout_milliseconds := 10000
      );
    exception when others then null;  -- push mag de cron-run nooit breken
    end;
  end loop;
end;
$$;

select cron.schedule(
  'agenda-herinneringen',
  '* * * * *',
  $$select trigger_agenda_herinneringen();$$
);

-- Rollback (verwijdert alleen de herinneringen-cron, agenda blijft werken):
--   select cron.unschedule('agenda-herinneringen');
