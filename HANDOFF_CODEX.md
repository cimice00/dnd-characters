# Handoff per Codex - Compendio Personaggi D&D

Questo file serve per riprendere il lavoro su un'altra macchina senza perdere contesto.

## Stato rapido

- Repository locale: `C:\Users\claudio.giglio\Documents\DnD Characters`
- Branch attuale al momento dell'handoff: `main`
- App statica frontend, senza framework.
- Versione reale del codice: `1.7.25` per la PWA/offline-first.
- `README.md`, `VERSION`, `manifest.webmanifest`, `manifest.json`, `sw.js` e `app-v13.js` sono allineati a `1.7.25`.
- Le ultime modifiche PWA/offline e banner sync non richiedono migrazioni database.

## File principali

- `index.html`: struttura UI, viste login/sessioni/admin/master/scheda, menu laterale.
- `styles.css`: stile globale, pannelli, dashboard master, banner sync, tab e layout mobile.
- `app.js`: logica scheda personaggio locale: campi, tab, condizioni, risorse, magia, slot, incantesimi.
- `app-v13.js`: logica applicativa: login, sessioni, Supabase RPC, master dashboard, PDF, PWA/offline, IndexedDB, sync queue.
- `spells-db.js`: database incantesimi frontend in inglese.
- `spells-db-it.js`: database incantesimi frontend in italiano, con stessi id e stesso ordine di `spells-db.js`.
- La lingua del database incantesimi si sceglie da Impostazioni; la preferenza viene salvata nella scheda come `spellLanguage`.
- La versione `1.7.8` normalizza lato frontend sessioni, inviti e schede master per evitare doppioni visivi temporanei se server/cache restituiscono righe duplicate.
- La versione `1.7.9` rifinisce la UI della scheda: banner sync nascondibile dal menu, Classe/Livello separati, PF/stat/caratteristiche allineati e TS morte progressivi.
- La versione `1.7.10` nasconde le frecce native degli input numerici per mantenere valori e label centrati senza cambiare il tipo `number`.
- La versione `1.7.11` elimina il flash del login, rende evidente la pressione dei pulsanti, collassa il banner sync nascosto e consente ai master di rinominare le campagne.
- La versione `1.7.12` sostituisce gli attacchi semplici con azioni configurabili, collegate alle risorse e con tipi di tiro, effetti e attivazioni diversi.
- La versione `1.7.13` separa dadi, bonus e tipo di danno nelle azioni, mostrando il danno completo nella riga di lettura rapida.
- La versione `1.7.14` aggiorna in tempo reale il riepilogo delle azioni e omette l'indicazione per le azioni sempre disponibili.
- La versione `1.7.15` omette dal riepilogo anche le risorse senza recupero configurato.
- La versione `1.7.16` rimuove l'opzione ridondante di recupero breve/lungo dalle risorse.
- La versione `1.7.17` rende collassabili i tiri salvezza contro morte e le caratteristiche, con riepiloghi rapidi aggiornati in tempo reale.
- La versione `1.7.18` usa una freccia per i pannelli collassabili e mostra i riepiloghi rapidi solo quando sono chiusi.
- La versione `1.7.19` aggiunge il limite di incantesimi preparati e ordina in cima quelli selezionati come preparati.
- La versione `1.7.20` allinea i marker dei pannelli collassabili a quelli nativi delle sezioni Abilita e Tiri salvezza.
- La versione `1.7.21` ottimizza la scheda per telefono: il nome delle risorse usa tutta la riga, i campi numerici si dispongono su due colonne e l'intestazione Azioni resta leggibile anche a 320 px.
- La versione `1.7.22` protegge l'eliminazione delle risorse con una conferma dedicata e rende il comando meno esposto su telefono.
- La versione `1.7.23` ridisegna ogni risorsa con Nome e Max, un contatore centrale attuale/max regolabile con pulsanti meno e piu, e Recupero affiancato alla rimozione protetta.
- La versione `1.7.24` allinea a sinistra i summary dei pannelli principali e ricorda per ogni personaggio pannelli aperti, azioni, oggetti e ultima scheda selezionata.
- La versione `1.7.25` separa statistiche e slot dagli incantesimi del personaggio, aggiunge contatori slot compatti con meno e piu e sposta aggiunta/rimozione nella modalita Modifica slot.
- `supabase-config.js`: configurazione runtime Supabase. In locale ora e' vuota/placeholder.
- `scripts/build-config.mjs`: genera `supabase-config.js` da variabili ambiente.
- `sw.js`: service worker PWA.
- `manifest.webmanifest`: manifest PWA aggiornato a `1.7.25`.
- `offline.html`: fallback pagina offline.
- `pwa-icon.svg`: icona PWA.
- `supabase/`: schema e migrazioni SQL.

