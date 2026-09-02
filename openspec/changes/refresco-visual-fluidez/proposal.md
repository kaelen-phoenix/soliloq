## Why

La app funciona pero se siente monótona: un solo acento rosa sobre una escala neutra, sin profundidad ni movimiento. El sistema visual (`tailwind.config.ts`, `globals.css`) es deliberadamente sobrio —"la jerarquía la dan el borde y el espacio"— y hoy eso se lee como plano, no como elegante. Encima hay dos fricciones concretas de UX: las fotos usan `<img>` crudo (sin dimensión reservada ni placeholder, la grilla salta en conexiones lentas) y el botón de cambio de modo muestra el **modo actual** ("TALENTO") con un ícono de intercambio, cuando en realidad estás en Talento y te pasa a Creador.

## What Changes

- **Refresco visual marcado, sin tocar la estructura de ninguna pantalla:**
  - **Acento por rol**: dos tokens nuevos —`talento` y `creador`— derivados de la rampa `brand`, que tiñen sutilmente el encabezado, el estado activo de la navegación y el foco según el modo en el que estás. Refuerzan "dónde estás" sin repintar la app.
  - **Profundidad**: gradiente suave solo en superficies grandes (portada, `titulo-seccion`, fondo de encabezado); `shadow-tarjeta` (ya existe como token, hoy sin usar) aplicada a tarjetas de lista; borde + sombra en vez de solo borde.
  - **Contraste tipográfico**: los títulos de pantalla y de tarjeta suben un escalón de peso/tamaño donde hoy compiten con el cuerpo; se usa `font-display` en los títulos de portada que hoy son `sans`.
  - **Micro-animaciones con `framer-motion`** (ya es dependencia): entrada escalonada de listas y grillas, transición de página en el grupo `(app)`, feedback de toque (`whileTap`) en botones y tarjetas. Todo bajo un helper que anula la animación cuando `prefers-reduced-motion: reduce`.
  - **Intactos**: los cuatro colores de familia de oficio (`escena`/`direccion`/`diseno`/`tecnica`) y los de estado (`error`/`alerta`/`exito`). Ya pasaron el validador de daltonismo; el refresco no los toca.
- **Carga de imágenes fluida:**
  - Componente `<Imagen>` propio sobre `next/image` con un **loader para el render endpoint de Supabase Storage** (`/render/image/public/...?width=&quality=`), para no bajar una foto full-res dentro de un thumbnail.
  - `next.config` declara el host de Supabase Storage en `images.remotePatterns`.
  - **Dimensión reservada** siempre (`width`/`height` o `fill` con contenedor de `aspect-ratio`), **placeholder** mientras carga (blur cuando hay `blurDataURL`, si no un fondo `ink-100` animado), `loading="lazy"` por defecto y `priority` solo en la primera imagen visible de cada pantalla.
  - Reemplazo de los `<img>` crudos actuales: tarjetas del buscador, avatares de feed/salas/notificaciones/equipo, foto del perfil propio y grilla de portfolio.
  - Estados de **carga** (skeleton, reusando `esqueleto.tsx`) y **vacío** consistentes en las pantallas de lista que hoy no los tienen.
- **Botón de cambio de modo (`conmutador-modo.tsx`):**
  - Se separa **estado** de **acción**: una píldora no interactiva dice "Estás en Talento" y, al lado, un botón explícito "Cambiar a Creador" (el texto nombra siempre el **destino**, nunca el estado actual).
  - Con un solo perfil se mantiene la invitación actual a "Sumar perfil de …".
  - El `title`/`aria-label` acompañan el texto visible en vez de contradecirlo.

## Capabilities

### New Capabilities

- `experiencia-visual`: la piel y la fluidez de la interfaz autenticada — acento de color según el rol activo, movimiento que respeta `prefers-reduced-motion`, imágenes que reservan su espacio y muestran un placeholder mientras cargan, y un conmutador de modo que distingue el estado actual de la acción de cambiarlo.

### Modified Capabilities

<!-- Ninguna: `openspec/specs/` no tiene specs sincronizadas todavía; el comportamiento nuevo se describe dentro de la capability nueva. -->

## Impact

**Sin base de datos.** Change 100% frontend, sin migración, sin RLS, sin RPC.

**Dependencias**: se usa `next/image` (parte de `next`, ya instalado) y `framer-motion` (ya instalado). No se agregan paquetes.

**Configuración**:
- `next.config.mjs` — `images.remotePatterns` con el host `*.supabase.co` (path `/storage/v1/render/image/public/**` y `/storage/v1/object/public/**`).
- `tailwind.config.ts` — tokens de color `talento` y `creador`; sin quitar nada.

**Código**:
- `src/app/globals.css` — variable de acento por rol, utilidades de gradiente, `@media (prefers-reduced-motion)`.
- `src/components/ui/imagen.tsx` — **nuevo**: wrapper de `next/image` + loader de Supabase + placeholder.
- `src/lib/imagenes.ts` — **nuevo**: loader y helper de URL de render de Supabase.
- `src/components/ui/movimiento.tsx` — **nuevo**: variantes de `framer-motion` y hook `usePrefiereReduccion`.
- `src/components/layout/conmutador-modo.tsx` — píldora de estado + botón de destino.
- `src/app/(app)/layout.tsx` (o el contenedor equivalente) — acento por rol y transición de página.
- `src/components/layout/titulo-seccion.tsx`, `items-navegacion` + barra lateral/inferior — acento y gradiente de encabezado.
- Reemplazo de `<img>` por `<Imagen>` en: `talento/tarjeta-talento.tsx`, `feed/tarjeta-rol.tsx`, `notificaciones/lista-notificaciones.tsx`, `perfil/formulario-creador.tsx`, `perfil/perfil-talento-detalle.tsx`, `perfil/subir-fotos.tsx`, `perfil/vidriera-publica.tsx`, `salas/sala-chat.tsx`, `seleccion/bandeja-postulantes.tsx`, `equipo/feed-equipo.tsx`, `app/(app)/creadores/[id]/page.tsx`, `app/(app)/perfil/page.tsx`.
- Estados de carga/vacío en las pantallas de lista de `(app)`.

**Rollback**: revertir el commit. Sin efecto persistente (no hay datos ni esquema tocados).

**Fuera de alcance**: modo oscuro; rediseño de la información o del flujo de cualquier pantalla; cambiar la paleta de familias de oficio o los colores de estado; ilustraciones o assets nuevos.
