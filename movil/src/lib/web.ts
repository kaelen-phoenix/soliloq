import * as WebBrowser from "expo-web-browser";

export const URL_WEB = "https://yalope.com";

/** Abre una página de la web en el navegador del teléfono (lo que todavía no es nativo). */
export function abrirWeb(ruta = "/") {
  return WebBrowser.openBrowserAsync(`${URL_WEB}${ruta}`);
}
