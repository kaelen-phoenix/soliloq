## Why

Hoy yalope.com no tiene **ninguna superficie indexable**. El `middleware.ts` manda cualquier visita sin sesión a `/ingresar`, no existen `src/app/robots.ts` ni `src/app/sitemap.ts`, y la única superficie pública en curso —los perfiles `/p/[token]` del change `perfil-publico-enlace`— nace `noindex` a propósito porque son datos personales. Un buscador solo puede llegar a la pantalla de login: la marca no rankea ni por su propio nombre y no hay una sola página que capte búsquedas reales del medio ("convocatorias de teatro", "casting actores Buenos Aires", "audiciones", "buscar elenco"). Posicionar el dominio exige, antes que cualquier ajuste técnico, **tener contenido público que Google pueda leer e indexar**.

## What Changes

- **Landing pública en `/`**, servida **sin sesión**: qué es Yalope, las dos puertas (talento / creador), muestra de convocatorias abiertas y CTA a registro. Con sesión iniciada, `/` redirige a `/inicio`.
- **Refactor de la home autenticada**: el tablero de hoy (`src/app/(app)/page.tsx`, `FeedTalento` / `TableroCreador`) se muda a **`src/app/(app)/inicio/page.tsx`**. Los enlaces internos al home, el `destinoSegunEstado` (`src/lib/cuenta.ts`) y el redirect post-login del middleware pasan a apuntar a `/inicio`.
- **Páginas por rol**: `/para-talento` y `/para-creadores`, públicas, cada una redactada contra su búsqueda ("cómo conseguir castings de teatro", "publicar una convocatoria de teatro") y con su CTA.
- **Convocatorias públicas**: índice `/convocatorias` (grilla de obras `publicada`, con filtro por texto y ciudad) y detalle `/convocatorias/[id]` (sinopsis, ciudad pública, fecha estimada de estreno, roles con rango etario y vacantes, nombre artístico y disciplinas del creador). **Indexables** (`index, follow`); son las páginas que captan la búsqueda de cola larga.
- **Proyección por RPC `SECURITY DEFINER`** (patrón de `feed_equipo` `0033`, `buscar_talento` `0036`, `perfil_publico` `0037`): `convocatorias_publicas(...)` y `convocatoria_publica(p_id uuid)`, `stable`, `set search_path = public`, `grant execute to anon, authenticated`. Devuelven solo los campos de arriba. **No se abre `perfiles_creador` a `anon`** (su RLS de `0007` exige `auth.uid() is not null` y así queda): el nombre del creador sale proyectado por la RPC, nada más.
- **Datos que nunca salen a la web**: `locacion_ensayos` ni `ubicacion_texto` crudos (se usa `obras.ubicacion_publica`, "barrio, ciudad, país", de `0025`), coordenadas exactas, `creador_id`, contacto, postulaciones ni sus conteos.
- **Opt-in de publicación web**: `obras` suma `publicacion_web boolean not null default true`. Toggle en el formulario de la obra, prendido por defecto, explicado en una línea ("esta convocatoria se muestra en yalope.com y puede aparecer en Google"). En `false`, la obra sigue en el feed interno pero no en `/convocatorias` ni en el sitemap. Mismo criterio que `aparece_en_buscador` de `0036`.
- **Base técnica SEO**:
  - `src/app/robots.ts` — permite el rastreo, `Disallow` de `/`-privadas (`/ingresar`, `/inicio`, `/perfil`, `/salas`, `/p/`, `/auth/`, …), apunta al sitemap.
  - `src/app/sitemap.ts` — rutas estáticas + una entrada por convocatoria `publicada` con `publicacion_web = true`, `lastModified` de `actualizado_en`.
  - **JSON-LD**: `Organization` + `WebSite` en la landing; `ItemList` en `/convocatorias`; en el detalle, `Event`/`TheaterEvent` cuando hay `fecha_estreno_estimada` (se descarta `JobPosting`: exige `hiringOrganization`/`jobLocation`/`datePosted` y Google lo trata como empleo real).
  - `generateMetadata` por página con `title`/`description` únicos, `alternates.canonical` y `openGraph` propios.
  - **Google Search Console**: `metadata.verification.google` desde `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (el token se carga como env en el host; sin token, no se emite la etiqueta).
  - Render **estático** (landing, páginas por rol) e **ISR** (`revalidate`) en `/convocatorias` y el detalle, para velocidad y presupuesto de rastreo.
- **`middleware.ts`**: `perfil-publico-enlace` ya sumó la constante `RUTAS_ABIERTAS = ["/p/"]` (se sirven con o sin sesión, sin rebote). Las rutas de este change se suman ahí — `/para-talento`, `/para-creadores`, `/convocatorias` — mientras que `/` necesita su propia rama (anónimo → landing; con sesión → `redirigir("/inicio")`). `/robots.txt` y `/sitemap.xml` se agregan al negative-lookahead del `matcher`.

## Capabilities

### New Capabilities

- `sitio-publico`: la parte de Yalope que se ve sin cuenta y que los buscadores pueden indexar — landing, páginas por rol y el catálogo público de convocatorias abiertas — junto con la plomería de indexación (robots, sitemap dinámico, datos estructurados, metadata canónica por página y verificación de Search Console).

### Modified Capabilities

<!-- Ninguna sincronizada: `openspec/specs/` está vacío. El toggle `publicacion_web` en la
     edición de la obra queda descrito dentro de la capability nueva. -->

## Impact

**Base de datos** — migración `0038_superficie_publica_seo.sql` (aditiva e idempotente):
- `obras.publicacion_web boolean not null default true`.
- RPC `convocatorias_publicas(p_texto text default null, p_ciudad text default null, p_limite int default 24, p_desfase int default 0)` y `convocatoria_publica(p_id uuid)`, ambas `SECURITY DEFINER`, `stable`, `set search_path = public`, `grant execute to anon, authenticated`. Proyección acotada de `obras` + `roles` + nombre/disciplinas/ciudad pública de `perfiles_creador`, filtrando `estado = 'publicada' and publicacion_web`. Sin fila o sin roles → la de detalle devuelve vacío y la página responde **404**.
- Sin políticas de lectura anónima nuevas sobre `obras`, `roles` ni `perfiles_creador`.

**Código**:
- `src/app/page.tsx` — landing pública nueva (server component, estático, con sesión `redirect('/inicio')`).
- `src/app/(app)/inicio/page.tsx` — el tablero autenticado, movido desde `(app)/page.tsx`.
- `src/app/para-talento/page.tsx`, `src/app/para-creadores/page.tsx` — páginas por rol.
- `src/app/convocatorias/page.tsx`, `src/app/convocatorias/[id]/page.tsx` — índice y detalle públicos, con `generateMetadata`, `notFound()` y JSON-LD.
- `src/components/publico/` — `landing.tsx`, `grilla-convocatorias.tsx`, `tarjeta-convocatoria.tsx`, `detalle-convocatoria.tsx`, `jsonld.tsx`.
- `src/app/robots.ts`, `src/app/sitemap.ts` — nuevos.
- `src/app/layout.tsx` — `metadata.verification.google` desde env.
- `middleware.ts` — `/para-talento`, `/para-creadores`, `/convocatorias` a `RUTAS_ABIERTAS`; rama propia para `/` (con sesión → `/inicio`); `matcher` deja pasar `robots.txt`/`sitemap.xml`.
- `src/components/convocatorias/formulario-rol.tsx` o el form de la obra — toggle `publicacion_web`; `src/lib/cuenta.ts` (`destinoSegunEstado`) y enlaces internos → `/inicio`.
- `src/lib/supabase/types.ts` — `publicacion_web` y las firmas de las dos RPC.
- `.env.example` — `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

