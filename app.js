const STORAGE_KEY = "dnd-mobile-character-v1";
const THEME_KEY = "dnd-mobile-theme-v1";

const classLabelsIt = {
  Artificer: "Artefice",
  Bard: "Bardo",
  Cleric: "Chierico",
  Druid: "Druido",
  Paladin: "Paladino",
  Ranger: "Ranger",
  Sorcerer: "Stregone",
  Warlock: "Warlock",
  Wizard: "Mago",
};

const classAliases = {
  artefice: "Artificer",
  artificer: "Artificer",
  bardo: "Bard",
  bard: "Bard",
  chierico: "Cleric",
  cleric: "Cleric",
  druido: "Druid",
  druid: "Druid",
  paladino: "Paladin",
  paladin: "Paladin",
  ranger: "Ranger",
  stregone: "Sorcerer",
  sorcerer: "Sorcerer",
  warlock: "Warlock",
  mago: "Wizard",
  wizard: "Wizard",
};

const abilities = [
  ["strength", "For"],
  ["dexterity", "Des"],
  ["constitution", "Cos"],
  ["intelligence", "Int"],
  ["wisdom", "Sag"],
  ["charisma", "Car"],
];

const saves = [
  ["strength", "Forza"],
  ["dexterity", "Destrezza"],
  ["constitution", "Costituzione"],
  ["intelligence", "Intelligenza"],
  ["wisdom", "Saggezza"],
  ["charisma", "Carisma"],
];

const skills = [
  ["acrobatics", "Acrobazia", "dexterity"],
  ["animalHandling", "Addestrare Animali", "wisdom"],
  ["arcana", "Arcano", "intelligence"],
  ["athletics", "Atletica", "strength"],
  ["deception", "Inganno", "charisma"],
  ["history", "Storia", "intelligence"],
  ["insight", "Intuizione", "wisdom"],
  ["intimidation", "Intimidire", "charisma"],
  ["investigation", "Indagare", "intelligence"],
  ["medicine", "Medicina", "wisdom"],
  ["nature", "Natura", "intelligence"],
  ["perception", "Percezione", "wisdom"],
  ["performance", "Intrattenere", "charisma"],
  ["persuasion", "Persuasione", "charisma"],
  ["religion", "Religione", "intelligence"],
  ["sleightOfHand", "Rapidità di Mano", "dexterity"],
  ["stealth", "Furtività", "dexterity"],
  ["survival", "Sopravvivenza", "wisdom"],
];

const conditionPresets = [
  "Prono",
  "Avvelenato",
  "Stordito",
  "Accecato",
  "Affascinato",
  "Spaventato",
  "Incapacitato",
  "Invisibile",
  "Paralizzato",
  "Pietrificato",
  "Rallentato",
  "A terra",
  "Concentrato",
];

const defaultState = {
  session: "La Miniera Perduta",
  name: "Aelar",
  race: "Mezzelfo",
  classLevel: "Ladro 3",
  hpCurrent: 24,
  hpMax: 27,
  hpTemp: 0,
  armorClass: 15,
  initiative: "+3",
  speed: "9 m",
  deathSuccesses: 0,
  deathFailures: 0,
  deathSuccessChecks: [],
  deathFailureChecks: [],
  conditions: [],
  hitDice: "2d8",
  proficiency: 2,
  inspiration: false,
  passivePerception: 14,
  spellDc: 13,
  spellAttack: "+5",
  abilities: {
    strength: 10,
    dexterity: 16,
    constitution: 13,
    intelligence: 12,
    wisdom: 14,
    charisma: 15,
  },
  saveProficiencies: {
    dexterity: true,
    intelligence: true,
  },
  skillProficiencies: {
    acrobatics: true,
    deception: true,
    perception: true,
    stealth: true,
    sleightOfHand: true,
  },
  attacks: [
    { name: "Stocco", bonus: "+5", damage: "1d8+3 perforante" },
    { name: "Arco corto", bonus: "+5", damage: "1d6+3 perforante" },
    { name: "Dardo di Fuoco", bonus: "+5", damage: "1d10 fuoco" },
  ],
  slots: [
    { level: 1, current: 2, max: 2 },
  ],
  cantrips: "Mano Magica\nIllusione Minore",
  spells: "Caduta Morbida\nCharme su Persone",
  knownSpellIds: [],
  preparedSpellIds: [],
  customSpells: [],
  proficienciesLanguages: "Arnesi da scasso, strumenti da gioco; Comune, Elfico, Nanico",
  equipment: "Armatura di cuoio, stocco, arco corto, faretra, arnesi da scasso",
  equipmentItems: [
    { name: "Armatura di cuoio", description: "Armatura leggera. CA 11 + modificatore di Destrezza." },
    { name: "Stocco", description: "Arma accurata. 1d8 danni perforanti." },
    { name: "Arco corto", description: "Gittata 24/96 m. 1d6 danni perforanti." },
    { name: "Faretra", description: "Contiene fino a 20 frecce." },
    { name: "Arnesi da scasso", description: "Usati per serrature, trappole e piccoli meccanismi." },
  ],
  resources: [
    { name: "Frecce", current: 17, max: 20 },
  ],
  treasure: "",
  background: "Criminale",
  alignment: "Caotico Buono",
  experience: 900,
  playerName: "Claudio",
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
  featuresTraits: "Attacco Furtivo, Azione Scaltra, Scurovisione",
  backstory: "",
  allies: "",
  symbol: "",
  coinMr: 0,
  coinMa: 12,
  coinMe: 0,
  coinMo: 34,
  coinMp: 1,
};

