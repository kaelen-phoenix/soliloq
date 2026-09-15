## Context

Ver `proposal.md` — Why. Estado actual relevante:

- `perfiles_creador` tiene campos de identidad personal — `nombre` ("Nombre personal **o nombre de la compañía**"), `imagen_url`, `descripcion`, `ubicacion_*` — que duplican los de `perfiles_talento`.
- `perfiles_creador` también tiene `disciplinas disciplina_artistica[]` + `otro_detalle` (0028): qué practica esta persona como artista (dirección, vestuario, etc.). Se usa en la vidriera pública, el flujo 1:1 de armar equipo (`feed-equipo`, `responder-interes`) y el `opengraph-image` del enlace público.
- 7 cuentas en producción; 1 es Creador-sin-Talento y es dueña de una obra publicada (`f81b4d09…`, "La gaviota").
- Confirmado con el product owner: el Creador nunca vuelve a representar una compañía distinta de la persona — se unifica sin excepción, incluso para cuentas que hoy cargaron un nombre de compañía.

## Goals / Non-Goals

**Goals:**
- Una sola fuente de identidad personal (`perfiles_talento`) para cualquier superficie que muestre "quién es esta persona", sea cual sea el modo en que está usando la app.
- `perfiles_creador` deja de tener campos de identidad; conserva sólo lo que describe su *práctica* como creador (`disciplinas`, `otro_detalle`) y lo operativo que ya tenía (fotos de obras propias no aplica acá — eso vive en `obras`/`equipos`).
- Ninguna cuenta pierde datos que ya cargó: la que hoy sólo tiene `perfiles_creador` recibe un `perfiles_talento` completo antes de que se le borre nada.

**Non-Goals:**
- No se toca el esquema de `perfiles_talento` (el issue lo deja fuera de alcance) — `disciplinas`/`otro_detalle` **no** se mueven a esa tabla ni se intenta fusionarlos con `habilidades` (son formas de dato distintas: enum cerrado vs. texto libre).
- No se cambia el circuito de Match/convocatoria/selección.
- No se rediseña el conmutador de modo (`ConmutadorModo`) — cambia lo que *significa* (ver Decisión 3), no su UI.

## Decisions

**1. `perfiles_creador` pierde `nombre`, `imagen_url`, `descripcion`, `ubicacion_*`; conserva `disciplinas`/`otro_detalle`.**
Alternativa descartada: mover `disciplinas`/`otro_detalle` a `perfiles_talento`. Se descarta porque el issue pone el esquema de Talento fuera de alcance, y porque no es estrictamente un dato de "quién sos" sino de "qué hacés como Creador" — puede seguir viviendo ahí sin ser una segunda identidad, siempre que se muestre *junto a* la identidad de Talento (mismo nombre y foto), nunca en su lugar. En la práctica: la vidriera pública, `feed-equipo` y `responder-interes` pasan a resolver nombre/foto/ubicación desde `perfiles_talento` del mismo `id`, y siguen leyendo `disciplinas`/`otro_detalle` de `perfiles_creador` para el detalle de práctica artística.

**2. Backfill antes del drop: generar `perfiles_talento` para cuentas Creador-sin-Talento.**
Migración en dos pasos (mismo patrón que 0028 — traducir antes de borrar):
1. `insert into perfiles_talento (id, nombre, imagen_url, ubicacion_*, ...) select id, nombre, imagen_url, ubicacion_* from perfiles_creador c where not exists (select 1 from perfiles_talento t where t.id = c.id)`. Campos de Talento sin equivalente en Creador (`fecha_nacimiento`, `genero`, `habilidades`, `experiencia`) quedan en su default/`null` — la cuenta migrada tiene un Perfil de Talento incompleto pero visible, no roto; complementarlo es cosa suya post-migración, igual que cualquier alta manual.
2. Recién entonces `alter table perfiles_creador drop column nombre, drop column imagen_url, drop column descripcion, drop column ubicacion_*`.
Alternativa descartada: forzar el completar-perfil de Talento antes de permitir seguir usando la cuenta. Se descarta por fricción innecesaria para una cuenta que ya tiene un Proyecto publicado funcionando — el backfill automático no le rompe nada, y puede completar el resto cuando quiera.

**3. El conmutador de modo cambia de significado, no de forma.**
Hoy `ConmutadorModo` + `Encabezado` ya muestran nombre/foto de la cuenta de forma constante arriba de todo (ver `campanita-notificaciones.tsx`, que usa `userId` = `perfiles.id` sin importar el modo). Con la identidad resuelta siempre desde `perfiles_talento`, ese encabezado deja de cambiar al conmutar — el conmutador pasa a leerse naturalmente como "a qué espacio de trabajo entro" en vez de "quién soy ahora". No hace falta ningún cambio de componente para esto: es consecuencia directa de sacarle la identidad a `perfiles_creador`, no una pieza nueva de UI. Responde la "decisión pendiente" que marcaba el issue.

**4. `placa-perfil-creador` se retira; `placa-perfil-talento` pasa a abrirse también desde tarjetas de Proyecto/Equipo.**
El componente agregado en #159/#165 mostraba el perfil de Creador al tocar una tarjeta desde el feed o Matches. Pasa a abrir `placa-perfil-talento` con el `id` del dueño (mismo `id`, ya no hace falta resolver cuál tabla mirar).

## Risks / Trade-offs

- [Cuentas con `nombre` de compañía pierden esa identidad pública] → Aceptado explícitamente por el product owner (ver proposal.md e issue #175): a partir de este cambio el Creador siempre se ve como la persona dueña de la cuenta.
- [Vistas/funciones en producción activa (`feed_talento`, notificaciones, salas) cambian de dónde leen la identidad] → Cada una se prueba en `begin/rollback` contra prod antes de aplicar, mismo procedimiento que se usó en #137/#138 (ver memoria `deploy-migraciones-prod`).
- [El backfill de la cuenta real Creador-sin-Talento es irreversible una vez cae `drop column`] → El paso 1 (insert) y el paso 2 (drop) van en migraciones separadas, para poder verificar el backfill contra la cuenta real antes de borrar nada.

## Migration Plan

1. Migración A (aditiva): backfill de `perfiles_talento` para cuentas Creador-sin-Talento. Se prueba en rollback, se aplica, se verifica a mano que la cuenta real (`52090620-…`) tiene ahora un Perfil de Talento coherente.
2. Cambios de aplicación: toda lectura de identidad pasa de `perfiles_creador` a `perfiles_talento` (vistas SQL, componentes, RPCs). Se puede desplegar con la Migración A ya aplicada y `perfiles_creador` todavía con sus columnas viejas (no rompe nada tenerlas de más un rato).
3. Migración B (destructiva): drop de las columnas de identidad en `perfiles_creador`. Sólo después de confirmar que ningún código en `main` las sigue leyendo (grep + build).
4. Onboarding: `elegir-rol`/`completar-perfil` dejan de ofrecer alta "sólo Creador"; "convertirse en Creador" pasa a ser simplemente crear un Proyecto o Equipo desde el tablero (ya casi es así desde #157 — el formulario de obra/equipo es inline).

Rollback: la Migración A es aditiva (no hay nada que revertir). La Migración B sólo se aplica cuando el paso 2 ya está en producción y verificado; si hiciera falta revertir, hay que restaurar las columnas desde el backfill (no son recuperables por `rollback` una vez mergeado, es el motivo de separarla y verificarla aparte).
