// Firma del APK de Android con la clave de Yalope (#387, #391): siempre la misma, para que cada
// versión se instale encima de la anterior (también encima de la vieja app de Capacitor, #395).
// La clave la pone el pipeline (secrets de GitHub); sin ella queda la firma de depuración de Expo.
const { withAppBuildGradle } = require("expo/config-plugins");

const FIRMA = `
        release {
            if (System.getenv("ANDROID_KEYSTORE")) {
                storeFile file(System.getenv("ANDROID_KEYSTORE"))
                storeType "pkcs12"
                storePassword System.getenv("ANDROID_KEYSTORE_CLAVE")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEYSTORE_CLAVE")
            }
        }`;

module.exports = function firmaAndroid(config) {
  return withAppBuildGradle(config, (c) => {
    let gradle = c.modResults.contents;
    if (gradle.includes('System.getenv("ANDROID_KEYSTORE")')) return c;
    // Se suma la configuración `release` junto a la `debug` que trae la plantilla.
    gradle = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${FIRMA}`);
    // Y el build `release` la usa si está la clave.
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig System.getenv("ANDROID_KEYSTORE") ? signingConfigs.release : signingConfigs.debug',
    );
    c.modResults.contents = gradle;
    return c;
  });
};
