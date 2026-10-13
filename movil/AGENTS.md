# App nativa de Yalope (`movil/`)

Android y iPhone con Expo (React Native), una sola base. Plan y etapas: issue #396.

- **Las tres versiones van juntas.** Todo cambio de la web se hace también acá, en el mismo PR.
- **Expo cambia en cada SDK.** Antes de usar una API de Expo o React Native, leé la documentación
  de la versión de `expo` de `package.json` (https://docs.expo.dev/versions/v<major>.0.0/ y
  https://docs.expo.dev/llms.txt). Paquetes nativos: `npx expo install <paquete>`.
- **Código compartido con la web** (`../src`), con el alias `@/`: textos (`@/mensajes`), tipos de
  la base, `@/lib/cuenta`, `@/lib/clave`, constantes. No se duplica: si algo hace falta en los
  dos lados, se mueve a un archivo sin dependencias de Next ni del DOM. Lo propio de la app va
  con `~/` (`movil/src`).
- **Textos:** `useTranslations` de `use-intl`, con las mismas claves que la web.
- **Carpetas `android/` e `ios/`:** las genera `npx expo prebuild`. No se versionan ni se editan
  a mano: lo nativo se configura en `app.config.ts` y en `plugins/`.
- **Antes de cerrar un cambio:** `npm run typecheck` y `npx expo export --platform android`, que
  arma el bundle y atrapa imports rotos.
- **Paquetes:** los arma `.github/workflows/apps.yml` en cada push a main.
