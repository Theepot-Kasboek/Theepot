-- Uitvoeren in de Supabase SQL-editor (Project > SQL Editor > New query).
-- Weekplanningen: per locatie instelbaar of activiteiten per week of per
-- dag (maandag t/m vrijdag) worden ingevuld.
--
-- Bestaande weekactiviteiten (dag = null) blijven gewoon bestaan en zichtbaar
-- in de weekweergave. Zodra een locatie op dagweergave staat, krijgen nieuwe
-- activiteiten een dag (0 = maandag .. 4 = vrijdag) en worden ze per dag
-- getoond — los van de oude weekactiviteiten.

alter table week_activiteiten
  add column if not exists dag smallint;

alter table week_activiteiten
  drop constraint if exists week_activiteiten_dag_check;
alter table week_activiteiten
  add constraint week_activiteiten_dag_check check (dag is null or (dag >= 0 and dag <= 4));

create index if not exists week_activiteiten_planning_dag_idx
  on week_activiteiten (planning_id, dag);

-- Weergave-instelling per locatie ('week' of 'dag').
create table if not exists week_weergave_instellingen (
  locatie_naam text primary key,
  weergave text not null default 'week' check (weergave in ('week', 'dag')),
  aangepast_op timestamptz not null default now()
);

alter table week_weergave_instellingen disable row level security;