let state = loadState();
let openEquipmentIndex = null;

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return mergeState(defaultState, stored || {});
  } catch {
    return structuredClone(defaultState);
  }
}

function mergeState(base, patch) {
  const next = structuredClone(base);
  Object.entries(patch).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && next[key]) {
      next[key] = { ...next[key], ...value };
    } else if (value !== undefined) {
      next[key] = value;
    }
  });
  if (!Array.isArray(next.equipmentItems) || next.equipmentItems.length === 0) {
    next.equipmentItems = String(next.equipment || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name, description: "" }));
  }
  if (!Array.isArray(next.knownSpellIds)) {
    next.knownSpellIds = [];
  }
  if (!Array.isArray(next.preparedSpellIds)) {
    next.preparedSpellIds = [];
  }
  if (!Array.isArray(next.customSpells)) {
    next.customSpells = [];
  }
  if (!Array.isArray(next.conditions)) {
    next.conditions = [];
  }
  if (!Array.isArray(next.resources)) {
    next.resources = [];
  }
  return next;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function signed(value) {
  const number = Number(value) || 0;
  return number >= 0 ? `+${number}` : `${number}`;
}

function abilityMod(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2);
}

function proficiency() {
  return Number(state.proficiency) || 0;
}

function totalFor(abilityKey, proficient) {
  return abilityMod(state.abilities[abilityKey]) + (proficient ? proficiency() : 0);
}

function bindFields() {
  document.querySelectorAll("[data-field]").forEach((field) => {
    const key = field.dataset.field;
    if (field.type === "checkbox") {
      field.checked = Boolean(state[key]);
      field.addEventListener("change", () => {
        state[key] = field.checked;
        saveState();
      });
      return;
    }

    field.value = state[key] ?? "";
    if (key === "hpCurrent") {
      field.max = Number(state.hpMax) || 0;
    }
    field.addEventListener("input", () => {
      state[key] = field.type === "number" ? Number(field.value) : field.value;
      if (key === "hpCurrent" || key === "hpMax") {
        clampHitPoints();
        const hpInput = document.querySelector('[data-field="hpCurrent"]');
        hpInput.value = state.hpCurrent;
        hpInput.max = state.hpMax;
      }
      saveState();
      if (key === "proficiency") {
        renderChecks();
      }
      if (key === "classLevel") {
        syncSpellClassFilter(false);
        renderSpellPicker();
      }
    });
  });
}

function clampHitPoints() {
  const max = Math.max(0, Number(state.hpMax) || 0);
  state.hpMax = max;
  state.hpCurrent = Math.min(Math.max(0, Number(state.hpCurrent) || 0), max);
}

function renderAbilities() {
  const grid = document.getElementById("abilityGrid");
  grid.innerHTML = abilities
    .map(([key, label]) => {
      const score = state.abilities[key];
      return `
        <article class="ability-card">
          <span>${label}</span>
          <div class="ability-mod" data-mod="${key}">${signed(abilityMod(score))}</div>
          <label>
            <input data-ability="${key}" type="number" inputmode="numeric" value="${score}" aria-label="${label}" />
          </label>
        </article>
      `;
    })
    .join("");

  grid.querySelectorAll("[data-ability]").forEach((input) => {
    input.addEventListener("input", () => {
      state.abilities[input.dataset.ability] = Number(input.value);
      document.querySelector(`[data-mod="${input.dataset.ability}"]`).textContent = signed(abilityMod(input.value));
      renderChecks();
      saveState();
    });
  });
}

