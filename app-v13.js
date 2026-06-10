(() => {
  const STORAGE_KEY = "dnd-mobile-character-v1";
  const APP_TOKEN_KEY = "dnd-app-account-token-v1";
  const SESSION_ID_KEY = "dnd-mobile-session-id-v1";
  const CHARACTER_ID_KEY = "dnd-mobile-character-id-v1";
  const MASTER_PREVIEW_KEY = "dnd-master-character-preview-v1";
  const APP_VERSION = "1.6.0";
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
    config: window.DND_APP_CONFIG || {},
    readOnlyCharacter: false,
    sessionToken: localStorage.getItem(APP_TOKEN_KEY) || "",
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
    return localStorage.getItem(SESSION_ID_KEY) || "";
  }

  function selectedCharacterId() {
    return localStorage.getItem(CHARACTER_ID_KEY) || "";
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
  }

  function setStatus(message) {
    setText("#syncStatus", message);
    if (!app.user) setText("#loginStatus", message);
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
      slots: Array.from({ length: 9 }, (_, index) => ({ level: index + 1, current: 0, max: 0 })),
      knownSpellIds: [],
      preparedSpellIds: [],
      customSpells: [],
      proficienciesLanguages: "",
      equipment: "",
      equipmentItems: [],
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
    renderSettingsMasterSessions();
  }

  function renderSettingsMasterSessions() {
    const panel = $("#masterSessionSettingsPanel");
    const list = $("#masterSessionSettingsList");
    if (!panel || !list) return;
    const masterSessions = app.sessions.filter((item) => item.role === "master" && item.session);
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
    const { data, error } = await app.client.rpc("app_get_shell", { app_token: app.sessionToken });
    if (error || !data?.profile) {
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
    app.sessions = data.sessions || [];
    app.invites = data.invites || [];
    applyThemePalette(app.profile?.theme_palette || DEFAULT_THEME_PALETTE);
  }

  async function loadSessionsAndInvites() {
    const { data, error } = await app.client.rpc("app_get_shell", { app_token: app.sessionToken });
    if (error || !data?.profile) throw error || new Error("Sessione non valida");
    app.profile = data.profile;
    app.user = data.profile;
    app.sessions = data.sessions || [];
    app.invites = data.invites || [];
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
    const { data } = await app.client.rpc("app_get_session_for_admin", { app_token: app.sessionToken, target_session_id: sessionId });
    return data || null;
  }

  async function createSessionFromList() {
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
    const currentCharacterId = selectedCharacterId();
    if (localState.activeSessionId === session.id && currentCharacterId) return;

    const { data: character, error } = await app.client.rpc("app_load_character", {
      app_token: app.sessionToken,
      target_session_id: session.id,
      target_character_id: currentCharacterId || null,
    });
    if (!error && character?.id) {
      localStorage.setItem(CHARACTER_ID_KEY, character.id);
      setState({ ...character.data, activeSessionId: session.id, session: session.name, appVersion: APP_VERSION });
      window.location.reload();
      return;
    }

    const blank = blankCharacterData(session);
    const { data: created, error: createError } = await app.client.rpc("app_create_character", {
      app_token: app.sessionToken,
      target_session_id: session.id,
      character_data: blank,
    });
    if (!createError && created) {
      localStorage.setItem(CHARACTER_ID_KEY, created.id);
    }
    setState(blank);
    window.location.reload();
  }

  function queueCharacterSave() {
    if (!app.user || !app.currentSession || app.currentRole === "master" || app.readOnlyCharacter) return;
    window.clearTimeout(app.saveTimer);
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
    const { error } = await app.client.rpc("app_update_character", {
      app_token: app.sessionToken,
      target_character_id: characterId,
      character_data: state,
    });
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
    return { ok: true, message: "Sincronizzato con Supabase" };
  }

  async function syncCustomSpells(state = getState()) {
    const sessionId = selectedSessionId();
    if (!sessionId || !app.user) return { ok: false, message: "Sessione non disponibile" };
    const customSpells = Array.isArray(state.customSpells) ? state.customSpells : [];
    const { error } = await app.client.rpc("app_sync_custom_spells", {
      app_token: app.sessionToken,
      target_session_id: sessionId,
      custom_spells: customSpells,
    });
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
          syncStatus: "Dati riletti dal database al momento dell'esportazione",
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
    const spells = [...(Array.isArray(window.DND_SPELLS) ? window.DND_SPELLS : []), ...customSpells];
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
    const { data, error } = await app.client.rpc("app_list_master_characters", {
      app_token: app.sessionToken,
      target_session_id: sessionId,
    });
    if (error) {
      app.masterCharacters = [];
      renderMasterCharacters();
      return;
    }

    app.masterCharacters = data || [];
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
        <div class="hp-meter" aria-label="Punti ferita">
          <span style="width:${hpPercent}%"></span>
        </div>
        <div class="master-stat-grid">
          <span>PF <strong>${hpCurrent}/${hpMax}</strong></span>
          <span>Temp <strong>${hpTemp}</strong></span>
          <span>CA <strong>${escapeHtml(data.armorClass ?? "-")}</strong></span>
          <span>TS morte <strong>${Number(data.deathSuccesses) || 0}/${Number(data.deathFailures) || 0}</strong></span>
        </div>
        <div class="master-card-actions">
          <small class="live-line">Aggiornato ${formatTime(character.updated_at)}</small>
          <button class="small-button" data-open-character-sheet="${escapeAttribute(character.id)}" type="button">Apri scheda</button>
        </div>
      </article>
    `;
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
    if (!app.client) {
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
    const { data, error } = await app.client.rpc("app_login_account", { target_username: username, target_password: password });
    if (error) {
      $("#loginStatus").textContent = "Accesso non riuscito.";
      return;
    }
    app.sessionToken = data.token;
    localStorage.setItem(APP_TOKEN_KEY, app.sessionToken);
    app.user = data.profile;
    app.profile = data.profile;
    $("#loginPassword").value = "";
    await routeAfterAuth();
  }

  async function signOut() {
    stopMasterRealtime();
    if (app.sessionToken) {
      await app.client.rpc("app_logout_account", { app_token: app.sessionToken });
    }
    app.user = null;
    app.profile = null;
    app.sessionToken = "";
    app.currentSession = null;
    app.currentRole = "";
    app.masterCharacters = [];
    localStorage.removeItem(APP_TOKEN_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(CHARACTER_ID_KEY);
    localStorage.removeItem(MASTER_PREVIEW_KEY);
    closeDrawer();
    showView("auth");
  }

  function bindEvents() {
    $("#loginSubmit").addEventListener("click", signIn);
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
    $("#exportSessionPdfButton").addEventListener("click", exportMasterSessionPdf);
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
    bindEvents();
    showView("auth");

    if (!app.config.supabaseUrl || !app.config.supabaseAnonKey || !window.supabase?.createClient) {
      $("#loginStatus").textContent = "Supabase non configurato.";
      return;
    }

    app.client = window.supabase.createClient(app.config.supabaseUrl, app.config.supabaseAnonKey);
    await routeAfterAuth();
  }

  init();
})();
