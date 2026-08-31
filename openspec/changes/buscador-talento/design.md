## Context

Ver `proposal.md` — Why. No hay backend propio: el cliente habla directo con PostgREST, así que **el filtrado y la paginación viven en Postgres** (mismo criterio que `feed_para_talento`, `0020`). La visibilidad de un perfil de talento la define la RLS de `perfiles_talento`; hoy solo se abre para un creador si esa persona se postuló a una obra suya (`talento_se_postulo_a_mis_obras`, `0007`). Los bloqueos (`0022`) ya recortan `perfiles_talento` y `fotos_talento` con políticas **restrictivas** (AND), y la vista/función del feed las heredan solas.

`fotos-perfil` ya es un bucket de lectura pública (`0010_rls_storage.sql`), así que la foto de la grilla no necesita URL firmada.

## Goals / Non-Goals

**Goals:**
- El creador encuentra talento por iniciativa propia, con la foto como elemento dominante.
- El talento controla si aparece; por defecto aparece, pero se entera.
- Una sola query paginada para la grilla; nada de traer todos los perfiles al cliente.
- No ampliar la superficie de lectura más de lo necesario: la grilla devuelve una proyección; el perfil completo se abre aparte con una política acotada a opt-in.

**Non-Goals:**
- Contactar o invitar desde la búsqueda (feature aparte).
- Ranking o recomendación algorítmica: el orden es estable y explicable (nombre).
- Concepto de "foto de portada": se usa la primera por `orden`.
- Buscador de creadores (el perfil de creador ya es de lectura abierta para autenticados).

## Decisions

### 1. Opt-in: `aparece_en_buscador boolean not null default true`

Columna en `perfiles_talento`. `true` por defecto para que la grilla no arranque vacía; el switch se muestra en el formulario con una línea que explica qué implica. Apagarlo no afecta postulaciones ni "armar equipo": solo saca de la grilla.

Alternativa descartada: tabla o enum de "nivel de visibilidad". No hay más de dos estados en alcance.

### 2. Lectura para creadores: política nueva + RPC de proyección, no abrir la tabla

Dos piezas:

- **RPC `buscar_talento(...)` `SECURITY INVOKER`, `stable`**: hace el `where` de los filtros y el `limit/offset`, y devuelve **solo** `id, nombre, edad (calculada), ubicacion_publica, habilidades, foto_principal_path`. Nunca `fecha_nacimiento`, `ubicacion_texto`, `ubicacion_lat/lng`, `experiencia`, `videoreel_url`, `genero_descripcion`. Al ser `security invoker` hereda la RLS y las restrictivas de bloqueo, igual que `feed_para_talento`.
- **Políticas permisivas nuevas** sobre `perfiles_talento` y `fotos_talento`:
  `for select using (public.puede_buscar_talento() and aparece_en_buscador = true)`.
  `puede_buscar_talento()` es `SECURITY DEFINER` (patrón `0005`) y devuelve `exists (select 1 from perfiles_creador where id = auth.uid())`. Sin esto, la RPC no podría leer el subconjunto, y además habilita que `/talentos/[id]` abra el perfil completo de un talento de la grilla. Las permisivas combinan con OR con las existentes (`_propio`, `_para_creador`); las restrictivas de bloqueo de `0022` siguen combinando con AND y no hay que tocarlas.

Se acepta que un creador autenticado pueda leer la fila completa (incluida `fecha_nacimiento`) de un talento **que optó por aparecer**. Es el precio de "al tocar la tarjeta se abre el perfil completo", y el opt-in es el consentimiento. La grilla, que es la superficie masiva, nunca expone esos campos.

### 3. Filtros, todos en la RPC

