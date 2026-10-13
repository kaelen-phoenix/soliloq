import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Las apps de Android y iPhone (#387): una cáscara nativa que abre `yalope.com`. Por eso cada
 * deploy de la web actualiza también las apps; solo hace falta un paquete nuevo si cambia algo
 * nativo (plugins, permisos, ícono, nombre). Los paquetes los arma `.github/workflows/apps.yml`.
 */
const config: CapacitorConfig = {
  appId: "com.yalope.app",
  appName: "Yalope",
  // Solo la página sin conexión: el resto viene de `server.url`.
  webDir: "app-nativa/www",
  // La web reconoce la app por esto (`src/lib/app-nativa.ts`).
  appendUserAgent: "YalopeApp",
  backgroundColor: "#0c0a0b",
  server: {
    url: "https://yalope.com",
    // Vincular Discord (Perfil) pasa por discord.com y vuelve a yalope.com: dentro de la app.
    allowNavigation: ["discord.com", "*.discord.com"],
    errorPath: "sin-conexion.html",
  },
  android: {
    // Para depurar el WebView desde chrome://inspect hace falta una compilación debug.
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: "never",
    scheme: "Yalope",
  },
};

export default config;
