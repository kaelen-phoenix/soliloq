## 1. Base de datos

- [ ] 1.1 Crear `supabase/migrations/0037_perfil_publico_enlace.sql`, aditiva e idempotente. Primer bloque, en su propia sentencia (fuera de transacción, gotcha de `0030`/`0032`): `alter type tipo_notificacion add value if not exists 'interes_recibido';`. Verificar número estrictamente creciente respecto de `0036`.
- [ ] 1.2 En la misma migración: `alter table perfiles add column if not exists enlace_token uuid not null default gen_random_uuid()`, `add column if not exists enlace_publico_activo boolean not null default false`; `create unique index if not exists idx_perfiles_enlace_token on perfiles (enlace_token)`. Verificar con una consulta a `information_schema.columns` que las dos columnas existen con sus defaults.
- [ ] 1.3 En la misma migración: llevar a `notificaciones` el actor del interés. Mirar la tabla real (`0003`, `0033`) y agregar una columna nullable (p. ej. `de_perfil uuid references perfiles(id) on delete cascade`) solo si no existe ya una referencia utilizable. Verificar que las notificaciones actuales (`equipo_armado`, etc.) siguen insertándose sin tocar (columna nullable).
- [ ] 1.4 En la misma migración: `create or replace function public.perfil_publico(p_token uuid)` `language sql`, `security definer`, `stable`, `set search_path = public`, que devuelve `tipo text, nombre text, texto text, habilidades text[], disciplinas disciplina_artistica[], otro_detalle text, fotos text[]` haciendo `union`/`coalesce` entre talento y creador `where p.enlace_token = p_token and p.enlace_publico_activo`. Nunca `fecha_nacimiento`, `genero`, `ubicacion_*`, `redes`, `videoreel_url`. `fotos` = `storage_path` ordenados por `orden` para talento; `array[imagen_url]` o `'{}'` para creador. `revoke all ... from public; grant execute ... to anon, authenticated`.
- [ ] 1.5 En la misma migración: `create or replace function public.contactar_desde_perfil(p_token uuid)` `security definer`, que resuelve el dueño por token activo, corta con `raise exception` si el token no está disponible / es el propio perfil / `public.hay_bloqueo(v_duenio)`, y hace `insert into intereses_equipo (de_perfil, a_perfil, interesa) values (auth.uid(), v_duenio, true) on conflict (de_perfil, a_perfil) do update set interesa = true`. `grant execute ... to authenticated`.
- [ ] 1.6 En la misma migración: `create or replace function public.perfil_para_responder(p_de uuid)` `security definer` con la proyección acotada de esa persona (misma forma que `feed_equipo`: nombre, pitch, disciplinas/habilidades, ciudad; sin fotos ni edad), para la pantalla de responder el interés. `grant execute ... to authenticated`.
- [ ] 1.7 En la misma migración: trigger `after insert or update on intereses_equipo` (separado de `al_marcar_interes()`, sin reescribirla) que, cuando `new.interesa` y NO existe interés recíproco, inserta `notificaciones (destinatario_id => new.a_perfil, tipo => 'interes_recibido', de_perfil => new.de_perfil)`. Usar `drop trigger if exists` antes.
- [ ] 1.8 Aplicar `0037` a la base (Management API con el PAT de `~/.soliloq-deploy/supabase-token.txt`, el `add value` del enum en su propia llamada) y registrar la fila en `supabase_migrations.schema_migrations`. Verificar en prod, simulando sesión con `set local role authenticated` + `request.jwt.claims`: `perfil_publico(<token válido>)` como `anon` devuelve la proyección; como `anon` con token al azar o enlace apagado devuelve 0 filas; `contactar_desde_perfil()` inserta el interés y falla para un par con `hay_bloqueo`; `select 'interes_recibido' = any(enum_range(null::tipo_notificacion)::text[])`.

## 2. Tipos

- [ ] 2.1 En `src/lib/supabase/types.ts`: `enlace_token: string` y `enlace_publico_activo: boolean` en `Row` de `perfiles` (y opcionales en `Insert`/`Update`); columna nueva de `notificaciones` si se agregó en 1.3; `perfil_publico`, `contactar_desde_perfil` y `perfil_para_responder` en `Functions` con `Args`/`Returns`; `'interes_recibido'` en la unión de `tipo` de `notificaciones`. Verificar con `npm run typecheck`.

## 3. Ruta pública y vidriera

