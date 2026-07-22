(() => {
  const STORAGE_KEY = "dnd-mobile-character-v1";
  const APP_TOKEN_KEY = "dnd-app-account-token-v1";
  const OFFLINE_ACCESS_ACTIVE_KEY = "dnd-offline-access-active-v1";
  const OFFLINE_ACCESS_RELOAD_KEY = "dnd-offline-access-reload-v1";
  const OFFLINE_PROFILE_ID_KEY = "dnd-offline-profile-id-v1";
  const SESSION_ID_KEY = "dnd-mobile-session-id-v1";
  const CHARACTER_ID_KEY = "dnd-mobile-character-id-v1";
  const MASTER_PREVIEW_KEY = "dnd-master-character-preview-v1";
  const SYNC_BANNER_PREF_KEY = "dnd-character-sync-banner-v1";
  const APP_VERSION = "1.7.10";
  const OFFLINE_DB_NAME = "dnd-offline-first-v1";
  const OFFLINE_DB_VERSION = 1;
  const SUPABASE_CDN_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const DEFAULT_THEME_PALETTE = {
    dark: { background: "#17130f", surface: "#231d17", accent: "#d8ae5f", muted: "#b9aa99" },
    light: { background: "#f0ece4", surface: "#fff8ee", accent: "#7f5217", muted: "#766755" },
  };
  const THEME_PALETTE_PRESETS = [
    DEFAULT_THEME_PALETTE,
    { dark: { background: "#10161b", surface: "#19242c", accent: "#63b3c2", muted: "#9fc3c8" }, light: { background: "#eef7f6", surface: "#ffffff", accent: "#217985", muted: "#477f86" } },
    { dark: { background: "#151017", surface: "#24192a", accent: "#c084fc", muted: "#c9addb" }, light: { background: "#f7f0fb", surface: "#ffffff", accent: "#7e3bb2", muted: "#8757a8" } },
    { dark: { background: "#10170f", surface: "#1b2618", accent: "#84cc6a", muted: "#accda2" }, light: { background: "#f1f7ed", surface: "#ffffff", accent: "#4b842f", muted: "#628b50" } },
    { dark: { background: "#190f12", surface: "#2a181d", accent: "#f06a7a", muted: "#e5a8af" }, light: { background: "#fff0f2", surface: "#ffffff", accent: "#b93649", muted: "#a54e5b" } },
    { dark: { background: "#14110e", surface: "#251d16", accent: "#f59e42", muted: "#dbb07a" }, light: { background: "#fff6eb", surface: "#ffffff", accent: "#9a5a16", muted: "#915d25" } },
    { dark: { background: "#0f141d", surface: "#182133", accent: "#7aa7ff", muted: "#a8c1ef" }, light: { background: "#eef3ff", surface: "#ffffff", accent: "#2f62bd", muted: "#526fa8" } },
    { dark: { background: "#151411", surface: "#24221b", accent: "#d6c94a", muted: "#d0c985" }, light: { background: "#faf8e9", surface: "#ffffff", accent: "#8a7b13", muted: "#807726" } },
    { dark: { background: "#0f1716", surface: "#182724", accent: "#2fb7a7", muted: "#9cc9c2" }, light: { background: "#edf8f5", surface: "#ffffff", accent: "#167d73", muted: "#3c857d" } },
    { dark: { background: "#17110f", surface: "#291d19", accent: "#d8744f", muted: "#d5a08b" }, light: { background: "#fff2ed", surface: "#ffffff", accent: "#a34522", muted: "#9a5234" } },
  ];
  const PDF_ABILITIES = [
    ["strength", "Forza"],
    ["dexterity", "Destrezza"],
    ["constitution", "Costituzione"],
    ["intelligence", "Intelligenza"],
    ["wisdom", "Saggezza"],
    ["charisma", "Carisma"],
  ];
  const PDF_SAVES = [
    ["strength", "Forza"],
    ["dexterity", "Destrezza"],
    ["constitution", "Costituzione"],
    ["intelligence", "Intelligenza"],
    ["wisdom", "Saggezza"],
    ["charisma", "Carisma"],
  ];
  const PDF_SKILLS = [
    ["acrobatics", "Acrobazia"],
    ["animalHandling", "Addestrare Animali"],
    ["arcana", "Arcano"],
    ["athletics", "Atletica"],
    ["deception", "Inganno"],
    ["history", "Storia"],
    ["insight", "Intuizione"],
    ["intimidation", "Intimidire"],
    ["investigation", "Indagare"],
    ["medicine", "Medicina"],
    ["nature", "Natura"],
    ["perception", "Percezione"],
    ["performance", "Intrattenere"],
    ["persuasion", "Persuasione"],
    ["religion", "Religione"],
    ["sleightOfHand", "Rapidita di Mano"],
    ["stealth", "Furtivita"],
    ["survival", "Sopravvivenza"],
  ];

  const app = {
    client: null,
    user: null,
    profile: null,
    sessions: [],
    invites: [],
    currentSession: null,
    currentRole: "",
    masterCharacters: [],
    masterChannel: null,
    masterPollTimer: null,
    pendingDeleteSessionId: "",
    saveTimer: null,
    db: null,
    offlineReady: false,
    offlineAccessOptions: [],
    isOnline: navigator.onLine,
    syncTimer: null,
    config: window.DND_APP_CONFIG || {},
    readOnlyCharacter: false,
    sessionToken: initialSessionToken(),
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function getState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function setState(nextState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  function masterPreview() {
    try {
      return JSON.parse(localStorage.getItem(MASTER_PREVIEW_KEY)) || null;
    } catch {
      return null;
    }
  }

  function selectedSessionId() {
    if (isOfflineLocalAccessActive()) return sessionStorage.getItem(SESSION_ID_KEY) || "";
    return localStorage.getItem(SESSION_ID_KEY) || "";
  }

  function selectedCharacterId() {
    if (isOfflineLocalAccessActive()) return sessionStorage.getItem(CHARACTER_ID_KEY) || "";
    return localStorage.getItem(CHARACTER_ID_KEY) || "";
  }

  function isOfflineLocalAccessActive() {
    return sessionStorage.getItem(OFFLINE_ACCESS_ACTIVE_KEY) === "1";
  }

  function initialSessionToken() {
    return isOfflineLocalAccessActive() ? sessionStorage.getItem(APP_TOKEN_KEY) || "" : localStorage.getItem(APP_TOKEN_KEY) || "";
  }

  function clearOfflineLocalAccess() {
    sessionStorage.removeItem(OFFLINE_ACCESS_ACTIVE_KEY);
    sessionStorage.removeItem(OFFLINE_ACCESS_RELOAD_KEY);
    sessionStorage.removeItem(APP_TOKEN_KEY);
    sessionStorage.removeItem(OFFLINE_PROFILE_ID_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(CHARACTER_ID_KEY);
  }

  function clearOfflineLocalAccessOnPageExit() {
    if (!isOfflineLocalAccessActive()) return;
    if (sessionStorage.getItem(OFFLINE_ACCESS_RELOAD_KEY) === "1") {
      sessionStorage.removeItem(OFFLINE_ACCESS_RELOAD_KEY);
      return;
    }
    clearOfflineLocalAccess();
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
  }

  function setStatus(message) {
    setText("#syncStatus", message);
    if (!app.user) setText("#loginStatus", message);
  }

  function setCharacterSyncBanner(state, detail) {
    const banner = $("#characterSyncBanner");
    if (!banner) return;
    const hasContent = Boolean(state || detail);
    banner.classList.toggle("user-hidden", hasContent && !isCharacterSyncBannerVisible());
    banner.hidden = !hasContent || !isCharacterSyncBannerVisible();
    if (state) setText("#characterSyncState", state);
    if (detail) setText("#characterSyncDetail", detail);
    updateSyncBannerMenuButton();
  }

  function isCharacterSyncBannerVisible() {
    return localStorage.getItem(SYNC_BANNER_PREF_KEY) !== "hidden";
  }

  function updateSyncBannerMenuButton() {
    const button = $("#toggleSyncBannerButton");
    if (!button) return;
    button.hidden = !selectedCharacterId();
    button.textContent = isCharacterSyncBannerVisible() ? "Nascondi stato scheda" : "Mostra stato scheda";
  }

  function toggleCharacterSyncBanner() {
    const nextHidden = isCharacterSyncBannerVisible();
    if (nextHidden) {
      localStorage.setItem(SYNC_BANNER_PREF_KEY, "hidden");
    } else {
      localStorage.removeItem(SYNC_BANNER_PREF_KEY);
    }
    const banner = $("#characterSyncBanner");
    const state = $("#characterSyncState")?.textContent || "";
    const detail = $("#characterSyncDetail")?.textContent || "";
    if (banner) setCharacterSyncBanner(state, detail);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => registration.update().catch(() => null))
      .catch(() => {
        setStatus("PWA non installata");
      });
  }

  function loadSupabaseLibrary() {
    if (window.supabase?.createClient) return Promise.resolve(true);
    if (!navigator.onLine) return Promise.resolve(false);
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = SUPABASE_CDN_URL;
      script.async = true;
      script.onload = () => resolve(Boolean(window.supabase?.createClient));
      script.onerror = () => resolve(false);
      window.setTimeout(() => resolve(Boolean(window.supabase?.createClient)), 3500);
      document.head.appendChild(script);
    });
  }

  async function ensureSupabaseClient() {
    if (app.client) return true;
    if (!app.config.supabaseUrl || !app.config.supabaseAnonKey) return false;
    const loaded = await loadSupabaseLibrary();
    if (!loaded || !window.supabase?.createClient) return false;
    app.client = window.supabase.createClient(app.config.supabaseUrl, app.config.supabaseAnonKey);
    return true;
  }

  function openOfflineDb() {
    if (app.db) return Promise.resolve(app.db);
    if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB non disponibile"));
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("local_profiles")) db.createObjectStore("local_profiles", { keyPath: "id" });
        if (!db.objectStoreNames.contains("local_sessions")) db.createObjectStore("local_sessions", { keyPath: "id" });
        if (!db.objectStoreNames.contains("local_characters")) db.createObjectStore("local_characters", { keyPath: "id" });
        if (!db.objectStoreNames.contains("local_spells")) db.createObjectStore("local_spells", { keyPath: "id" });
        if (!db.objectStoreNames.contains("sync_queue")) db.createObjectStore("sync_queue", { keyPath: "id" });
        if (!db.objectStoreNames.contains("local_meta")) db.createObjectStore("local_meta", { keyPath: "key" });
      };
      request.onsuccess = () => {
        app.db = request.result;
        app.offlineReady = true;
        resolve(app.db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function withOfflineStore(storeName, mode, callback) {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let request = null;
      transaction.oncomplete = () => resolve(request?.result);
      transaction.onerror = () => reject(transaction.error);
      try {
        request = callback(store);
      } catch (error) {
        reject(error);
      }
    });
  }

  function idbGet(storeName, key) {
    return withOfflineStore(storeName, "readonly", (store) => store.get(key));
  }

  function idbGetAll(storeName) {
    return withOfflineStore(storeName, "readonly", (store) => store.getAll());
  }

  function idbPut(storeName, value) {
    return withOfflineStore(storeName, "readwrite", (store) => store.put(value));
  }

  function idbDelete(storeName, key) {
    return withOfflineStore(storeName, "readwrite", (store) => store.delete(key));
  }

  function localSessionRecordId(profileId, sessionId) {
    return `${profileId || "unknown"}:${sessionId || "unknown"}`;
  }

  function realSessionId(record) {
    return record?.session_id || record?.session?.id || record?.id || "";
  }

  function localSessionMatches(record, profileId, sessionId) {
    return realSessionId(record) === sessionId && (!profileId || record.profile_id === profileId);
  }

  async function findLocalSessionRecord(sessionId, profileId = app.profile?.id || app.user?.id || "") {
    const exact = await idbGet("local_sessions", localSessionRecordId(profileId, sessionId)).catch(() => null);
    if (exact) return exact;
    const all = await idbGetAll("local_sessions").catch(() => []);
    return all.find((record) => localSessionMatches(record, profileId, sessionId)) || null;
  }

  async function cacheShellData(shellData = {}) {
    const now = new Date().toISOString();
    const profileId = shellData.profile?.id || app.user?.id || "";
    if (shellData.profile?.id) {
      await idbPut("local_profiles", { ...shellData.profile, cached_at: now, token: app.sessionToken });
    }
    const sessions = normalizeSessionMemberships(shellData.sessions);
    await Promise.all(
      sessions
        .filter((member) => member?.session?.id)
        .map((member) =>
          idbPut("local_sessions", {
            id: localSessionRecordId(profileId, member.session.id),
            session_id: member.session.id,
            role: member.role,
            session: member.session,
            profile_id: profileId,
            cached_at: now,
          })
        )
    );
    await idbPut("local_meta", { key: "last_shell_sync", value: now });
  }

  async function loadCachedShell() {
    const profiles = await idbGetAll("local_profiles").catch(() => []);
    const offlineProfileId = isOfflineLocalAccessActive() ? sessionStorage.getItem(OFFLINE_PROFILE_ID_KEY) || "" : "";
    const profile =
      profiles.find((item) => offlineProfileId && item.id === offlineProfileId) ||
      profiles.find((item) => item.token === app.sessionToken) ||
      null;
    if (!profile) return null;
    const sessions = (await idbGetAll("local_sessions").catch(() => []))
      .filter((item) => localSessionMatches(item, profile.id, realSessionId(item)))
      .map((item) => ({ role: item.role, session: item.session }));
    return { profile, sessions: normalizeSessionMemberships(sessions), invites: [] };
  }

  function normalizeSessionMemberships(sessions = []) {
    const bySession = new Map();
    (Array.isArray(sessions) ? sessions : []).forEach((member) => {
      const sessionId = member?.session?.id;
      if (!sessionId) return;
      const normalized = {
        ...member,
        role: member.role === "master" ? "master" : "player",
      };
      const existing = bySession.get(sessionId);
      if (!existing || (existing.role !== "master" && normalized.role === "master")) {
        bySession.set(sessionId, normalized);
      }
    });
    return [...bySession.values()];
  }

  function normalizeInvites(invites = []) {
    const byInvite = new Map();
    (Array.isArray(invites) ? invites : []).forEach((invite) => {
      if (invite?.id && !byInvite.has(invite.id)) byInvite.set(invite.id, invite);
    });
    return [...byInvite.values()];
  }

  function normalizeCharacters(characters = []) {
    const byCharacter = new Map();
    (Array.isArray(characters) ? characters : []).forEach((character) => {
      if (!character?.id) return;
      const existing = byCharacter.get(character.id);
      const existingUpdated = existing?.updated_at || existing?.local_updated_at || "";
      const nextUpdated = character.updated_at || character.local_updated_at || "";
      if (!existing || nextUpdated >= existingUpdated) byCharacter.set(character.id, character);
    });
    return [...byCharacter.values()];
  }

  function normalizeLocalCharacter(character, sessionId = "", ownerId = "") {
    const now = new Date().toISOString();
    const data = character?.data || character || {};
    const id = character?.id || selectedCharacterId() || `local-${sessionId || "session"}-${ownerId || "player"}`;
    return {
      id,
      session_id: character?.session_id || sessionId || data.activeSessionId || selectedSessionId(),
      owner_id: character?.owner_id || ownerId || app.user?.id || "",
      ownerProfile: character?.ownerProfile || character?.owner_profile || null,
      name: character?.name || data.name || "",
      data,
      updated_at: character?.updated_at || now,
      server_updated_at: character?.updated_at || character?.server_updated_at || "",
      local_updated_at: character?.local_updated_at || now,
      last_successful_sync_at: character?.last_successful_sync_at || "",
      sync_status: character?.sync_status || "synced",
      local_revision: Number(character?.local_revision) || Date.now(),
    };
  }

  async function cacheCharacter(character, sessionId = selectedSessionId(), ownerId = app.user?.id, syncStatus = "synced") {
    if (!character) return null;
    const record = normalizeLocalCharacter({ ...character, sync_status: syncStatus }, sessionId, ownerId);
    await idbPut("local_characters", record);
    if (Array.isArray(record.data?.customSpells)) {
      await Promise.all(record.data.customSpells.map((spell) => idbPut("local_spells", { ...spell, session_id: record.session_id, cached_at: record.local_updated_at })));
    }
    return record;
  }

  async function findLocalCharacter(sessionId, characterId = selectedCharacterId(), ownerId = app.user?.id) {
    if (characterId) {
      const exact = await idbGet("local_characters", characterId).catch(() => null);
      if (exact && (!ownerId || !exact.owner_id || exact.owner_id === ownerId)) return exact;
    }
    const all = await idbGetAll("local_characters").catch(() => []);
    return all.find((item) => item.session_id === sessionId && item.owner_id === ownerId) || null;
  }

  function shouldApplyRemoteCharacter(remoteCharacter, localRecord) {
    if (!remoteCharacter?.id) return false;
    if (!localRecord) return true;
    if (localRecord.sync_status && localRecord.sync_status !== "synced") return false;
    const remoteTime = Date.parse(remoteCharacter.updated_at || remoteCharacter.server_updated_at || "");
    const localTime = Date.parse(localRecord.server_updated_at || localRecord.updated_at || localRecord.local_updated_at || "");
    if (Number.isFinite(remoteTime) && Number.isFinite(localTime)) return remoteTime > localTime;
    return JSON.stringify(remoteCharacter.data || {}) !== JSON.stringify(localRecord.data || {});
  }

  async function fetchRemoteCharacter(session, characterId = selectedCharacterId()) {
    if (!app.client || !navigator.onLine) return { character: null, error: new Error("Offline") };
    try {
      const response = await app.client.rpc("app_load_character", {
        app_token: app.sessionToken,
        target_session_id: session.id,
        target_character_id: characterId || null,
      });
      return { character: response.data, error: response.error };
    } catch (error) {
      return { character: null, error };
    }
  }

  async function refreshLocalCharacterFromServer(session, characterId = selectedCharacterId()) {
    const localRecord = await findLocalCharacter(session.id, characterId);
    if (localRecord?.sync_status && localRecord.sync_status !== "synced") return false;
    const { character, error } = await fetchRemoteCharacter(session, characterId);
    if (error || !character?.id || !shouldApplyRemoteCharacter(character, localRecord)) return false;
    await cacheCharacter(character, session.id, app.user?.id, "synced").catch(() => null);
    localStorage.setItem(CHARACTER_ID_KEY, character.id);
    setState({ ...character.data, activeSessionId: session.id, session: session.name, appVersion: APP_VERSION });
    window.location.reload();
    return true;
  }

  async function saveLocalCharacterSnapshot(syncStatus = "pending") {
    const sessionId = selectedSessionId();
    const characterId = selectedCharacterId();
    if (!sessionId || !characterId || !app.user || app.readOnlyCharacter || app.currentRole === "master") return null;
    const now = new Date().toISOString();
    const state = { ...getState(), activeSessionId: sessionId, session: app.currentSession?.name || getState().session, appVersion: APP_VERSION };
    const previous = await idbGet("local_characters", characterId).catch(() => null);
    if (previous?.owner_id && previous.owner_id !== app.user.id) {
      setCharacterSyncBanner("Non sincronizzata", "Questa scheda appartiene a un altro utente locale.");
      setStatus("Scheda di un altro utente: salvataggio non accodato");
      return null;
    }
    const record = {
      ...(previous || {}),
      id: characterId,
      session_id: sessionId,
      owner_id: app.user.id,
      name: state.name || previous?.name || "",
      data: state,
      updated_at: now,
      local_updated_at: now,
      sync_status: syncStatus,
      local_revision: Date.now(),
    };
    await idbPut("local_characters", record);
    if (Array.isArray(state.customSpells)) {
      await Promise.all(state.customSpells.map((spell) => idbPut("local_spells", { ...spell, session_id: sessionId, cached_at: now })));
    }
    if (syncStatus !== "synced") await enqueueCharacterSync(record);
    setCharacterSyncBanner(syncStatus === "synced" ? "Sincronizzata" : "Salvata offline", syncStatus === "synced" ? "La scheda e il database sono allineati." : "La scheda e pronta sul dispositivo e verra sincronizzata appena possibile.");
    return record;
  }

  async function enqueueCharacterSync(record) {
    if (!record?.id) return;
    await idbPut("sync_queue", {
      id: `character:${record.id}`,
      type: "character_upsert",
      character_id: record.id,
      session_id: record.session_id,
      owner_id: record.owner_id,
      payload: record.data,
      status: "pending",
      attempts: 0,
      updated_at: new Date().toISOString(),
    });
  }

  async function syncPendingQueue() {
    if (!app.client || !app.user || !app.sessionToken || !navigator.onLine) return { ok: false, message: "Offline" };
    const queue = await idbGetAll("sync_queue").catch(() => []);
    const pending = queue.filter((item) => item.status !== "synced");
    if (!pending.length) return { ok: true, message: "Nessuna modifica in coda" };
    let skippedForOwner = 0;
    for (const item of pending) {
      if (item.type !== "character_upsert") continue;
      const record = await idbGet("local_characters", item.character_id).catch(() => null);
      const ownerId = item.owner_id || record?.owner_id || "";
      if (!ownerId || ownerId !== app.user.id) {
        skippedForOwner += 1;
        continue;
      }
      let error = null;
      try {
        const response = await app.client.rpc("app_update_character", {
          app_token: app.sessionToken,
          target_character_id: item.character_id,
          character_data: item.payload,
        });
        error = response.error;
      } catch (rpcError) {
        error = rpcError;
      }
      if (error) {
        await idbPut("sync_queue", { ...item, status: "error", attempts: Number(item.attempts) + 1, updated_at: new Date().toISOString() });
        return { ok: false, message: "Modifiche salvate offline, DB non raggiungibile" };
      }
      const spellSync = await syncCustomSpells(item.payload);
      if (!spellSync.ok) {
        await idbPut("sync_queue", { ...item, status: "error", attempts: Number(item.attempts) + 1, updated_at: new Date().toISOString() });
        return { ok: false, message: "Scheda salvata, incantesimi custom in coda" };
      }
      if (record) {
        const syncedAt = new Date().toISOString();
        await idbPut("local_characters", { ...record, sync_status: "synced", last_successful_sync_at: syncedAt, server_updated_at: syncedAt });
      }
      await idbDelete("sync_queue", item.id);
    }
    if (skippedForOwner) {
      return { ok: false, message: "Alcune modifiche appartengono a un altro utente e restano locali" };
    }
    setCharacterSyncBanner("Sincronizzata", "Le modifiche locali sono arrivate al database.");
    return { ok: true, message: "Sincronizzato con Supabase" };
  }

  function scheduleSyncQueue(delay = 1000) {
    window.clearTimeout(app.syncTimer);
    app.syncTimer = window.setTimeout(() => syncPendingQueue().catch(() => null), delay);
  }

  async function buildOfflineAccessOptions() {
    const profiles = await idbGetAll("local_profiles").catch(() => []);
    const sessions = await idbGetAll("local_sessions").catch(() => []);
    const characters = await idbGetAll("local_characters").catch(() => []);
    return profiles
      .map((profile) => {
        const sheets = characters
          .filter((character) => character.owner_id === profile.id)
          .map((character) => {
            const sessionRecord = sessions.find((record) => localSessionMatches(record, profile.id, character.session_id));
            const role = sessionRecord?.role || "player";
            return {
              character,
              sessionRecord,
              role,
              session: sessionRecord?.session || {
                id: character.session_id,
                name: character.data?.session || "Sessione offline",
              },
            };
          })
          .filter((item) => item.role !== "master");
        return { profile, sheets };
      })
      .filter((option) => option.sheets.length);
  }

  async function showOfflineLocalAccess() {
    const panel = $("#offlineAccessPanel");
    const userList = $("#offlineAccessUsers");
    const sheetList = $("#offlineAccessSheets");
    if (!panel || !userList || !sheetList) return;
    panel.hidden = false;
    sheetList.hidden = true;
    setText("#offlineAccessCount", "Cerco");
    userList.innerHTML = `<div class="empty-state">Cerco dati locali...</div>`;
    sheetList.innerHTML = "";

    app.offlineAccessOptions = await buildOfflineAccessOptions();
    setText("#offlineAccessCount", String(app.offlineAccessOptions.length));
    if (!app.offlineAccessOptions.length) {
      userList.innerHTML = `<div class="empty-state">Nessuna scheda player trovata su questo dispositivo.</div>`;
      setText("#loginStatus", "Apri online una sessione almeno una volta prima di usarla offline.");
      return;
    }

    userList.innerHTML = app.offlineAccessOptions
      .map(
        ({ profile, sheets }) => `
          <button class="offline-choice-button" data-offline-profile="${escapeAttribute(profile.id)}" type="button">
            <strong>${escapeHtml(profileName(profile))}</strong>
            <small>${sheets.length} schede disponibili</small>
          </button>
        `
      )
      .join("");
    userList.querySelectorAll("[data-offline-profile]").forEach((button) => {
      button.addEventListener("click", () => renderOfflineSheets(button.dataset.offlineProfile));
    });
    setText("#loginStatus", "Scegli un utente salvato su questo dispositivo.");
  }

  function renderOfflineSheets(profileId) {
    const sheetList = $("#offlineAccessSheets");
    if (!sheetList) return;
    const option = app.offlineAccessOptions.find((item) => item.profile.id === profileId);
    if (!option) return;
    sheetList.hidden = false;
    sheetList.innerHTML = option.sheets
      .map(({ character, session }) => {
        const data = character.data || {};
        const pending = character.sync_status && character.sync_status !== "synced";
        return `
          <button class="offline-choice-button" data-offline-character="${escapeAttribute(character.id)}" data-offline-profile-id="${escapeAttribute(profileId)}" type="button">
            <strong>${escapeHtml(data.name || character.name || "Personaggio senza nome")}</strong>
            <span>${escapeHtml(session.name || "Sessione offline")}</span>
            <small>${pending ? "Modifiche locali" : "Sincronizzata"} - ${escapeHtml(data.classLevel || "Classe non indicata")}</small>
          </button>
        `;
      })
      .join("");
    sheetList.querySelectorAll("[data-offline-character]").forEach((button) => {
      button.addEventListener("click", () => openOfflineLocalCharacter(button.dataset.offlineProfileId, button.dataset.offlineCharacter));
    });
    setText("#loginStatus", "Scegli la scheda da aprire offline.");
  }

  async function openOfflineLocalCharacter(profileId, characterId) {
    const option = app.offlineAccessOptions.find((item) => item.profile.id === profileId);
    const sheet = option?.sheets.find((item) => item.character.id === characterId);
    if (!option || !sheet) {
      setText("#loginStatus", "Scheda offline non trovata.");
      return;
    }
    const token = option.profile.token || "";
    if (!token) {
      setText("#loginStatus", "Profilo locale incompleto: accedi online almeno una volta.");
      return;
    }
    const state = {
      ...(sheet.character.data || {}),
      activeSessionId: sheet.session.id,
      session: sheet.session.name || "Sessione offline",
      appVersion: APP_VERSION,
    };
    app.sessionToken = token;
    app.user = option.profile;
    app.profile = option.profile;
    app.currentSession = sheet.session;
    app.currentRole = "player";
    app.sessions = normalizeSessionMemberships(option.sheets.map((item) => ({ role: "player", session: item.session })));
    sessionStorage.setItem(OFFLINE_ACCESS_ACTIVE_KEY, "1");
    sessionStorage.setItem(OFFLINE_ACCESS_RELOAD_KEY, "1");
    sessionStorage.setItem(APP_TOKEN_KEY, token);
    sessionStorage.setItem(OFFLINE_PROFILE_ID_KEY, profileId);
    sessionStorage.setItem(SESSION_ID_KEY, sheet.session.id);
    sessionStorage.setItem(CHARACTER_ID_KEY, sheet.character.id);
    localStorage.removeItem(APP_TOKEN_KEY);
    localStorage.removeItem(OFFLINE_PROFILE_ID_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(CHARACTER_ID_KEY);
    localStorage.removeItem(MASTER_PREVIEW_KEY);
    setState(state);
    setText("#loginStatus", "Apro scheda offline...");
    window.location.reload();
  }

  function profileName(profile = app.profile) {
    return profile?.display_name || profile?.username || "Utente";
  }

  function normalizeThemeColor(value, fallback = "#000000") {
    const color = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
  }

  function hexToRgb(value) {
    const color = normalizeThemeColor(value, "#000000").slice(1);
    return {
      r: parseInt(color.slice(0, 2), 16),
      g: parseInt(color.slice(2, 4), 16),
      b: parseInt(color.slice(4, 6), 16),
    };
  }

  function rgba(value, alpha) {
    const { r, g, b } = hexToRgb(value);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function mixColor(value, target, amount) {
    const from = hexToRgb(value);
    const to = hexToRgb(target);
    const mixed = ["r", "g", "b"].map((key) => Math.round(from[key] + (to[key] - from[key]) * amount));
    return `#${mixed.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
  }

  function normalizeThemePalette(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      dark: {
        background: normalizeThemeColor(source.dark?.background, DEFAULT_THEME_PALETTE.dark.background),
        surface: normalizeThemeColor(source.dark?.surface, DEFAULT_THEME_PALETTE.dark.surface),
        accent: normalizeThemeColor(source.dark?.accent, DEFAULT_THEME_PALETTE.dark.accent),
        muted: normalizeThemeColor(source.dark?.muted, DEFAULT_THEME_PALETTE.dark.muted),
      },
      light: {
        background: normalizeThemeColor(source.light?.background, DEFAULT_THEME_PALETTE.light.background),
        surface: normalizeThemeColor(source.light?.surface, DEFAULT_THEME_PALETTE.light.surface),
        accent: normalizeThemeColor(source.light?.accent, DEFAULT_THEME_PALETTE.light.accent),
        muted: normalizeThemeColor(source.light?.muted, DEFAULT_THEME_PALETTE.light.muted),
      },
    };
  }

  function activeThemeMode() {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  }

  function applyThemePalette(value = app.profile?.theme_palette || DEFAULT_THEME_PALETTE) {
    const palette = normalizeThemePalette(value);
    const mode = activeThemeMode();
    const colors = palette[mode];
    const isLight = mode === "light";
    const fieldColor = mixColor(colors.surface, isLight ? "#ffffff" : "#000000", isLight ? 0.45 : 0.32);
    const root = document.documentElement;
    root.style.setProperty("--bg", colors.background);
    root.style.setProperty("--surface", colors.surface);
    root.style.setProperty("--surface-2", mixColor(colors.surface, isLight ? "#000000" : "#ffffff", isLight ? 0.08 : 0.07));
    root.style.setProperty("--surface-3", mixColor(colors.surface, isLight ? "#000000" : "#ffffff", isLight ? 0.15 : 0.13));
    root.style.setProperty("--panel-bg", rgba(colors.surface, isLight ? 0.96 : 0.92));
    root.style.setProperty("--field-bg", rgba(fieldColor, isLight ? 0.96 : 0.78));
    root.style.setProperty("--tabbar-bg", rgba(colors.background, 0.94));
    root.style.setProperty("--gold", colors.accent);
    root.style.setProperty("--focus", colors.accent);
    root.style.setProperty("--muted", colors.muted);
    root.style.setProperty("--line", rgba(colors.accent, isLight ? 0.34 : 0.32));
    root.style.setProperty("--hero-border", rgba(colors.accent, isLight ? 0.44 : 0.36));
    root.style.setProperty("--focus-ring", rgba(colors.accent, 0.18));
    root.style.setProperty("--page-wash", rgba(colors.surface, isLight ? 0.2 : 0.18));
    root.style.setProperty("--page-glow", rgba(colors.accent, isLight ? 0.14 : 0.16));
    root.style.setProperty("--hero-glow", rgba(colors.accent, isLight ? 0.12 : 0.18));
    root.style.setProperty("--hero-ring", rgba(colors.accent, 0.22));
    root.style.setProperty("--hero-name-border", rgba(colors.accent, isLight ? 0.45 : 0.5));
    root.style.setProperty("--tab-active-border", rgba(colors.accent, 0.75));
    root.style.setProperty("--active-tab-bg", rgba(colors.accent, 0.22));
    syncThemeControls(palette);
    renderThemePalettePresets(palette);
  }

  function syncThemeControls(palette = normalizeThemePalette(app.profile?.theme_palette)) {
    $$("[data-theme-mode][data-theme-token]").forEach((input) => {
      input.value = palette[input.dataset.themeMode]?.[input.dataset.themeToken] || input.value;
    });
  }

  function renderThemePalettePresets(activePalette = app.profile?.theme_palette || DEFAULT_THEME_PALETTE) {
    const container = $("#themePalettePresets");
    if (!container) return;
    const active = JSON.stringify(normalizeThemePalette(activePalette));
    container.innerHTML = THEME_PALETTE_PRESETS.map((palette, index) => {
      const normalized = normalizeThemePalette(palette);
      return `
        <button
          class="theme-preset ${JSON.stringify(normalized) === active ? "active" : ""}"
          data-theme-preset="${index}"
          style="--dark-bg: ${normalized.dark.background}; --dark-accent: ${normalized.dark.accent}; --dark-muted: ${normalized.dark.muted}; --light-bg: ${normalized.light.background}; --light-accent: ${normalized.light.accent}; --light-muted: ${normalized.light.muted}"
          type="button"
          aria-label="Usa palette ${index + 1}"
          title="Palette ${index + 1}"
        ><span></span><span></span></button>
      `;
    }).join("");
    container.querySelectorAll("[data-theme-preset]").forEach((button) => {
      button.addEventListener("click", () => saveThemePalette(THEME_PALETTE_PRESETS[Number(button.dataset.themePreset)]));
    });
  }

  function paletteFromControls() {
    const palette = normalizeThemePalette(app.profile?.theme_palette || DEFAULT_THEME_PALETTE);
    $$("[data-theme-mode][data-theme-token]").forEach((input) => {
      palette[input.dataset.themeMode][input.dataset.themeToken] = normalizeThemeColor(
        input.value,
        DEFAULT_THEME_PALETTE[input.dataset.themeMode][input.dataset.themeToken]
      );
    });
    return palette;
  }

  async function saveThemePalette(value) {
    const palette = normalizeThemePalette(value);
    applyThemePalette(palette);
    if (!app.user || !app.client) return;
    const { data, error } = await app.client.rpc("app_update_theme_palette", { app_token: app.sessionToken, palette });
    if (error) {
      setStatus("Tema non salvato");
      return;
    }
    app.profile = data || { ...(app.profile || {}), theme_palette: palette };
    app.user = app.profile;
    setStatus("Tema salvato");
  }

  function showView(viewName) {
    const viewIds = {
      auth: "authView",
      sessions: "sessionView",
      settings: "settingsView",
      admin: "adminView",
      master: "masterView",
      character: "characterView",
    };
    Object.values(viewIds).forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.hidden = id !== viewIds[viewName];
    });
    if (viewName !== "character") setCharacterReadOnly(false);
    if (viewName !== "master") stopMasterRealtime();
  }

  function openDrawer() {
    $("#drawerBackdrop").hidden = false;
    $("#sideDrawer").hidden = false;
    renderDrawer();
  }

  function closeDrawer() {
    $("#drawerBackdrop").hidden = true;
    $("#sideDrawer").hidden = true;
  }

  function setSessionTitle(name) {
    const title = name || "Sessione";
    $$("[data-session-name]").forEach((element) => {
      element.textContent = title;
    });
  }

  function blankCharacterData(session) {
    return {
      activeSessionId: session.id,
      appVersion: APP_VERSION,
      session: session.name,
      name: "",
      race: "",
      classLevel: "",
      hpCurrent: 0,
      hpMax: 0,
      hpTemp: 0,
      armorClass: 10,
      initiative: "",
      speed: "9 m",
      deathSuccesses: 0,
      deathFailures: 0,
      deathSuccessChecks: [],
      deathFailureChecks: [],
      conditions: [],
      hitDice: "",
      proficiency: 2,
      inspiration: false,
      passivePerception: 10,
      spellDc: "",
      spellAttack: "",
      abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      saveProficiencies: {},
      skillProficiencies: {},
      attacks: [{ name: "", bonus: "", damage: "" }],
      slots: [],
      knownSpellIds: [],
      preparedSpellIds: [],
      customSpells: [],
      proficienciesLanguages: "",
      equipment: "",
      equipmentItems: [],
      resources: [],
      treasure: "",
      background: "",
      alignment: "",
      experience: 0,
      playerName: profileName(),
      age: "",
      height: "",
      weight: "",
      eyes: "",
      skin: "",
      hair: "",
      personality: "",
      ideals: "",
      bonds: "",
      flaws: "",
      featuresTraits: "",
      backstory: "",
      allies: "",
      symbol: "",
      coinMr: 0,
      coinMa: 0,
      coinMe: 0,
      coinMo: 0,
      coinMp: 0,
    };
  }

  function renderSessionList() {
    const list = $("#sessionList");
    const count = $("#sessionCount");
    if (!list || !count) return;
    app.sessions = normalizeSessionMemberships(app.sessions);
    count.textContent = String(app.sessions.length);
    list.innerHTML = app.sessions.length
      ? app.sessions
          .map((member) => {
            const isMaster = member.role === "master";
            return `
              <article class="session-card">
                <div>
                  <strong>${escapeHtml(member.session.name)}</strong>
                  <small>${isMaster ? "Master" : "Giocatore"}</small>
                </div>
                <button class="small-button" data-open-session="${member.session.id}" type="button">${isMaster ? "Controllo" : "Scheda"}</button>
              </article>
            `;
          })
          .join("")
      : `<div class="empty-state">Nessuna sessione attiva.</div>`;
    list.querySelectorAll("[data-open-session]").forEach((button) => {
      button.addEventListener("click", () => openSession(button.dataset.openSession));
    });
  }

  function renderInvites(target = $("#inviteList")) {
    if (!target) return;
    const pending = app.invites.filter((invite) => invite.status === "pending");
    const count = $("#inviteCount");
    if (count) count.textContent = String(pending.length);
    target.innerHTML = pending.length
      ? pending
          .map(
            (invite) => `
              <article class="invite-card">
                <strong>${escapeHtml(invite.sessions?.name || "Sessione")}</strong>
                <small>Invito in attesa</small>
                <div class="invite-card-actions">
                  <button class="small-button" data-accept-invite="${invite.id}" type="button">Accetta</button>
                  <button class="small-button" data-decline-invite="${invite.id}" type="button">Rifiuta</button>
                </div>
              </article>
            `
          )
          .join("")
      : `<div class="empty-state">Nessun invito.</div>`;

    target.querySelectorAll("[data-accept-invite]").forEach((button) => {
      button.addEventListener("click", () => acceptInvite(button.dataset.acceptInvite));
    });
    target.querySelectorAll("[data-decline-invite]").forEach((button) => {
      button.addEventListener("click", () => declineInvite(button.dataset.declineInvite));
    });
  }

  function renderDrawer() {
    setText("#drawerUserName", profileName());
    setText("#drawerUserEmail", app.profile?.username ? `@${app.profile.username}` : "");
    setText("#settingsUserEmail", app.profile?.username ? `@${app.profile.username}` : "");
    setText("#sessionUserName", profileName());
    const adminNav = $("#adminNavButton");
    if (adminNav) adminNav.hidden = app.profile?.role !== "admin";
    const exportButton = $("#exportCharacterPdfButton");
    if (exportButton) exportButton.hidden = !selectedCharacterId();
    const prepareButton = $("#prepareOfflineButton");
    if (prepareButton) prepareButton.hidden = !app.currentSession;
    updateSyncBannerMenuButton();
    renderSettingsMasterSessions();
  }

  function renderSettingsMasterSessions() {
    const panel = $("#masterSessionSettingsPanel");
    const list = $("#masterSessionSettingsList");
    if (!panel || !list) return;
    const masterSessions = normalizeSessionMemberships(app.sessions).filter((item) => item.role === "master" && item.session);
    panel.hidden = !masterSessions.length;
    list.innerHTML = masterSessions.length
      ? masterSessions
          .map(
            (item) => `
              <article class="admin-row">
                <strong>${escapeHtml(item.session.name)}</strong>
                <small>Master</small>
                <div class="row-actions">
                  <button class="small-button danger-button" data-delete-master-session="${item.session.id}" type="button">Elimina</button>
                </div>
              </article>
            `
          )
          .join("")
      : `<div class="empty-state">Nessuna sessione master.</div>`;

    list.querySelectorAll("[data-delete-master-session]").forEach((button) => {
      button.addEventListener("click", () => requestDeleteMasterSession(button.dataset.deleteMasterSession));
    });
  }

  async function loadProfile() {
    if (!app.client) {
      const cached = await loadCachedShell();
      if (!cached?.profile) throw new Error("Sessione offline non disponibile");
      app.profile = cached.profile;
      app.user = cached.profile;
      app.sessions = normalizeSessionMemberships(cached.sessions);
      app.invites = [];
      applyThemePalette(app.profile?.theme_palette || DEFAULT_THEME_PALETTE);
      setStatus("Modalita offline: dati locali");
      return;
    }
    let data = null;
    let error = null;
    try {
      const response = await app.client.rpc("app_get_shell", { app_token: app.sessionToken });
      data = response.data;
      error = response.error;
    } catch (rpcError) {
      error = rpcError;
    }
    if (error || !data?.profile) {
      const cached = await loadCachedShell();
      if (cached?.profile) {
        app.profile = cached.profile;
        app.user = cached.profile;
        app.sessions = normalizeSessionMemberships(cached.sessions);
        app.invites = [];
        applyThemePalette(app.profile?.theme_palette || DEFAULT_THEME_PALETTE);
        setStatus("Supabase non risponde: uso dati offline");
        return;
      }
      app.user = null;
      app.profile = null;
      app.sessions = [];
      app.invites = [];
      localStorage.removeItem(APP_TOKEN_KEY);
      app.sessionToken = "";
      throw error || new Error("Sessione non valida");
    }
    app.profile = data.profile;
    app.user = data.profile;
    app.sessions = normalizeSessionMemberships(data.sessions);
    app.invites = normalizeInvites(data.invites);
    await cacheShellData(data).catch(() => null);
    applyThemePalette(app.profile?.theme_palette || DEFAULT_THEME_PALETTE);
  }

  async function loadSessionsAndInvites() {
    if (!app.client) {
      const cached = await loadCachedShell();
      if (!cached?.profile) throw new Error("Sessione offline non disponibile");
      app.profile = cached.profile;
      app.user = cached.profile;
      app.sessions = normalizeSessionMemberships(cached.sessions);
      app.invites = [];
      setStatus("Modalita offline: sessioni locali");
      return;
    }
    let data = null;
    let error = null;
    try {
      const response = await app.client.rpc("app_get_shell", { app_token: app.sessionToken });
      data = response.data;
      error = response.error;
    } catch (rpcError) {
      error = rpcError;
    }
    if (error || !data?.profile) {
      const cached = await loadCachedShell();
      if (!cached?.profile) throw error || new Error("Sessione non valida");
      app.profile = cached.profile;
      app.user = cached.profile;
      app.sessions = normalizeSessionMemberships(cached.sessions);
      app.invites = [];
      setStatus("Supabase non risponde: sessioni locali");
      return;
    }
    app.profile = data.profile;
    app.user = data.profile;
    app.sessions = normalizeSessionMemberships(data.sessions);
    app.invites = normalizeInvites(data.invites);
    await cacheShellData(data).catch(() => null);
  }

  async function refreshShellData() {
    await loadProfile();
    renderSessionList();
    renderInvites($("#inviteList"));
    renderDrawer();
  }

  async function routeAfterAuth() {
    if (!app.sessionToken) {
      app.user = null;
      localStorage.removeItem(SESSION_ID_KEY);
      localStorage.removeItem(CHARACTER_ID_KEY);
      closeDrawer();
      showView("auth");
      return;
    }

    try {
      await refreshShellData();
    } catch {
      localStorage.removeItem(APP_TOKEN_KEY);
      app.sessionToken = "";
      app.user = null;
      app.profile = null;
      closeDrawer();
      showView("auth");
      setText("#loginStatus", "Sessione scaduta. Accedi di nuovo.");
      return;
    }

    const sessionId = selectedSessionId();
    if (!sessionId) {
      closeDrawer();
      showView("sessions");
      return;
    }

    const membership = app.sessions.find((item) => item.session.id === sessionId);
    if (!membership && app.profile?.role !== "admin") {
      localStorage.removeItem(SESSION_ID_KEY);
      localStorage.removeItem(CHARACTER_ID_KEY);
      showView("sessions");
      return;
    }

    app.currentSession = membership?.session || (await loadSessionForAdmin(sessionId));
    app.currentRole = membership?.role || (app.profile?.role === "admin" ? "admin" : "");
    if (!app.currentSession) {
      localStorage.removeItem(SESSION_ID_KEY);
      showView("sessions");
      return;
    }

    setSessionTitle(app.currentSession.name);
    const preview = masterPreview();
    if (app.currentRole === "master" || app.profile?.role === "admin") {
      if (preview?.sessionId === app.currentSession.id) {
        app.readOnlyCharacter = true;
        setCharacterReadOnly(true, preview);
        showView("character");
        return;
      }
      await openMasterDashboard(app.currentSession);
      return;
    }

    await loadCharacter(app.currentSession);
    showView("character");
  }

  async function navigate(target) {
    closeDrawer();
    if (!app.user) {
      showView("auth");
      return;
    }
    if (target === "settings") {
      renderDrawer();
      renderSettingsMasterSessions();
      showView("settings");
      return;
    }
    if (target === "admin") {
      if (app.profile?.role !== "admin") return;
      await loadAdminData();
      showView("admin");
      return;
    }
    if (target === "sessions") {
      localStorage.removeItem(SESSION_ID_KEY);
      localStorage.removeItem(CHARACTER_ID_KEY);
      localStorage.removeItem(MASTER_PREVIEW_KEY);
      await refreshShellData();
      showView("sessions");
    }
  }

  async function loadSessionForAdmin(sessionId) {
    if (app.profile?.role !== "admin") return null;
    if (!app.client) {
      const cached = await findLocalSessionRecord(sessionId);
      return cached?.session || null;
    }
    const { data } = await app.client.rpc("app_get_session_for_admin", { app_token: app.sessionToken, target_session_id: sessionId });
    return data || null;
  }

  async function createSessionFromList() {
    if (!app.client) {
      setStatus("Creazione sessione disponibile solo online");
      return;
    }
    const input = $("#newSessionName");
    const name = input.value.trim() || "Nuova sessione";
    const { data, error } = await app.client.rpc("app_create_session", { app_token: app.sessionToken, session_name: name });
    if (error) {
      setStatus("Sessione non creata");
      return;
    }
    input.value = "";
    await openSession(data.id);
  }

  async function openSession(sessionId) {
    localStorage.setItem(SESSION_ID_KEY, sessionId);
    localStorage.removeItem(CHARACTER_ID_KEY);
    await routeAfterAuth();
  }

  async function loadCharacter(session) {
    const localState = getState();
    let currentCharacterId = selectedCharacterId();
    const localCharacter = await findLocalCharacter(session.id, currentCharacterId);
    if (localState.activeSessionId === session.id && currentCharacterId && localCharacter) {
      setCharacterSyncBanner(
        localCharacter.sync_status === "synced" ? "Disponibile offline" : "Salvata offline",
        localCharacter.sync_status === "synced" ? "Questa scheda e gia pronta su questo dispositivo." : "Ci sono modifiche locali in attesa di database."
      );
      scheduleSyncQueue(1500);
      await refreshLocalCharacterFromServer(session, currentCharacterId);
      return;
    }
    if (localState.activeSessionId === session.id && currentCharacterId && !localCharacter) {
      localStorage.removeItem(CHARACTER_ID_KEY);
      currentCharacterId = "";
    }

    if (localCharacter) {
      localStorage.setItem(CHARACTER_ID_KEY, localCharacter.id);
      setState({ ...(localCharacter.data || {}), activeSessionId: session.id, session: session.name, appVersion: APP_VERSION });
      setCharacterSyncBanner("Aperta da dispositivo", "Supabase non serve per aprire questa scheda gia caricata.");
      window.location.reload();
      return;
    }

    if (app.client) {
      const { character, error } = await fetchRemoteCharacter(session, currentCharacterId);
      if (!error && character?.id) {
        await cacheCharacter(character, session.id, app.user?.id, "synced").catch(() => null);
        localStorage.setItem(CHARACTER_ID_KEY, character.id);
        setState({ ...character.data, activeSessionId: session.id, session: session.name, appVersion: APP_VERSION });
        window.location.reload();
        return;
      }

      const blank = blankCharacterData(session);
      let created = null;
      let createError = null;
      try {
        const response = await app.client.rpc("app_create_character", {
          app_token: app.sessionToken,
          target_session_id: session.id,
          character_data: blank,
        });
        created = response.data;
        createError = response.error;
      } catch (rpcError) {
        createError = rpcError;
      }
      if (!createError && created) {
        localStorage.setItem(CHARACTER_ID_KEY, created.id);
        await cacheCharacter({ id: created.id, data: blank }, session.id, app.user?.id, "synced").catch(() => null);
        setState(blank);
        window.location.reload();
        return;
      }
      setState(blank);
      setStatus("Scheda non trovata offline: aprila online almeno una volta.");
      return;
    }

    const blank = blankCharacterData(session);
    setState(blank);
    setStatus("Scheda non trovata offline: aprila online almeno una volta.");
  }

  function queueCharacterSave() {
    if (!app.user || !app.currentSession || app.currentRole === "master" || app.readOnlyCharacter) return;
    window.clearTimeout(app.saveTimer);
    window.setTimeout(() => saveLocalCharacterSnapshot("pending").catch(() => null), 0);
    app.saveTimer = window.setTimeout(saveCharacter, 900);
  }

  async function saveCharacter(options = {}) {
    const { silent = false } = options;
    const sessionId = selectedSessionId();
    const characterId = selectedCharacterId();
    if (!app.user || !sessionId || !characterId || app.currentRole === "master" || app.readOnlyCharacter) {
      return { ok: false, skipped: true, message: "Salvataggio non disponibile per questa scheda" };
    }
    const state = { ...getState(), activeSessionId: sessionId, appVersion: APP_VERSION };
    await saveLocalCharacterSnapshot("pending").catch(() => null);
    const localRecord = await idbGet("local_characters", characterId).catch(() => null);
    if (localRecord?.owner_id && localRecord.owner_id !== app.user.id) {
      const message = "Scheda di un altro utente: sincronizzazione bloccata";
      if (!silent) setStatus(message);
      setCharacterSyncBanner("Non sincronizzata", "Accedi con l'utente proprietario per sincronizzare questa scheda.");
      return { ok: false, message };
    }
    if (!app.client || !navigator.onLine) {
      if (!silent) setStatus("Salvato offline");
      return { ok: false, message: "Salvato offline: sincronizzazione in coda" };
    }
    let error = null;
    try {
      const response = await app.client.rpc("app_update_character", {
        app_token: app.sessionToken,
        target_character_id: characterId,
        character_data: state,
      });
      error = response.error;
    } catch (rpcError) {
      error = rpcError;
    }
    if (error) {
      if (!silent) setStatus("Errore salvataggio");
      return { ok: false, message: "Scheda non sincronizzata" };
    }
    const spellSync = await syncCustomSpells(state);
    if (!spellSync.ok) {
      if (!silent) setStatus("Scheda salvata, incantesimi custom non sincronizzati");
      return { ok: false, message: "Scheda salvata, incantesimi custom non sincronizzati" };
    }
    if (!silent) setStatus("Salvato");
    await saveLocalCharacterSnapshot("synced").catch(() => null);
    await idbDelete("sync_queue", `character:${characterId}`).catch(() => null);
    return { ok: true, message: "Sincronizzato con Supabase" };
  }

  async function syncCustomSpells(state = getState()) {
    const sessionId = selectedSessionId();
    if (!sessionId || !app.user || !app.client) return { ok: false, message: "Sessione non disponibile" };
    const customSpells = Array.isArray(state.customSpells) ? state.customSpells : [];
    let error = null;
    try {
      const response = await app.client.rpc("app_sync_custom_spells", {
        app_token: app.sessionToken,
        target_session_id: sessionId,
        custom_spells: customSpells,
      });
      error = response.error;
    } catch (rpcError) {
      error = rpcError;
    }
    return error ? { ok: false, message: "Custom spell non sincronizzati" } : { ok: true, message: "Custom spell sincronizzati" };
  }

  async function exportCurrentCharacterPdf() {
    const button = $("#exportCharacterPdfButton");
    if (button) button.disabled = true;
    setStatus("Preparo PDF...");
    try {
      const syncResult = await ensureCharacterSyncedForExport();
      const state = { ...getState(), activeSessionId: selectedSessionId(), appVersion: APP_VERSION };
      const characterName = state.name || "Personaggio senza nome";
      const pdf = buildCharacterBackupPdf(
        [
          {
            state,
            title: characterName,
            syncStatus: syncResult.message,
          },
        ],
        {
          title: `Backup scheda - ${characterName}`,
          generatedAt: new Date(),
        }
      );
      downloadBlob(pdf, `${safeFileName(characterName)}-scheda.pdf`);
      setStatus(syncResult.ok ? "PDF creato e scheda sincronizzata" : "PDF creato, sincronizzazione non completata");
      closeDrawer();
    } catch {
      setStatus("PDF non creato");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function exportMasterSessionPdf() {
    const button = $("#exportSessionPdfButton");
    if (button) button.disabled = true;
    setStatus("Preparo PDF sessione...");
    try {
      if (!app.currentSession) {
        setStatus("Sessione non selezionata");
        return;
      }
      await loadMasterCharacters(app.currentSession.id);
      if (!app.masterCharacters.length) {
        setStatus("Nessuna scheda da esportare");
        return;
      }
      const backups = app.masterCharacters.map((character) => {
        const state = {
          ...(character.data || {}),
          activeSessionId: app.currentSession.id,
          session: app.currentSession.name,
          appVersion: APP_VERSION,
        };
        const owner = character.ownerProfile?.display_name || character.ownerProfile?.username || "Giocatore";
        return {
          state,
          title: `${state.name || character.name || "Personaggio senza nome"} - ${owner}`,
          syncStatus: character.sync_status && character.sync_status !== "synced" ? "Dati da backup locale, sincronizzazione non completata" : "Dati riletti dal database o da copia locale sincronizzata",
        };
      });
      const pdf = buildCharacterBackupPdf(backups, {
        title: `Backup sessione - ${app.currentSession.name}`,
        generatedAt: new Date(),
      });
      downloadBlob(pdf, `${safeFileName(app.currentSession.name)}-sessione.pdf`);
      setStatus("PDF sessione creato");
    } catch {
      setStatus("PDF sessione non creato");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function ensureCharacterSyncedForExport() {
    window.clearTimeout(app.saveTimer);
    if (!app.client || !app.user) return { ok: false, message: "Non sincronizzato: Supabase non disponibile" };
    if (!selectedCharacterId()) return { ok: false, message: "Non sincronizzato: scheda non selezionata" };
    if (app.readOnlyCharacter || app.currentRole === "master") return { ok: true, message: "Sola lettura: esportazione senza salvataggio" };
    setStatus("Verifico salvataggio...");
    return saveCharacter({ silent: true });
  }

  async function prepareOfflineSession() {
    closeDrawer();
    if (!app.currentSession) {
      setStatus("Seleziona prima una sessione");
      return;
    }
    setStatus("Preparo sessione offline...");
    const profileId = app.user?.id || "";
    await idbPut("local_sessions", {
      id: localSessionRecordId(profileId, app.currentSession.id),
      session_id: app.currentSession.id,
      role: app.currentRole,
      session: app.currentSession,
      profile_id: profileId,
      cached_at: new Date().toISOString(),
      prepared_at: new Date().toISOString(),
    }).catch(() => null);

    if (app.currentRole === "master" || app.profile?.role === "admin") {
      await loadMasterCharacters(app.currentSession.id);
      await idbPut("local_meta", { key: `offline_session:${app.currentSession.id}`, value: new Date().toISOString() }).catch(() => null);
      setStatus(app.masterCharacters.length ? "Sessione master pronta offline" : "Sessione pronta, nessuna scheda locale");
      return;
    }

    await saveLocalCharacterSnapshot("pending").catch(() => null);
    const syncResult = await syncPendingQueue().catch(() => ({ ok: false }));
    await idbPut("local_meta", { key: `offline_session:${app.currentSession.id}`, value: new Date().toISOString() }).catch(() => null);
    setCharacterSyncBanner(
      syncResult.ok ? "Pronta offline" : "Pronta offline",
      syncResult.ok ? "Scheda locale e database sincronizzati." : "Scheda salvata sul dispositivo, sync in coda."
    );
    setStatus(syncResult.ok ? "Sessione pronta offline" : "Sessione pronta offline, DB non raggiunto");
  }

  function buildCharacterBackupPdf(characterBackups, options = {}) {
    const lines = [];
    addPdfLine(lines, options.title || "Backup scheda personaggio", 18, 8);
    addPdfLine(lines, `Creato il ${formatDateTime(options.generatedAt || new Date())}`, 10, 16);
    characterBackups.forEach((backup, index) => {
      if (index > 0) addPdfLine(lines, "", 10, 12);
      appendCharacterBackupLines(lines, backup.state || {}, backup);
    });
    return new Blob([createPdfBytes(lines)], { type: "application/pdf" });
  }

  function appendCharacterBackupLines(lines, state, backup = {}) {
    addPdfLine(lines, backup.title || state.name || "Personaggio senza nome", 15, 8);
    addPdfKeyValues(lines, [
      ["Sincronizzazione DB", backup.syncStatus || "Non verificata"],
      ["Sessione", state.session],
      ["Giocatore", state.playerName],
      ["Versione app", state.appVersion],
    ]);

    addPdfSection(lines, "Dati principali");
    addPdfKeyValues(lines, [
      ["Nome", state.name],
      ["Razza", state.race],
      ["Classe e livello", state.classLevel],
      ["Background", state.background],
      ["Allineamento", state.alignment],
      ["PX", state.experience],
      ["Eta", state.age],
      ["Altezza", state.height],
      ["Peso", state.weight],
      ["Occhi", state.eyes],
      ["Pelle", state.skin],
      ["Capelli", state.hair],
    ]);

    addPdfSection(lines, "Combattimento");
    addPdfKeyValues(lines, [
      ["PF", `${valueOrDash(state.hpCurrent)} / ${valueOrDash(state.hpMax)} + temp ${valueOrDash(state.hpTemp)}`],
      ["CA", state.armorClass],
      ["Iniziativa", state.initiative],
      ["Velocita", state.speed],
      ["Dadi vita", state.hitDice],
      ["Competenza", state.proficiency],
      ["Ispirazione", state.inspiration ? "Si" : "No"],
      ["Percezione passiva", state.passivePerception],
      ["TS morte", `Successi ${Number(state.deathSuccesses) || 0}, fallimenti ${Number(state.deathFailures) || 0}`],
      ["Condizioni e stati", formatConditions(state)],
    ]);

    addPdfSection(lines, "Caratteristiche");
    addPdfWrapped(
      lines,
      PDF_ABILITIES
        .map(([key, label]) => `${label}: ${valueOrDash(state.abilities?.[key])} (${signedPdf(abilityModPdf(state.abilities?.[key]))})`)
        .join(" | ")
    );

    addPdfSection(lines, "Competenze");
    addPdfKeyValues(lines, [
      ["Tiri salvezza", checkedLabels(PDF_SAVES, state.saveProficiencies).join(", ") || "-"],
      ["Abilita", checkedLabels(PDF_SKILLS, state.skillProficiencies).join(", ") || "-"],
      ["Altre competenze e linguaggi", state.proficienciesLanguages],
      ["Privilegi e tratti", state.featuresTraits],
    ]);

    addPdfSection(lines, "Attacchi");
    const attacks = Array.isArray(state.attacks) ? state.attacks : [];
    if (attacks.length) {
      attacks.forEach((attack, index) => addPdfWrapped(lines, `${index + 1}. ${valueOrDash(attack.name)} | Bonus ${valueOrDash(attack.bonus)} | Danni ${valueOrDash(attack.damage)}`));
    } else {
      addPdfWrapped(lines, "-");
    }

    addPdfSection(lines, "Magia");
    addPdfKeyValues(lines, [
      ["CD incantesimi", state.spellDc],
      ["Bonus attacco inc.", state.spellAttack],
      ["Slot", formatSpellSlots(state.slots)],
      ["Trucchetti testuali", state.cantrips],
      ["Incantesimi testuali", state.spells],
    ]);
    appendKnownSpells(lines, state);

    addPdfSection(lines, "Equipaggiamento e tesoro");
    addPdfKeyValues(lines, [
      ["Monete", `MR ${Number(state.coinMr) || 0}, MA ${Number(state.coinMa) || 0}, ME ${Number(state.coinMe) || 0}, MO ${Number(state.coinMo) || 0}, MP ${Number(state.coinMp) || 0}`],
      ["Risorse", formatResources(state.resources)],
      ["Equipaggiamento", state.equipment],
      ["Tesoro", state.treasure],
    ]);
    const equipmentItems = Array.isArray(state.equipmentItems) ? state.equipmentItems : [];
    equipmentItems.forEach((item, index) => addPdfWrapped(lines, `${index + 1}. ${valueOrDash(item.name)} - ${valueOrDash(item.description)}`));

    addPdfSection(lines, "Storia e note");
    addPdfKeyValues(lines, [
      ["Tratti caratteriali", state.personality],
      ["Ideali", state.ideals],
      ["Legami", state.bonds],
      ["Difetti", state.flaws],
      ["Storia", state.backstory],
      ["Alleati e organizzazioni", state.allies],
      ["Simbolo", state.symbol],
    ]);
  }

  function appendKnownSpells(lines, state) {
    const customSpells = Array.isArray(state.customSpells) ? state.customSpells : [];
    const spells = [...officialSpellsForState(state), ...customSpells];
    const spellById = new Map(spells.map((spell) => [spell.id, spell]));
    const knownIds = Array.isArray(state.knownSpellIds) ? state.knownSpellIds : [];
    const preparedIds = new Set(Array.isArray(state.preparedSpellIds) ? state.preparedSpellIds : []);
    if (!knownIds.length) {
      addPdfWrapped(lines, "Incantesimi del personaggio: -");
    } else {
      addPdfLine(lines, "Incantesimi del personaggio", 11, 4);
      knownIds.forEach((id, index) => {
        const spell = spellById.get(id);
        if (!spell) {
          addPdfWrapped(lines, `${index + 1}. ${id}`);
          return;
        }
        const prepared = preparedIds.has(id) ? "Preparato" : "Non preparato";
        addPdfWrapped(
          lines,
          `${index + 1}. ${spell.name_it || spell.name} - ${spell.level_it || spell.level || "-"} - ${spell.source || "-"} - ${prepared}`
        );
        addPdfWrapped(
          lines,
          `Scuola: ${valueOrDash(spell.school_it)} | Tempo: ${valueOrDash(spell.casting_time)} | Raggio: ${valueOrDash(spell.range)} | Componenti: ${valueOrDash(spell.components)} | Durata: ${valueOrDash(spell.duration)}`,
          14
        );
        if (spell.description) addPdfWrapped(lines, spell.description, 14);
      });
    }
    if (customSpells.length) {
      addPdfLine(lines, "Incantesimi custom locali", 11, 4);
      customSpells.forEach((spell, index) => addPdfWrapped(lines, `${index + 1}. ${spell.name_it || spell.name} - ${spell.level_it || spell.level} - ${spell.source || "Custom"}`));
    }
  }

  function officialSpellsForState(state) {
    const language = state?.spellLanguage === "en" ? "en" : "it";
    const englishSpells = Array.isArray(window.DND_SPELLS_EN)
      ? window.DND_SPELLS_EN
      : Array.isArray(window.DND_SPELLS)
        ? window.DND_SPELLS
        : [];
    const italianSpells = Array.isArray(window.DND_SPELLS_IT) ? window.DND_SPELLS_IT : [];
    if (language === "en") return englishSpells;
    return italianSpells.length ? italianSpells : englishSpells;
  }

  function addPdfSection(lines, title) {
    addPdfLine(lines, "", 10, 4);
    addPdfLine(lines, title, 13, 6);
  }

  function addPdfKeyValues(lines, entries) {
    entries.forEach(([label, value]) => addPdfWrapped(lines, `${label}: ${valueOrDash(value)}`));
  }

  function addPdfWrapped(lines, text, indent = 0) {
    const safe = String(valueOrDash(text)).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    safe.split("\n").forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) {
        addPdfLine(lines, "", 10, 6, indent);
        return;
      }
      let current = "";
      words.forEach((word) => {
        const next = current ? `${current} ${word}` : word;
        if (pdfApproxLength(next, indent) > 94 && current) {
          addPdfLine(lines, current, 10, 2, indent);
          current = word;
        } else {
          current = next;
        }
      });
      if (current) addPdfLine(lines, current, 10, 2, indent);
    });
  }

  function addPdfLine(lines, text, size = 10, after = 2, indent = 0) {
    lines.push({ text: String(text ?? ""), size, after, indent });
  }

  function createPdfBytes(lines) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 42;
    const pages = [];
    let page = [];
    let y = pageHeight - margin;
    lines.forEach((line) => {
      const needed = line.size + line.after + 4;
      if (y - needed < margin && page.length) {
        pages.push(page);
        page = [];
        y = pageHeight - margin;
      }
      page.push({ ...line, x: margin + (line.indent || 0), y });
      y -= needed;
    });
    if (page.length) pages.push(page);

    const objects = [];
    const pageRefs = pages.map((_, index) => 4 + index * 2);
    objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pages.length} >>`;
    objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    pages.forEach((pdfPage, index) => {
      const pageObjectNumber = 4 + index * 2;
      const contentObjectNumber = pageObjectNumber + 1;
      const content = pdfPage
        .map((line) => `BT /F1 ${line.size} Tf ${line.x.toFixed(2)} ${line.y.toFixed(2)} Td (${escapePdfString(line.text)}) Tj ET`)
        .join("\n");
      objects[pageObjectNumber - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
      objects[contentObjectNumber - 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets[index + 1] = pdf.length;
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return pdf;
  }

  function escapePdfString(value) {
    return pdfSafeText(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  }

  function pdfSafeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pdfApproxLength(text, indent = 0) {
    return String(text).length + Math.round(indent / 5);
  }

  function checkedLabels(definitions, values = {}) {
    return definitions.filter(([key]) => Boolean(values?.[key])).map(([, label]) => label);
  }

  function formatSpellSlots(slots) {
    if (!Array.isArray(slots) || !slots.length) return "-";
    return slots.map((slot) => `L${slot.level}: ${Number(slot.current) || 0}/${Number(slot.max) || 0}`).join(", ");
  }

  function abilityModPdf(score) {
    return Math.floor(((Number(score) || 10) - 10) / 2);
  }

  function signedPdf(value) {
    const number = Number(value) || 0;
    return number >= 0 ? `+${number}` : `${number}`;
  }

  function valueOrDash(value) {
    if (value === null || value === undefined || value === "") return "-";
    return value;
  }

  function formatConditions(state) {
    const conditions = Array.isArray(state.conditions) ? [...state.conditions] : [];
    if ((Number(state.hpCurrent) || 0) <= 0 && !conditions.includes("A terra")) {
      conditions.unshift("A terra");
    }
    return conditions.filter(Boolean).join(", ") || "-";
  }

  function formatResources(resources, limit = Infinity) {
    if (!Array.isArray(resources) || !resources.length) return "-";
    const shown = resources
      .filter((resource) => resource?.name)
      .slice(0, limit)
      .map((resource) => `${resource.name}: ${valueOrDash(resource.current)}/${valueOrDash(resource.max)}`);
    return shown.join(", ") || "-";
  }

  function safeFileName(value) {
    return pdfSafeText(value || "personaggio").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "personaggio";
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function openMasterDashboard(session) {
    setSessionTitle(session.name);
    await loadMasterCharacters(session.id);
    subscribeMasterCharacters(session.id);
    showView("master");
  }

  async function loadMasterCharacters(sessionId) {
    if (!app.client) {
      const cached = await idbGetAll("local_characters").catch(() => []);
      app.masterCharacters = normalizeCharacters(cached.filter((character) => character.session_id === sessionId));
      renderMasterCharacters();
      setStatus("Dashboard master offline");
      return;
    }
    let data = null;
    let error = null;
    try {
      const response = await app.client.rpc("app_list_master_characters", {
        app_token: app.sessionToken,
        target_session_id: sessionId,
      });
      data = response.data;
      error = response.error;
    } catch (rpcError) {
      error = rpcError;
    }
    if (error) {
      const cached = await idbGetAll("local_characters").catch(() => []);
      app.masterCharacters = normalizeCharacters(cached.filter((character) => character.session_id === sessionId));
      renderMasterCharacters();
      setStatus(app.masterCharacters.length ? "Dashboard master da dati offline" : "Nessuna scheda offline per questa sessione");
      return;
    }

    app.masterCharacters = normalizeCharacters(data);
    await Promise.all(app.masterCharacters.map((character) => cacheCharacter(character, sessionId, character.owner_id || character.ownerProfile?.id || "").catch(() => null)));
    renderMasterCharacters();
  }

  function renderMasterCharacters() {
    const list = $("#masterCharacterList");
    const count = $("#masterCharacterCount");
    if (!list || !count) return;
    count.textContent = String(app.masterCharacters.length);
    list.innerHTML = app.masterCharacters.length
      ? app.masterCharacters.map(renderMasterCharacterCard).join("")
      : `<div class="empty-state">Nessun personaggio nella sessione.</div>`;
    list.querySelectorAll("[data-open-character-sheet]").forEach((button) => {
      button.addEventListener("click", () => openCharacterPreview(button.dataset.openCharacterSheet));
    });
  }

  function renderMasterCharacterCard(character) {
    const data = character.data || {};
    const hpCurrent = Number(data.hpCurrent) || 0;
    const hpMax = Number(data.hpMax) || 0;
    const hpTemp = Number(data.hpTemp) || 0;
    const hpPercent = hpMax > 0 ? Math.max(0, Math.min(100, Math.round((hpCurrent / hpMax) * 100))) : 0;
    const status = hpCurrent <= 0 ? "A terra" : "Attivo";
    const conditionSummary = masterConditionSummary(data);
    const resourceSummary = formatResources(data.resources, 3);
    const owner = character.ownerProfile?.display_name || character.ownerProfile?.username || "Giocatore";
    return `
      <article class="master-character-card">
        <div class="master-card-head">
          <div>
            <strong>${escapeHtml(data.name || character.name || "Personaggio senza nome")}</strong>
            <small>${escapeHtml(owner)} - ${escapeHtml(data.classLevel || "Classe non indicata")}</small>
          </div>
          <span class="status-pill ${hpCurrent <= 0 ? "danger" : ""}">${status}</span>
        </div>
        ${conditionSummary ? `<div class="master-condition-line">${conditionSummary.map((condition) => `<span>${escapeHtml(condition)}</span>`).join("")}</div>` : ""}
        <div class="hp-meter" aria-label="Punti ferita">
          <span style="width:${hpPercent}%"></span>
        </div>
        <div class="master-stat-grid">
          <span>PF <strong>${hpCurrent}/${hpMax}</strong></span>
          <span>Temp <strong>${hpTemp}</strong></span>
          <span>CA <strong>${escapeHtml(data.armorClass ?? "-")}</strong></span>
          <span>TS morte <strong>${Number(data.deathSuccesses) || 0}/${Number(data.deathFailures) || 0}</strong></span>
          <span>Vel. <strong>${escapeHtml(data.speed || "-")}</strong></span>
          <span>Risorse <strong>${escapeHtml(resourceSummary)}</strong></span>
        </div>
        <div class="master-card-actions">
          <small class="live-line">${character.sync_status && character.sync_status !== "synced" ? "Offline" : "Aggiornato"} ${formatTime(character.updated_at || character.local_updated_at)}</small>
          <button class="small-button" data-open-character-sheet="${escapeAttribute(character.id)}" type="button">Apri scheda</button>
        </div>
      </article>
    `;
  }

  function masterConditionSummary(data) {
    const conditions = Array.isArray(data.conditions) ? data.conditions.filter(Boolean) : [];
    const summary = [];
    if ((Number(data.hpCurrent) || 0) <= 0 && !conditions.includes("A terra")) summary.push("A terra");
    conditions.slice(0, 4).forEach((condition) => {
      if (!summary.includes(condition)) summary.push(condition);
    });
    return summary;
  }

  function openCharacterPreview(characterId) {
    const character = app.masterCharacters.find((item) => item.id === characterId);
    if (!character || !app.currentSession) return;
    const characterState = {
      ...(character.data || {}),
      activeSessionId: app.currentSession.id,
      session: app.currentSession.name,
      appVersion: APP_VERSION,
    };
    setState(characterState);
    localStorage.setItem(SESSION_ID_KEY, app.currentSession.id);
    localStorage.setItem(CHARACTER_ID_KEY, character.id);
    localStorage.setItem(
      MASTER_PREVIEW_KEY,
      JSON.stringify({
        sessionId: app.currentSession.id,
        characterId: character.id,
        characterName: characterState.name || character.name || "Personaggio senza nome",
      })
    );
    window.location.reload();
  }

  async function closeCharacterPreview() {
    localStorage.removeItem(MASTER_PREVIEW_KEY);
    localStorage.removeItem(CHARACTER_ID_KEY);
    app.readOnlyCharacter = false;
    setCharacterReadOnly(false);
    if (app.currentSession) {
      await openMasterDashboard(app.currentSession);
    } else {
      await routeAfterAuth();
    }
  }

  function setCharacterReadOnly(readOnly, preview = masterPreview()) {
    app.readOnlyCharacter = Boolean(readOnly);
    const view = $("#characterView");
    if (!view) return;
    view.classList.toggle("read-only-sheet", app.readOnlyCharacter);
    view.querySelectorAll("input, textarea, select").forEach((field) => {
      field.disabled = app.readOnlyCharacter;
    });
    view.querySelectorAll("button").forEach((button) => {
      if (button.id === "menuButton" || button.classList.contains("tab-button")) return;
      button.disabled = app.readOnlyCharacter;
    });

    let notice = $("#readOnlySheetNotice");
    if (app.readOnlyCharacter) {
      if (!notice) {
        notice = document.createElement("section");
        notice.id = "readOnlySheetNotice";
        notice.className = "read-only-notice";
        const hero = view.querySelector(".hero");
        view.insertBefore(notice, hero || view.firstChild);
      }
      notice.innerHTML = `
        <div>
          <span>Sola visualizzazione</span>
          <strong>${escapeHtml(preview?.characterName || "Scheda personaggio")}</strong>
        </div>
        <button class="small-button" id="closeReadOnlySheetButton" type="button">Torna al master</button>
      `;
      $("#closeReadOnlySheetButton")?.addEventListener("click", closeCharacterPreview);
    } else if (notice) {
      notice.remove();
    }
  }

  function subscribeMasterCharacters(sessionId) {
    stopMasterRealtime();
    if (app.client?.channel) {
      app.masterChannel = app.client
        .channel(`session-characters-${sessionId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "characters", filter: `session_id=eq.${sessionId}` },
          () => loadMasterCharacters(sessionId)
        )
        .subscribe();
    }
    app.masterPollTimer = window.setInterval(() => loadMasterCharacters(sessionId), 7000);
  }

  function stopMasterRealtime() {
    if (app.masterChannel && app.client?.removeChannel) {
      app.client.removeChannel(app.masterChannel);
    }
    app.masterChannel = null;
    window.clearInterval(app.masterPollTimer);
    app.masterPollTimer = null;
  }

  async function acceptInvite(inviteId) {
    const { data, error } = await app.client.rpc("app_accept_invite", { app_token: app.sessionToken, target_invite_id: inviteId });
    if (error) {
      setStatus("Invito non accettato");
      return;
    }
    await openSession(data);
  }

  async function declineInvite(inviteId) {
    await app.client.rpc("app_decline_invite", { app_token: app.sessionToken, target_invite_id: inviteId });
    await loadSessionsAndInvites();
    renderInvites($("#inviteList"));
  }

  async function changeOwnPassword() {
    const input = $("#ownNewPassword");
    const password = input.value;
    if (!password || password.length < 6) {
      setStatus("Password troppo corta");
      return;
    }
    const { error } = await app.client.rpc("app_change_password", { app_token: app.sessionToken, new_password: password });
    input.value = "";
    setStatus(error ? "Password non cambiata" : "Password cambiata");
  }

  async function searchInviteUsers() {
    const term = $("#inviteUserSearch").value.trim();
    const results = $("#inviteUserResults");
    if (term.length < 2) {
      results.innerHTML = `<div class="empty-state">Scrivi almeno 2 caratteri.</div>`;
      return;
    }
    const { data, error } = await app.client.rpc("app_search_accounts", { app_token: app.sessionToken, search_term: term });
    if (error || !data.length) {
      results.innerHTML = `<div class="empty-state">Nessun utente trovato.</div>`;
      return;
    }
    results.innerHTML = data
      .filter((profile) => profile.id !== app.user.id)
      .map(
        (profile) => `
          <article class="user-row">
            <strong>${escapeHtml(profile.display_name || profile.username)}</strong>
            <small>@${escapeHtml(profile.username)}</small>
            <button class="small-button" data-invite-user="${profile.id}" type="button">Invita</button>
          </article>
        `
      )
      .join("");
    results.querySelectorAll("[data-invite-user]").forEach((button) => {
      button.addEventListener("click", () => inviteUser(button.dataset.inviteUser));
    });
  }

  async function inviteUser(userId) {
    if (!app.currentSession) return;
    const { error } = await app.client.rpc("app_invite_account", {
      app_token: app.sessionToken,
      target_session_id: app.currentSession.id,
      target_account_id: userId,
    });
    setStatus(error ? "Invito non inviato" : "Invito inviato");
  }

  function requestDeleteMasterSession(sessionId) {
    const membership = app.sessions.find((item) => item.session?.id === sessionId && item.role === "master");
    if (!membership) return;
    app.pendingDeleteSessionId = sessionId;
    setText("#deleteSessionConfirmTitle", `Eliminare ${membership.session.name}?`);
    setText("#deleteSessionConfirmText", "Questa azione rimuove la sessione e tutte le schede collegate. Non può essere annullata.");
    $("#deleteSessionConfirmBackdrop").hidden = false;
  }

  function closeDeleteSessionConfirm() {
    app.pendingDeleteSessionId = "";
    $("#deleteSessionConfirmBackdrop").hidden = true;
  }

  async function confirmDeleteMasterSession() {
    const sessionId = app.pendingDeleteSessionId;
    if (!sessionId) return;
    const button = $("#confirmDeleteSessionButton");
    button.disabled = true;
    const { error } = await app.client.rpc("app_delete_master_session", {
      app_token: app.sessionToken,
      target_session_id: sessionId,
    });
    button.disabled = false;
    closeDeleteSessionConfirm();
    if (error) {
      setStatus("Sessione non eliminata");
      return;
    }
    if (selectedSessionId() === sessionId) {
      localStorage.removeItem(SESSION_ID_KEY);
      localStorage.removeItem(CHARACTER_ID_KEY);
      localStorage.removeItem(MASTER_PREVIEW_KEY);
      app.currentSession = null;
      app.currentRole = "";
    }
    await loadSessionsAndInvites();
    renderSessionList();
    renderSettingsMasterSessions();
    renderDrawer();
    setStatus("Sessione eliminata");
  }

  async function loadAdminData() {
    await Promise.all([loadAdminUsers(), loadAdminSessions()]);
  }

  async function loadAdminUsers() {
    const list = $("#adminUsersList");
    const { data, error } = await app.client.rpc("app_admin_list_accounts", { app_token: app.sessionToken });
    if (error || !data) {
      list.innerHTML = `<div class="empty-state">Account non caricati.</div>`;
      return;
    }
    list.innerHTML = data
      .map(
        (profile) => `
          <article class="admin-row">
            <strong>${escapeHtml(profile.display_name || profile.username)}</strong>
            <small>@${escapeHtml(profile.username)} - ${profile.role}</small>
            <div class="row-actions">
              <button class="small-button" data-admin-role="${profile.id}" data-role="${profile.role === "admin" ? "user" : "admin"}" type="button">
                ${profile.role === "admin" ? "Rendi user" : "Rendi admin"}
              </button>
            </div>
          </article>
        `
      )
      .join("");
    list.querySelectorAll("[data-admin-role]").forEach((button) => {
      button.addEventListener("click", () => updateUserRole(button.dataset.adminRole, button.dataset.role));
    });
  }

  async function loadAdminSessions() {
    const list = $("#adminSessionsList");
    const { data, error } = await app.client.rpc("app_admin_list_sessions", { app_token: app.sessionToken });
    if (error || !data) {
      list.innerHTML = `<div class="empty-state">Sessioni non caricate.</div>`;
      return;
    }
    list.innerHTML = data
      .map(
        (session) => `
          <article class="admin-row">
            <strong>${escapeHtml(session.name)}</strong>
            <small>${new Date(session.created_at).toLocaleDateString("it-IT")}</small>
            <div class="row-actions">
              <button class="small-button" data-admin-open-session="${session.id}" type="button">Apri</button>
              <button class="small-button" data-admin-delete-session="${session.id}" type="button">Elimina</button>
            </div>
          </article>
        `
      )
      .join("");
    list.querySelectorAll("[data-admin-open-session]").forEach((button) => {
      button.addEventListener("click", () => openSession(button.dataset.adminOpenSession));
    });
    list.querySelectorAll("[data-admin-delete-session]").forEach((button) => {
      button.addEventListener("click", () => deleteAdminSession(button.dataset.adminDeleteSession));
    });
  }

  async function createAdminUser() {
    const username = $("#adminNewUsername").value.trim();
    const displayName = $("#adminNewDisplayName").value.trim() || username;
    const password = $("#adminNewPassword").value;
    if (!username || password.length < 6) {
      setStatus("Dati account incompleti");
      return;
    }

    const { error } = await app.client.rpc("app_admin_create_account", {
      app_token: app.sessionToken,
      target_username: username,
      target_display_name: displayName,
      target_password: password,
      target_role: "user",
    });
    if (error) {
      setStatus("Account non creato");
      return;
    }

    ["adminNewUsername", "adminNewDisplayName", "adminNewPassword"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.value = "";
    });
    setStatus("Account creato");
    await loadAdminUsers();
  }

  async function updateUserRole(userId, role) {
    const { error } = await app.client.rpc("app_admin_update_account_role", {
      app_token: app.sessionToken,
      target_account_id: userId,
      target_role: role,
    });
    setStatus(error ? "Ruolo non cambiato" : "Ruolo aggiornato");
    await loadAdminUsers();
    await loadProfile();
    renderDrawer();
  }

  async function deleteAdminSession(sessionId) {
    const { error } = await app.client.rpc("app_admin_delete_session", { app_token: app.sessionToken, target_session_id: sessionId });
    setStatus(error ? "Sessione non eliminata" : "Sessione eliminata");
    await loadAdminSessions();
    await loadSessionsAndInvites();
    renderSessionList();
  }

  async function signIn() {
    const hasClient = await ensureSupabaseClient();
    if (!hasClient) {
      $("#loginStatus").textContent = "Configurazione Supabase mancante.";
      return;
    }
    const username = $("#loginUsername").value.trim();
    const password = $("#loginPassword").value;
    if (!username || !password) {
      $("#loginStatus").textContent = "Inserisci username e password.";
      return;
    }
    $("#loginStatus").textContent = "Accesso...";
    let data = null;
    let error = null;
    try {
      const response = await app.client.rpc("app_login_account", { target_username: username, target_password: password });
      data = response.data;
      error = response.error;
    } catch (rpcError) {
      error = rpcError;
    }
    if (error) {
      $("#loginStatus").textContent = "Accesso non riuscito.";
      return;
    }
    clearOfflineLocalAccess();
    app.sessionToken = data.token;
    localStorage.setItem(APP_TOKEN_KEY, app.sessionToken);
    localStorage.removeItem(OFFLINE_PROFILE_ID_KEY);
    app.user = data.profile;
    app.profile = data.profile;
    $("#loginPassword").value = "";
    await routeAfterAuth();
  }

  async function signOut() {
    stopMasterRealtime();
    if (app.sessionToken && app.client) {
      await app.client.rpc("app_logout_account", { app_token: app.sessionToken });
    }
    app.user = null;
    app.profile = null;
    app.sessionToken = "";
    app.currentSession = null;
    app.currentRole = "";
    app.masterCharacters = [];
    clearOfflineLocalAccess();
    localStorage.removeItem(APP_TOKEN_KEY);
    localStorage.removeItem(OFFLINE_PROFILE_ID_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(CHARACTER_ID_KEY);
    localStorage.removeItem(MASTER_PREVIEW_KEY);
    closeDrawer();
    showView("auth");
  }

  function bindEvents() {
    $("#loginSubmit").addEventListener("click", signIn);
    $("#offlineLocalAccessButton").addEventListener("click", showOfflineLocalAccess);
    $("#loginPassword").addEventListener("keydown", (event) => {
      if (event.key === "Enter") signIn();
    });
    $("#createSessionFromList").addEventListener("click", createSessionFromList);
    $("#menuButton").addEventListener("click", openDrawer);
    $("#sessionMenuButton").addEventListener("click", openDrawer);
    $$("[data-menu-button]").forEach((button) => button.addEventListener("click", openDrawer));
    $("#closeDrawerButton").addEventListener("click", closeDrawer);
    $("#drawerBackdrop").addEventListener("click", closeDrawer);
    $("#logoutButton").addEventListener("click", signOut);
    $("#changeOwnPasswordButton").addEventListener("click", changeOwnPassword);
    $("#exportCharacterPdfButton").addEventListener("click", exportCurrentCharacterPdf);
    $("#toggleSyncBannerButton")?.addEventListener("click", toggleCharacterSyncBanner);
    $("#exportSessionPdfButton").addEventListener("click", exportMasterSessionPdf);
    $("#prepareOfflineButton").addEventListener("click", prepareOfflineSession);
    $("#prepareOfflineMasterButton").addEventListener("click", prepareOfflineSession);
    $("#cancelDeleteSessionButton").addEventListener("click", closeDeleteSessionConfirm);
    $("#confirmDeleteSessionButton").addEventListener("click", confirmDeleteMasterSession);
    $("#deleteSessionConfirmBackdrop").addEventListener("click", (event) => {
      if (event.target.id === "deleteSessionConfirmBackdrop") closeDeleteSessionConfirm();
    });
    $("#inviteUserSearch").addEventListener("input", debounce(searchInviteUsers, 350));
    $$("[data-theme-mode][data-theme-token]").forEach((input) => {
      input.addEventListener("input", () => applyThemePalette(paletteFromControls()));
      input.addEventListener("change", () => saveThemePalette(paletteFromControls()));
    });
    $("#themeButton")?.addEventListener("click", () => window.setTimeout(() => applyThemePalette(), 0));
    $("#adminCreateUserButton").addEventListener("click", createAdminUser);
    $$("[data-nav-target]").forEach((button) => {
      button.addEventListener("click", () => navigate(button.dataset.navTarget));
    });
    $("#characterView").addEventListener("input", queueCharacterSave, true);
    $("#characterView").addEventListener("change", queueCharacterSave, true);
    $("#characterView").addEventListener("click", queueCharacterSave);
  }

  function debounce(callback, delay) {
    let timer = null;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => callback(...args), delay);
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('"', "&quot;");
  }

  function formatTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  }

  async function init() {
    if (!isOfflineLocalAccessActive()) localStorage.removeItem(OFFLINE_PROFILE_ID_KEY);
    bindEvents();
    showView("auth");
    registerServiceWorker();
    await openOfflineDb().catch(() => {
      app.offlineReady = false;
      setStatus("Archivio offline non disponibile");
    });

    window.addEventListener("online", () => {
      app.isOnline = true;
      setStatus("Connessione tornata: sincronizzo...");
      scheduleSyncQueue(300);
    });
    window.addEventListener("offline", () => {
      app.isOnline = false;
      setStatus("Offline: uso dati locali");
      setCharacterSyncBanner("Offline", "Le modifiche restano sul dispositivo.");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveLocalCharacterSnapshot("pending").catch(() => null);
      if (document.visibilityState === "visible") scheduleSyncQueue(500);
    });
    window.addEventListener("pagehide", clearOfflineLocalAccessOnPageExit);
    if (sessionStorage.getItem(OFFLINE_ACCESS_RELOAD_KEY) === "1") sessionStorage.removeItem(OFFLINE_ACCESS_RELOAD_KEY);

    const hasClient = await ensureSupabaseClient();
    if (!hasClient) {
      await routeAfterAuth();
      if (!app.sessionToken) $("#loginStatus").textContent = "Supabase non configurato.";
      return;
    }

    await routeAfterAuth();
    scheduleSyncQueue(1200);
  }

  init().catch(() => {
    showView("auth");
    setText("#loginStatus", "Avvio non riuscito. Riprova online.");
  });
})();