function renderChecks() {
  const saveList = document.getElementById("saveList");
  saveList.innerHTML = saves
    .map(([key, label]) => checkRow("save", key, label, key, Boolean(state.saveProficiencies[key])))
    .join("");

  const skillList = document.getElementById("skillList");
  skillList.innerHTML = skills
    .map(([key, label, ability]) => checkRow("skill", key, label, ability, Boolean(state.skillProficiencies[key])))
    .join("");

  document.querySelectorAll("[data-prof-type]").forEach((input) => {
    input.addEventListener("change", () => {
      const bucket = input.dataset.profType === "save" ? "saveProficiencies" : "skillProficiencies";
      state[bucket][input.dataset.profKey] = input.checked;
      renderChecks();
      saveState();
    });
  });
}

function checkRow(type, key, label, ability, checked) {
  return `
    <label class="check-row">
      <input data-prof-type="${type}" data-prof-key="${key}" type="checkbox" ${checked ? "checked" : ""} />
      <span>${label} <em>${abilityLabel(ability)}</em></span>
      <strong>${signed(totalFor(ability, checked))}</strong>
    </label>
  `;
}

function abilityLabel(key) {
  return abilities.find(([abilityKey]) => abilityKey === key)?.[1] || "";
}

function renderAttacks() {
  const list = document.getElementById("attackList");
  list.innerHTML = state.attacks
    .map(
      (attack, index) => `
        <article class="attack-row">
          <label><span>Nome</span><input data-attack="${index}" data-attack-field="name" value="${escapeAttribute(attack.name)}" /></label>
          <label><span>Bonus</span><input data-attack="${index}" data-attack-field="bonus" value="${escapeAttribute(attack.bonus)}" /></label>
          <label><span>Danni / tipo</span><input data-attack="${index}" data-attack-field="damage" value="${escapeAttribute(attack.damage)}" /></label>
          <button class="remove-attack" data-remove-attack="${index}" type="button" aria-label="Rimuovi attacco" title="Rimuovi attacco">×</button>
        </article>
      `
    )
    .join("");

  list.querySelectorAll("[data-attack]").forEach((input) => {
    input.addEventListener("input", () => {
      state.attacks[Number(input.dataset.attack)][input.dataset.attackField] = input.value;
      saveState();
    });
  });

  list.querySelectorAll("[data-remove-attack]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.attacks.length === 1) return;
      state.attacks.splice(Number(button.dataset.removeAttack), 1);
      renderAttacks();
      saveState();
    });
  });
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderSlots() {
  const grid = document.getElementById("slotsGrid");
  const levelSelect = document.getElementById("slotLevelToAdd");
  const slots = Array.isArray(state.slots) ? state.slots : [];
  slots.sort((a, b) => Number(a.level) - Number(b.level));
  if (levelSelect) {
    const usedLevels = new Set(slots.map((slot) => Number(slot.level)));
    const options = Array.from({ length: 9 }, (_, index) => index + 1).filter((level) => !usedLevels.has(level));
    levelSelect.innerHTML = options.length
      ? options.map((level) => `<option value="${level}">Livello ${level}</option>`).join("")
      : `<option value="">Tutti aggiunti</option>`;
    levelSelect.disabled = !options.length;
  }
  grid.innerHTML = slots.length
    ? slots
        .map(
          (slot, index) => `
            <article class="slot-card">
              <span>Liv. ${slot.level}</span>
              <label>
                <small>RIM</small>
                <input data-slot="${index}" data-slot-field="current" type="number" inputmode="numeric" value="${slot.current}" aria-label="Slot livello ${slot.level} rimasti" />
              </label>
              <label>
                <small>MAX</small>
                <input data-slot="${index}" data-slot-field="max" type="number" inputmode="numeric" value="${slot.max}" aria-label="Slot livello ${slot.level} massimi" />
              </label>
              <button class="small-button remove-slot" data-remove-slot="${index}" type="button">Rimuovi</button>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">Nessuno slot. Aggiungi solo i livelli disponibili per il personaggio.</div>`;

  grid.querySelectorAll("[data-slot]").forEach((input) => {
    input.addEventListener("input", () => {
      state.slots[Number(input.dataset.slot)][input.dataset.slotField] = Number(input.value);
      saveState();
    });
  });

  grid.querySelectorAll("[data-remove-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      state.slots.splice(Number(button.dataset.removeSlot), 1);
      renderSlots();
      saveState();
    });
  });
}

