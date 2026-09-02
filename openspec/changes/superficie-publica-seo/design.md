## Context

Ver `proposal.md` — Why. Restricciones que moldean el enfoque:

- **No hay backend propio.** El cliente habla directo con PostgREST; lo que se expone o se esconde se define en Postgres (RLS o funciones `SECURITY DEFINER`), no en una capa intermedia.
- **`middleware.ts` / `src/lib/supabase/middleware.ts`** (ya tocado por `perfil-publico-enlace`): sin sesión, todo lo que no está en `RUTAS_PUBLICAS` redirige a `/ingresar` (ahora con `?next=`); con sesión, `RUTAS_PUBLICAS` redirige a `/`. Ya existe `RUTAS_ABIERTAS = ["/p/"]`, que se evalúa antes de las ramas de sesión y devuelve la respuesta tal cual para cualquiera. El `matcher` excluye `_next/*`, `favicon.ico`, `manifest.json`, `icons/` y archivos de imagen; **no** excluye `.txt` ni `.xml`.
- **`0002_convocatorias.sql`**: `obras (creador_id → perfiles_creador, titulo, sinopsis, locacion_ensayos, fecha_estreno_estimada, estado ∈ {borrador, publicada, cerrada})`; `roles (obra_id, nombre, tipo ∈ {actuacion, tecnica}, edad_minima, edad_maxima, vacantes, descripcion)`.
- **`0008_rls_convocatorias.sql`**: `obras_select_publicada` es `for select using (estado = 'publicada')` — **sin `auth.uid()`**, ya legible por `anon`. Ídem `roles` de una obra publicada. `postulaciones` y `descartes` NO son anónimas.
- **`0007_rls_perfiles.sql`**: `perfiles_creador` se lee con cualquier sesión pero **no sin sesión**. El nombre y las disciplinas del creador no llegan hoy a `anon`.
- **`0018` / `0025`**: `obras` tiene `ubicacion_texto` (puede ser dirección con altura) y `ubicacion_publica` ("barrio, ciudad, país", recortada al guardar). `ubicacion_lat/lng` son exactas y no se publican.
- **`0033` / `0036` / `0037`**: precedente de "mostrar datos sin abrir la tabla" — RPC `SECURITY DEFINER`, `stable`, `set search_path = public`, lista de columnas explícita, `revoke from public` + `grant execute to anon, authenticated`.
- **`src/lib/supabase/server.ts`**: `createClient()` server-side usa la anon key y adjunta las cookies de sesión. Sin sesión funciona igual, como cliente `anon`.
- **`src/app/layout.tsx`**: ya define `metadataBase = new URL("https://yalope.com")`, `title`, `description`, OG, Twitter. `viewport` aparte.
- **Home actual**: `src/app/(app)/page.tsx` devuelve `FeedTalento` o `TableroCreador`; `null` si no hay sesión (nunca se llega sin ella por el gate). `(app)/layout.tsx` hace `redirect("/ingresar")` y monta la barra lateral y la navegación.
- **Publicación de la obra**: `src/components/convocatorias/acciones-obra.tsx` hace `update({ estado: "publicada" })` / `"cerrada"` directo. No hay pantalla de edición de obra aparte.
- **Deploy**: el código va por push a `main`; el DDL de prod se aplica antes con el PAT `sbp_` + Management API (memoria [[deploy-migraciones-prod]]).

## Goals / Non-Goals

**Goals:**
- Que el rastreador entre a `yalope.com` y encuentre HTML con contenido —no un redirect a login— en la portada, dos páginas por rol y un catálogo de convocatorias con una URL por convocatoria.
- Una sola superficie anónima nueva de datos: dos funciones `SECURITY DEFINER` con lista de columnas explícita. Cero políticas de lectura anónima nuevas; `perfiles_creador` no se abre a `anon`.
- Plomería de indexación completa y correcta: `robots.txt`, `sitemap.xml` dinámico, canónicas absolutas, OG por página, datos estructurados, hook de verificación de Search Console.
- Páginas públicas rápidas y cacheadas (estáticas o ISR), con la baja de una convocatoria reflejada en minutos sin redeploy.
- Cambio de la home mínimo y localizado: mover el árbol autenticado a `/inicio` y ajustar los pocos punteros a `/`.

