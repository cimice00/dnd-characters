-- Versione 1.6: account applicativi username/password senza email Supabase Auth.
-- Esegui questo file in Supabase SQL Editor dopo supabase/version-1.5.sql.

create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

create table if not exists public.app_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  display_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  password_hash text not null,
  theme_palette jsonb not null default '{
    "dark": { "background": "#17130f", "surface": "#231d17", "accent": "#d8ae5f", "muted": "#b9aa99" },
    "light": { "background": "#f0ece4", "surface": "#fff8ee", "accent": "#7f5217", "muted": "#766755" }
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_accounts enable row level security;

create unique index if not exists app_accounts_username_unique_idx
on public.app_accounts (lower(username));

drop trigger if exists app_accounts_set_updated_at on public.app_accounts;
create trigger app_accounts_set_updated_at
before update on public.app_accounts
for each row execute function public.set_updated_at();

create table if not exists public.app_login_sessions (
  token_hash text primary key,
  account_id uuid not null references public.app_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

alter table public.app_login_sessions enable row level security;

create index if not exists app_login_sessions_account_id_idx
on public.app_login_sessions (account_id);

alter table public.sessions
  add column if not exists app_owner_id uuid references public.app_accounts (id) on delete cascade;

alter table public.sessions
  alter column owner_id drop not null;

alter table public.session_members
  add column if not exists app_user_id uuid references public.app_accounts (id) on delete cascade;

alter table public.session_members
  drop constraint if exists session_members_pkey;

alter table public.session_members
  alter column user_id drop not null;

create unique index if not exists session_members_auth_unique_idx
on public.session_members (session_id, user_id)
where user_id is not null;

create unique index if not exists session_members_app_unique_idx
on public.session_members (session_id, app_user_id)
where app_user_id is not null;

create index if not exists session_members_app_user_id_idx
on public.session_members (app_user_id);

alter table public.characters
  add column if not exists app_owner_id uuid references public.app_accounts (id) on delete cascade;

alter table public.characters
  alter column owner_id drop not null;

create index if not exists characters_app_owner_id_idx
on public.characters (app_owner_id);

alter table public.custom_spells
  add column if not exists app_owner_id uuid references public.app_accounts (id) on delete cascade;

alter table public.custom_spells
  alter column owner_id drop not null;

create index if not exists custom_spells_app_owner_id_idx
on public.custom_spells (app_owner_id);

alter table public.master_messages
  add column if not exists app_sender_id uuid references public.app_accounts (id) on delete cascade;

alter table public.master_messages
  alter column sender_id drop not null;

alter table public.session_invites
  add column if not exists app_inviter_id uuid references public.app_accounts (id) on delete cascade,
  add column if not exists app_invitee_id uuid references public.app_accounts (id) on delete cascade;

alter table public.session_invites
  alter column inviter_id drop not null,
  alter column invitee_id drop not null;

create unique index if not exists session_invites_app_pending_unique_idx
on public.session_invites (session_id, app_invitee_id)
where status = 'pending' and app_invitee_id is not null;

create index if not exists session_invites_app_invitee_status_idx
on public.session_invites (app_invitee_id, status, created_at desc);

create or replace function public.normalize_app_username(raw_value text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
begin
  normalized := lower(regexp_replace(coalesce(nullif(trim(raw_value), ''), ''), '[^a-zA-Z0-9_]+', '_', 'g'));
  normalized := trim(both '_' from normalized);
  if normalized = '' then
    raise exception 'Username obbligatorio';
  end if;
  return left(normalized, 32);
end;
$$;

create or replace function public.app_token_hash(raw_token text)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select encode(extensions.digest(convert_to(coalesce(raw_token, ''), 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.app_account_id_from_token(app_token text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select als.account_id
  from public.app_login_sessions als
  where als.token_hash = public.app_token_hash(app_token)
    and als.expires_at > now()
  limit 1;
$$;

create or replace function public.app_account_json(account_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', aa.id,
    'username', aa.username,
    'display_name', aa.display_name,
    'role', aa.role,
    'theme_palette', aa.theme_palette,
    'created_at', aa.created_at
  )
  from public.app_accounts aa
  where aa.id = account_id;
$$;

create or replace function public.app_is_session_member(target_session_id uuid, target_account_id uuid)
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
      and sm.app_user_id = target_account_id
  );
$$;

create or replace function public.app_session_role(target_session_id uuid, target_account_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select sm.role
  from public.session_members sm
  where sm.session_id = target_session_id
    and sm.app_user_id = target_account_id
  limit 1;
$$;

create or replace function public.app_is_session_master(target_session_id uuid, target_account_id uuid)
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
      and sm.app_user_id = target_account_id
      and sm.role = 'master'
  );
$$;

create or replace function public.app_is_admin(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_accounts aa
    where aa.id = target_account_id
      and aa.role = 'admin'
  );
$$;

create or replace function public.handle_new_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.session_members (session_id, user_id, role)
    values (new.id, new.owner_id, 'master')
    on conflict do nothing;
  end if;

  if new.app_owner_id is not null then
    insert into public.session_members (session_id, app_user_id, role)
    values (new.id, new.app_owner_id, 'master')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.bootstrap_app_admin(target_username text, target_password text, target_display_name text default 'Admin')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_username text;
  created_id uuid;
begin
  if length(coalesce(target_password, '')) < 6 then
    raise exception 'Password troppo corta';
  end if;

  normalized_username := public.normalize_app_username(target_username);

  select id
  into created_id
  from public.app_accounts
  where lower(username) = lower(normalized_username)
  limit 1;

  if created_id is null then
    insert into public.app_accounts (username, display_name, role, password_hash)
    values (normalized_username, coalesce(nullif(trim(target_display_name), ''), normalized_username), 'admin', extensions.crypt(target_password, extensions.gen_salt('bf')))
    returning id into created_id;
  else
    update public.app_accounts
    set display_name = coalesce(nullif(trim(target_display_name), ''), normalized_username),
        role = 'admin',
        password_hash = extensions.crypt(target_password, extensions.gen_salt('bf')),
        updated_at = now()
    where id = created_id;
  end if;

  return created_id;
end;
$$;

create or replace function public.app_login_account(target_username text, target_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_row public.app_accounts;
  raw_token text;
begin
  select *
  into account_row
  from public.app_accounts
  where lower(username) = lower(public.normalize_app_username(target_username))
  limit 1;

  if account_row.id is null or account_row.password_hash <> extensions.crypt(coalesce(target_password, ''), account_row.password_hash) then
    raise exception 'Credenziali non valide';
  end if;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.app_login_sessions (token_hash, account_id)
  values (public.app_token_hash(raw_token), account_row.id);

  return jsonb_build_object(
    'token', raw_token,
    'profile', public.app_account_json(account_row.id)
  );
end;
$$;

create or replace function public.app_logout_account(app_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.app_login_sessions
  where token_hash = public.app_token_hash(app_token);
end;
$$;

create or replace function public.app_get_shell(app_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  profile jsonb;
  sessions_json jsonb;
  invites_json jsonb;
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;

  profile := public.app_account_json(account_id);

  select coalesce(jsonb_agg(item order by item -> 'session' ->> 'created_at' desc), '[]'::jsonb)
  into sessions_json
  from (
    select jsonb_build_object(
      'role', sm.role,
      'session', jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'owner_id', s.app_owner_id,
        'created_at', s.created_at
      )
    ) as item
    from public.session_members sm
    join public.sessions s on s.id = sm.session_id
    where sm.app_user_id = account_id
  ) listed;

  select coalesce(jsonb_agg(item order by item ->> 'created_at' desc), '[]'::jsonb)
  into invites_json
  from (
    select jsonb_build_object(
      'id', si.id,
      'status', si.status,
      'created_at', si.created_at,
      'session_id', si.session_id,
      'sessions', jsonb_build_object('id', s.id, 'name', s.name)
    ) as item
    from public.session_invites si
    join public.sessions s on s.id = si.session_id
    where si.app_invitee_id = account_id
      and si.status = 'pending'
  ) listed;

  return jsonb_build_object('profile', profile, 'sessions', sessions_json, 'invites', invites_json);
end;
$$;

create or replace function public.app_update_theme_palette(app_token text, palette jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;
  if palette is null or jsonb_typeof(palette) <> 'object' then
    raise exception 'Palette non valida';
  end if;

  update public.app_accounts
  set theme_palette = palette
  where id = account_id;

  return public.app_account_json(account_id);
end;
$$;

create or replace function public.app_change_password(app_token text, new_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;
  if length(coalesce(new_password, '')) < 6 then
    raise exception 'Password troppo corta';
  end if;

  update public.app_accounts
  set password_hash = extensions.crypt(new_password, extensions.gen_salt('bf'))
  where id = account_id;
end;
$$;

create or replace function public.app_create_session(app_token text, session_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  session_row public.sessions;
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;

  insert into public.sessions (name, app_owner_id)
  values (coalesce(nullif(trim(session_name), ''), 'Nuova sessione'), account_id)
  returning * into session_row;

  return jsonb_build_object('id', session_row.id, 'name', session_row.name, 'owner_id', session_row.app_owner_id, 'created_at', session_row.created_at);
end;
$$;

create or replace function public.app_get_session_for_admin(app_token text, target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  session_row public.sessions;
begin
  if account_id is null or not public.app_is_admin(account_id) then
    raise exception 'Permesso negato';
  end if;

  select * into session_row
  from public.sessions
  where id = target_session_id;

  if session_row.id is null then
    return null;
  end if;

  return jsonb_build_object('id', session_row.id, 'name', session_row.name, 'owner_id', session_row.app_owner_id, 'created_at', session_row.created_at);
end;
$$;

create or replace function public.app_load_character(app_token text, target_session_id uuid, target_character_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  character_row public.characters;
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;
  if not public.app_is_session_member(target_session_id, account_id) and not public.app_is_admin(account_id) then
    raise exception 'Permesso negato';
  end if;

  if target_character_id is not null then
    select * into character_row
    from public.characters
    where id = target_character_id
      and session_id = target_session_id
      and (app_owner_id = account_id or public.app_is_admin(account_id) or public.app_is_session_master(target_session_id, account_id))
    limit 1;
  else
    select * into character_row
    from public.characters
    where session_id = target_session_id
      and app_owner_id = account_id
    order by updated_at desc
    limit 1;
  end if;

  if character_row.id is null then
    return null;
  end if;

  return jsonb_build_object('id', character_row.id, 'name', character_row.name, 'data', character_row.data, 'updated_at', character_row.updated_at);
end;
$$;

create or replace function public.app_create_character(app_token text, target_session_id uuid, character_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  character_row public.characters;
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;
  if not public.app_is_session_member(target_session_id, account_id) then
    raise exception 'Permesso negato';
  end if;

  insert into public.characters (session_id, app_owner_id, name, data)
  values (
    target_session_id,
    account_id,
    coalesce(nullif(character_data ->> 'name', ''), 'Personaggio senza nome'),
    coalesce(character_data, '{}'::jsonb)
  )
  returning * into character_row;

  return jsonb_build_object('id', character_row.id, 'name', character_row.name, 'data', character_row.data, 'updated_at', character_row.updated_at);
end;
$$;

create or replace function public.app_update_character(app_token text, target_character_id uuid, character_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;

  update public.characters
  set name = coalesce(nullif(character_data ->> 'name', ''), 'Personaggio senza nome'),
      data = coalesce(character_data, '{}'::jsonb)
  where id = target_character_id
    and app_owner_id = account_id;

  if not found then
    raise exception 'Scheda non trovata';
  end if;
end;
$$;

create or replace function public.app_sync_custom_spells(app_token text, target_session_id uuid, custom_spells jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  spell jsonb;
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;
  if not public.app_is_session_member(target_session_id, account_id) then
    raise exception 'Permesso negato';
  end if;

  delete from public.custom_spells
  where session_id = target_session_id
    and app_owner_id = account_id;

  if custom_spells is null or jsonb_typeof(custom_spells) <> 'array' then
    return;
  end if;

  for spell in select value from jsonb_array_elements(custom_spells)
  loop
    insert into public.custom_spells (session_id, app_owner_id, name, class_names, level, source, data)
    values (
      target_session_id,
      account_id,
      coalesce(spell ->> 'name_it', spell ->> 'name', 'Incantesimo custom'),
      coalesce(array(select jsonb_array_elements_text(coalesce(spell -> 'classes', '[]'::jsonb))), '{}'),
      coalesce((spell ->> 'level')::integer, 0),
      coalesce(spell ->> 'source', 'Custom'),
      spell
    );
  end loop;
end;
$$;

create or replace function public.app_list_master_characters(app_token text, target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  characters_json jsonb;
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;
  if not public.app_is_admin(account_id) and not public.app_is_session_master(target_session_id, account_id) then
    raise exception 'Permesso negato';
  end if;

  select coalesce(jsonb_agg(item order by item ->> 'updated_at' desc), '[]'::jsonb)
  into characters_json
  from (
    select jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'owner_id', c.app_owner_id,
      'data', c.data,
      'updated_at', c.updated_at,
      'ownerProfile', public.app_account_json(c.app_owner_id)
    ) as item
    from public.characters c
    where c.session_id = target_session_id
  ) listed;

  return characters_json;
end;
$$;

create or replace function public.app_accept_invite(app_token text, target_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  invite_row public.session_invites;
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;

  select * into invite_row
  from public.session_invites
  where id = target_invite_id
    and app_invitee_id = account_id
    and status = 'pending';

  if invite_row.id is null then
    raise exception 'Invito non trovato';
  end if;

  update public.session_invites
  set status = 'accepted', responded_at = now()
  where id = target_invite_id;

  insert into public.session_members (session_id, app_user_id, role)
  values (invite_row.session_id, account_id, 'player')
  on conflict do nothing;

  return invite_row.session_id;
end;
$$;

create or replace function public.app_decline_invite(app_token text, target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;

  update public.session_invites
  set status = 'declined', responded_at = now()
  where id = target_invite_id
    and app_invitee_id = account_id
    and status = 'pending';
end;
$$;

create or replace function public.app_search_accounts(app_token text, search_term text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  results jsonb;
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;
  if length(trim(coalesce(search_term, ''))) < 2 then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(public.app_account_json(id) order by username), '[]'::jsonb)
  into results
  from (
    select id, username
    from public.app_accounts
    where id <> account_id
      and username ilike '%' || trim(search_term) || '%'
    order by username
    limit 8
  ) matched;

  return results;
end;
$$;

create or replace function public.app_invite_account(app_token text, target_session_id uuid, target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;
  if not public.app_is_admin(account_id) and not public.app_is_session_master(target_session_id, account_id) then
    raise exception 'Permesso negato';
  end if;

  insert into public.session_invites (session_id, app_inviter_id, app_invitee_id)
  values (target_session_id, account_id, target_account_id);
end;
$$;

create or replace function public.app_admin_list_accounts(app_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  results jsonb;
begin
  if account_id is null or not public.app_is_admin(account_id) then
    raise exception 'Permesso negato';
  end if;

  select coalesce(jsonb_agg(public.app_account_json(id) order by username), '[]'::jsonb)
  into results
  from public.app_accounts;

  return results;
end;
$$;

create or replace function public.app_admin_create_account(app_token text, target_username text, target_display_name text, target_password text, target_role text default 'user')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  normalized_username text;
  created_id uuid;
  clean_role text := case when target_role = 'admin' then 'admin' else 'user' end;
begin
  if account_id is null or not public.app_is_admin(account_id) then
    raise exception 'Permesso negato';
  end if;
  if length(coalesce(target_password, '')) < 6 then
    raise exception 'Password troppo corta';
  end if;

  normalized_username := public.normalize_app_username(target_username);

  insert into public.app_accounts (username, display_name, role, password_hash)
  values (
    normalized_username,
    coalesce(nullif(trim(target_display_name), ''), normalized_username),
    clean_role,
    extensions.crypt(target_password, extensions.gen_salt('bf'))
  )
  returning id into created_id;

  return public.app_account_json(created_id);
end;
$$;

create or replace function public.app_admin_update_account_role(app_token text, target_account_id uuid, target_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  clean_role text := case when target_role = 'admin' then 'admin' else 'user' end;
begin
  if account_id is null or not public.app_is_admin(account_id) then
    raise exception 'Permesso negato';
  end if;

  update public.app_accounts
  set role = clean_role
  where id = target_account_id;

  return public.app_account_json(target_account_id);
end;
$$;

create or replace function public.app_admin_list_sessions(app_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  results jsonb;
begin
  if account_id is null or not public.app_is_admin(account_id) then
    raise exception 'Permesso negato';
  end if;

  select coalesce(jsonb_agg(item order by item ->> 'created_at' desc), '[]'::jsonb)
  into results
  from (
    select jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'owner_id', s.app_owner_id,
      'created_at', s.created_at
    ) as item
    from public.sessions s
  ) listed;

  return results;
end;
$$;

create or replace function public.app_admin_delete_session(app_token text, target_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
begin
  if account_id is null or not public.app_is_admin(account_id) then
    raise exception 'Permesso negato';
  end if;

  delete from public.sessions
  where id = target_session_id;
end;
$$;

create or replace function public.app_delete_master_session(app_token text, target_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;
  if not public.app_is_admin(account_id) and not public.app_is_session_master(target_session_id, account_id) then
    raise exception 'Permesso negato';
  end if;

  delete from public.sessions
  where id = target_session_id;
end;
$$;

revoke all on function public.normalize_app_username(text) from public, anon, authenticated;
revoke all on function public.app_token_hash(text) from public, anon, authenticated;
revoke all on function public.app_account_id_from_token(text) from public, anon, authenticated;
revoke all on function public.app_account_json(uuid) from public, anon, authenticated;
revoke all on function public.app_is_session_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_session_role(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_is_session_master(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_is_admin(uuid) from public, anon, authenticated;
revoke all on function public.bootstrap_app_admin(text, text, text) from public, anon, authenticated;

grant execute on function public.app_login_account(text, text) to anon, authenticated;
grant execute on function public.app_logout_account(text) to anon, authenticated;
grant execute on function public.app_get_shell(text) to anon, authenticated;
grant execute on function public.app_update_theme_palette(text, jsonb) to anon, authenticated;
grant execute on function public.app_change_password(text, text) to anon, authenticated;
grant execute on function public.app_create_session(text, text) to anon, authenticated;
grant execute on function public.app_get_session_for_admin(text, uuid) to anon, authenticated;
grant execute on function public.app_load_character(text, uuid, uuid) to anon, authenticated;
grant execute on function public.app_create_character(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.app_update_character(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.app_sync_custom_spells(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.app_list_master_characters(text, uuid) to anon, authenticated;
grant execute on function public.app_accept_invite(text, uuid) to anon, authenticated;
grant execute on function public.app_decline_invite(text, uuid) to anon, authenticated;
grant execute on function public.app_search_accounts(text, text) to anon, authenticated;
grant execute on function public.app_invite_account(text, uuid, uuid) to anon, authenticated;
grant execute on function public.app_admin_list_accounts(text) to anon, authenticated;
grant execute on function public.app_admin_create_account(text, text, text, text, text) to anon, authenticated;
grant execute on function public.app_admin_update_account_role(text, uuid, text) to anon, authenticated;
grant execute on function public.app_admin_list_sessions(text) to anon, authenticated;
grant execute on function public.app_admin_delete_session(text, uuid) to anon, authenticated;
grant execute on function public.app_delete_master_session(text, uuid) to anon, authenticated;