function spellDatabase() {
  const officialSpells = Array.isArray(window.DND_SPELLS) ? window.DND_SPELLS : [];
  return [...officialSpells, ...state.customSpells];
}

function normalizedText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferSpellClass() {
  const classText = normalizedText(state.classLevel);
  const found = Object.entries(classAliases).find(([alias]) => classText.includes(alias));
  return found ? found[1] : "";
}

function resolveClassName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const alias = classAliases[normalizedText(raw)];
  return alias || raw;
}

function spellLevelLabel(level) {
  return Number(level) === 0 ? "Trucchetto" : `Livello ${level}`;
}

function populateSpellFilters() {
  const classFilter = document.getElementById("spellClassFilter");
  const levelFilter = document.getElementById("spellLevelFilter");
  const sourceFilter = document.getElementById("spellSourceFilter");
  if (!classFilter || !levelFilter || !sourceFilter) return;

  const previousClass = classFilter.value;
  const previousLevel = levelFilter.value;
  const previousSource = sourceFilter.value;
  const spells = spellDatabase();
  const classes = [...new Set(spells.flatMap((spell) => spell.classes || []))].sort((a, b) =>
    (classLabelsIt[a] || a).localeCompare(classLabelsIt[b] || b, "it")
  );
  classFilter.innerHTML = [
    `<option value="">Tutte le classi</option>`,
    ...classes.map((className) => `<option value="${escapeAttribute(className)}">${classLabelsIt[className] || className}</option>`),
  ].join("");

  const levels = [...new Set(spells.map((spell) => Number(spell.level)).filter((level) => Number.isFinite(level) && level >= 0))]
    .sort((a, b) => a - b);
  levelFilter.innerHTML = [
    `<option value="">Tutti i livelli</option>`,
    ...levels.map((level) => `<option value="${level}">${level === 0 ? "Trucchetti" : `Livello ${level}`}</option>`),
  ].join("");

  const sources = [...new Set(spells.map((spell) => spell.source).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
  sourceFilter.innerHTML = [
    `<option value="">Tutte le fonti</option>`,
    ...sources.map((source) => `<option value="${escapeAttribute(source)}">${escapeHtml(source)}</option>`),
  ].join("");

  setFilterValueIfAvailable(classFilter, previousClass);
  setFilterValueIfAvailable(levelFilter, previousLevel);
  setFilterValueIfAvailable(sourceFilter, previousSource);
  syncSpellClassFilter(true);
  populateCustomSpellDatalists(classes, levels);
}

function setFilterValueIfAvailable(select, value) {
  if (!value) return;
  if ([...select.options].some((option) => option.value === value)) {
    select.value = value;
  }
}

function populateCustomSpellDatalists(classes, levels) {
  const classOptions = document.getElementById("customSpellClassOptions");
  const levelOptions = document.getElementById("customSpellLevelOptions");
  if (classOptions) {
    classOptions.innerHTML = classes
      .map((className) => `<option value="${escapeAttribute(classLabelsIt[className] || className)}"></option>`)
      .join("");
  }
  if (levelOptions) {
    levelOptions.innerHTML = levels.map((level) => `<option value="${level}"></option>`).join("");
  }
}

function syncSpellClassFilter(onlyIfEmpty) {
  const classFilter = document.getElementById("spellClassFilter");
  if (!classFilter) return;
  if (onlyIfEmpty && classFilter.value) return;
  const inferred = inferSpellClass();
  if (inferred && [...classFilter.options].some((option) => option.value === inferred)) {
    classFilter.value = inferred;
  }
}

function renderSpellPicker() {
  const list = document.getElementById("spellList");
  const knownList = document.getElementById("knownSpellList");
  const resultCount = document.getElementById("spellResultCount");
  if (!list || !knownList || !resultCount) return;

  const spells = spellDatabase();
  const spellById = new Map(spells.map((spell) => [spell.id, spell]));
  const classValue = document.getElementById("spellClassFilter")?.value || "";
  const levelValue = document.getElementById("spellLevelFilter")?.value || "";
  const sourceValue = document.getElementById("spellSourceFilter")?.value || "";
  const searchValue = normalizedText(document.getElementById("spellSearchInput")?.value || "");
  const knownIds = new Set(state.knownSpellIds);

  const knownSpells = state.knownSpellIds.map((id) => spellById.get(id)).filter(Boolean);
  knownList.innerHTML = knownSpells.length
    ? `
      <div class="section-title compact-title">
        <span>Incantesimi del personaggio</span>
        <small>${knownSpells.length}</small>
      </div>
      <div class="known-spell-list">
        ${knownSpells.map((spell) => renderKnownSpell(spell)).join("")}
      </div>
    `
    : `<div class="empty-state">Nessun incantesimo aggiunto.</div>`;

  const filtered = spells.filter((spell) => {
    if (knownIds.has(spell.id)) return false;
    if (classValue && !(spell.classes || []).includes(classValue)) return false;
    if (levelValue !== "" && Number(spell.level) !== Number(levelValue)) return false;
    if (sourceValue && spell.source !== sourceValue) return false;
    if (searchValue) {
      const haystack = normalizedText([
        spell.name,
        spell.name_it,
        spell.school_it,
        spell.source,
        (spell.classes || []).map((className) => classLabelsIt[className] || className).join(" "),
      ].join(" "));
      if (!haystack.includes(searchValue)) return false;
    }
    return true;
  });

  resultCount.textContent = `${filtered.length} disponibili`;
  const shown = filtered.slice(0, 40);
  list.innerHTML = shown.length
    ? shown.map((spell) => renderAvailableSpell(spell)).join("")
    : `<div class="empty-state">Nessun incantesimo trovato con questi filtri.</div>`;

  if (filtered.length > shown.length) {
    list.insertAdjacentHTML("beforeend", `<div class="empty-state">Mostro i primi ${shown.length}. Usa la ricerca per restringere.</div>`);
  }

  list.querySelectorAll("[data-add-spell]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.addSpell;
      if (!state.knownSpellIds.includes(id)) {
        state.knownSpellIds.push(id);
        saveState();
        renderSpellPicker();
      }
    });
  });

  list.querySelectorAll("[data-delete-custom-spell]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteCustomSpell(button.dataset.deleteCustomSpell);
    });
  });

  knownList.querySelectorAll("[data-remove-spell]").forEach((button) => {
    button.addEventListener("click", () => {
      state.knownSpellIds = state.knownSpellIds.filter((id) => id !== button.dataset.removeSpell);
      state.preparedSpellIds = state.preparedSpellIds.filter((id) => id !== button.dataset.removeSpell);
      saveState();
      renderSpellPicker();
    });
  });

  knownList.querySelectorAll("[data-delete-custom-spell]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteCustomSpell(button.dataset.deleteCustomSpell);
    });
  });

  knownList.querySelectorAll("[data-prepared-spell]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.dataset.preparedSpell;
      if (input.checked && !state.preparedSpellIds.includes(id)) {
        state.preparedSpellIds.push(id);
      }
      if (!input.checked) {
        state.preparedSpellIds = state.preparedSpellIds.filter((spellId) => spellId !== id);
      }
      saveState();
      renderSpellPicker();
    });
  });
}

