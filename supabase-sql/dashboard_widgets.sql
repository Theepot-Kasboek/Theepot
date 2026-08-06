-- Uitgevoerd via de Supabase CLI (supabase db query -f supabase-sql/dashboard_widgets.sql --linked).
-- Widget-volgorde voor het nieuwe Dashboard-openingsscherm (iOS + Android).
-- Eén rij per profiel; de hele volgorde wordt in één keer overschreven bij
-- een reorder (geen losse rijen per widget nodig).

create table if not exists dashboard_voorkeuren (
  profiel_id uuid primary key references profielen(id) on delete cascade,
  widget_volgorde text[] not null default '{}',
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

-- Zelfde open toegangsmodel als de rest van het project: autorisatie
-- gebeurt in de apps zelf (filter op profiel_id = ingelogde gebruiker),
-- niet via RLS. Zie agenda.sql / push_meldingen.sql voor hetzelfde patroon.
alter table dashboard_voorkeuren disable row level security;
