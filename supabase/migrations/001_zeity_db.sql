-- Zeity single-user app state: one row, JSONB columns per domain
create table if not exists public.zeity_db (
  id             int primary key default 1 check (id = 1),
  days           jsonb not null default '[]'::jsonb,
  active         jsonb,
  day_log        jsonb not null default '{}'::jsonb,
  weight         jsonb not null default '{"current":null,"history":[]}'::jsonb,
  protein        jsonb not null default '{"daily":null,"history":{},"ai_bonus":null}'::jsonb,
  protein_streak jsonb not null default '{"current":0,"best":0,"lastCompletedDate":null,"log":{}}'::jsonb,
  custom_foods   jsonb not null default '[]'::jsonb,
  ai_chat        jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now()
);

insert into public.zeity_db (id)
values (1)
on conflict (id) do nothing;

alter table public.zeity_db enable row level security;

create policy "zeity_db_anon_select"
  on public.zeity_db
  for select
  to anon, authenticated
  using (true);

create policy "zeity_db_anon_insert"
  on public.zeity_db
  for insert
  to anon, authenticated
  with check (id = 1);

create policy "zeity_db_anon_update"
  on public.zeity_db
  for update
  to anon, authenticated
  using (id = 1)
  with check (id = 1);

-- Realtime (safe if already in publication)
do $$
begin
  alter publication supabase_realtime add table public.zeity_db;
exception
  when duplicate_object then null;
end $$;
