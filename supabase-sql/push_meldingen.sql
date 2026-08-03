-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Push notificaties voor chatberichten (later uit te breiden naar prikbord/agenda).
--
-- BELANGRIJK — VOLGORDE VAN UITVOEREN:
--   1. Voer eerst alleen het blok "A. Tabellen" en "B. RPC" uit.
--   2. Zet daarna pas de Vercel-kant + de iOS/Android-apps live en verifieer
--      dat er rijen in push_apparaten verschijnen (zie supabase-sql/README of
--      het implementatieplan voor de exacte volgorde).
--   3. Voer PAS DAARNA het blok "C. Trigger" uit. Zonder `security definer`
--      op de triggerfunctie breekt ELKE chat-insert (op alle platforms
--      tegelijk), dus dit blok bewust als allerlaatste stap.
--
-- Vereist: pg_net-extensie aanzetten (Dashboard > Database > Extensions)
-- vóórdat het trigger-blok wordt uitgevoerd.

-- ============================================================
-- A. Tabellen
-- ============================================================

create table if not exists push_apparaten (
  id uuid primary key default gen_random_uuid(),
  profiel_id uuid not null references profielen(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  omgeving text not null default 'productie' check (omgeving in ('sandbox', 'productie')),
  bundel_id text,
  app_versie text,
  apparaat_naam text,
  laatst_gezien_op timestamptz not null default now(),
  aangemaakt_op timestamptz not null default now(),
  unique (token)
);

create index if not exists push_apparaten_profiel_id_idx on push_apparaten(profiel_id);

create table if not exists push_log (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  profiel_id uuid references profielen(id) on delete set null,
  platform text,
  token_staart text,
  status text not null,
  reden text,
  verzonden_op timestamptz not null default now()
);

-- Zelfde open toegangsmodel als de rest van het dashboard: autorisatie
-- gebeurt in de webapp/apps zelf (rechten/isSuperadmin), niet via RLS.
alter table push_apparaten disable row level security;
alter table push_log disable row level security;

-- ============================================================
-- B. RPC — ongelezen chatberichten (voor de iOS-badge)
-- ============================================================
-- gelezen_door wordt defensief naar text[] gecast: dat werkt zowel als de
-- kolom uuid[] als text[] is, zonder dat het schema vooraf geverifieerd hoeft
-- te worden.

create or replace function ongelezen_chat_aantal(p_profiel_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from chat_berichten b
  join chat_deelnemers d on d.gesprek_id = b.gesprek_id
  where d.profiel_id = p_profiel_id
    and b.afzender_id is distinct from p_profiel_id
    and not (p_profiel_id::text = any (b.gelezen_door::text[]))
$$;

-- ============================================================
-- C. Trigger — PAS UITVOEREN NADAT VERCEL + IOS + ANDROID GEVERIFIEERD ZIJN
-- ============================================================

create or replace function trigger_push_chatbericht()
returns trigger
language plpgsql
security definer            -- KRITIEK: zie waarschuwing bovenaan dit bestand
set search_path = public, net
as $$
begin
  if new.afzender_id is null then return new; end if;
  begin
    perform net.http_post(
      url := 'https://<vercel-domein>/api/push/chat',
      body := jsonb_build_object('bericht_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json',
                                     'x-theepot-push-secret', '<PUSH_WEBHOOK_SECRET>'),
      timeout_milliseconds := 10000
    );
  exception when others then null;  -- push mag chat nooit breken
  end;
  return new;
end;
$$;

drop trigger if exists push_bij_nieuw_chatbericht on chat_berichten;
create trigger push_bij_nieuw_chatbericht
  after insert on chat_berichten
  for each row execute function trigger_push_chatbericht();

-- Rollback (verwijdert alleen de push-koppeling, chat blijft werken):
--   drop trigger if exists push_bij_nieuw_chatbericht on chat_berichten;
