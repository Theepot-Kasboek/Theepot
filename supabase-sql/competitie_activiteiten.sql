-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Gedeelde opslag voor de Competitie Activiteiten pagina (kikkers, dierenkring,
-- en het Roze/Rood puntenschema). Eén rij per "sleutel" met de data als JSON,
-- zodat alle locaties realtime dezelfde stand zien.

create table if not exists competitie_data (
  sleutel text primary key,
  waarde jsonb not null default '{}'::jsonb,
  bijgewerkt_op timestamptz not null default now()
);

-- Zelfde open toegangsmodel als de rest van het dashboard: autorisatie
-- gebeurt in de webapp zelf, niet via RLS.
alter table competitie_data disable row level security;
