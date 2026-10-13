import type { ExpoConfig } from "expo/config";

/**
 * La app nativa de Yalope (#396): una sola base para Android y iPhone.
 *
 * Mientras dura la migración (#391–#395) sale como **vista previa** (`APP_VARIANT=previa`, el
 * valor por defecto): otro identificador, así se instala al lado de la app actual (Capacitor,
 * #387). Cuando esté a la par (#395) se compila con `APP_VARIANT=final`, como `com.yalope.app`, y
 * con la misma clave de firma se instala encima de la de Capacitor.
 */
const final = process.env.APP_VARIANT === "final";
const id = final ? "com.yalope.app" : "com.yalope.app.previa";
const NEGRO = "#060606";

const config: ExpoConfig = {
  name: final ? "Yalope" : "Yalope (previa)",
  slug: "yalope",
  version: process.env.VERSION_NAME ?? "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  // Como la web (#225): oscura siempre.
  userInterfaceStyle: "dark",
  backgroundColor: NEGRO,
  // El login con Google vuelve por `<id>://auth/callback` (Supabase lo tiene permitido).
  scheme: id,
  ios: {
    bundleIdentifier: id,
    buildNumber: process.env.VERSION_CODE ?? "1",
    supportsTablet: false,
  },
  android: {
    package: id,
    versionCode: Number(process.env.VERSION_CODE ?? 1),
    adaptiveIcon: {
      backgroundColor: NEGRO,
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-router",
    "expo-status-bar",
    "expo-sqlite",
    "expo-web-browser",
    [
      "expo-splash-screen",
      { image: "./assets/splash-icon.png", imageWidth: 160, backgroundColor: NEGRO },
    ],
    "expo-font",
    "expo-image",
    "./plugins/firma-android",
  ],
  experiments: { typedRoutes: true },
  extra: {
    // Son públicas (las mismas `NEXT_PUBLIC_` de la web): van en el paquete.
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default config;
