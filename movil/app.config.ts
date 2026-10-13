import type { ExpoConfig } from "expo/config";

/**
 * La app de Yalope para Android y iPhone (#396): una sola base. Con la web son las tres
 * versiones, siempre a la par (#402). Reemplazó a la de Capacitor (#395) con el mismo
 * identificador y la misma clave de firma, así que se instala encima de aquella.
 */
const id = "com.yalope.app";
const NEGRO = "#060606";

const config: ExpoConfig = {
  name: "Yalope",
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
    // Firebase Cloud Messaging, para las push (#389). El pipeline escribe el archivo desde un
    // secret y avisa con `GOOGLE_SERVICES_FILE`; sin él (en una compilación local) la app anda
    // igual, sin push.
    ...(process.env.GOOGLE_SERVICES_FILE ? { googleServicesFile: process.env.GOOGLE_SERVICES_FILE } : {}),
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
    [
      "expo-notifications",
      { icon: "./assets/notification-icon.png", color: "#f2571e", defaultChannel: "default" },
    ],
    [
      "expo-image-picker",
      { photosPermission: "Yalope usa tus fotos para armar el portfolio de tu perfil.", cameraPermission: false },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Yalope usa tu ubicación solo si la pedís, para completar tu barrio o ciudad en el perfil.",
      },
    ],
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