**Solape con `perfil-publico-enlace`** (branch actual, migración `0037`): ese change ya está tocando `middleware.ts` — sumó `RUTAS_ABIERTAS = ["/p/"]` y el helper `conNext`. Este change extiende `RUTAS_ABIERTAS` con las rutas públicas nuevas y agrega la rama de `/`; hay que mergear después de `perfil-publico-enlace` y rebasar. Numeración de migración: este change usa `0038` (después de `0037`).

**Sin cambios de storage**: `fotos-perfil` ya sirve a `anon` (`0010`); `perfiles_creador.imagen_url` se sirve con `getPublicUrl`.

**Rollback**: `drop function convocatorias_publicas, convocatoria_publica; alter table obras drop column publicacion_web;` + revertir el código y borrar `robots.ts`/`sitemap.ts`. Sin pérdida de dato.

## Decisiones tomadas

1. **RPC de proyección, no RLS anónima.** Aunque la policy `obras_select_publicada` de `0008` ya no filtra por `auth.uid()`, exponer `obras`/`roles` enteras a `anon` filtraría `locacion_ensayos`, `creador_id` y columnas internas. Se sigue el patrón ya usado tres veces en el repo: RPC `SECURITY DEFINER` con proyección mínima y `perfiles_creador` sin abrir.
2. **`publicacion_web` default `true`.** El objetivo del change es tráfico; arrancar en `false` lo vaciaría de contenido el día uno. Se acepta el costo: publicar una obra pasa a significar "visible en internet", y por eso el toggle se explica en el formulario. Espeja `aparece_en_buscador` de `0036`.
3. **El detalle de convocatoria se indexa; los perfiles `/p/*` no.** Una convocatoria abierta es información que el creador quiere difundir (ya la ve todo el feed); un perfil `/p/*` lo manda una persona por chat. Cuando la obra deja de estar `publicada` o se apaga `publicacion_web`, el detalle responde 404 y sale del sitemap.
4. **Home en `/` para anónimos, `/inicio` para autenticados.** Es un cambio de ruta con efecto en enlaces internos y en el middleware, pero es la única forma de que la portada del dominio sea contenido y no un redirect a login.
5. **Sin `JobPosting`.** Los roles de teatro no son empleo formal y el rich result exige campos que no tenemos; se usa `Event`/`TheaterEvent` cuando hay fecha, y `ItemList` en el índice.
6. **Un solo locale (`es-AR`).** Sin `hreflang` ni i18n en este change.
