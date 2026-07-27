-- Versione 1.8: consente a master e admin di rinominare le campagne.
-- Esegui questo file in Supabase SQL Editor dopo supabase/version-1.7.sql.

create or replace function public.app_rename_session(app_token text, target_session_id uuid, session_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid := public.app_account_id_from_token(app_token);
  next_name text := nullif(trim(coalesce(session_name, '')), '');
  session_row public.sessions;
begin
  if account_id is null then
    raise exception 'Sessione non valida';
  end if;

  if next_name is null then
    raise exception 'Nome campagna non valido';
  end if;

  if not public.app_is_admin(account_id)
     and not public.app_is_session_master(target_session_id, account_id) then
    raise exception 'Permesso negato';
  end if;

  update public.sessions
  set name = next_name
  where id = target_session_id
  returning * into session_row;

  if not found then
    raise exception 'Sessione non trovata';
  end if;

  return jsonb_build_object(
    'id', session_row.id,
    'name', session_row.name,
    'owner_id', session_row.app_owner_id,
    'created_at', session_row.created_at,
    'updated_at', session_row.updated_at
  );
end;
$$;

revoke all on function public.app_rename_session(text, uuid, text) from public, anon, authenticated;
grant execute on function public.app_rename_session(text, uuid, text) to anon, authenticated;