- [ ] 3.1 Crear `src/app/p/[token]/page.tsx`: server component, usa el cliente **anónimo** de Supabase, llama `rpc("perfil_publico", { p_token })`; sin filas → `notFound()`. No usa el layout de `(app)`. Renderiza `<VidrieraPublica ... />` y el botón de contacto.
- [ ] 3.2 `generateMetadata({ params })` en esa ruta: misma RPC; `title = nombre`, `openGraph`/`twitter` con la primera foto (fallback `/og.png`), `robots: { index: false, follow: false }`. Verificar con `curl -s .../p/<token> | grep -i 'og:image\|robots'` tras el deploy.
- [ ] 3.3 Crear `src/components/perfil/vidriera-publica.tsx`: grilla de fotos (`aspect-[3/4]`), `texto` (experiencia/descripción) en `whitespace-pre-line max-w-prose`, chips de `habilidades` o `EtiquetasDisciplina` para `disciplinas`+`otro_detalle`. Sin edad, ubicación, redes, videoreel ni `BotonDenuncia`. No rompe con `fotos` vacío.
- [ ] 3.4 Crear `src/components/perfil/boton-contactar-publico.tsx` (client): si no hay sesión → link a `/ingresar?next=/p/<token>`; con sesión y no es el dueño → botón que llama `rpc("contactar_desde_perfil", { p_token })`, con estado de éxito ("le llegó tu interés") y de error; si es el dueño, no se muestra.

## 4. Middleware

- [ ] 4.1 En `src/lib/supabase/middleware.ts`: agregar `RUTAS_ABIERTAS = ["/p/"]` evaluada antes de las ramas de sesión — si `path` empieza con alguna, `return response` con o sin usuario (hoy `RUTAS_PUBLICAS` rebota al usuario logueado a `/`). Verificar: `/p/<token>` responde 200 logueado y sin loguear; `/p/<random>` responde 404 en ambos casos.
- [ ] 4.2 En `middleware.ts` (raíz): añadir cabecera `X-Robots-Tag: noindex, nofollow` a la respuesta cuando `path` empieza con `/p/`. Verificar con `curl -sI .../p/<token> | grep -i x-robots-tag`.

## 5. Compartir desde el perfil propio

- [ ] 5.1 Crear `src/components/perfil/boton-compartir.tsx` (client): Web Share API (`navigator.share`) cuando existe; fallback con WhatsApp, X, Instagram, Facebook y "copiar enlace" (`navigator.clipboard.writeText` + confirmación visible). La URL es `${origin}/p/${enlace_token}`. Si `enlace_publico_activo` es `false`, el primer uso hace `update perfiles set enlace_publico_activo = true` (política `perfiles_update_propio`) mostrando antes la línea de qué queda visible. Incluir "desactivar enlace" y "regenerar enlace" (`enlace_token = gen_random_uuid()`).
- [ ] 5.2 En `src/app/(app)/perfil/page.tsx`: leer `enlace_token, enlace_publico_activo` de `perfiles` y montar `<BotonCompartir />` en la vista del perfil propio, para modo talento y modo creador (fuera de los dos formularios, como `BuscarEquipo`). Verificar que aparece en ambos modos.

## 6. Responder el interés recibido

- [ ] 6.1 En `src/components/notificaciones/lista-notificaciones.tsx` (y el tipo de notificación): renderizar `interes_recibido` con un texto tipo "Alguien quiere contactarte desde tu perfil" y un link a la pantalla de respuesta.
- [ ] 6.2 Crear la pantalla/panel de respuesta: llama `rpc("perfil_para_responder", { p_de })`, muestra la proyección acotada y un botón "Me interesa" que hace `insert into intereses_equipo (de_perfil, a_perfil, interesa) values (auth.uid(), <de_perfil>, true)` — el trigger `al_marcar_interes()` de `0033` arma la sala. Verificar el circuito completo con dos cuentas de prueba: A abre `/p/<token de B>` logueada y contacta → B recibe `interes_recibido` → B responde "Me interesa" → se crea la sala y ambos reciben `equipo_armado`.

## 7. Verificación integral

- [ ] 7.1 `npm run lint && npm run typecheck && npm run build` en verde.
- [ ] 7.2 Con `0037` aplicada, sin sesión: abrir `/p/<token activo>` y ver fotos + texto + habilidades/disciplinas y nada de contacto/edad/ubicación; `/p/<token al azar>` da 404; apagar el enlace desde el perfil y confirmar que la URL pasa a 404; regenerar el token y confirmar que la URL vieja deja de resolver y la nueva sí. Pegar el enlace en un chat y ver la tarjeta con foto y nombre.
- [ ] 7.3 Contacto: sin sesión, "Contactar" lleva a registro con `next` y al terminar vuelve a `/p/<token>`; con sesión, "Contactar" registra el interés y notifica al dueño; un par con bloqueo cargado a mano no puede contactar. El dueño abriendo su propio enlace no ve el botón de contacto.
- [ ] 7.4 Merge del PR a `main`, deploy de Vercel en verde, verificación en `https://yalope.com`: `/p/<token real>` visible sin sesión, `X-Robots-Tag` y `robots` meta presentes, `/p/<random>` 404.
