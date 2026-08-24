-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Groepen bij weekplanningen: per locatie kun je zelf groepen aanmaken
-- (bijv. "4+" en "8+") die elk hun eigen weekactiviteiten hebben.
--
-- Een planning zonder groep_id is de "Algemene" planning van de locatie —
-- zo blijven alle bestaande weekplanningen gewoon staan.

create table if not exists week_groepen (
  id uuid primary key default gen_random_uuid(),
  locatie_naam text not null,
  naam text not null,
  volgorde int not null default 0,
  aangemaakt_op timestamptz not null default now(),
  aangemaakt_door uuid
);

create index if not exists week_groepen_locatie_idx on week_groepen (locatie_naam);
create unique index if not exists week_groepen_uniek_idx on week_groepen (locatie_naam, lower(naam));

-- Zelfde open toegangsmodel als de rest van het dashboard: autorisatie
-- gebeurt in de webapp zelf, niet via RLS.
alter table week_groepen disable row level security;

-- Koppeling planning -> groep. Groep verwijderen ruimt ook de planningen op.
alter table week_planningen
  add column if not exists groep_id uuid references week_groepen(id) on delete cascade;

create index if not exists week_planningen_groep_idx on week_planningen (groep_id);

-- Oude uniciteit (locatie_naam, week_start) vervangen door een variant
-- die de groep meeneemt. NULL telt daarbij als één vaste waarde, anders
-- zouden meerdere "Algemene" planningen per week toch mogelijk blijven.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'week_planningen'
      and con.contype = 'u'
      and (
        select array_agg(att.attname order by att.attname)
        from unnest(con.conkey) as k(attnum)
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
      ) = array['locatie_naam', 'week_start']
  loop
    execute format('alter table week_planningen drop constraint %I', c.conname);
  end loop;
end $$;

create unique index if not exists week_planningen_locatie_week_groep_idx
  on week_planningen (
    locatie_naam,
    week_start,
    coalesce(groep_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
