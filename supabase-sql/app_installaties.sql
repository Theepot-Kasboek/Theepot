-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Tabellen voor het bijhouden van app-versies en op welke apparaten
-- de native iOS/Android app is geïnstalleerd.

create table if not exists app_versies (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('android', 'ios')),
  versie text not null,
  wijzigingen text,
  uitgebracht_op date not null default current_date,
  aangemaakt_op timestamptz not null default now()
);

create table if not exists app_installaties (
  id uuid primary key default gen_random_uuid(),
  apparaat_naam text not null,
  platform text not null check (platform in ('android', 'ios')),
  versie_id uuid references app_versies(id) on delete set null,
  notitie text,
  geinstalleerd_op date not null default current_date,
  aangemaakt_op timestamptz not null default now()
);

-- Zelfde open toegangsmodel als de rest van het dashboard: autorisatie
-- gebeurt in de webapp zelf (rechten/isSuperadmin), niet via RLS.
alter table app_versies disable row level security;
alter table app_installaties disable row level security;

-- Startversie 1.1 voor beide platforms.
insert into app_versies (platform, versie, wijzigingen)
values
  ('android', '1.1', 'Eerste versie van de native Android-app.'),
  ('ios', '1.1', 'Eerste versie van de native iOS-app.');