Firma:
```
buscar_talento(
  p_texto        text  default null,   -- ilike sobre nombre
  p_edad_min     int   default null,
  p_edad_max     int   default null,
  p_generos      genero_persona[] default '{}',
  p_habilidades  text[] default '{}',
  p_lat          double precision default null,
  p_lng          double precision default null,
  p_radio_metros int   default null,
  p_limite       int   default 24,
  p_offset       int   default 0
)
```
- Texto: `p_texto is null or t.nombre ilike '%' || p_texto || '%'`.
- Edad: sobre `extract(year from age(t.fecha_nacimiento))::int`, cada extremo opcional.
- Género: `cardinality(p_generos) = 0 or t.genero = any (p_generos)`.
- Habilidades: `cardinality(p_habilidades) = 0 or t.habilidades && p_habilidades` (solapamiento).
- Geo: mismo `earth_box` + `earth_distance` que `0020`, solo si `p_lat/p_lng/p_radio_metros` vienen.
- **Sin foto → fuera**: `exists (select 1 from fotos_talento f where f.talento_id = t.id)`.
- Excluye la propia fila: `t.id <> auth.uid()`.
- `foto_principal_path = (select storage_path from fotos_talento f where f.talento_id = t.id order by f.orden limit 1)`.
- Orden: `t.nombre asc, t.id asc` (estable para que `offset` no repita ni saltee).
- `limit p_limite offset p_offset`.

### 4. Pantalla y navegación

- `src/app/(app)/talentos/page.tsx`: server component. `leerEstadoCuenta`; si `modoActivo !== "creador"` → `redirect("/")`. Pasa `creadorId` y hace la primera llamada a la RPC.
- `buscador-talento.tsx` (client): estado de filtros, llama `supabase.rpc("buscar_talento", …)`, botón "Cargar más" que incrementa `offset`. La ubicación reusa `CampoUbicacion` + un control de radio como en el feed.
- `tarjeta-talento.tsx`: `<Link href={/talentos/${id}}>` con la foto en `aspect-[3/4]` como elemento dominante; nombre, edad, ubicación y habilidades en segundo plano.
- `items-navegacion.tsx`: en `creador`, item `{ href: "/talentos", label: "Buscar talento", labelCorto: "Buscar", icono: "buscar" }`. Se agrega el icono `buscar` (lupa) a `icono.tsx` y al union `ItemNavegacion["icono"]`.

### 5. Formulario de perfil

`formulario-talento.tsx` suma el switch "Aparecer en el buscador de creadores" (default `true`), con la línea: "Necesitás al menos una foto para que te encuentren". `aparece_en_buscador` entra en `DatosIniciales`, en el estado y en `campos` de `guardar()`.

## Risks / Trade-offs

- **`fecha_nacimiento` legible por cualquier creador para talento opt-in** → mitigado: es opt-in, la sesión ya es de un creador, y la grilla masiva nunca la devuelve. Revertir a "solo proyección, nunca perfil completo" rompería el criterio de aceptación de abrir el perfil al tocar la tarjeta.
- **`offset` con datos que cambian** → si un talento cambia de nombre entre dos páginas puede repetir o saltear una fila. Aceptable para el volumen actual; el orden por `(nombre, id)` acota el efecto.
- **`ilike '%x%'` sin índice trigram** → a esta escala (decenas de perfiles) es irrelevante; si crece, se agrega `pg_trgm`.
- **La foto principal es la de `orden` más bajo**, que el talento no eligió pensando en esto. Es la misma que ya se muestra primero en el perfil, así que no hay sorpresa.

## Migration Plan

1. `0036_buscador_talento.sql`: `add column aparece_en_buscador`; `puede_buscar_talento()`; políticas permisivas de select; `buscar_talento(...)`. Todo aditivo e idempotente.
2. Aplicar a producción (Management API o `supabase db push`) **antes** del deploy: el código nuevo llama a la RPC y lee la columna.
3. Deploy por merge a `main`.
4. Rollback: `drop function buscar_talento; drop policy … ; alter table perfiles_talento drop column aparece_en_buscador;`. Sin pérdida de dato de perfil.
