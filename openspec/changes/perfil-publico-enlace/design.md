## Context

Ver `proposal.md` — Why. Restricciones que moldean el enfoque:

- **No hay backend propio.** El cliente habla directo con PostgREST; lo que se quiere exponer o esconder se define en Postgres (RLS o funciones), no en una capa intermedia.
- **`0007_rls_perfiles.sql`**: `perfiles`, `perfiles_talento` y `fotos_talento` solo se leen con `auth.uid()` propio (o, para talento, un creador a cuyas obras se postuló). `perfiles_creador` y `obras_previas` se leen con cualquier sesión. Ninguna tabla se lee sin sesión.
- **`0010_rls_storage.sql`**: el bucket `fotos-perfil` tiene `for select using (bucket_id = 'fotos-perfil')` — **lectura pública real, sin `auth.uid()`**. `getPublicUrl` sirve a anónimos.
- **`0033_armar_equipo.sql`**: `intereses_equipo (de_perfil, a_perfil, interesa)` con RLS `de_perfil = auth.uid()` para insert/select/update y restrictiva `bloqueo_intereses`. El trigger `al_marcar_interes()` crea la sala y notifica cuando el interés es mutuo. `perfiles.busca_equipo` y `feed_equipo()` (`SECURITY DEFINER`, proyección acotada) son el precedente exacto de "mostrar gente sin abrir `perfiles_talento`".
- **`middleware.ts`** (`src/lib/supabase/middleware.ts`): sin sesión, todo lo que no está en `RUTAS_PUBLICAS` redirige a `/ingresar`; **con** sesión, `RUTAS_PUBLICAS` redirige a `/`. Una ruta que deba servir a ambos no encaja en ninguna de las dos listas actuales.
- **`tipo_notificacion`** es un enum; se extiende con `alter type ... add value if not exists` (`0030`, `0032`).
- **`auth/callback/route.ts`** ya lee `?next=` y redirige ahí tras autenticar.

## Goals / Non-Goals

**Goals:**
- Una sola superficie anónima, chica y auditable: una ruta, una función `SECURITY DEFINER` con lista de columnas explícita.
- Cero políticas nuevas de lectura anónima sobre tablas de perfil. Si mañana se quiere cerrar la vidriera, se `revoke` una función y se cae sola.
- El contacto desde la vidriera reusa `intereses_equipo` y su trigger tal como están; lo único nuevo es cómo se entera el dueño.
- Token revocable de verdad: apagar el flag o rotar el token invalida la URL vieja en la misma request siguiente.

**Non-Goals:**
- Perfiles públicos indexables / SEO (queda `noindex`).
- Analítica de visitas al perfil compartido.
- Respetar bloqueos en la vista anónima (imposible con enlace público; se acepta explícito).
- Vidriera pública del feed de armar equipo: es otra proyección (`0033` a propósito no muestra fotos ni edad); no se toca.
- Mostrar videoreel o redes en la vidriera (son canales hacia afuera; fuera de alcance como el issue de redes ya fijó para las redes).

## Decisions

### 1. Token + flag en `perfiles`, no tabla aparte

```sql
alter table perfiles
  add column if not exists enlace_token uuid not null default gen_random_uuid(),
  add column if not exists enlace_publico_activo boolean not null default false;
create unique index if not exists idx_perfiles_enlace_token on perfiles (enlace_token);
```

El token existe siempre (default), pero la URL solo resuelve con `enlace_publico_activo = true`. "Regenerar" es `update perfiles set enlace_token = gen_random_uuid() where id = auth.uid()` — cabe en la política `perfiles_update_propio` existente, sin SQL nuevo de escritura.

**Alternativa descartada**: tabla `enlaces_publicos` con histórico de tokens. No hay requisito de histórico ni de varios enlaces por perfil; dos columnas alcanzan.

**Alternativa descartada**: URL adivinable `/p/<usuario>`. El issue ya se inclinó por token: es el perfil de una persona real y tiene que poder revocarse.

### 2. La vidriera se sirve por `perfil_publico(p_token uuid)` `SECURITY DEFINER`, no por políticas anónimas

```sql
create or replace function public.perfil_publico(p_token uuid)
returns table (
  tipo text,              -- 'talento' | 'creador'
  nombre text,
  texto text,             -- experiencia (talento) | descripcion (creador)
  habilidades text[],     -- habilidades (talento) | '{}'
  disciplinas disciplina_artistica[],  -- '{}' (talento) | disciplinas (creador)
  otro_detalle text,      -- null (talento) | otro_detalle (creador)
  fotos text[]            -- storage_path ordenados (talento) | array[imagen_url path] o '{}'
)
language sql security definer stable set search_path = public
as $$
  ... where p.enlace_token = p_token and p.enlace_publico_activo
$$;
revoke all on function public.perfil_publico(uuid) from public;
grant execute on function public.perfil_publico(uuid) to anon, authenticated;
```