**Non-Goals:**
- Circuito completo de postulación desde la web pública. El CTA "participar" lleva al registro con retorno; postularse de verdad sigue pasando dentro de la app.
- Perfiles `/p/*` indexables — siguen `noindex` (los fija `perfil-publico-enlace`).
- i18n / `hreflang` — un solo locale `es-AR`.
- Blog, páginas de ciudad generadas, landing pages por disciplina — es la evolución natural del SEO pero excede este change.
- Analítica, dashboards de posición, integración con Ads.
- Revalidación on-demand por webhook de la base — se usa ventana de tiempo (ISR); on-demand queda como mejora posterior.

## Decisions

### 1. Home partida: `/` público, `/inicio` autenticado

`src/app/page.tsx` nuevo (fuera de `(app)`), server component, estático:
- Con sesión → `redirect("/inicio")`.
- Sin sesión → `<Landing />` (descripción, dos puertas, muestra de ~6 convocatorias vía `convocatorias_publicas(p_limite => 6)`, CTA a `/ingresar`).

El árbol autenticado se mueve tal cual: `src/app/(app)/page.tsx` → `src/app/(app)/inicio/page.tsx`. `(app)/layout.tsx` no cambia.

**Punteros a ajustar** (grep `"/"` como destino): `src/lib/cuenta.ts` `destinoSegunEstado` (si devuelve `""`/`"/"` para el caso "listo"), los `redirigir("/")` del middleware (líneas ~59 y ~81 — pasan a `/inicio`), `Link href="/"` en la barra lateral / navegación / encabezado, y `router.push("/")` post-onboarding.

**Alternativa descartada**: un solo `src/app/page.tsx` que renderiza landing o tablero según sesión, sin `(app)`. Rechazada: el tablero depende del layout de `(app)` (barra lateral, navegación, gate de onboarding); replicarlo en la raíz duplica ese layout y su lógica. Mover el árbol es más barato y deja `(app)` intacto.

**Alternativa descartada**: dejar el tablero en `/` y poner la landing en `/inicio` o `/bienvenida`. Rechazada: la portada del dominio (`yalope.com/`) es la URL que más peso tiene para un buscador; tiene que ser el contenido, no el redirect.

### 2. `middleware.ts`: rutas abiertas nuevas + rama propia para `/`

- `RUTAS_ABIERTAS` pasa a `["/p/", "/para-talento", "/para-creadores", "/convocatorias"]`. Estas tres se sirven igual con o sin sesión (un creador logueado también puede mirar el catálogo público).
- `/` necesita su propia rama porque no es "abierta para todos por igual": sin sesión devuelve la landing, con sesión redirige a `/inicio`.

```ts
if (esRutaAbierta) return response;

if (path === "/") {
  return user ? redirigir("/inicio") : response;
}

if (!user) {
  return esRutaPublica ? response : redirigir(conNext("/ingresar", path));
}
```

- `config.matcher`: agregar `sitemap.xml` y `robots.txt` al negative-lookahead, junto a `favicon.ico|manifest.json`.
- **Sin** `X-Robots-Tag` para las rutas públicas (al revés de `/p/*`, donde `perfil-publico-enlace` lo pone en `noindex`).

**Orden con `perfil-publico-enlace`**: ese change está en vuelo en esta misma branch base. Este se mergea después y rebasa; la edición es sobre las mismas líneas (`RUTAS_ABIERTAS`, `matcher`). Conviene un solo PR de middleware si ambos siguen abiertos a la vez.

### 3. Catálogo por RPC `SECURITY DEFINER`, no por RLS anónima

