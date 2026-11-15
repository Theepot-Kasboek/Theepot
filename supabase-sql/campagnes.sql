-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Campagnes-module (sleep-en-klik e-mailbouwer, bouwer-UI only — geen
-- geautomatiseerd verzenden/abonneelijst). Zelfde open toegangsmodel als de
-- rest van het dashboard: RLS staat uit, autorisatie gebeurt in de webapp
-- zelf (rechten-tabel, pagina_campagnes).

-- 1. Campagnes zelf: concept of al "verzonden" gemarkeerd (handmatig, geen
--    echte verzendlaag), met de volledige inhoud als blokken-array in jsonb.
create table if not exists campagnes (
  id            uuid primary key default gen_random_uuid(),
  titel         text not null default 'Naamloze campagne',
  onderwerp     text not null default '',
  afzender_naam text,
  blokken       jsonb not null default '[]'::jsonb,
  status        text not null default 'concept' check (status in ('concept', 'verzonden')),
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now(),
  verzonden_op  timestamptz
);

-- 2. Huisstijl: singleton-rij (Theepot heeft maar één huisstijl, dus geen
--    organisatie_id). id is altijd 1.
create table if not exists campagne_huisstijl (
  id               integer primary key default 1 check (id = 1),
  logo_pad         text,
  merkkleur        text,
  achtergrondkleur text,
  koptekst         text,
  voettekst        text,
  bijgewerkt_op    timestamptz not null default now()
);

-- 3. Herbruikbare bloksjablonen: één opgeslagen blok (incl. combinatieblokken)
--    dat je later weer in een andere campagne kunt slepen/klikken.
create table if not exists campagne_bloksjablonen (
  id            uuid primary key default gen_random_uuid(),
  naam          text not null,
  blok          jsonb not null,
  aangemaakt_op timestamptz not null default now()
);

-- 4. Heel-nieuwsbrief-sjablonen: de volledige blokkenopbouw van een campagne,
--    los opslagbaar (met gekozen blokken leeggemaakt) als startpunt voor een
--    nieuwe campagne.
create table if not exists campagne_nieuwsbriefsjablonen (
  id            uuid primary key default gen_random_uuid(),
  naam          text not null,
  blokken       jsonb not null default '[]'::jsonb,
  aangemaakt_op timestamptz not null default now()
);

alter table campagnes disable row level security;
alter table campagne_huisstijl disable row level security;
alter table campagne_bloksjablonen disable row level security;
alter table campagne_nieuwsbriefsjablonen disable row level security;

-- Let op: afbeeldingen in campagnes (incl. het huisstijl-logo) gebruiken een
-- nieuwe storage bucket "campagne-afbeeldingen" (publiek leesbaar, alleen
-- ingelogde gebruikers uploaden) — pad campagnes/<blok_id>(-links|-rechts).<ext>
-- voor blokafbeeldingen, pad huisstijl/logo.<ext> voor het logo. Deze bucket
-- moet nog handmatig aangemaakt worden in Supabase (Storage > New bucket).
