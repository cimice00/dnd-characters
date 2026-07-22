-- Versione 1.7: stabilizza session_members dopo gli account applicativi.

alter table public.session_members
  add column if not exists id uuid default gen_random_uuid();

update public.session_members
set id = gen_random_uuid()
where id is null;

alter table public.session_members
  alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.session_members'::regclass
      and contype = 'p'
  ) then
    alter table public.session_members
      add constraint session_members_pkey primary key (id);
  end if;
end;
$$;