```sql
create or replace function public.convocatorias_publicas(
  p_texto  text default null,
  p_ciudad text default null,
  p_limite int  default 24,
  p_desfase int default 0
)
returns table (
  id uuid,
  titulo text,
  sinopsis text,
  ciudad text,                 -- obras.ubicacion_publica
  fecha_estreno_estimada date,
  actualizado_en timestamptz,
  creador_nombre text,
  creador_disciplinas disciplina_artistica[],
  roles_abiertos int           -- count(roles) de la obra
)
language sql security definer stable set search_path = public
as $$
  select o.id, o.titulo, o.sinopsis, o.ubicacion_publica,
         o.fecha_estreno_estimada, o.actualizado_en,
         c.nombre, c.disciplinas,
         (select count(*) from roles r where r.obra_id = o.id)::int
    from obras o
    join perfiles_creador c on c.id = o.creador_id
   where o.estado = 'publicada' and o.publicacion_web
     and (p_texto  is null or o.titulo ilike '%' || p_texto  || '%')
     and (p_ciudad is null or o.ubicacion_publica ilike '%' || p_ciudad || '%')
   order by o.actualizado_en desc, o.id
   limit least(greatest(p_limite, 1), 48) offset greatest(p_desfase, 0);
$$;

create or replace function public.convocatoria_publica(p_id uuid)
returns table ( ...los campos de arriba + array de roles con
                nombre, tipo, edad_minima, edad_maxima, vacantes, descripcion,
                y creador_ciudad... )
language sql security definer stable set search_path = public
as $$ select ... from obras o join perfiles_creador c ...
     where o.id = p_id and o.estado = 'publicada' and o.publicacion_web $$;

revoke all on function public.convocatorias_publicas(text,text,int,int) from public;
revoke all on function public.convocatoria_publica(uuid) from public;
grant execute on function public.convocatorias_publicas(text,text,int,int) to anon, authenticated;
grant execute on function public.convocatoria_publica(uuid) to anon, authenticated;
```

`convocatoria_publica` devuelve **cero filas** si la obra no existe, no está `publicada` o tiene `publicacion_web = false` → la página hace `notFound()` (HTTP 404 real).

**Por qué RPC y no cliente `anon` + RLS existente**: `obras_select_publicada` ya deja leer `obras` sin sesión, pero un `select *` filtraría `locacion_ensayos`, `ubicacion_texto`, `ubicacion_lat/lng`, `creador_id`. Y el nombre del creador exige `perfiles_creador`, que **no** es anónima — habría que agregarle una policy `using (true)` para `anon`, exponiendo `ubicacion_texto`/`imagen_url`/`descripcion` de todos los creadores. La función con lista de columnas es la única forma de acotar sin abrir tablas. Es el mismo patrón de `feed_equipo` (`0033`) y `perfil_publico` (`0037`).

**Por qué `SECURITY DEFINER` y no `INVOKER`**: `INVOKER` como `anon` no puede tocar `perfiles_creador`. `buscar_talento` (`0036`) es `INVOKER` porque ahí el invocante siempre es un creador autenticado; acá el invocante es anónimo.

### 4. `obras.publicacion_web boolean not null default true`

```sql
alter table obras add column if not exists publicacion_web boolean not null default true;
```

- Toggle en `acciones-obra.tsx`: junto al botón "Publicar convocatoria" (estado `borrador`) un checkbox "Mostrar en yalope.com y buscadores" prendido, y cuando la obra ya está `publicada`, un switch suelto para prenderlo/apagarlo con `update({ publicacion_web })`.
- Una línea de ayuda: "La convocatoria aparece en el catálogo público de Yalope y puede salir en Google. Los datos de contacto y la dirección de ensayo nunca se publican."
- `default true`: el change existe para traer tráfico; arrancar en `false` deja el catálogo vacío. Espeja `aparece_en_buscador` de `0036`. El costo —"publicar" pasa a implicar "en internet"— se compensa con el texto explícito y el apagado en un clic.

### 5. Rutas y renderizado

| Ruta | Archivo | Render | `robots` |
|---|---|---|---|
| `/` | `src/app/page.tsx` | estático (redirect si hay sesión) | index, follow |
| `/para-talento`, `/para-creadores` | `src/app/para-*/page.tsx` | estático | index, follow |
| `/convocatorias` | `src/app/convocatorias/page.tsx` | ISR `revalidate = 300` | index, follow |
| `/convocatorias/[id]` | `src/app/convocatorias/[id]/page.tsx` | ISR `revalidate = 300`, sin `generateStaticParams` (se generan on-demand y se cachean) | index, follow / `notFound()` |
| `/robots.txt` | `src/app/robots.ts` | estático | — |
| `/sitemap.xml` | `src/app/sitemap.ts` | ISR `revalidate = 300` | — |

El filtro del índice (`?texto=`, `?ciudad=`) se resuelve server-side leyendo `searchParams`; con filtro la página es dinámica (no cacheada), sin filtro es la ISR. "Cargar más" por `?desfase=` o botón cliente que llama la RPC con la anon key (`src/lib/supabase/client.ts`).

