// Íconos y pantalla de carga de la app nativa (#387, #395), con el isotipo de
// `src/lib/marca-isotipo.ts` a dos tintas sobre negro, como los íconos de la web
// (`app/_marca-icono.tsx`).
//
//   node scripts/iconos-app.mts
//
// Los deja en `movil/assets/`, que es de donde los toma `movil/app.config.ts`. Volver a correrlo
// solo si cambia el logo.
import sharp from "sharp";
import { ISOTIPO_TRAZOS, ISOTIPO_VIEWBOX } from "../src/lib/marca-isotipo.ts";

const TINTA = "#060606";
const BRAZO_IZQ = "#f2571e";
const BRAZO_DER = "#e62d03";
const [, , ISO_W, ISO_H] = ISOTIPO_VIEWBOX.split(" ").map(Number);
const DIR = "movil/assets";

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
      (escala > 0
        ? `<svg x="${(lado - w) / 2}" y="${(lado - h) / 2}" width="${w}" height="${h}" viewBox="${ISOTIPO_VIEWBOX}">${trazos}</svg>`
        : "") +
      `</svg>`,
  );
}

async function png(nombre: string, lado: number, escala: number, fondo: string | null) {
  await sharp(svg(lado, escala, fondo)).png().toFile(`${DIR}/${nombre}`);
  console.log("listo", nombre);
}

await png("icon.png", 1024, 0.7, TINTA);
// Ícono adaptable de Android: el sistema recorta a círculo o squircle, el dibujo va más chico.
await png("android-icon-foreground.png", 1024, 0.5, null);
await png("android-icon-background.png", 1024, 0, TINTA);
// La pantalla de carga: el isotipo solo, sobre el fondo negro que pone `expo-splash-screen`.
await png("splash-icon.png", 1024, 0.5, null);
