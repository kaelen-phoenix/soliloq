# Identidad de marca

- `logotipo-yalope.svg` / `.png` — el logotipo real de Yalope (isotipo «Y» de dos manos + wordmark «yalope», degradé naranja→rojo sobre negro). El SVG lleva el PNG embebido; **no es vector puro**, sirve de origen.
- `isotipo.svg` — el isotipo **vectorizado** del logo real (trazado de `logotipo-yalope`). Dos tintas: naranja `#f2571e` el brazo izquierdo, rojo `#e62d03` el derecho.
- `isotipo-plano.svg` — igual pero a una tinta (`fill="currentColor"`), para donde el color lo pone el contexto.
- `logotipo.svg` — el lockup completo (isotipo + wordmark «yalope») vectorizado, una tinta.
- `identidad-de-marca.pdf` — documento de marca con la paleta.

El trazado del isotipo vive en código en `src/lib/marca-isotipo.ts` (fuente única para el logo de la app y los íconos generados).

## Dónde se usa (`docs/marca/README` → código)

| Superficie | Qué usa |
|---|---|
| Imágenes OG (compartir) | El **PNG real** del logotipo, edge-to-edge sobre negro (`_logo-datauri.ts` + `app/opengraph-image.tsx`). |
| Favicon, apple-icon, íconos PWA | El **isotipo vectorizado** (`lib/marca-isotipo.ts`), naranja/rojo sobre negro, centrado en el cuadrado (`app/_marca-icono.tsx`). El PNG apaisado no se puede recortar limpio a un cuadrado —el wordmark va pegado al isotipo—, por eso el vector. |
| Logo en la app (barras, portada, «Apoyar») | Isotipo vectorizado a una tinta + wordmark «yalope» en **Baloo 2** 800 (`components/ui/logotipo.tsx`). |
| OG del perfil compartido (`/p/[token]`) | Isotipo vectorizado chico + «yalope» en texto. |

## Paleta (del PDF)

Acentos: `#e62d03` (rojo-naranja principal) · `#FB6543` (coral) · `#743404` (marrón) · `#040404` (casi negro)

Rampa naranja→marrón: `#FFF5F3` `#FEE1DA` `#FFBFB0` `#FCA995` `#FE8064` `#FB6543` `#F23906` `#D63B13` `#B62803` `#9D280B` `#7A1801` `#631604` `#420800` `#2F0601`

Neutros: `#C9C9C9` `#A3A3A3` `#7F7F7F` `#5F5F5F` `#3F3F3F` `#1E1E1E` `#040404`
