-- Versione 1.5: aggiunge il colore dei testi secondari alle palette utente.
-- Esegui questo file in Supabase SQL Editor dopo supabase/version-1.4.sql.

alter table public.profiles
  alter column theme_palette set default '{
    "dark": { "background": "#17130f", "surface": "#231d17", "accent": "#d8ae5f", "muted": "#b9aa99" },
    "light": { "background": "#f0ece4", "surface": "#fff8ee", "accent": "#7f5217", "muted": "#766755" }
  }'::jsonb;

update public.profiles
set theme_palette = '{
  "dark": { "background": "#17130f", "surface": "#231d17", "accent": "#d8ae5f", "muted": "#b9aa99" },
  "light": { "background": "#f0ece4", "surface": "#fff8ee", "accent": "#7f5217", "muted": "#766755" }
}'::jsonb
where theme_palette is null
   or jsonb_typeof(theme_palette) <> 'object';

update public.profiles
set theme_palette = jsonb_build_object(
  'dark',
  '{
    "background": "#17130f",
    "surface": "#231d17",
    "accent": "#d8ae5f",
    "muted": "#b9aa99"
  }'::jsonb || coalesce(theme_palette -> 'dark', '{}'::jsonb),
  'light',
  '{
    "background": "#f0ece4",
    "surface": "#fff8ee",
    "accent": "#7f5217",
    "muted": "#766755"
  }'::jsonb || coalesce(theme_palette -> 'light', '{}'::jsonb)
)
where jsonb_typeof(theme_palette) = 'object';
