-- Versione 1.3: aggiornamenti live dei personaggi per la vista master.
-- Esegui questo file in Supabase SQL Editor dopo supabase/version-1.2.sql.

alter table public.characters replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'characters'
  ) then
    alter publication supabase_realtime add table public.characters;
  end if;
end $$;
