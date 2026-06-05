(() => {
  const STORAGE_KEY = "dnd-mobile-character-v1";
  const SESSION_ID_KEY = "dnd-mobile-session-id-v1";
  const CHARACTER_ID_KEY = "dnd-mobile-character-id-v1";
  const APP_VERSION = "1.2.0";

  const app = {
    client: null,
    user: null,
    profile: null,
    sessions: [],
    invites: [],
    currentSession: null,
    currentRole: "",
    saveTimer: null,
    config: window.DND_APP_CONFIG || {},
  };

  const $ = (selector) => document.querySelector(selector);

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

  function selectedSessionId() {
    return localStorage.getItem(SESSION_ID_KEY) || "";
  }

  function selectedCharacterId() {
    return localStorage.getItem(CHARACTER_ID_KEY) || "";
  }

  function setStatus(message) {
    const status = $("#syncStatus");
    const loginStatus = $("#loginStatus");
    if (status) status.textContent = message;
    if (loginStatus && !app.user) loginStatus.textContent = message;
  }

  function profileName(profile = app.profile) {
    return profile?.display_name || profile?.username || app.user?.email || "Utente";
  }

  function showView(viewName) {
    $("#authView").hidden = viewName !== "auth";
    $("#sessionView").hidden = viewName !== "sessions";
    $("#characterView").hidden = viewName !== "character";
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
    document.querySelectorAll("[data-session-name]").forEach((element) => {
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
          .map(
            (member) => `
              <article class="session-card">
                <div>
                  <strong>${escapeHtml(member.session.name)}</strong>
                  <small>${member.role === "master" ? "Master" : "Giocatore"}</small>
                </div>
                <button class="small-button" data-open-session="${member.session.id}" type="button">Apri</button>
              </article>
            `
          )
          .join("")
      : `<div class="empty-state">Nessuna sessione attiva.</div>`;
    list.querySelectorAll("[data-open-session]").forEach((button) => {
      button.addEventListener("click", () => openSession(button.dataset.openSession));
    });
  }

  function renderInvites(target = $("#inviteList")) {
    if (!target) return;
    const pending = app.invites.filter((invite) => invite.status === "pending");
    const count = target.id === "drawerInviteList" ? $("#drawerInviteCount") : $("#inviteCount");
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
    $("#drawerUserName").textContent = profileName();
    $("#drawerUserEmail").textContent = app.user?.email || "";
    $("#sessionUserName").textContent = profileName();
    $("#currentSessionRole").textContent = app.currentRole === "master" ? "Master" : app.currentRole || "-";
    $("#adminPanel").hidden = app.profile?.role !== "admin";
    $("#sessionMasterTools").hidden = !(app.currentRole === "master" || app.profile?.role === "admin");
    renderInvites($("#drawerInviteList"));
    if (app.profile?.role === "admin") {
      loadAdminData();
    }
  }

  async function loadProfile() {
    const { data, error } = await app.client
      .from("profiles")
      .select("id, username, display_name, role")
      .eq("id", app.user.id)
      .single();
    app.profile = error ? { id: app.user.id, username: app.user.email, display_name: app.user.email, role: "user" } : data;
  }

  async function loadSessionsAndInvites() {
    const { data: memberships } = await app.client
      .from("session_members")
      .select("role, sessions(id, name, owner_id, created_at)")
      .eq("user_id", app.user.id)
      .order("created_at", { ascending: false });
    app.sessions = (memberships || []).filter((member) => member.sessions).map((member) => ({
      role: member.role,
      session: member.sessions,
    }));

    const { data: invites } = await app.client
      .from("session_invites")
      .select("id, status, created_at, session_id, sessions(id, name)")
      .eq("invitee_id", app.user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    app.invites = invites || [];
  }

  async function routeAfterAuth() {
    if (!app.user) {
      showView("auth");
      closeDrawer();
      return;
    }

    await loadProfile();
    await loadSessionsAndInvites();
    renderSessionList();
    renderInvites($("#inviteList"));
    renderDrawer();

    const sessionId = selectedSessionId();
    if (!sessionId) {
      showView("sessions");
      closeDrawer();
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
    await loadCharacter(app.currentSession);
    showView("character");
    renderDrawer();
  }

  async function loadSessionForAdmin(sessionId) {
    if (app.profile?.role !== "admin") return null;
    const { data } = await app.client.from("sessions").select("id, name, owner_id, created_at").eq("id", sessionId).single();
    return data || null;
  }

  async function createSessionFromList() {
    const input = $("#newSessionName");
    const name = input.value.trim() || "Nuova sessione";
    const { data, error } = await app.client
      .from("sessions")
      .insert({ name, owner_id: app.user.id })
      .select("id, name, owner_id, created_at")
      .single();
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

    let query = app.client
      .from("characters")
      .select("id, name, data, updated_at")
      .eq("session_id", session.id)
      .eq("owner_id", app.user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (currentCharacterId) {
      query = app.client.from("characters").select("id, name, data, updated_at").eq("id", currentCharacterId).limit(1);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length) {
      const character = data[0];
      localStorage.setItem(CHARACTER_ID_KEY, character.id);
      setState({ ...character.data, activeSessionId: session.id, session: session.name, appVersion: APP_VERSION });
      window.location.reload();
      return;
    }

    const blank = blankCharacterData(session);
    const { data: created, error: createError } = await app.client
      .from("characters")
      .insert({
        session_id: session.id,
        owner_id: app.user.id,
        name: "Personaggio senza nome",
        data: blank,
      })
      .select("id")
      .single();
    if (!createError && created) {
      localStorage.setItem(CHARACTER_ID_KEY, created.id);
    }
    setState(blank);
    window.location.reload();
  }

  function queueCharacterSave() {
    if (!app.user || !app.currentSession) return;
    window.clearTimeout(app.saveTimer);
    app.saveTimer = window.setTimeout(saveCharacter, 900);
  }

  async function saveCharacter() {
    const sessionId = selectedSessionId();
    const characterId = selectedCharacterId();
    if (!app.user || !sessionId || !characterId) return;
    const state = { ...getState(), activeSessionId: sessionId, appVersion: APP_VERSION };
    const { error } = await app.client
      .from("characters")
      .update({
        name: state.name || "Personaggio senza nome",
        data: state,
      })
      .eq("id", characterId);
    setStatus(error ? "Errore salvataggio" : "Salvato");
    await syncCustomSpells(state);
  }

  async function syncCustomSpells(state = getState()) {
    const sessionId = selectedSessionId();
    if (!sessionId || !app.user) return;
    const customSpells = Array.isArray(state.customSpells) ? state.customSpells : [];
    await app.client.from("custom_spells").delete().eq("session_id", sessionId).eq("owner_id", app.user.id);
    if (!customSpells.length) return;
    await app.client.from("custom_spells").insert(
      customSpells.map((spell) => ({
        session_id: sessionId,
        owner_id: app.user.id,
        name: spell.name_it || spell.name,
        class_names: spell.classes || [],
        level: Number(spell.level) || 0,
        source: spell.source || "Custom",
        data: spell,
      }))
    );
  }

  async function acceptInvite(inviteId) {
    const { data, error } = await app.client.rpc("accept_session_invite", { target_invite_id: inviteId });
    if (error) {
      setStatus("Invito non accettato");
      return;
    }
    await openSession(data);
  }

  async function declineInvite(inviteId) {
    await app.client.rpc("decline_session_invite", { target_invite_id: inviteId });
    await loadSessionsAndInvites();
    renderInvites($("#inviteList"));
    renderDrawer();
  }

  async function changeOwnPassword() {
    const input = $("#ownNewPassword");
    const password = input.value;
    if (!password || password.length < 6) {
      setStatus("Password troppo corta");
      return;
    }
    const { error } = await app.client.auth.updateUser({ password });
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
    const { data, error } = await app.client
      .from("profiles")
      .select("id, username, display_name")
      .ilike("username", `%${term}%`)
      .limit(8);
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
    const { error } = await app.client.from("session_invites").insert({
      session_id: app.currentSession.id,
      inviter_id: app.user.id,
      invitee_id: userId,
    });
    setStatus(error ? "Invito non inviato" : "Invito inviato");
  }

  async function loadAdminData() {
    await Promise.all([loadAdminUsers(), loadAdminSessions()]);
  }

  async function loadAdminUsers() {
    const list = $("#adminUsersList");
    const { data, error } = await app.client
      .from("profiles")
      .select("id, username, display_name, role, created_at")
      .order("username", { ascending: true });
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
    const { data, error } = await app.client.from("sessions").select("id, name, owner_id, created_at").order("created_at", { ascending: false });
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
    const email = $("#adminNewUserEmail").value.trim();
    const username = $("#adminNewUsername").value.trim();
    const displayName = $("#adminNewDisplayName").value.trim() || username;
    const password = $("#adminNewPassword").value;
    if (!email || !username || password.length < 6) {
      setStatus("Dati account incompleti");
      return;
    }

    const memoryStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    const signupClient = window.supabase.createClient(app.config.supabaseUrl, app.config.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: memoryStorage,
      },
    });

    const { data, error } = await signupClient.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: displayName } },
    });
    if (error || !data.user) {
      setStatus("Account non creato");
      return;
    }

    await app.client
      .from("profiles")
      .update({ username, display_name: displayName, role: "user" })
      .eq("id", data.user.id);

    ["adminNewUserEmail", "adminNewUsername", "adminNewDisplayName", "adminNewPassword"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.value = "";
    });
    setStatus("Account creato");
    await loadAdminUsers();
  }

  async function updateUserRole(userId, role) {
    const { error } = await app.client.from("profiles").update({ role }).eq("id", userId);
    setStatus(error ? "Ruolo non cambiato" : "Ruolo aggiornato");
    await loadAdminUsers();
  }

  async function deleteAdminSession(sessionId) {
    const { error } = await app.client.from("sessions").delete().eq("id", sessionId);
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
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    if (!email || !password) {
      $("#loginStatus").textContent = "Inserisci email e password.";
      return;
    }
    $("#loginStatus").textContent = "Accesso...";
    const { data, error } = await app.client.auth.signInWithPassword({ email, password });
    if (error) {
      $("#loginStatus").textContent = "Accesso non riuscito.";
      return;
    }
    app.user = data.user;
    $("#loginPassword").value = "";
    await routeAfterAuth();
  }

  async function signOut() {
    await app.client.auth.signOut();
    app.user = null;
    app.profile = null;
    app.currentSession = null;
    app.currentRole = "";
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(CHARACTER_ID_KEY);
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
    $("#closeDrawerButton").addEventListener("click", closeDrawer);
    $("#drawerBackdrop").addEventListener("click", closeDrawer);
    $("#logoutButton").addEventListener("click", signOut);
    $("#backToSessionsButton").addEventListener("click", () => {
      localStorage.removeItem(SESSION_ID_KEY);
      localStorage.removeItem(CHARACTER_ID_KEY);
      closeDrawer();
      routeAfterAuth();
    });
    $("#changeOwnPasswordButton").addEventListener("click", changeOwnPassword);
    $("#inviteUserSearch").addEventListener("input", debounce(searchInviteUsers, 350));
    $("#adminCreateUserButton").addEventListener("click", createAdminUser);
    $("#characterView").addEventListener("input", queueCharacterSave, true);
    $("#characterView").addEventListener("change", queueCharacterSave, true);
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

  async function init() {
    bindEvents();
    showView("auth");

    if (!app.config.supabaseUrl || !app.config.supabaseAnonKey || !window.supabase?.createClient) {
      $("#loginStatus").textContent = "Supabase non configurato.";
      return;
    }

    app.client = window.supabase.createClient(app.config.supabaseUrl, app.config.supabaseAnonKey);
    const { data } = await app.client.auth.getSession();
    app.user = data.session?.user || null;
    app.client.auth.onAuthStateChange((_event, session) => {
      app.user = session?.user || null;
      routeAfterAuth();
    });
    await routeAfterAuth();
  }

  init();
})();
