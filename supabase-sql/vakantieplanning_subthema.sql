-- Subthema per dag/week schakelaar voor vakantieplanningen
-- Voegt een modus toe aan de planning (week of dag) en een JSON-veld
-- op de week voor de subthema's per dag.

alter table vakantie_planningen
  add column if not exists subthema_modus text not null default 'week'
  check (subthema_modus in ('week', 'dag'));

alter table vakantie_weken
  add column if not exists dag_subthemas jsonb not null default '{}'::jsonb;
