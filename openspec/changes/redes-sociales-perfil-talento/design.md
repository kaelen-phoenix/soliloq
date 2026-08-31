## Context

Ver `proposal.md` — Why. El perfil de talento (`perfiles_talento`) se edita entero desde `formulario-talento.tsx`, que arma un objeto plano de campos y hace `insert`/`update` directo contra PostgREST — no hay backend propio, así que la validación de forma vive en el cliente y el `check` de la migración es la última red. El detalle público del perfil se arma en las páginas server (`talentos/[id]`, `vista-perfil-propio`) que seleccionan columnas explícitas y las pasan a `PerfilTalentoDetalle`.

`habilidades` es un `text[]` de una lista cerrada de disciplinas; no tiene relación con redes y no se toca.

## Goals / Non-Goals

**Goals:**
- Un único lugar de verdad para el catálogo de redes (clave, etiqueta, icono, regla de dominio, normalización).
- Normalización idempotente: normalizar una URL ya canónica devuelve lo mismo.
- Validación en cliente antes de guardar, con `check` de forma en la base como respaldo.
- Presentación que colapsa a nada cuando no hay redes.

**Non-Goals:**
- No se verifica que la cuenta exista o sea de esa persona (no se hace request a la red).
- No se muestran las redes en ninguna superficie sin sesión — eso lo define el issue #3.
- No se agrega orden configurable de las redes: el orden es el del catálogo.
- No hay embed ni preview de contenido; solo enlace.

## Decisions

### 1. `redes jsonb` en `perfiles_talento`, no tabla aparte

El conjunto de redes es chico (7) y estable. Un objeto `{ [clave]: url_canonica }` alcanza y evita un `join` en cada lectura de perfil. Una tabla aparte solo se justificaría con orden por usuario o redes dinámicas, y ninguna de las dos está en alcance.
Alternativa descartada: columnas `instagram_url`, `youtube_url`, … — 7 columnas nullable que crecen con cada red nueva y obligan a migración por cada alta de red.

Forma guardada: objeto JSON con claves del catálogo y valores string URL `https`. Claves ausentes = red no cargada. `check (jsonb_typeof(redes) = 'object')` en la migración; el resto de la forma la garantiza el cliente.

### 2. Catálogo en `constantes.ts`, helpers en `src/lib/redes.ts`

`constantes.ts` ya concentra las listas cerradas (`HABILIDADES`, `GENEROS`). Se agrega `REDES`: por cada red, `clave`, `etiqueta`, `hosts` aceptados (p. ej. `["instagram.com", "www.instagram.com"]`), `prefijoCanonico` y un `icono`.
`redes.ts` expone `normalizarRed(clave, entrada): string | null` y `validarRedes(redes): Record<clave, string>` reutilizables por el formulario y, si hiciera falta, por scripts. Se separan de `constantes.ts` porque llevan lógica (parseo de URL, armado de la canónica), no solo datos.

### 3. Reglas de normalización

- Entrada vacía o solo espacios → la red queda sin cargar (clave ausente).
- Empieza con `@` o no parece URL (sin `.` ni esquema) → se trata como identificador: `prefijoCanonico + identificador` (se saca el `@` inicial, se recorta whitespace).
- Parece URL → se le antepone `https://` si no trae esquema, se parsea con `new URL()`. Si el host no está en `hosts` de esa red → `null` (error de dominio). Si parsea → se reconstruye canónica: `https://<hostCanonico><pathname sin barra final>`, se descartan query y hash salvo que la red los necesite (YouTube: si el path es `/watch` se conserva `?v=`; caso contemplado en el catálogo con un flag `conservarQuery`).
- Sitio web propio: cualquier host; se exige que `new URL()` parsee y el esquema resultante sea `https`. Se rechaza `http`.
- `new URL()` que tira → `null`.

### 4. Validación en el formulario

Estado local `redes: Record<clave, string>` (lo que la persona tipeó, sin normalizar). En `validar()`, por cada campo no vacío se llama `normalizarRed`; si devuelve `null` se marca error en ese campo. Al guardar se manda el objeto de valores ya normalizados, omitiendo las claves vacías. Mismohelper en alta y en edición.

### 5. Presentación

`PerfilTalentoDetalle` recibe `redes` en `TalentoDetalle`. Si el objeto tiene al menos una clave, renderiza una fila de `<a target="_blank" rel="noopener noreferrer">` con el icono de cada red presente, en el orden del catálogo. Si está vacío, no renderiza el bloque. Los iconos salen del set que ya usa la app (`components/ui/icono.tsx`); las redes que no tengan icono propio ahí se agregan como paths nuevos en ese componente.

## Risks / Trade-offs

- **Normalización incompleta para casos raros de URL** (perfiles con locale en el path, handles con mayúsculas, shortlinks) → se guarda lo que se pueda canonizar y, ante la duda, se acepta la URL tal cual si el host valida; el objetivo es un enlace que funcione, no una canónica perfecta.
- **`jsonb` sin esquema fuerte en la base** → una escritura que saltee el cliente podría meter claves basura. Mitigación: el `check` de tipo objeto frena lo peor; la lectura del perfil ignora claves fuera del catálogo al renderizar.
- **Validación de dominio da falsa sensación de verificación** → el texto de ayuda deja claro que solo se comprueba el formato del enlace, no que la cuenta exista.
- **Iconos nuevos en `icono.tsx`** → si falta el path de alguna red, el bloque quedaría con un hueco; la tarea incluye verificar los 7 iconos antes de cerrar.

## Migration Plan

1. `0035_redes_talento.sql`: `alter table perfiles_talento add column redes jsonb not null default '{}'::jsonb, add constraint redes_es_objeto check (jsonb_typeof(redes) = 'object');`
2. Aplicar con `supabase db push` contra producción (requiere password de la base).
3. Deploy de la app por merge a `main`.
4. Rollback: `alter table perfiles_talento drop column redes;` — no hay dato que preservar mientras nadie haya cargado redes; una vez en uso, el rollback pierde solo las redes cargadas, no el resto del perfil.

El orden importa: la migración va **antes** del deploy, porque el `select` nuevo pide la columna. Si el deploy llega primero, las páginas de perfil rompen hasta que corra la migración.
