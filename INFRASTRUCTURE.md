# Infrastruttura: Cloudflare Pages + Supabase

Questa app puo essere ospitata su Cloudflare Pages come sito statico. Supabase gestira database, sessioni, personaggi e dati condivisi. Gli account dell'app sono account applicativi username/password e non richiedono email reali in Supabase Auth.

## 1. Supabase

1. Crea un nuovo progetto su Supabase.
2. Apri `SQL Editor`.
3. Esegui tutto il contenuto di `supabase/schema.sql`.
4. Per la versione 1.2, esegui anche tutto il contenuto di `supabase/version-1.2.sql`.
5. Per la versione 1.3, esegui anche tutto il contenuto di `supabase/version-1.3.sql`.
6. Per la versione 1.4, esegui anche tutto il contenuto di `supabase/version-1.4.sql`.
7. Per la versione 1.5, esegui anche tutto il contenuto di `supabase/version-1.5.sql`.
8. Per la versione 1.6, esegui anche tutto il contenuto di `supabase/version-1.6.sql`.

Lo schema include:

- `profiles`
- `sessions`
- `session_members`
- `characters`
- `custom_spells`
- `master_messages`
- `session_invites`
- `app_accounts`
- `app_login_sessions`

Tutte le tabelle principali hanno Row Level Security attiva.

## 1.1 Admin iniziale

Per creare l'admin iniziale:

1. Esegui questa query nel SQL Editor, scegliendo username e password:

```sql
select public.bootstrap_app_admin('admin', 'cambia-questa-password', 'Admin');
```

Per sicurezza cambia subito la password dall'app dopo il primo accesso.

## 2. Cloudflare Pages

1. Vai in Cloudflare Dashboard.
2. Crea una Pages app collegata al repository `cimice00/dnd-characters`.
3. Framework preset: `None` oppure static HTML.
4. Build command:

```text
node scripts/build-config.mjs
```

5. Build output directory:

```text
.
```

6. Aggiungi queste variabili nella sezione di build di Cloudflare Pages.

Importante: se Cloudflare mostra il messaggio "Variables cannot be added to a Worker that only has static assets", sei nella sezione sbagliata. Non aggiungerle nelle variabili runtime del Worker statico. Devi inserirle nella configurazione di build del progetto Pages:

```text
Settings > Environment variables
```

oppure, nella nuova interfaccia Workers/Pages:

```text
Settings > Builds > Build variables and secrets
```

Variabili da aggiungere:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

La chiave anon/publishable di Supabase puo stare nel frontend: la protezione vera e' nelle policy RLS del database.

7. Salva e rilancia il deploy. A fine build Cloudflare deve generare `supabase-config.js` con i valori Supabase reali.

URL di test attuale:

```text
https://dnd-characters.united2-9999.workers.dev/
```

## 3. Account applicativi

Il login usa `username` e `password` salvati in `app_accounts`. Le password sono salvate come hash tramite `pgcrypto`; il frontend conserva solo un token locale temporaneo creato da `app_login_sessions`.

## 4. Sviluppo locale

Per generare il file di configurazione in locale:

```bash
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co" \
SUPABASE_ANON_KEY="YOUR_KEY" \
node scripts/build-config.mjs
```

Su Windows PowerShell:

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
$env:SUPABASE_ANON_KEY="YOUR_KEY"
node scripts/build-config.mjs
```

Poi apri `index.html` o avvia un server locale.

## 5. Versione 1.2

La versione 1.2 organizza l'app cosi:

- login come prima schermata;
- pagina sessioni attive e inviti;
- scheda personaggio solo dopo scelta sessione;
- menu laterale per password, inviti e strumenti master;
- pannello admin per account, ruoli e sessioni.

## 6. Versione 1.3

La versione 1.3 aggiunge:

- menu laterale come navigazione;
- pagina Sessioni;
- pagina Impostazioni;
- pagina Amministrazione solo per admin;
- pulsante tema sempre disponibile;
- vista master senza scheda personaggio;
- stato live dei personaggi della sessione tramite Supabase Realtime.

## 7. Versione 1.4

La versione 1.4 aggiunge:

- apertura della scheda completa in sola lettura dalla vista master;
- palette tema personale salvata nel profilo Supabase;
- colori separati per tema scuro e chiaro: sfondo, pannelli e accento.

## 8. Versione 1.5

La versione 1.5 aggiunge:

- colore personalizzabile per testi secondari e label in maiuscolo;
- migrazione delle palette esistenti da 3 a 4 colori per tema.

## 9. Versione 1.6

La versione 1.6 aggiunge:

- account applicativi username/password creati dal pannello amministrazione;
- login senza email reali e senza dipendere da `auth.users`;
- token applicativi per autorizzare sessioni, inviti, personaggi e pannello admin;
- supporto ai ruoli per-sessione: lo stesso account puo essere master in una sessione e player in un'altra.
