# Yalope: reglas del proyecto

## Web, app de Capacitor y app nativa: siempre a la par (#402)

Yalope tiene **dos apps que conviven** (ninguna reemplaza a la otra) y la web. **Todo cambio que
se pide se hace para las tres**, en el mismo PR:

| Versión | Dónde | Qué hay que hacer |
|---|---|---|
| **Web** | `src/` (Next.js, yalope.com) | El cambio en sí. |
| **App de Capacitor** | `android/`, `ios/`, `capacitor.config.ts` (`com.yalope.app`) | Abre yalope.com, así que lo de la web le llega solo. Revisar lo propio de la cáscara: lo que solo va en la web (`.solo-web`, «Apoyar»), el login con Google por el navegador del sistema (`PuenteApp`), los enlaces externos y los permisos. |
| **App nativa** (Android e iPhone) | `movil/` (Expo) | El mismo cambio, con las mismas reglas y los mismos textos. Leé `movil/AGENTS.md`. |

- **Lógica compartida, no duplicada.** Lo que usan la web y la app nativa va en `src/lib/`, como
  código puro, sin importar paquetes (cada lado tiene su copia de React y de Supabase).
- **Lo de servidor** (mails, servicios con claves, permisos de admin) va en un `src/lib/*-servidor.ts`
  y se expone a la app nativa por `src/app/api/app/…`, con la sesión como `Bearer` (`usuarioDesdeApp`).
- **Textos:** los mismos `src/mensajes/{es,en}` para las dos. Cada texto nuevo va en los dos idiomas.
- **Solo en la web:** el panel de administración, «Apoyar», la portada y las páginas legales. Las
  apps los abren en el navegador.
- **El PR dice qué se hizo en cada versión** (ver la plantilla).

## Otras reglas

- Cada tarea tiene su issue y se cierra con el PR que la resuelve.
- Las migraciones de la base van en `supabase/migrations/` con su prueba en `supabase/tests/`, y los
  tipos se regeneran (`npm run tipos-db`).
- Los paquetes de las apps los arma `.github/workflows/apps.yml` en cada push a `main` (release
  `apps-ultima`).
