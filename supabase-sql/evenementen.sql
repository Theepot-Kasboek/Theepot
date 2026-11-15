-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Evenementen-module: evenementen aanmaken met een publieke aanmeldlink
-- (capaciteit + sluitingsdatum voor aanmelden). Zelfde open toegangsmodel als
-- de rest van het dashboard: RLS staat uit, autorisatie gebeurt in de webapp
-- zelf (rechten-tabel, pagina_evenementen). De publieke aanmeldpagina schrijft
-- via de service-role key in app/api/evenementen/aanmelden, dus er is geen
-- anon insert-policy nodig.

create table if not exists evenementen (
  id                 uuid primary key default gen_random_uuid(),
  titel              text not null,
  omschrijving       text,
  locatie            text,
  datum              timestamptz,
  sluit_aanmelden_op timestamptz not null,
  max_aanmeldingen   integer,
  status             text not null default 'actief' check (status in ('actief', 'geannuleerd')),
  aangemaakt_door    uuid references profielen(id) on delete set null,
  aangemaakt_op      timestamptz not null default now(),
  bijgewerkt_op      timestamptz not null default now()
);

create table if not exists evenement_aanmeldingen (
  id           uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references evenementen(id) on delete cascade,
  naam         text,
  email        text not null,
  aangemeld_op timestamptz not null default now()
);

create index if not exists idx_evenement_aanmeldingen_event
  on evenement_aanmeldingen (evenement_id);

-- Eén rij per e-mailadres per evenement: een tweede aanmelding met hetzelfde
-- adres werkt de bestaande rij bij i.p.v. een duplicaat toe te voegen.
create unique index if not exists uq_evenement_aanmelding_email
  on evenement_aanmeldingen (evenement_id, lower(email));

alter table evenementen disable row level security;
alter table evenement_aanmeldingen disable row level security;