function renderAvailableSpell(spell) {
  const classNames = (spell.classes || []).map((className) => classLabelsIt[className] || className).join(", ");
  const ritual = spell.ritual ? " rituale" : "";
  return `
    <article class="spell-card">
      <div class="spell-card-main">
        <strong>${escapeHtml(spell.name_it || spell.name)}</strong>
        <span>${escapeHtml(spell.level_it)} - ${escapeHtml(spell.school_it)}${ritual}</span>
        <small>${escapeHtml(classNames)} · ${escapeHtml(spell.source)}</small>
      </div>
      <div class="spell-card-actions">
        <button class="small-button" data-add-spell="${escapeAttribute(spell.id)}" type="button">Aggiungi</button>
        ${spell.custom ? `<button class="small-button remove-spell" data-delete-custom-spell="${escapeAttribute(spell.id)}" type="button">Elimina DB</button>` : ""}
      </div>
    </article>
  `;
}

function renderKnownSpell(spell) {
  const prepared = state.preparedSpellIds.includes(spell.id);
  return `
    <article class="known-spell-row">
      <details class="known-spell-card">
        <summary>
          <span>${escapeHtml(spell.name_it || spell.name)}</span>
          <small>${escapeHtml(spell.level_it)} · ${escapeHtml(spell.source)}</small>
        </summary>
        <div class="known-spell-body">
          <dl>
            <div><dt>Scuola</dt><dd>${escapeHtml(spell.school_it)}${spell.ritual ? " (rituale)" : ""}</dd></div>
            <div><dt>Tempo</dt><dd>${escapeHtml(spell.casting_time)}</dd></div>
            <div><dt>Raggio</dt><dd>${escapeHtml(spell.range)}</dd></div>
            <div><dt>Componenti</dt><dd>${escapeHtml(spell.components)}</dd></div>
            <div><dt>Durata</dt><dd>${escapeHtml(spell.duration)}</dd></div>
          </dl>
          <p>${escapeHtml(spell.description).replaceAll("\n", "<br>")}</p>
        </div>
      </details>
      <div class="known-spell-actions">
        <label class="prepared-toggle">
          <input data-prepared-spell="${escapeAttribute(spell.id)}" type="checkbox" ${prepared ? "checked" : ""} />
          <span>Prep.</span>
        </label>
        <button class="small-button remove-spell" data-remove-spell="${escapeAttribute(spell.id)}" type="button">Rimuovi</button>
        ${spell.custom ? `<button class="small-button remove-spell" data-delete-custom-spell="${escapeAttribute(spell.id)}" type="button">Elimina DB</button>` : ""}
      </div>
    </article>
  `;
}

