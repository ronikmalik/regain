-- Regain sync schema. Run once in the Supabase SQL editor (Dashboard > SQL > New query).
-- Security model: every table has Row Level Security on, and every policy is scoped to
-- auth.uid(), so the public anon key can never read or write another user's rows.

-- ---------- profiles: settings + consent record ----------
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  settings       jsonb not null default '{}'::jsonb,
  terms_version  text,
  consent_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- sets: one row per saved exercise set ----------
create table if not exists public.sets (
  id           uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  exercise_id  text not null,
  ts           timestamptz not null,
  data         jsonb not null,          -- the full set record incl. reps, metrics, samples
  deleted      boolean not null default false,
  updated_at   timestamptz not null default now()
);
create index if not exists sets_user_ts on public.sets (user_id, ts);
create index if not exists sets_user_updated on public.sets (user_id, updated_at);

-- keep updated_at honest regardless of what the client sends
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists sets_touch on public.sets;
create trigger sets_touch before update on public.sets for each row execute function public.touch_updated_at();

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.sets     enable row level security;

drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: own row" on public.profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "sets: own rows" on public.sets;
create policy "sets: own rows" on public.sets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- nothing for anonymous callers
revoke all on public.profiles from anon;
revoke all on public.sets     from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.sets     to authenticated;

-- ---------- delete my account (data rights) ----------
-- Runs as the function owner so it may delete from auth.users, but only ever the caller's own row.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from public.sets     where user_id = auth.uid();
  delete from public.profiles where user_id = auth.uid();
  delete from auth.users      where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
