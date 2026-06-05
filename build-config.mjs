import { writeFile } from "node:fs/promises";

const url = process.env.SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";

const contents = `window.DND_APP_CONFIG = ${JSON.stringify(
  {
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
  },
  null,
  2
)};\n`;

await writeFile("supabase-config.js", contents, "utf8");
console.log(`Generated supabase-config.js (${url ? "configured" : "missing Supabase URL"})`);