function bindSpellFilters() {
  ["spellClassFilter", "spellLevelFilter", "spellSourceFilter", "spellSearchInput"].forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener("input", renderSpellPicker);
    element.addEventListener("change", renderSpellPicker);
  });
}

function customSpellValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function makeCustomSpellId(name) {
  const base = `custom-${normalizedText(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "spell"}`;
  let id = base;
  let index = 2;
  const existingIds = new Set(spellDatabase().map((spell) => spell.id));
  while (existingIds.has(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

function addCustomSpell() {
  const name = customSpellValue("customSpellName");
  const className = resolveClassName(customSpellValue("customSpellClass"));
  const level = Number(customSpellValue("customSpellLevel"));
  if (!name || !className || !Number.isFinite(level) || level < 0) return;

  const source = customSpellValue("customSpellSource") || "Custom";
  const school = customSpellValue("customSpellSchool") || "Personalizzata";
  const spell = {
    id: makeCustomSpellId(name),
    name,
    name_it: name,
    level,
    level_it: spellLevelLabel(level),
    school: normalizedText(school),
    school_it: school,
    ritual: false,
    casting_time: customSpellValue("customSpellCasting"),
    range: customSpellValue("customSpellRange"),
    components: customSpellValue("customSpellComponents"),
    material: "",
    duration: customSpellValue("customSpellDuration"),
    classes: [className],
    class_details: [{ name: className, name_it: classLabelsIt[className] || className, optional: false, source: null }],
    source,
    description: customSpellValue("customSpellDescription"),
    language: "it",
    ui_language: "it",
    custom: true,
  };

  state.customSpells.push(spell);
  saveState();
  clearCustomSpellForm();
  populateSpellFilters();
  document.getElementById("spellClassFilter").value = className;
  document.getElementById("spellLevelFilter").value = String(level);
  document.getElementById("spellSourceFilter").value = source;
  renderSpellPicker();
}

function clearCustomSpellForm() {
  [
    "customSpellName",
    "customSpellClass",
    "customSpellLevel",
    "customSpellSchool",
    "customSpellCasting",
    "customSpellRange",
    "customSpellComponents",
    "customSpellDuration",
    "customSpellDescription",
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = "";
  });
  const source = document.getElementById("customSpellSource");
  if (source) source.value = "Custom";
}

function deleteCustomSpell(id) {
  state.customSpells = state.customSpells.filter((spell) => spell.id !== id);
  state.knownSpellIds = state.knownSpellIds.filter((spellId) => spellId !== id);
  state.preparedSpellIds = state.preparedSpellIds.filter((spellId) => spellId !== id);
  saveState();
  populateSpellFilters();
  renderSpellPicker();
}

function bindCustomSpellForm() {
  document.getElementById("addCustomSpellButton")?.addEventListener("click", addCustomSpell);
}

function renderConditions() {
  const list = document.getElementById("conditionList");
  if (!list) return;
  const selected = new Set(state.conditions || []);
  const customConditions = (state.conditions || []).filter((condition) => !conditionPresets.includes(condition));
  list.innerHTML = [
    ...conditionPresets.map(
      (condition) => `
        <label class="condition-chip ${selected.has(condition) ? "active" : ""}">
          <input data-condition="${escapeAttribute(condition)}" type="checkbox" ${selected.has(condition) ? "checked" : ""} />
          <span>${escapeHtml(condition)}</span>
        </label>
      `
    ),
    ...customConditions.map(
      (condition) => `
        <button class="condition-chip active custom-condition-chip" data-remove-condition="${escapeAttribute(condition)}" type="button">
          <span>${escapeHtml(condition)}</span>
          <strong>x</strong>
        </button>
      `
    ),
  ].join("");

  list.querySelectorAll("[data-condition]").forEach((input) => {
    input.addEventListener("change", () => {
      const condition = input.dataset.condition;
      if (input.checked && !state.conditions.includes(condition)) {
        state.conditions.push(condition);
      }
      if (!input.checked) {
        state.conditions = state.conditions.filter((item) => item !== condition);
      }
      saveState();
      renderConditions();
    });
  });

  list.querySelectorAll("[data-remove-condition]").forEach((button) => {
    button.addEventListener("click", () => {
      state.conditions = state.conditions.filter((item) => item !== button.dataset.removeCondition);
      saveState();
      renderConditions();
    });
  });
}

function addCustomCondition() {
  const input = document.getElementById("customConditionInput");
  const condition = input?.value.trim();
  if (!condition) return;
  if (!state.conditions.includes(condition)) {
    state.conditions.push(condition);
  }
  input.value = "";
  saveState();
  renderConditions();
}

function bindCustomConditionForm() {
  const input = document.getElementById("customConditionInput");
  document.getElementById("addCustomConditionButton")?.addEventListener("click", addCustomCondition);
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomCondition();
    }
  });
}