### 6. `robots.ts` y `sitemap.ts` (API `MetadataRoute` de Next)

```ts
// src/app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/inicio", "/perfil", "/salas", "/postulaciones", "/notificaciones",
                 "/obras", "/talentos", "/creadores", "/equipo", "/p/",
                 "/ingresar", "/recuperar", "/auth/", "/cambiar-clave",
                 "/elegir-rol", "/completar-perfil"],
    },
    sitemap: "https://yalope.com/sitemap.xml",
  };
}
```

```ts
// src/app/sitemap.ts — lee con el cliente anon
const { data } = await supabaseAnon.rpc("convocatorias_publicas", { p_limite: 48, p_desfase: 0 });
// TODO paginar si supera 48; por ahora el catálogo es chico.
return [
  { url: `${BASE}/`,               changeFrequency: "weekly",  priority: 1 },
  { url: `${BASE}/convocatorias`,  changeFrequency: "daily",   priority: 0.9 },
  { url: `${BASE}/para-talento`,   changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE}/para-creadores`, changeFrequency: "monthly", priority: 0.7 },
  ...(data ?? []).map((c) => ({
    url: `${BASE}/convocatorias/${c.id}`,
    lastModified: c.actualizado_en,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  })),
];
```

`BASE` sale de `metadataBase` o una constante compartida `src/lib/sitio.ts`.

### 7. Metadata y datos estructurados por página

- Cada `page.tsx` público exporta `metadata` (estáticas) o `generateMetadata` (convocatorias) con `title`, `description` únicos y `alternates: { canonical: "/ruta" }` (se resuelve absoluta contra `metadataBase`). OG por página; imagen `/og.png` de fallback.
- **JSON-LD**: componente `src/components/publico/jsonld.tsx` que renderiza `<script type="application/ld+json" dangerouslySetInnerHTML>`.
  - Landing: `Organization` (`name`, `url`, `logo`) + `WebSite` (`url`, `name`).
  - `/convocatorias`: `ItemList` con las URLs de las convocatorias visibles.
  - `/convocatorias/[id]`: `@type: "TheaterEvent"` **solo si** hay `fecha_estreno_estimada` (`name`, `startDate`, `location` = ciudad, `organizer` = nombre del creador). Sin fecha, se omite el bloque de evento y queda solo `BreadcrumbList`.
- **Descartado `JobPosting`**: exige `hiringOrganization`, `jobLocation`, `datePosted`, `validThrough` y Google lo valida como empleo formal; un rol de teatro no lo es y saldría con errores en Search Console.

### 8. Verificación de Google Search Console

En `src/app/layout.tsx`:

```ts
verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
  : undefined,
