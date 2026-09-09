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

Los flujos con sesión (circuito de match: swipe → placa → `/matches` → `/convocado` → sala)
**se saltean** salvo que estén:

- `E2E_BASE_URL` — la app corriendo contra una base de **staging** (nunca prod).
- `E2E_SUPABASE_URL` + `E2E_SERVICE_KEY` — para sembrar/limpiar usuarios de prueba
  (`auth.admin.createUser` / `deleteUser`).

`flujos/match.spec.ts` tiene el helper de usuarios y el esqueleto del test con los pasos.
El mismo circuito ya está cubierto a nivel SQL en `supabase/tests/match_convocatoria.sql`.