function renderResources() {
  const list = document.getElementById("resourceList");
  if (!list) return;
  list.innerHTML = state.resources.length
    ? state.resources
        .map(
          (resource, index) => `
            <article class="resource-row">
              <label><span>Nome</span><input data-resource="${index}" data-resource-field="name" value="${escapeAttribute(resource.name)}" /></label>
              <label><span>Attuale</span><input data-resource="${index}" data-resource-field="current" type="number" inputmode="numeric" value="${escapeAttribute(resource.current)}" /></label>
              <label><span>Max</span><input data-resource="${index}" data-resource-field="max" type="number" inputmode="numeric" value="${escapeAttribute(resource.max)}" /></label>
              <button class="small-button remove-resource" data-remove-resource="${index}" type="button">Rimuovi</button>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">Nessuna risorsa.</div>`;

  list.querySelectorAll("[data-resource]").forEach((field) => {
    field.addEventListener("input", () => {
      const index = Number(field.dataset.resource);
      const key = field.dataset.resourceField;
      state.resources[index][key] = field.type === "number" ? Number(field.value) : field.value;
      saveState();
    });
  });

  list.querySelectorAll("[data-remove-resource]").forEach((button) => {
    button.addEventListener("click", () => {
      state.resources.splice(Number(button.dataset.removeResource), 1);
      renderResources();
      saveState();
    });
  });
}

function renderEquipment() {
  const list = document.getElementById("equipmentList");
  list.innerHTML = state.equipmentItems
    .map((item, index) => {
      const isOpen = index === openEquipmentIndex;
      return `
        <article class="equipment-item ${isOpen ? "open" : ""}">
          <button class="equipment-toggle" data-equipment-toggle="${index}" type="button" aria-expanded="${isOpen}">
            <span>${escapeHtml(item.name || "Oggetto senza nome")}</span>
            <strong>${isOpen ? "-" : "+"}</strong>
          </button>
          <div class="equipment-details" ${isOpen ? "" : "hidden"}>
            <label class="field">
              <span>Nome oggetto</span>
              <input data-equipment="${index}" data-equipment-field="name" value="${escapeAttribute(item.name)}" />
            </label>
            <label class="field">
              <span>Descrizione</span>
              <textarea data-equipment="${index}" data-equipment-field="description" rows="4">${escapeHtml(item.description)}</textarea>
            </label>
            <button class="small-button remove-equipment" data-remove-equipment="${index}" type="button">Rimuovi</button>
          </div>
        </article>
      `;
    })
    .join("");

  list.querySelectorAll("[data-equipment-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.equipmentToggle);
      openEquipmentIndex = openEquipmentIndex === index ? null : index;
      renderEquipment();
    });
  });

  list.querySelectorAll("[data-equipment]").forEach((field) => {
    field.addEventListener("input", () => {
      const index = Number(field.dataset.equipment);
      state.equipmentItems[index][field.dataset.equipmentField] = field.value;
      state.equipment = state.equipmentItems.map((item) => item.name).filter(Boolean).join(", ");
      saveState();
      if (field.dataset.equipmentField === "name") {
        field.closest(".equipment-item").querySelector(".equipment-toggle span").textContent = field.value || "Oggetto senza nome";
      }
    });
  });

  list.querySelectorAll("[data-remove-equipment]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeEquipment);
      state.equipmentItems.splice(index, 1);
      openEquipmentIndex = null;
      state.equipment = state.equipmentItems.map((item) => item.name).filter(Boolean).join(", ");
      renderEquipment();
      saveState();
    });
  });
}

