-- Versione 1.4: preferenze tema persistenti per utente.
-- Esegui questo file in Supabase SQL Editor dopo supabase/version-1.3.sql.

alter table public.profiles
  add column if not exists theme_palette jsonb not null default '{
    "dark": { "background": "#17130f", "surface": "#231d17", "accent": "#d8ae5f" },
    "light": { "background": "#f0ece4", "surface": "#fff8ee", "accent": "#7f5217" }
  }'::jsonb;

update public.profiles
set theme_palette = '{
  "dark": { "background": "#17130f", "surface": "#231d17", "accent": "#d8ae5f" },
  "light": { "background": "#f0ece4", "surface": "#fff8ee", "accent": "#7f5217" }
}'::jsonb
where theme_palette is null
   or jsonb_typeof(theme_palette) <> 'object';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_theme_palette_object_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_theme_palette_object_check
      check (jsonb_typeof(theme_palette) = 'object');
  end if;
end $$;
