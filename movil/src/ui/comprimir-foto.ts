import { decode } from "base64-arraybuffer";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// El lado mayor con el que se guardan las fotos (perfil e iniciativas): livianas, pero nítidas.
const LADO_MAXIMO = 1600;

/**
 * Achica y comprime una foto en el teléfono (como `comprimirImagen` de la web) y la devuelve
 * lista para `storage.upload`, en JPEG. `null` si no se pudo procesar.
 */
export async function comprimirFoto(uri: string, ancho: number, alto: number): Promise<ArrayBuffer | null> {
  try {
    const contexto = ImageManipulator.manipulate(uri);
    if (Math.max(ancho, alto) > LADO_MAXIMO) {
      contexto.resize(ancho >= alto ? { width: LADO_MAXIMO } : { height: LADO_MAXIMO });
    }
    const imagen = await contexto.renderAsync();
    const { base64 } = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.82, base64: true });
    return base64 ? decode(base64) : null;
  } catch {
    return null;
  }
}