function bindDeathSaves() {
  document.querySelectorAll("[data-death]").forEach((input) => {
    const key = input.dataset.death === "successes" ? "deathSuccesses" : "deathFailures";
    const checksKey = input.dataset.death === "successes" ? "deathSuccessChecks" : "deathFailureChecks";
    const checks = Array.isArray(state[checksKey]) ? state[checksKey].map(String) : [];
    input.checked = checks.length ? checks.includes(String(input.value)) : Number(input.value) <= Number(state[key]);
    input.addEventListener("change", () => {
      const checkedValues = [...document.querySelectorAll(`[data-death="${input.dataset.death}"]`)]
        .filter((box) => box.checked)
        .map((box) => String(box.value));
      state[checksKey] = checkedValues;
      state[key] = checkedValues.length;
      saveState();
    });
  });
}

function bindActions() {
  document.querySelector('[data-action="hp-minus"]').addEventListener("click", () => changeHp(-1));
  document.querySelector('[data-action="hp-plus"]').addEventListener("click", () => changeHp(1));
  document.getElementById("addEquipmentButton").addEventListener("click", () => {
    state.equipmentItems.push({ name: "Nuovo oggetto", description: "" });
    openEquipmentIndex = state.equipmentItems.length - 1;
    state.equipment = state.equipmentItems.map((item) => item.name).filter(Boolean).join(", ");
    renderEquipment();
    saveState();
  });
  document.getElementById("addResourceButton").addEventListener("click", () => {
    state.resources.push({ name: "Nuova risorsa", current: 0, max: 0 });
    renderResources();
    saveState();
  });
  document.getElementById("addSlotButton").addEventListener("click", () => {
    const level = Number(document.getElementById("slotLevelToAdd")?.value);
    if (!level || state.slots.some((slot) => Number(slot.level) === level)) return;
    state.slots.push({ level, current: 0, max: 0 });
    renderSlots();
    saveState();
  });
  document.getElementById("addAttackButton").addEventListener("click", () => {
    state.attacks.push({ name: "", bonus: "", damage: "" });
    renderAttacks();
    saveState();
  });
  document.getElementById("themeButton").addEventListener("click", toggleTheme);

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
    });
  });
}

function changeHp(amount) {
  state.hpCurrent = Number(state.hpCurrent || 0) + amount;
  clampHitPoints();
  const input = document.querySelector('[data-field="hpCurrent"]');
  input.value = state.hpCurrent;
  saveState();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  document.getElementById("themeButton").setAttribute("aria-pressed", theme === "light" ? "true" : "false");
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  applyTheme(current === "light" ? "dark" : "light");
}

function init() {
  applyTheme(localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");
  clampHitPoints();
  bindFields();
  renderAbilities();
  renderChecks();
  renderAttacks();
  renderSlots();
  populateSpellFilters();
  renderSpellPicker();
  renderEquipment();
  renderConditions();
  renderResources();
  bindDeathSaves();
  bindActions();
  bindSpellFilters();
  bindCustomSpellForm();
  bindCustomConditionForm();
}

init();
