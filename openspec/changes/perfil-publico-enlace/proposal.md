## Why

Hoy ningún perfil se puede ver sin sesión: todas las políticas de lectura de `0007_rls_perfiles.sql` exigen `auth.uid() is not null`. Compartir un perfil por WhatsApp o Instagram —algo que una persona quiere hacer con su propio material de presentación— obliga hoy a que quien lo recibe se registre antes de ver una sola foto. Esta feature abre, por primera vez, una superficie pública y anónima de la app: **el enlace es una vidriera, no una puerta**. Para *ver* no hace falta cuenta; para *contactar*, sí.

## What Changes

- **Ruta pública nueva `/p/[token]`**, fuera del grupo `(app)`, que resuelve **sin sesión** y no redirige a login.
- **Opt-in con token revocable**: `perfiles` suma `enlace_token uuid` (aleatorio, único) y `enlace_publico_activo boolean not null default false`. La acción de compartir en `/perfil` es la que activa el enlace, con una línea que explica qué queda visible. Volver a apagarlo —o regenerar el token— hace que la URL deje de resolver.
- **Qué se ve sin sesión**: solo **fotos**, **experiencia o descripción**, y **habilidades o disciplinas**, más el nombre. Nada de correo, teléfono, redes sociales, fecha de nacimiento, ni ubicación (ni la pública). Sin videoreel (es un canal hacia otra plataforma).
- **Proyección por RPC `SECURITY DEFINER`** `perfil_publico(p_token uuid)` (patrón de `feed_equipo`, `0033`): devuelve solo esos campos y nada más. **No se agregan políticas de lectura anónima** sobre `perfiles`, `perfiles_talento`, `fotos_talento` ni `perfiles_creador`. Token desconocido o enlace apagado → la RPC devuelve vacío y la página responde **404** (nunca un "no autorizado" que confirme que la persona existe).
- **Fotos**: el bucket `fotos-perfil` ya es de lectura pública para anónimos (`0010_rls_storage.sql`), así que `getPublicUrl` funciona sin sesión y sin URLs firmadas.
- **Open Graph / Twitter Card** con la primera foto y el nombre, para que el enlace pegado en WhatsApp o redes muestre una tarjeta. `noindex` por defecto (meta `robots` + `X-Robots-Tag`): que Google indexe el perfil es un cambio grande para alguien que solo quería mandarlo por chat.
- **Contacto desde el perfil público**:
  - Acción "Contactar" visible en la vidriera.
  - Sin sesión → registro (`/ingresar?next=/p/<token>`), y al terminar vuelve al perfil desde el que venía, no a la home. El registro **no obliga a elegir rol creador**.
  - Con sesión → marca interés en `intereses_equipo` (`0033`), del que mira hacia el dueño. Si el interés es mutuo, se abre la sala por el trigger existente. **No** se exige crear una obra.
  - El dueño se entera por una **notificación nueva** (`tipo = 'interes_recibido'`) que lo lleva a la proyección acotada de esa persona para responder el interés. Sin esto, el modelo de match ciego de `0033` no tiene forma de cerrarse cuando el contacto nace de un enlace y no del feed.
- **Bloqueos**: la vidriera anónima no puede respetar bloqueos (es el precio de un enlace público, y se decide a conciencia). El **contacto**, ya registrado, sí: `intereses_equipo` ya trae la restrictiva `bloqueo_intereses`, y la RPC de contacto rechaza el par bloqueado con `hay_bloqueo`.

## Capabilities

### New Capabilities

- `perfil-publico`: una persona comparte su perfil con un enlace de token revocable; quien lo recibe ve una vidriera anónima (fotos, experiencia/descripción, habilidades/disciplinas) sin registrarse, y para contactar se registra y el contacto se resuelve por el circuito de armar equipo.

### Modified Capabilities

<!-- Ninguna: `openspec/specs/` no tiene specs sincronizadas todavía; la edición del perfil que suma el control de compartir queda descrita dentro de la capability nueva. -->

## Impact

**Base de datos** — migración `0037_perfil_publico_enlace.sql` (aditiva e idempotente):
- `perfiles.enlace_token uuid unique` (default `gen_random_uuid()`), `perfiles.enlace_publico_activo boolean not null default false`.
- RPC `perfil_publico(p_token uuid)` `SECURITY DEFINER`, `stable`, `set search_path = public`: proyección acotada de talento o creador, `grant execute to anon, authenticated`.
- RPC `contactar_desde_perfil(p_token uuid)` `SECURITY DEFINER`: valida sesión y token activo, rechaza par bloqueado, hace el `insert ... on conflict` en `intereses_equipo` de `auth.uid()` → dueño.
- Nuevo valor `'interes_recibido'` en el enum de `notificaciones.tipo`; trigger sobre `intereses_equipo` que lo emite cuando el interés no es (todavía) recíproco.

**Código**:
- `src/app/p/[token]/page.tsx` — ruta pública nueva, server component, `generateMetadata` con OG y `robots: noindex`, `notFound()` si la RPC vuelve vacía.
- `src/components/perfil/vidriera-publica.tsx` — la vista anónima (reusa el layout de `perfil-talento-detalle` recortado).
- `src/components/perfil/boton-compartir.tsx` — Web Share API con fallback (WhatsApp, X, Instagram, Facebook, copiar enlace); activa el enlace en el primer uso y ofrece apagarlo/regenerarlo.
- `src/app/(app)/perfil/page.tsx` — suma la acción de compartir a la vista del perfil propio (talento y creador).
- `middleware.ts` — `X-Robots-Tag: noindex` para `/p/*`; excluir `/p/*` del gate de sesión.
- Circuito de contacto: página o panel para responder un `interes_recibido` desde notificaciones.
- `src/lib/supabase/types.ts` — columnas nuevas, firmas de las dos RPC, nuevo `tipo` de notificación.

**Sin cambios de storage**: `fotos-perfil` ya sirve a anónimos.

**Rollback**: `drop function perfil_publico, contactar_desde_perfil; drop trigger; alter table perfiles drop column enlace_token, drop column enlace_publico_activo;`. Sin pérdida de dato de perfil. El valor de enum nuevo queda (los enums no se recortan), inofensivo.
