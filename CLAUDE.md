# Yalope: reglas del proyecto

## Tres versiones, siempre a la par (#402)

Yalope tiene tres versiones: la **web**, la **app nativa de Android** y la **app nativa de iPhone**.
Las dos apps salen de una sola base (`movil/`, Expo). **Todo cambio que se pide se hace para las
tres, en el mismo PR:**

| Versión | Dónde |
|---|---|
| **Web** | `src/` (Next.js, yalope.com) |
| **App nativa (Android e iPhone)** | `movil/` (Expo, `com.yalope.app`). Leé `movil/AGENTS.md`. |

- **Lógica compartida, no duplicada.** Lo que usan la web y la app va en `src/lib/`, como código
  puro, sin importar paquetes (cada lado tiene su copia de React y de Supabase).
- **Lo de servidor** (mails, servicios con claves, permisos de admin) va en un `src/lib/*-servidor.ts`
  y se expone a la app por `src/app/api/app/…`, con la sesión como `Bearer` (`usuarioDesdeApp`).
- **Textos:** los mismos `src/mensajes/{es,en}` para las dos. Cada texto nuevo va en los dos idiomas.
- **Solo en la web:** el panel de administración, «Apoyar», la portada y las páginas legales. La
  app los abre en el navegador.
- **El PR dice qué se hizo en cada versión** (ver la plantilla).
- **Android e iPhone:** si algo se comporta distinto en cada uno, se prueba en los dos.

## Otras reglas

- Cada tarea tiene su issue y se cierra con el PR que la resuelve.
- Las migraciones de la base van en `supabase/migrations/` con su prueba en `supabase/tests/`, y los
  tipos se regeneran (`npm run tipos-db`).
- Los paquetes de las apps los arma `.github/workflows/apps.yml` en cada push a `main` (release
  `apps-ultima`).
