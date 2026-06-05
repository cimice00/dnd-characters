-- Supabase schema for the D&D character app.
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_members (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('master', 'player')),
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_spells (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  class_names text[] not null default '{}',
  level integer not null check (level >= 0),
  source text not null default 'Custom',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.master_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at
before update on public.characters
for each row execute function public.set_updated_at();

drop trigger if exists custom_spells_set_updated_at on public.custom_spells;
create trigger custom_spells_set_updated_at
before update on public.custom_spells
for each row execute function public.set_updated_at();

create or replace function public.is_session_member(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_members sm
    where sm.session_id = target_session_id
      and sm.user_id = auth.uid()
  );
$$;

create or replace function public.is_session_master(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_members sm
    where sm.session_id = target_session_id
      and sm.user_id = auth.uid()
      and sm.role = 'master'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_new_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.session_members (session_id, user_id, role)
  values (new.id, new.owner_id, 'master')
  on conflict (session_id, user_id) do update set role = 'master';
  return new;
end;
$$;

drop trigger if exists on_session_created on public.sessions;
create trigger on_session_created
after insert on public.sessions
for each row execute function public.handle_new_session();

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.characters enable row level security;
alter table public.custom_spells enable row level security;
alter table public.master_messages enable row level security;

drop policy if exists "Profiles are visible to authenticated users" on public.profiles;
create policy "Profiles are visible to authenticated users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Members can read sessions" on public.sessions;
create policy "Members can read sessions"
on public.sessions for select
to authenticated
using (public.is_session_member(id));

drop policy if exists "Users can create sessions" on public.sessions;
create policy "Users can create sessions"
on public.sessions for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Masters can update sessions" on public.sessions;
create policy "Masters can update sessions"
on public.sessions for update
to authenticated
using (public.is_session_master(id))
with check (public.is_session_master(id));

drop policy if exists "Members can read membership" on public.session_members;
create policy "Members can read membership"
on public.session_members for select
to authenticated
using (public.is_session_member(session_id));

drop policy if exists "Session owner can add members" on public.session_members;
create policy "Session owner can add members"
on public.session_members for insert
to authenticated
with check (
  exists (
    select 1
    from public.sessions s
    where s.id = session_id
      and s.owner_id = auth.uid()
  )
);

drop policy if exists "Masters can update membership" on public.session_members;
create policy "Masters can update membership"
on public.session_members for update
to authenticated
using (public.is_session_master(session_id))
with check (public.is_session_master(session_id));

drop policy if exists "Masters can remove membership" on public.session_members;
create policy "Masters can remove membership"
on public.session_members for delete
to authenticated
using (public.is_session_master(session_id));

drop policy if exists "Members can read characters" on public.characters;
create policy "Members can read characters"
on public.characters for select
to authenticated
using (public.is_session_member(session_id));

drop policy if exists "Players can create their characters" on public.characters;
create policy "Players can create their characters"
on public.characters for insert
to authenticated
with check (owner_id = auth.uid() and public.is_session_member(session_id));

drop policy if exists "Owners and masters can update characters" on public.characters;
create policy "Owners and masters can update characters"
on public.characters for update
to authenticated
using (owner_id = auth.uid() or public.is_session_master(session_id))
with check (owner_id = auth.uid() or public.is_session_master(session_id));

drop policy if exists "Owners and masters can delete characters" on public.characters;
create policy "Owners and masters can delete characters"
on public.characters for delete
to authenticated
using (owner_id = auth.uid() or public.is_session_master(session_id));

drop policy if exists "Members can read custom spells" on public.custom_spells;
create policy "Members can read custom spells"
on public.custom_spells for select
to authenticated
using (session_id is null or public.is_session_member(session_id));

drop policy if exists "Members can create custom spells" on public.custom_spells;
create policy "Members can create custom spells"
on public.custom_spells for insert
to authenticated
with check (
  owner_id = auth.uid()
  and (session_id is null or public.is_session_member(session_id))
);

drop policy if exists "Owners and masters can update custom spells" on public.custom_spells;
create policy "Owners and masters can update custom spells"
on public.custom_spells for update
to authenticated
using (
  owner_id = auth.uid()
  or (session_id is not null and public.is_session_master(session_id))
)
with check (
  owner_id = auth.uid()
  or (session_id is not null and public.is_session_master(session_id))
);

drop policy if exists "Owners and masters can delete custom spells" on public.custom_spells;
create policy "Owners and masters can delete custom spells"
on public.custom_spells for delete
to authenticated
using (
  owner_id = auth.uid()
  or (session_id is not null and public.is_session_master(session_id))
);

drop policy if exists "Members can read messages" on public.master_messages;
create policy "Members can read messages"
on public.master_messages for select
to authenticated
using (public.is_session_member(session_id));

drop policy if exists "Masters can send messages" on public.master_messages;
create policy "Masters can send messages"
on public.master_messages for insert
to authenticated
with check (sender_id = auth.uid() and public.is_session_master(session_id));

create index if not exists sessions_owner_id_idx on public.sessions (owner_id);
create index if not exists session_members_user_id_idx on public.session_members (user_id);
create index if not exists characters_session_id_idx on public.characters (session_id);
create index if not exists characters_owner_id_idx on public.characters (owner_id);
create index if not exists custom_spells_session_id_idx on public.custom_spells (session_id);
create index if not exists custom_spells_owner_id_idx on public.custom_spells (owner_id);
create index if not exists master_messages_session_id_created_at_idx on public.master_messages (session_id, created_at desc);
