import fs from "node:fs";
import path from "node:path";

const htmlPath = process.argv[2];
if (!htmlPath) {
  throw new Error("Uso: node scripts/build-spells-it.mjs <Incantesimi.html>");
}

const repoRoot = process.cwd();
const englishDbPath = path.join(repoRoot, "spells-db.js");
const outputPath = path.join(repoRoot, "spells-db-it.js");

const schoolLabels = {
  abiurazione: "Abiurazione",
  ammaliamento: "Ammaliamento",
  divinazione: "Divinazione",
  evocazione: "Evocazione",
  illusione: "Illusione",
  invocazione: "Invocazione",
  necromanzia: "Necromanzia",
  trasmutazione: "Trasmutazione",
};

const namedEntities = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeEntities(value) {
  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    return namedEntities[lower] || `&${entity};`;
  });
}

function htmlToText(value) {
  return decodeEntities(
    String(value || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/tr>\s*<tr[^>]*>/gi, "\n")
      .replace(/<\/t[hd]>\s*<t[hd][^>]*>/gi, " | ")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractSingle(block, pattern, label) {
  const match = block.match(pattern);
  if (!match) throw new Error(`Campo mancante: ${label}`);
  return htmlToText(match[1]);
}

function parseFields(block) {
  const fields = {};
  for (const match of block.matchAll(/<div><strong>([\s\S]*?)<\/strong>:\s*([\s\S]*?)<\/div>/g)) {
    fields[htmlToText(match[1]).toLowerCase()] = htmlToText(match[2]);
  }
  return fields;
}

function parseLevelAndSchool(rawValue) {
  const clean = rawValue.toLowerCase();
  const levelMatch = clean.match(/livello\s+(\d+)/);
  const level = levelMatch ? Number(levelMatch[1]) : 0;
  const ritual = clean.includes("rituale");
  const schoolRaw = clean
    .replace(/livello\s+\d+/g, "")
    .replace(/\(rituale\)/g, "")
    .replace(/[-–—]/g, " ")
    .trim();
  return {
    level,
    level_it: level === 0 ? "Trucchetto" : `Livello ${level}`,
    ritual,
    school_it: schoolLabels[schoolRaw] || schoolRaw.replace(/^./, (letter) => letter.toUpperCase()),
  };
}

function parseMaterial(components) {
  const match = String(components || "").match(/\bM\s*\(([\s\S]*?)\)/);
  return match ? match[1].trim() : "";
}

function parseItalianBlocks(html) {
  return [...html.matchAll(/<div class="bloc">([\s\S]*?)(?=<div class="bloc">|<\/div><\/body><\/html>)/g)].map((match) => {
    const block = match[1];
    const meta = parseLevelAndSchool(extractSingle(block, /<div class="ecole">([\s\S]*?)<\/div>/, "livello/scuola"));
    const fields = parseFields(block);
    const components = fields.componenti || "";
    return {
      name_it: extractSingle(block, /<h1>([\s\S]*?)<\/h1>/, "nome"),
      ...meta,
      casting_time: fields["tempo di lancio"] || "",
      range: fields.gittata || "",
      components,
      material: parseMaterial(components),
      duration: fields.durata || "",
      description: extractSingle(block, /<div class="description">([\s\S]*?)<\/div>/, "descrizione"),
      classes_it: [...block.matchAll(/<div class="classe">([\s\S]*?)<\/div>/g)].map((item) => htmlToText(item[1])),
      source: extractSingle(block, /<div class="source">([\s\S]*?)<\/div>/, "fonte"),
    };
  });
}

const englishSource = fs.readFileSync(englishDbPath, "utf8");
const englishMatch = englishSource.match(/window\.DND_SPELLS\s*=\s*(\[.*\]);\s*$/s);
if (!englishMatch) throw new Error("Formato spells-db.js non riconosciuto.");

const englishSpells = JSON.parse(englishMatch[1]);
const italianBlocks = parseItalianBlocks(fs.readFileSync(htmlPath, "utf8"));

if (italianBlocks.length !== englishSpells.length) {
  throw new Error(`Conteggio incantesimi non allineato: inglese ${englishSpells.length}, italiano ${italianBlocks.length}.`);
}

const italianSpells = englishSpells.map((spell, index) => {
  const translated = italianBlocks[index];
  return {
    ...spell,
    name_it: translated.name_it,
    level_it: translated.level_it,
    school_it: translated.school_it,
    ritual: translated.ritual,
    casting_time: translated.casting_time,
    range: translated.range,
    components: translated.components,
    material: translated.material,
    duration: translated.duration,
    source: translated.source,
    description: translated.description,
    language: "it",
    ui_language: "it",
  };
});

const output = [
  "// Database generato da Incantesimi.html. Mantiene id e ordine di spells-db.js, con testi e metadati in italiano.",
  `window.DND_SPELLS_IT = ${JSON.stringify(italianSpells)};`,
  "window.DND_SPELLS = window.DND_SPELLS_IT;",
  "",
].join("\n");

fs.writeFileSync(outputPath, output, "utf8");
console.log(`Generati ${italianSpells.length} incantesimi in ${path.basename(outputPath)}.`);
