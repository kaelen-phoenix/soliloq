# E2E (Playwright)

```
npm run test:e2e                 # todo
npx playwright test e2e/publico.spec.ts
```

`playwright.config.ts` levanta la app (`npm run start` en el puerto 3100) con variables
dummy y `Accept-Language: es-AR`.

## `publico.spec.ts`

Superficies sin sesión: landing (copy del modelo de match, CTA → `/ingresar`), `/` como
landing para anónimos, `/ingresar` con email + contraseña, y `robots.txt` / `sitemap.xml` /
`manifest.webmanifest` / `favicon.ico`. Corre en CI (job `ci`), contra la app buildeada.

## `flujos/` — necesita staging

Los flujos con sesión (circuito de match: swipe → placa → `/matches` → sala)
**se saltean** salvo que estén:

- `E2E_BASE_URL` — la app corriendo contra una base de **staging** (nunca prod).
- `E2E_SUPABASE_URL` + `E2E_SERVICE_KEY` — para sembrar/limpiar usuarios de prueba
  (`auth.admin.createUser` / `deleteUser`).

`flujos/match.spec.ts` recorre el circuito completo por UI: Talento se postula a una Obra
(swipe), Creador marca "Me interesa" (match en el acto), placa "Hay interés" → "Ahora no",
aviso "¡Tenés un Match!" (#194) → "Aceptar", Call Back → "Aceptar" (pasa a Convocados),
"Convocar" en firme, Talento acepta en `/convocatoria` → entra a `/salas`. La aprobación
manual (#182), las Normas (#180) y el onboarding con ubicación por Google Places se siembran
directo con el cliente admin en vez de navegarse — ver los comentarios del archivo.

`flujos/salas-no-leidos.spec.ts` (#216, #222): un mensaje nuevo enciende la sala en
`/salas` y el badge de "Chats" en vivo; entrar la marca leída y queda así al volver; y una
sala abierta con carga completa recibe en vivo los mensajes de los demás (el canal de
Realtime espera la sesión, `suscribirConSesion`).

`flujos/eliminar-equipo.spec.ts` (#215): el Creador elimina su Equipo desde el tablero y el
Talento que había convocado vuelve a aparecer en Buscar Talentos; la sala del equipo se borra.

`flujos/qa-en-vivo.spec.ts` (#122), en teléfono (Pixel 7): la caminata de QA que antes se
pedía a mano — «Cupo lleno» en Call Back, «Dar de baja» un convocado, el feed no repite una
obra donde ya entraste, estados vacíos de Call Back y `/convocatoria`, destacar y
desvincularse en Chats, ocultar la edad (y que el enlace público la respete), deslizar en el
visor de fotos, «Borrar mi cuenta», «Borrar proyecto», borrar un usuario desde Admin y el
límite de 20 «Me interesa» por día. Los borrados usan la clave de servicio del server:
levantar la app con `SUPABASE_SERVICE_ROLE_KEY` (ver abajo).

`flujos/tour-guiado.spec.ts` (#231), en teléfono: el tour de la primera vez — recorrido con
«Siguiente» hasta «Entendido», «Omitir», un tour por experiencia para quien tiene los dos
roles (sin repetir el paso de Perfil) y «Ver el recorrido de nuevo» desde Ajustes.

Ojo al sembrar usuarios en cualquier otro spec: una cuenta nueva ve el tour y la capa tapa
la pantalla. Por eso todos los helpers marcan `tour_talento_visto_en` y
`tour_creador_visto_en` junto con `normas_aceptadas_en`.

### El proyecto de staging (2026-09-20)

Existe `soliloq-staging` (ref `rcjjdguldfrkpmxgkazn`, mismo org de Supabase, plan free) con
el schema completo replicado (las 81 migraciones de `supabase/migrations/`, aplicadas a
mano vía la Management API — la CLI no está logueada acá, ver `consultar-base`). Nunca
tiene datos reales de personas: solo lo que crean/borran los tests.

Credenciales en `~/.soliloq-deploy/` (fuera de git, igual que las de prod):
`staging-url.txt`, `staging-anon-key.txt`, `staging-service-key.txt`, `staging-db-url.txt`,
`staging-ref.txt`. Los mismos valores están como secrets del repo, `E2E_SUPABASE_URL` /
`E2E_SERVICE_KEY` (no así el anon key — no hace falta como secret, no es sensible, pero
tampoco está cableado a un job de CI todavía: correr `flujos/` hoy es manual).

Para correrlo en local contra staging:
```
NEXT_PUBLIC_SUPABASE_URL="$(cat ~/.soliloq-deploy/staging-url.txt)" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$(cat ~/.soliloq-deploy/staging-anon-key.txt)" \
E2E_SUPABASE_URL="$(cat ~/.soliloq-deploy/staging-url.txt)" \
E2E_SERVICE_KEY="$(cat ~/.soliloq-deploy/staging-service-key.txt)" \
SUPABASE_SERVICE_ROLE_KEY="$(cat ~/.soliloq-deploy/staging-service-key.txt)" \
E2E_BASE_URL="http://localhost:3100" \
npm run build && npm run start -- --port 3100 &
npx playwright test e2e/flujos
```

Nota de cupo: la organización está en plan free (2 proyectos activos). Para crear
`soliloq-staging` se pausó `mcp-box` (otro proyecto de la cuenta, sin relación con este
repo) — está pausado, no borrado, y se puede reactivar desde el dashboard de Supabase si
hace falta.

Ojo con `supabase/tests/*.sql`: están escritos para correr contra **prod**
(`supabase/tests/run.sh` usa el PAT de prod). Para correrlos contra staging en cambio hay
que pegarle a `https://api.supabase.com/v1/projects/rcjjdguldfrkpmxgkazn/database/query`
con el mismo PAT (el token es de cuenta, no de proyecto).

El mismo circuito de match ya está cubierto a nivel SQL en
`supabase/tests/match_convocatoria.sql` (corre contra prod en CI, `db-tests`) — `flujos/`
suma la capa de UI que eso no toca (swipe, placa, `/matches`, `/salas`).

## `local/` — solo en una PC, no en CI

`local/push-chrome.spec.ts` (#232): notificaciones push de punta a punta. El receptor activa
las notificaciones en Ajustes, sale de la app, otra persona le escribe y la notificación llega
a su service worker con título, texto y la URL de la sala. Necesita **Google Chrome
instalado**: el Chromium de Playwright no trae servicio de push, y por eso no corre en CI
(que solo corre `publico.spec.ts` y `flujos/`). Se saltea sin `E2E_PUSH_CHROME=1`. Abre una
ventana de Chrome de verdad, y la notificación puede aparecer en el sistema.

`local/push-acceso.spec.ts` (#247, #248): los avisos de acceso por push. Un admin con las
notificaciones activadas recibe «Nueva solicitud de acceso» cuando alguien se registra sin
invitación; esa persona toca «Avisame cuando me habiliten» en `/solicitud-pendiente`, el admin
la habilita desde el panel y le llega «¡Ya tenés acceso a Yalope!». Abre dos Chrome, uno por
cuenta. Mismas condiciones que el anterior.

`local/discord-espacios.mts` (#269): los espacios privados en Discord contra el servidor real (no es
Playwright: se corre con `npx tsx`). Crea y borra canales de prueba; las instrucciones están en
el encabezado del archivo.

La app tiene que levantarse con claves VAPID. Sirve un par descartable, que no hace falta
guardar en ningún lado:
```
node -e 'const k=require("web-push").generateVAPIDKeys();console.log(`export NEXT_PUBLIC_VAPID_PUBLIC_KEY="${k.publicKey}"\nexport VAPID_PRIVATE_KEY="${k.privateKey}"\nexport VAPID_SUBJECT="mailto:qa@yalope.test"`)' > /tmp/vapid.sh
. /tmp/vapid.sh   # antes del build (la pública se hornea en el bundle) y del start
# … mismo build/start contra staging que arriba …
E2E_PUSH_CHROME=1 npx playwright test e2e/local
```

`local/recorrido-ux.spec.ts` (#285): recorrido de UX, sin aserciones. Pasa por todas las pantallas
en tamaño celular (sin cuenta, alta, Talento, Creador, Admin) y guarda una captura de cada una en
`E2E_RECORRIDO_DIR`. Se corre con `E2E_RECORRIDO=1` contra staging.