Devuelve **cero filas** si el token no existe o el enlace está apagado — el mismo resultado, así el 404 es indistinguible (requisito). Nunca devuelve `fecha_nacimiento`, `genero`, `ubicacion_*`, `redes`, `videoreel_url`, correo ni teléfono.

Las fotos salen como `storage_path`; el server component arma la URL con `getPublicUrl` (bucket público). Para el creador, `imagen_url` ya es una URL pública guardada como texto: se devuelve como único elemento del array o vacío.

**Por qué no una política permisiva `using (enlace_publico_activo)` sobre `perfiles_talento` + `fotos_talento`**: abriría la fila entera (incluida `fecha_nacimiento`, `ubicacion_lat/lng`) a cualquier anónimo, y el issue es explícito en que eso no puede pasar. La función con lista de columnas es la única forma de garantizar la proyección.

### 3. Ruta `/p/[token]` fuera de `(app)`, con su propio `generateMetadata`

- `src/app/p/[token]/page.tsx`: server component. Llama `supabase.rpc("perfil_publico", { p_token })` con el **cliente anónimo** (no el de sesión). Sin filas → `notFound()`.
- `generateMetadata({ params })`: hace la misma RPC; setea `title = nombre`, `openGraph.images = [primeraFotoUrl]` (fallback `/og.png`), y `robots: { index: false, follow: false }`.
- No usa el layout de `(app)` (sin barra lateral ni navegación): la vidriera es para alguien que no tiene cuenta.
- Reusa el armado visual de `perfil-talento-detalle.tsx` recortado en un componente nuevo `vidriera-publica.tsx` (fotos en grilla, texto, chips de habilidades/disciplinas). Sin `BotonDenuncia` (requiere sesión y perfil).

### 4. `middleware.ts`: `/p/` es ruta abierta a todos

Se agrega una lista `RUTAS_ABIERTAS = ["/p/"]` que se evalúa **antes** de las ramas de sesión: si `path` empieza con `/p/`, `return response` sin más, con o sin usuario. Así un anónimo la ve y un usuario logueado también (hoy `RUTAS_PUBLICAS` lo rebotaría a `/`).

Además, en `./middleware.ts` (raíz) se agrega la cabecera `X-Robots-Tag: noindex, nofollow` a la respuesta cuando `path` empieza con `/p/` — defensa en profundidad junto al `robots` de `generateMetadata`.

### 5. Contacto: reusa `intereses_equipo`, suma `contactar_desde_perfil()` y la notificación `interes_recibido`

**Sin sesión**: el botón "Contactar" es un link a `/ingresar?next=/p/<token>`. `auth/callback` ya respeta `next`; al terminar el onboarding vuelve a la vidriera. Ahí, ya con sesión, el botón cambia a la acción real.

**Con sesión**:
```sql
create or replace function public.contactar_desde_perfil(p_token uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_duenio uuid;
begin
  select id into v_duenio from perfiles where enlace_token = p_token and enlace_publico_activo;
  if v_duenio is null then raise exception 'enlace no disponible'; end if;
  if v_duenio = auth.uid() then raise exception 'es tu propio perfil'; end if;
  if public.hay_bloqueo(v_duenio) then raise exception 'no disponible'; end if;
  insert into intereses_equipo (de_perfil, a_perfil, interesa)
    values (auth.uid(), v_duenio, true)
    on conflict (de_perfil, a_perfil) do update set interesa = true;
end;
$$;
```

El `insert` dispara `al_marcar_interes()` (`0033`) sin cambios: si el dueño ya había marcado interés (poco probable acá) se abre la sala; si no, no pasa nada… **salvo** la pieza nueva:

**`interes_recibido`**: `alter type tipo_notificacion add value if not exists 'interes_recibido'`, y en `al_marcar_interes()` —o en un trigger hermano para no reescribir esa función— cuando `new.interesa` y **no** hay recíproco, insertar `notificaciones (destinatario_id => new.a_perfil, tipo => 'interes_recibido', ...)` con referencia a `new.de_perfil`. La notificación linkea a una pantalla donde el dueño ve la **proyección acotada** de esa persona (se reusa `feed_equipo`'s shape, o un `perfil_para_responder(p_de uuid)` `SECURITY DEFINER` análogo) y un botón "me interesa" que hace el `insert` recíproco → el trigger existente arma la sala.

Decidir en tasks si se agrega columna `actor_id`/`de_perfil` a `notificaciones` o si se reusa una referencia ya existente. La tabla `notificaciones` hoy referencia `sala_id`; para `interes_recibido` no hay sala todavía, así que hace falta llevar **quién** generó el interés. Es el único cambio de forma de `notificaciones`.

**Alternativa descartada** (más chica): no notificar; confiar en que quien contacta prenda `busca_equipo` y aparezca en el feed del dueño. Rechazada: quien llega desde un enlace compartido viene a contactar a **una** persona, no a explorar; obligarlo a entrar al feed de armar equipo (y exponerse ahí a todos) es fricción y sobreexposición. El contacto dirigido necesita un canal dirigido.

### 6. Alcance: talento y creador

La columna vive en `perfiles` (compartida). Los dos tipos de perfil obtienen la acción de compartir en `/perfil` y una vidriera en `/p/[token]`. `perfil_publico()` ramifica por `tipo`. Para el creador la lectura logueada ya era abierta; lo nuevo es la superficie anónima, igual que para el talento. No duplica trabajo: es un `coalesce`/`union` en una función.

## Risks / Trade-offs

- **`fecha_nacimiento` y ubicación NO se exponen, pero el nombre + fotos sí, a internet abierto** → mitigado: es opt-in explícito, `noindex`, y la única forma de llegar es tener el token. El dueño puede revocar en un toque.
- **Enlace filtrado / token en logs de terceros** → el token es un UUID v4 (122 bits); no se adivina. Revocable con regeneración. No se loguea del lado de la app más de lo que cualquier URL.
- **`alter type ... add value` no corre dentro de una transacción** → la migración manda ese statement **en su propia llamada** a la Management API (o su propio archivo si se usa `supabase db push`), antes del resto. Gotcha conocido, ya visto en `0030`/`0032`.
- **`al_marcar_interes()` es `SECURITY DEFINER` y se toca** → si se agrega ahí la notificación nueva, revisar que no cambie el camino del match mutuo existente. Preferible un trigger `after insert or update` separado que solo emita `interes_recibido`, dejando `al_marcar_interes()` intacto.
- **La vidriera anónima hace 2 RPC iguales** (page + `generateMetadata`) → aceptable; Next dedupe de `fetch` no aplica a `rpc`, pero la query es trivial y cacheable. Si molesta, `React.cache` sobre el fetch.
- **Un usuario logueado que abre `/p/<su-propio-token>`** ve su vidriera como la ve un extraño; el botón "Contactar" se oculta si `auth.uid()` es el dueño. Sin efecto adverso.
- **Bloqueo y vista anónima**: alguien bloqueado ve la vidriera. Aceptado y documentado en el spec; el contacto registrado sí lo frena.

## Migration Plan

1. `0037_perfil_publico_enlace.sql`, aditiva e idempotente:
   1. `alter type tipo_notificacion add value if not exists 'interes_recibido';` — **en su propia sentencia/llamada**, fuera de transacción.
   2. `alter table perfiles add column enlace_token ...`, `enlace_publico_activo ...`; unique index.
   3. Cambio de forma en `notificaciones` para llevar el `de_perfil`/actor del interés (columna nullable nueva).
   4. `perfil_publico(uuid)`, `contactar_desde_perfil(uuid)`, `perfil_para_responder(uuid)` (o reuso de `feed_equipo` shape); `revoke`/`grant`.
   5. Trigger `after insert or update on intereses_equipo` que emite `interes_recibido` cuando el interés no es recíproco.
2. Aplicar a producción **antes** del deploy (Management API con el PAT en `~/.soliloq-deploy/supabase-token.txt`, o `supabase db push`), registrar en `supabase_migrations.schema_migrations`.
3. Verificar en prod: la columna y el default; `perfil_publico()` como `anon` con token válido devuelve la proyección y con token inválido devuelve 0 filas; `contactar_desde_perfil()` como una sesión inserta el interés y rechaza el par bloqueado; el enum tiene el valor nuevo.
4. Deploy por merge a `main`. Smoke-test: `/p/<token-real-activo>` responde 200 sin sesión; `/p/<random>` responde 404.
5. Rollback: `drop` de las tres funciones y el trigger; `alter table perfiles drop column enlace_token, drop column enlace_publico_activo`; la columna nueva de `notificaciones` se puede dejar (nullable, inofensiva). El valor de enum queda (Postgres no borra valores de enum); sin efecto sin el trigger.

## Open Questions

- **Forma exacta de `notificaciones` para el actor del interés**: columna `de_perfil uuid` nullable nueva vs. reusar una referencia genérica. Se resuelve al escribir la tarea 1.x mirando la tabla real; no cambia specs ni enfoque.
- **Copys** de la línea que explica qué queda visible al activar el enlace, del texto del botón "Contactar" y de la notificación `interes_recibido`. Se afinan en implementación.