## Funzionalita implementate

L'app permette di:

- creare/accedere con account applicativi `username + password`, senza email reali e senza usare Supabase Auth;
- gestire account dal pannello amministrazione;
- creare sessioni;
- invitare utenti alle sessioni;
- avere ruoli per sessione: lo stesso account puo essere master in una sessione e player in un'altra;
- aprire la scheda personaggio del player;
- salvare i dati principali della scheda: nome, razza, classe, PF, CA, iniziativa, velocita, caratteristiche, TS, abilita, attacchi, inventario, monete, storia;
- gestire incantesimi da database frontend;
- aggiungere incantesimi custom;
- gestire slot incantesimo aggiungibili/rimovibili, con sigle `RIM` e `MAX`;
- gestire condizioni/stati in pannello dedicato `Condizioni`;
- gestire risorse personalizzate in pannello dedicato `Risorse`;
- vedere dashboard master con PF, condizioni, TS morte, velocita e risorse dei player;
- aprire da master una scheda in sola lettura;
- eliminare sessioni master solo dopo conferma in secondo banner popup;
- esportare PDF della propria scheda;
- esportare PDF sessione master con tutte le schede disponibili;
- personalizzare tema utente;
- usare modalita PWA offline-first.

## PWA/offline-first

Implementazione attuale:

- `manifest.webmanifest` collegato in `index.html`;
- service worker in `sw.js`;
- cache app shell: `index.html`, `styles.css`, `app.js`, `app-v13.js`, `spells-db.js`, `spells-db-it.js`, `supabase-config.js`, manifest, icona, fallback offline;
- IndexedDB nativo, senza Dexie, per evitare dipendenze CDN offline;
- database browser: `dnd-offline-first-v1`;
- store IndexedDB:
  - `local_profiles`
  - `local_sessions`
  - `local_characters`
  - `local_spells`
  - `sync_queue`
  - `local_meta`
- salvataggio locale prima di Supabase;
- `sync_queue` per modifiche scheda non ancora arrivate al DB;
- apertura offline delle sessioni/schede gia caricate almeno una volta sul dispositivo;
- fallback dashboard master da copie locali;
- pulsante `Prepara sessione offline` nel menu e nella dashboard master;
- banner sync nella scheda con spazio fisso, per evitare saltelli di layout.

Fix importante gia applicata:

- `sw.js` e' passato a cache `dnd-pwa-v1.7.25`;
- `offline.html` viene restituito solo per navigazioni, mai come fallback per `.js` o `.css`;
- lo script Supabase CDN non e' piu caricato direttamente in `index.html`;
- `app-v13.js` carica Supabase dinamicamente solo se serve e se c'e' rete.
- La versione `1.7.5` rende l'accesso offline di emergenza temporaneo: dopo chiusura/uscita dalla pagina bisogna ripartire dalla schermata login e scegliere di nuovo l'accesso offline o fare login normale.

Nota operativa PWA:

- Dopo una modifica al service worker bisogna aprire una volta l'app online, aspettare qualche secondo, chiudere e riaprire.
- Se il dispositivo ha ancora la vecchia cache difettosa, offline puo restare bianco finche non riesce a scaricare il nuovo `sw.js`.
- Service worker funziona su HTTPS o `localhost`, non su `file://`.

## Supabase e database

Setup iniziale descritto in `INFRASTRUCTURE.md`.

Ordine SQL per nuovo progetto:

