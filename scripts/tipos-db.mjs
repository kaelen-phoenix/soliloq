// Tipos de la base generados por Supabase (#353), en vez de escribirlos a mano.
//
//   node scripts/tipos-db.mjs            → regenera src/lib/supabase/database.generated.ts
//   node scripts/tipos-db.mjs --verificar → falla si el archivo no coincide con la base (CI)
//
// La fuente es staging: las migraciones se aplican a staging y a prod juntas, así que si el
// archivo no coincide es porque se aplicó una migración sin regenerar los tipos (o al revés).
// Token: SUPABASE_ACCESS_TOKEN, o ~/.soliloq-deploy/supabase-token.txt en la máquina local.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REF = process.env.SUPABASE_PROJECT_REF ?? "rcjjdguldfrkpmxgkazn";
const ARCHIVO = "src/lib/supabase/database.generated.ts";
const ENCABEZADO =
  "// Generado por `node scripts/tipos-db.mjs` desde el esquema de la base. No editar a mano.\n";

function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  return fs.readFileSync(path.join(os.homedir(), ".soliloq-deploy/supabase-token.txt"), "utf8").trim();
}

const r = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/types/typescript?included_schemas=public`,
  { headers: { Authorization: `Bearer ${token()}` } },
);
if (!r.ok) {
  console.error(`No se pudieron generar los tipos: HTTP ${r.status}`);
  process.exit(1);
}
const { types } = await r.json();
const generado = ENCABEZADO + types.replace(/\r\n/g, "\n").trimEnd() + "\n";

// La versión de PostgREST la agrega el generador, no sale del esquema: una actualización de
// Supabase no tiene que hacer fallar el CI.
const sinVersion = (t) => t.replace(/PostgrestVersion:\s*"[^"]*"/, 'PostgrestVersion: "*"');

if (process.argv.includes("--verificar")) {
  const actual = fs.existsSync(ARCHIVO) ? fs.readFileSync(ARCHIVO, "utf8").replace(/\r\n/g, "\n") : "";
  if (sinVersion(actual) !== sinVersion(generado)) {
    console.error(
      `${ARCHIVO} no coincide con el esquema de la base. Corré \`npm run tipos-db\` y commiteá el resultado.`,
    );
    process.exit(1);
  }
  console.log("Tipos de la base al día.");
} else {
  fs.writeFileSync(ARCHIVO, generado);
  console.log(`Escrito ${ARCHIVO}`);
}
