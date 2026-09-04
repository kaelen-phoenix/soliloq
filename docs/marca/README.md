# Identidad de marca

- `logotipo-yalope.svg` / `.png` — el logotipo real de Yalope (isotipo «Y» de dos manos + wordmark «yalope», degradé naranja→rojo sobre negro). El SVG lleva el PNG embebido; no es vector puro.
- `identidad-de-marca.pdf` — documento de marca con la paleta.

## Dónde se usa (`docs/marca/README` → código)

| Superficie | Qué usa |
|---|---|
| Imágenes OG (compartir) | El **PNG real** del logotipo, edge-to-edge sobre negro (`_logo-datauri.ts` + `app/opengraph-image.tsx`). |
| Favicon, apple-icon, íconos PWA | El **isotipo redibujado** en SVG: dos manos de tres trazos cada una (naranja `#f2571e` izquierda, rojo `#e62d03` derecha) sobre negro. No se recorta el PNG apaisado a un cuadrado —el wordmark va pegado al isotipo— y Satori no hace degradés (`app/_marca-icono.tsx`). |
| Logo en la app (barras, portada, «Apoyar») | Isotipo redibujado + wordmark «yalope» en **Baloo 2** 800 (`components/ui/logotipo.tsx`). |
| OG del perfil compartido (`/p/[token]`) | Isotipo redibujado chico + «yalope» en texto. |

## Paleta (del PDF)

Acentos: `#e62d03` (rojo-naranja principal) · `#FB6543` (coral) · `#743404` (marrón) · `#040404` (casi negro)

Rampa naranja→marrón: `#FFF5F3` `#FEE1DA` `#FFBFB0` `#FCA995` `#FE8064` `#FB6543` `#F23906` `#D63B13` `#B62803` `#9D280B` `#7A1801` `#631604` `#420800` `#2F0601`

Neutros: `#C9C9C9` `#A3A3A3` `#7F7F7F` `#5F5F5F` `#3F3F3F` `#1E1E1E` `#040404`