1. `supabase/schema.sql`
2. `supabase/version-1.2.sql`
3. `supabase/version-1.3.sql`
4. `supabase/version-1.4.sql`
5. `supabase/version-1.5.sql`
6. `supabase/version-1.6.sql`
7. `supabase/version-1.7.sql`
8. `supabase/version-1.8.sql`

La versione 1.6 introduce gli account applicativi:

- `app_accounts`
- `app_login_sessions`
- RPC `app_login_account`
- RPC `app_get_shell`
- RPC `app_create_session`
- RPC `app_load_character`
- RPC `app_create_character`
- RPC `app_update_character`
- RPC `app_sync_custom_spells`
- RPC `app_list_master_characters`
- funzioni admin e inviti

Lo schema usa `pgcrypto`.

Nota su errore gia incontrato:

- Se Supabase dice `function digest(text, unknown) does not exist`, la query corretta deve usare `extensions.digest(convert_to(...), 'sha256')`.
- `version-1.6.sql` contiene gia questa forma:
  `extensions.digest(convert_to(coalesce(raw_token, ''), 'UTF8'), 'sha256')`

Creazione admin iniziale:

```sql
select public.bootstrap_app_admin('Admin', 'Admin', 'Admin');
```

Per produzione, cambiare subito la password.

La versione 1.7 richiede `supabase/version-1.7.sql` per aggiungere la primary key tecnica a `session_members`.

## Configurazione locale

`supabase-config.js` nel workspace attuale contiene valori vuoti/placeholder. Per collegare una macchina nuova:

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
$env:SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY"
node scripts/build-config.mjs
```

Se `node` non e' nel PATH, usare il Node installato localmente o quello del runtime Codex.

Per provare la PWA serve un server locale:

```powershell
python -m http.server 8787 --bind 127.0.0.1
```

Poi aprire:

```text
http://127.0.0.1:8787/index.html
```

## Verifiche usate finora

Sintassi JS:

```powershell
node --check app.js
node --check app-v13.js
node --check sw.js
```

Pulizia diff:

```powershell
git diff --check
```

Controllo file serviti:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8787/index.html" -UseBasicParsing
Invoke-WebRequest -Uri "http://127.0.0.1:8787/sw.js" -UseBasicParsing
Invoke-WebRequest -Uri "http://127.0.0.1:8787/manifest.webmanifest" -UseBasicParsing
```

Nota: un test Playwright headless non e' stato possibile nel runtime locale per modulo mancante `playwright-core`.

## Attenzioni tecniche

- Non tornare a caricare Supabase CDN direttamente in `index.html`: offline puo bloccare l'avvio.
- Non usare Cache Storage per dati sensibili di personaggi/account. I dati scheda stanno in IndexedDB.
- Non restituire `offline.html` come fallback per asset non-navigazione nel service worker.
- Se si cambia `sw.js`, aumentare `CACHE_VERSION`.
- Se si cambia PWA/manifest, aggiornare anche `manifest.webmanifest` se serve.
- `app-v13.js` e' grande: preferire patch piccole e testare spesso con `node --check`.
- Il player senza scheda offline puo giocare offline solo se quella scheda e' stata aperta almeno una volta su quel dispositivo.
- Il master vede offline solo le schede gia caricate/preparate sul dispositivo.
- Le modifiche locali vanno prima in IndexedDB e poi in `sync_queue`.

## Comandi git utili

Stato:

```powershell
git status
git branch --show-current
```

Commit normale:

```powershell
git add .
git commit -m "Messaggio commit"
git push origin HEAD
```

Se si vuole evitare di includere file di configurazione locali, controllare sempre:

```powershell
git status --short
```

## Prossimi miglioramenti consigliati

- Mantenere `README.md`, `INFRASTRUCTURE.md` e `VERSION` allineati alla versione corrente.
- Aggiungere UI piu esplicita per vedere la coda sync e riprovare manualmente.
- Aggiungere gestione conflitti piu chiara quando DB e copia locale divergono.
- Aggiungere test browser reale per PWA installata/offline.
- Valutare una piccola libreria locale o wrapper per IndexedDB se il codice offline cresce ancora.
