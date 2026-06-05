(() => {
  if (window.DND_SYNC_BUILTIN) return;

  const STORAGE_KEY = "dnd-mobile-character-v1";
  const SESSION_ID_KEY = "dnd-mobile-session-id-v1";
  const CHARACTER_ID_KEY = "dnd-mobile-character-id-v1";
  const APP_VERSION = "1.1.0";

  const cloud = {
    client: null,
    user: null,
    sessionId: localStorage.getItem(SESSION_ID_KEY) || "",
    characterId: localStorage.getItem(CHARACTER_ID_KEY) || "",
    saveTimer: null,
    ready: false,
    loadingRemote: false,
  };

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

  function setStatus(message) {
    const status = document.getElementById("syncStatus");
    if (status) status.textContent = message;
  }

  function updateSessionTitle(name) {
    const title = name || getState().session || "Sessione senza nome";
    const header = document.querySelector("[data-session-name]");
    const input = document.getElementById("sessionNameInput");
    if (header) header.textContent = title;
    if (input && document.activeElement !== input) input.value = title;
  }

  function renderCloudUi() {
    const signedOut = document.getElementById("authSignedOut");
    const signedIn = document.getElementById("authSignedIn");
    const email = document.getElementById("accountEmail");
    if (!signedOut || !signedIn) return;
    signedOut.hidden = Boolean(cloud.user);
    signedIn.hidden = !cloud.user;
    if (email) email.textContent = cloud.user?.email || "Non connesso";
    updateSessionTitle();
  }

  function credentials() {
    return {
      email: document.getElementById("authEmail")?.value.trim() || "",
      password: document.getElementById("authPassword")?.value || "",
    };
  }

  function cloudReady() {
    return Boolean(cloud.client && cloud.user && cloud.sessionId);
  }

  function queueSave() {
    if (cloud.loadingRemote || !cloudReady()) return;
    window.clearTimeout(cloud.saveTimer);
    cloud.saveTimer = window.setTimeout(() => saveCharacter(), 900);
  }

  function patchLocalSave() {
    if (typeof window.saveState === "function" && !window.saveState.__cloudPatched) {
      const original = window.saveState;
      const patched = function patchedSaveState(...args) {
        const result = original.apply(this, args);
        queueSave();
        return result;
      };
      patched.__cloudPatched = true;
      window.saveState = patched;
    }

    document.addEventListener(
      "input",
      () => {
        window.setTimeout(queueSave, 30);
      },
      true
    );
    document.addEventListener(
      "change",
      () => {
        window.setTimeout(queueSave, 30);
      },
      true
    );
  }

  async function signIn() {
    if (!cloud.client) {
      setStatus("Config assente");
      return;
    }
    const { email, password } = credentials();
    if (!email || !password) {
      setStatus("Email e password");
      return;
    }
    setStatus("Accesso...");
    const { data, error } = await cloud.client.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("Accesso non riuscito");
      return;
    }
    cloud.user = data.user;
    await afterAuthChanged();
  }

  async function signUp() {
    if (!cloud.client) {
      setStatus("Config assente");
      return;
    }
    const { email, password } = credentials();
    if (!email || !password) {
      setStatus("Email e password");
      return;
    }
    setStatus("Creo account...");
    const { data, error } = await cloud.client.auth.signUp({
      email,
      password,
      options: { data: { display_name: email.split("@")[0] } },
    });
    if (error) {
      setStatus("Account non creato");
      return;
    }
    cloud.user = data.user;
    if (data.session) {
      await afterAuthChanged();
    } else {
      renderCloudUi();
      setStatus("Controlla email");
    }
  }

  async function signOut() {
    if (!cloud.client) return;
    await cloud.client.auth.signOut();
    cloud.user = null;
    cloud.sessionId = "";
    cloud.characterId = "";
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(CHARACTER_ID_KEY);
    renderCloudUi();
    renderMasterMessages([]);
    setStatus("Solo dispositivo");
  }

  async function afterAuthChanged() {
    renderCloudUi();
    if (!cloud.user) {
      setStatus(cloud.ready ? "Solo dispositivo" : "Config assente");
      return;
    }
    setStatus(cloud.sessionId ? "Connesso" : "Connesso, crea sessione");
    if (cloud.sessionId) {
      await loadSession();
      await loadCharacter();
      await loadCustomSpells();
      await loadMasterMessages();
    }
  }

  async function createOrOpenSession() {
    if (!cloud.client || !cloud.user) {
      setStatus("Accedi prima");
      return;
    }

    const state = getState();
    const name = document.getElementById("sessionNameInput")?.value.trim() || state.session || "Nuova sessione";
    state.session = name;
    setState(state);
    updateSessionTitle(name);
    setStatus("Sessione...");

    if (cloud.sessionId) {
      const { data, error } = await cloud.client
        .from("sessions")
        .update({ name })
        .eq("id", cloud.sessionId)
        .select("id,name")
        .single();
      if (!error && data) {
        setStatus("Sessione aperta");
        await saveCharacter();
        await loadMasterMessages();
        return;
      }
    }

    const { data, error } = await cloud.client
      .from("sessions")
      .insert({ name, owner_id: cloud.user.id })
      .select("id,name")
      .single();
    if (error) {
      setStatus("Errore sessione");
      return;
    }

    cloud.sessionId = data.id;
    localStorage.setItem(SESSION_ID_KEY, data.id);
    state.session = data.name;
    setState(state);
    updateSessionTitle(data.name);
    setStatus("Sessione creata");
    await saveCharacter();
    await syncCustomSpells();
    await loadMasterMessages();
  }

  async function loadSession() {
    if (!cloudReady()) return;
    const { data, error } = await cloud.client.from("sessions").select("id,name").eq("id", cloud.sessionId).single();
    if (error || !data) return;
    const state = getState();
    state.session = data.name;
    setState(state);
    updateSessionTitle(data.name);
  }

  async function loadCharacter() {
    if (!cloudReady()) return;
    let query = cloud.client
      .from("characters")
      .select("id,name,data,updated_at")
      .eq("session_id", cloud.sessionId)
      .eq("owner_id", cloud.user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (cloud.characterId) {
      query = cloud.client.from("characters").select("id,name,data,updated_at").eq("id", cloud.characterId).limit(1);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data) || !data.length) {
      await saveCharacter();
      return;
    }

    const character = data[0];
    cloud.characterId = character.id;
    localStorage.setItem(CHARACTER_ID_KEY, character.id);
    cloud.loadingRemote = true;
    setState(character.data || {});
    cloud.loadingRemote = false;
    setStatus("Scheda caricata");
    window.location.reload();
  }

  async function saveCharacter() {
    if (!cloudReady()) {
      setStatus(cloud.user ? "Crea sessione" : "Solo dispositivo");
      return;
    }

    const state = getState();
    const payload = {
      name: state.name || "Personaggio senza nome",
      data: { ...state, appVersion: APP_VERSION },
    };

    setStatus("Salvataggio...");
    if (!cloud.characterId) {
      const { data, error } = await cloud.client
        .from("characters")
        .insert({
          ...payload,
          session_id: cloud.sessionId,
          owner_id: cloud.user.id,
        })
        .select("id")
        .single();
      if (error) {
        setStatus("Errore salvataggio");
        return;
      }
      cloud.characterId = data.id;
      localStorage.setItem(CHARACTER_ID_KEY, data.id);
      await syncCustomSpells();
      setStatus("Salvato");
      return;
    }

    const { error } = await cloud.client.from("characters").update(payload).eq("id", cloud.characterId);
    if (!error) await syncCustomSpells();
    setStatus(error ? "Errore salvataggio" : "Salvato");
  }

  function spellFromRow(row) {
    const data = row.data && typeof row.data === "object" ? row.data : {};
    return {
      ...data,
      id: data.id || `custom-${row.id}`,
      name: data.name || row.name,
      name_it: data.name_it || data.name || row.name,
      level: Number(data.level ?? row.level),
      level_it: data.level_it || (Number(row.level) === 0 ? "Trucchetto" : `Livello ${row.level}`),
      classes: Array.isArray(data.classes) && data.classes.length ? data.classes : row.class_names || [],
      source: data.source || row.source || "Custom",
      custom: true,
    };
  }

  async function loadCustomSpells() {
    if (!cloudReady()) return;
    const { data, error } = await cloud.client
      .from("custom_spells")
      .select("id,name,class_names,level,source,data")
      .eq("session_id", cloud.sessionId);
    if (error || !Array.isArray(data) || !data.length) {
      await syncCustomSpells();
      return;
    }

    const state = getState();
    const byId = new Map((state.customSpells || []).map((spell) => [spell.id, spell]));
    data.map(spellFromRow).forEach((spell) => byId.set(spell.id, spell));
    state.customSpells = [...byId.values()];
    setState(state);
  }

  async function syncCustomSpells() {
    if (!cloudReady()) return;
    const state = getState();
    const customSpells = Array.isArray(state.customSpells) ? state.customSpells : [];
    const { error: deleteError } = await cloud.client
      .from("custom_spells")
      .delete()
      .eq("session_id", cloud.sessionId)
      .eq("owner_id", cloud.user.id);
    if (deleteError) {
      setStatus("Errore incantesimi");
      return;
    }
    if (!customSpells.length) return;
    const rows = customSpells.map((spell) => ({
      session_id: cloud.sessionId,
      owner_id: cloud.user.id,
      name: spell.name_it || spell.name,
      class_names: spell.classes || [],
      level: Number(spell.level) || 0,
      source: spell.source || "Custom",
      data: spell,
    }));
    const { error } = await cloud.client.from("custom_spells").insert(rows);
    if (error) setStatus("Errore incantesimi");
  }

  function renderMasterMessages(messages) {
    const list = document.getElementById("masterMessages");
    const count = document.getElementById("masterMessageCount");
    if (!list || !count) return;
    count.textContent = String(messages.length);
    list.innerHTML = messages.length
      ? messages
          .map(
            (message) => `
              <article class="master-message">
                <time>${new Date(message.created_at).toLocaleString("it-IT")}</time>
                <p>${String(message.body || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>
              </article>
            `
          )
          .join("")
      : `<div class="empty-state">Nessun messaggio.</div>`;
  }

  async function loadMasterMessages() {
    if (!cloudReady()) {
      renderMasterMessages([]);
      return;
    }
    const { data, error } = await cloud.client
      .from("master_messages")
      .select("body,created_at")
      .eq("session_id", cloud.sessionId)
      .order("created_at", { ascending: false })
      .limit(5);
    renderMasterMessages(error ? [] : data || []);
  }

  function bindControls() {
    document.getElementById("loginButton")?.addEventListener("click", signIn);
    document.getElementById("signupButton")?.addEventListener("click", signUp);
    document.getElementById("logoutButton")?.addEventListener("click", signOut);
    document.getElementById("createSessionButton")?.addEventListener("click", createOrOpenSession);
    document.getElementById("saveCloudButton")?.addEventListener("click", saveCharacter);
    document.getElementById("sessionNameInput")?.addEventListener("input", (event) => {
      const state = getState();
      state.session = event.target.value;
      setState(state);
      updateSessionTitle(state.session);
      queueSave();
    });
  }

  async function init() {
    bindControls();
    patchLocalSave();
    renderCloudUi();

    const config = window.DND_APP_CONFIG || {};
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      setStatus("Solo dispositivo");
      return;
    }
    if (!window.supabase?.createClient) {
      setStatus("Supabase non caricato");
      return;
    }

    cloud.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    cloud.ready = true;
    const { data } = await cloud.client.auth.getSession();
    cloud.user = data.session?.user || null;
    cloud.client.auth.onAuthStateChange((_event, session) => {
      cloud.user = session?.user || null;
      afterAuthChanged();
    });
    await afterAuthChanged();
  }

  init();
})();
