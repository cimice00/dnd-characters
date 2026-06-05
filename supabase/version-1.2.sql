-- Versione 1.2: ruoli, username, inviti sessione e policy admin.
-- Esegui questo file in Supabase SQL Editor dopo supabase/schema.sql.

alter table public.profiles
  add column if not exists username text,
  add column if not exists role text not null default 'user' check (role in ('admin', 'user'));

update public.profiles
set username = 'user_' || replace(left(id::text, 8), '-', '')
where username is null or trim(username) = '';

create unique index if not exists profiles_username_unique_idx
on public.profiles (lower(username));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.normalize_username(raw_value text, fallback_value text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
begin
  base := lower(regexp_replace(coalesce(nullif(trim(raw_value), ''), fallback_value), '[^a-zA-Z0-9_]+', '_', 'g'));
  base := trim(both '_' from base);
  if base = '' then
    base := fallback_value;
  end if;
  return left(base, 32);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
  suffix integer := 1;
begin
  base_username := public.normalize_username(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    'user_' || replace(left(new.id::text, 8), '-', '')
  );
  candidate_username := base_username;

  while exists (
    select 1
    from public.profiles p
    where lower(p.username) = lower(candidate_username)
      and p.id <> new.id
  ) loop
    suffix := suffix + 1;
    candidate_username := left(base_username, 26) || '_' || suffix::text;
  end loop;

  insert into public.profiles (id, display_name, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    candidate_username,
    'user'
  )
  on conflict (id) do update
  set
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    username = coalesce(public.profiles.username, excluded.username),
    role = coalesce(public.profiles.role, 'user');
  return new;
end;
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Non puoi cambiare id profilo';
  end if;

  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Solo un admin puo cambiare ruolo';
  end if;

  if new.username is null or trim(new.username) = '' then
    raise exception 'Username obbligatorio';
  end if;

  new.username := public.normalize_username(new.username, 'user_' || replace(left(new.id::text, 8), '-', ''));
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

create table if not exists public.session_invites (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  invitee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table public.session_invites enable row level security;

create unique index if not exists session_invites_pending_unique_idx
on public.session_invites (session_id, invitee_id)
where status = 'pending';

create index if not exists session_invites_invitee_status_idx
on public.session_invites (invitee_id, status, created_at desc);

drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read sessions" on public.sessions;
create policy "Admins can read sessions"
on public.sessions for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update sessions" on public.sessions;
create policy "Admins can update sessions"
on public.sessions for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete sessions" on public.sessions;
create policy "Admins can delete sessions"
on public.sessions for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read membership" on public.session_members;
create policy "Admins can read membership"
on public.session_members for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage membership" on public.session_members;
create policy "Admins can manage membership"
on public.session_members for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage characters" on public.characters;
create policy "Admins can manage characters"
on public.characters for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage custom spells" on public.custom_spells;
create policy "Admins can manage custom spells"
on public.custom_spells for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage master messages" on public.master_messages;
create policy "Admins can manage master messages"
on public.master_messages for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Invite participants can read invites" on public.session_invites;
create policy "Invite participants can read invites"
on public.session_invites for select
to authenticated
using (
  public.is_admin()
  or invitee_id = auth.uid()
  or public.is_session_master(session_id)
);

drop policy if exists "Masters can invite users" on public.session_invites;
create policy "Masters can invite users"
on public.session_invites for insert
to authenticated
with check (
  inviter_id = auth.uid()
  and (public.is_admin() or public.is_session_master(session_id))
);

drop policy if exists "Invitees can answer invites" on public.session_invites;
create policy "Invitees can answer invites"
on public.session_invites for update
to authenticated
using (
  public.is_admin()
  or invitee_id = auth.uid()
  or public.is_session_master(session_id)
)
with check (
  public.is_admin()
  or invitee_id = auth.uid()
  or public.is_session_master(session_id)
);

drop policy if exists "Masters can delete invites" on public.session_invites;
create policy "Masters can delete invites"
on public.session_invites for delete
to authenticated
using (public.is_admin() or public.is_session_master(session_id));

create or replace function public.accept_session_invite(target_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.session_invites;
begin
  select *
  into invite_row
  from public.session_invites
  where id = target_invite_id
    and invitee_id = auth.uid()
    and status = 'pending';

  if invite_row.id is null then
    raise exception 'Invito non trovato';
  end if;

  update public.session_invites
  set status = 'accepted', responded_at = now()
  where id = target_invite_id;

  insert into public.session_members (session_id, user_id, role)
  values (invite_row.session_id, auth.uid(), 'player')
  on conflict (session_id, user_id) do nothing;

  return invite_row.session_id;
end;
$$;

create or replace function public.decline_session_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.session_invites
  set status = 'declined', responded_at = now()
  where id = target_invite_id
    and invitee_id = auth.uid()
    and status = 'pending';
end;
$$;

create or replace function public.bootstrap_admin(target_email text, target_username text default 'Admin', target_display_name text default 'Admin')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  select id
  into target_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_id is null then
    raise exception 'Utente non trovato: %', target_email;
  end if;

  insert into public.profiles (id, username, display_name, role)
  values (
    target_id,
    public.normalize_username(target_username, 'admin'),
    target_display_name,
    'admin'
  )
  on conflict (id) do update
  set username = excluded.username,
      display_name = excluded.display_name,
      role = 'admin',
      updated_at = now();
end;
$$;

grant execute on function public.accept_session_invite(uuid) to authenticated;
grant execute on function public.decline_session_invite(uuid) to authenticated;
revoke all on function public.bootstrap_admin(text, text, text) from anon, authenticated;
