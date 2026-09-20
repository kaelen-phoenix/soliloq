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