```

El token se carga como variable de entorno en el host (Vercel). `.env.example` documenta la clave. Sin token no se emite `<meta name="google-site-verification">`. Alternativa (archivo `googleXXXX.html` en `public/`) descartada: la etiqueta es una sola línea y no agrega un archivo al repo.

### 9. CTA "participar" sin RPC nueva

En `/convocatorias/[id]`, para visita sin sesión: link a `/ingresar?next=/convocatorias/<id>` (reusa `conNext` del middleware y el `?next=` que `auth/callback` ya respeta). Con sesión: link a la ruta interna de la obra (`/obras/<id>` o el flujo de postulación que exista). No se agrega circuito de contacto tipo `perfil-publico-enlace`: postularse ya tiene su camino dentro de la app y meterlo acá es otro alcance.

## Risks / Trade-offs

- **Mover la home rompe punteros internos** → grep exhaustivo de `href="/"`, `push("/")`, `redirect("/")`, `redirigir("/")` antes de tocar nada; el `matcher` y `RUTAS_ABIERTAS` cubren el resto. Smoke-test del onboarding completo (registro → elegir rol → completar perfil → llegar a `/inicio`).
- **Páginas por rol "delgadas" = doorway pages** → penalización de Google si `/para-talento` y `/para-creadores` son un párrafo y un botón. Mitigación: cada una con contenido sustancial y único (cómo funciona, qué resuelve, preguntas frecuentes); si no hay copy real, es mejor no publicarlas que publicarlas vacías.
- **Indexar el nombre de un creador** → es nombre artístico o de compañía, aparece solo con `estado = 'publicada'` y `publicacion_web = true`, y se retira en un clic. No se indexa ningún dato de talento ni de contacto. Documentado en el spec.
- **Convocatoria indexada que después cierra → soft 404** → `notFound()` devuelve 404 real, sale del sitemap en ≤5 min (ISR), y Google la desprioriza al recrawlear. Aceptable; el spec habla de "plazo acotado".
- **`add column ... not null default true` en `obras`** → additive, default constante: Postgres ≥11 no reescribe la tabla. Sin bloqueo relevante.
- **Sitemap con cliente `anon` en build/revalidate** → `sitemap.ts` corre en request/revalidate, no en build; con `revalidate = 300` nunca queda más de 5 min viejo. Si la anon key falla, devuelve solo las rutas estáticas (degradación, no error).
- **El SEO no lo garantiza el código** → indexación en días, posicionar en semanas o meses, y depende de contenido y enlaces entrantes, no solo de tags. Este change deja el sitio *indexable y correcto*; el ranking es trabajo posterior (contenido, backlinks, GMB). Hay que decírselo a quien espera resultados.
- **Doble RPC (page + `generateMetadata`) en el detalle** → igual que en `perfil-publico`: query trivial; envolver en `React.cache` si molesta.
- **Filtro dinámico desactiva el cache del índice** → una visita con `?ciudad=` paga la RPC. Es de bajo costo y el caso común (sin filtro) sigue siendo ISR.

## Migration Plan

1. **`supabase/migrations/0038_superficie_publica_seo.sql`** — aditiva e idempotente:
   1. `alter table obras add column if not exists publicacion_web boolean not null default true;`
   2. `create or replace function convocatorias_publicas(...)` y `convocatoria_publica(...)`, `SECURITY DEFINER`, `stable`, `set search_path = public`.
   3. `revoke all ... from public;` + `grant execute ... to anon, authenticated;` para ambas.
2. **Aplicar a producción antes del deploy** con el PAT `sbp_` + Management API (memoria [[deploy-migraciones-prod]]); registrar la fila en `supabase_migrations.schema_migrations`.
3. **Verificar en prod**:
   - `select publicacion_web from obras limit 1;` → columna existe, default `true`.
   - Como `anon`: `select * from convocatorias_publicas();` → devuelve solo publicadas con `publicacion_web`, sin `locacion_ensayos` ni `creador_id`.
   - `select * from convocatoria_publica('<uuid-de-obra-cerrada>');` → 0 filas.
4. **Merge del código a `main`** (después de `perfil-publico-enlace`, rebasando el middleware). Deploy automático.
5. **Post-deploy**:
   - `curl -s https://yalope.com/robots.txt` y `/sitemap.xml` → 200 con contenido.
   - `/` sin cookies → 200 con HTML de la landing; con sesión → 307 a `/inicio`.
   - `/convocatorias/<id-publicada>` sin sesión → 200; `/convocatorias/<id-cerrada>` → 404.
   - Alta de la propiedad en Google Search Console (cargar `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` en el host, redeploy), enviar el sitemap, pedir indexación de `/`, `/convocatorias` y 2-3 convocatorias.
6. **Rollback**: `drop function convocatorias_publicas(text,text,int,int); drop function convocatoria_publica(uuid); alter table obras drop column publicacion_web;` + revertir el código (borrar `robots.ts`, `sitemap.ts`, rutas públicas; devolver la home a `(app)/page.tsx`). Sin pérdida de dato.

## Open Questions

- **Copy final** de la landing, `/para-talento`, `/para-creadores`, la línea del toggle y las metadescripciones. Se redacta en implementación; no cambia specs ni enfoque.
- **Filtro de ciudad**: campo de texto libre (`ilike`) vs. lista de `distinct ubicacion_publica`. Se decide en tasks mirando cuántas ciudades hay; el spec solo pide "filtrar por ciudad".
- **Imagen OG por convocatoria** (`opengraph-image.tsx` con `ImageResponse` y el título de la obra) vs. `/og.png` fija. Mejora de presentación, se puede sumar después sin tocar specs.
- **Revalidación on-demand** (`revalidatePath` desde una acción del servidor al publicar/cerrar una obra) en vez de la ventana de 300 s. Optimización; el spec admite "plazo acotado".
