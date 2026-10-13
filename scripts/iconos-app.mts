// Íconos y pantalla de carga de las apps (#387), con el isotipo de `src/lib/marca-isotipo.ts`
// a dos tintas sobre negro, como los íconos de la web (`app/_marca-icono.tsx`).
//
//   node scripts/iconos-app.mts
//
// Deja los originales en `app-nativa/recursos/` y los reparte por `android/` e `ios/` con
// `@capacitor/assets`. Volver a correrlo solo si cambia el logo.
import { execSync } from "node:child_process";
import fs from "node:fs";
import sharp from "sharp";
import { ISOTIPO_TRAZOS, ISOTIPO_VIEWBOX } from "../src/lib/marca-isotipo.ts";

const TINTA = "#060606";
const BRAZO_IZQ = "#f2571e";
const BRAZO_DER = "#e62d03";
const [, , ISO_W, ISO_H] = ISOTIPO_VIEWBOX.split(" ").map(Number);
const DIR = "app-nativa/recursos";

/** Un cuadrado de `lado` con el isotipo centrado ocupando `escala` del alto. */
function svg(lado: number, escala: number, fondo: string | null) {
  const h = lado * escala;
  const w = (h * ISO_W) / ISO_H;
  const trazos = ISOTIPO_TRAZOS.map(
    (t) =>
      `<path d="${t.d}" transform="translate(${t.x},${t.y})" fill="${t.brazo === "izq" ? BRAZO_IZQ : BRAZO_DER}"/>`,
  ).join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">` +
      (fondo ? `<rect width="${lado}" height="${lado}" fill="${fondo}"/>` : "") +
      `<svg x="${(lado - w) / 2}" y="${(lado - h) / 2}" width="${w}" height="${h}" viewBox="${ISOTIPO_VIEWBOX}">${trazos}</svg>` +
      `</svg>`,
  );
}

async function png(nombre: string, lado: number, escala: number, fondo: string | null) {
  await sharp(svg(lado, escala, fondo)).png().toFile(`${DIR}/${nombre}`);
  console.log("listo", nombre);
}

fs.mkdirSync(DIR, { recursive: true });
await png("icon-only.png", 1024, 0.7, TINTA);
// Ícono adaptable de Android: el sistema recorta a círculo o squircle, el dibujo va más chico.
await png("icon-foreground.png", 1024, 0.5, null);
await png("icon-background.png", 1024, 0, TINTA);
await png("splash.png", 2732, 0.2, TINTA);
await png("splash-dark.png", 2732, 0.2, TINTA);

execSync(
  `npx capacitor-assets generate --android --ios --assetPath ${DIR} --iconBackgroundColor "${TINTA}" --iconBackgroundColorDark "${TINTA}" --splashBackgroundColor "${TINTA}" --splashBackgroundColorDark "${TINTA}"`,
  { stdio: "inherit" },
);
