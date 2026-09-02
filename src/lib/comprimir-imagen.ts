/**
 * Compresión de imágenes en el navegador, antes de subirlas a Storage.
 *
 * La regla vieja era un rechazo seco: más de 5 MB, error y a buscar otra foto. Pero una
 * foto de celular moderna pasa los 5 MB sin ser "grande" —es resolución de sobra para un
 * perfil—, así que la persona quedaba trabada por algo que la app puede resolver sola:
 * reduce el lado mayor y reencodea hasta que entra.
 *
 * Solo se toca la imagen si hace falta (pesa de más o mide de más). Si ya entra, se sube
 * tal cual. Y hay un techo absoluto sobre el archivo original: por encima ni se intenta
 * decodificar, porque eso sí puede colgar la pestaña.
 */

const MB = 1024 * 1024;

export interface OpcionesCompresion {
  /** Tamaño objetivo del resultado. Default 5 MB. */
  maxBytes?: number;
  /** Lado mayor en píxeles. Una foto más grande se reduce a esto antes de reencodear. Default 2200. */
  maxLado?: number;
  /** Techo del archivo original: por encima se rechaza sin decodificar. Default 40 MB. */
  techoBytes?: number;
}

/** El original supera el techo: no se intenta comprimir. */
export class ImagenDemasiadoGrande extends Error {}
/** No se pudo decodificar o reencodear la imagen. */
export class ImagenInvalida extends Error {}

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/png": "png",
};

export async function comprimirImagen(
  archivo: File,
  { maxBytes = 5 * MB, maxLado = 2200, techoBytes = 40 * MB }: OpcionesCompresion = {},
): Promise<File> {
  if (archivo.size > techoBytes) {
    throw new ImagenDemasiadoGrande(
      `La imagen pesa ${Math.round(archivo.size / MB)} MB. Elegí uno de hasta ${Math.round(
        techoBytes / MB,
      )} MB.`,
    );
  }

  const img = await cargarImagen(archivo);
  try {
    const ladoMayorOriginal = Math.max(img.width, img.height);
    const necesitaRedimension = ladoMayorOriginal > maxLado;

    // Ya entra y no hay que achicar: se sube el archivo original.
    if (archivo.size <= maxBytes && !necesitaRedimension) return archivo;

    // WebP comprime mejor y conserva transparencia; si el canvas no lo soporta, JPEG.
    const tipoSalida = (await soportaWebp()) ? "image/webp" : "image/jpeg";

    let lado = necesitaRedimension ? maxLado : ladoMayorOriginal;
    let calidad = 0.9;
    let blob = await encodear(img, lado, tipoSalida, calidad);

    // Primero baja calidad; cuando llega al piso, achica dimensiones. Se planta en un
    // resultado razonable aunque no llegue al objetivo exacto.
    while (blob.size > maxBytes && (calidad > 0.5 || lado > 800)) {
      if (calidad > 0.5) {
        calidad = Math.round((calidad - 0.1) * 10) / 10;
      } else {
        lado = Math.round(lado * 0.8);
        calidad = 0.8;
      }
      blob = await encodear(img, lado, tipoSalida, calidad);
    }

    const base = archivo.name.replace(/\.[^.]+$/, "") || "imagen";
    return new File([blob], `${base}.${EXTENSION[tipoSalida]}`, {
      type: tipoSalida,
      lastModified: Date.now(),
    });
  } finally {
    img.cerrar();
  }
}

interface FuenteImagen {
  fuente: CanvasImageSource;
  width: number;
  height: number;
  cerrar: () => void;
}

async function cargarImagen(archivo: File): Promise<FuenteImagen> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
      return {
        fuente: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cerrar: () => bitmap.close(),
      };
    } catch {
      // Safari viejo y algunos formatos: cae al <img>.
    }
  }

  const url = URL.createObjectURL(archivo);
  try {
    const el = await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const imagen = new window.Image();
      imagen.onload = () => resolver(imagen);
      imagen.onerror = () => rechazar(new ImagenInvalida("No pudimos leer la imagen."));
      imagen.src = url;
    });
    return {
      fuente: el,
      width: el.naturalWidth,
      height: el.naturalHeight,
      cerrar: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

async function encodear(
  img: FuenteImagen,
  ladoMayor: number,
  tipo: string,
  calidad: number,
): Promise<Blob> {
  const escala = Math.min(1, ladoMayor / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * escala));
  const h = Math.max(1, Math.round(img.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImagenInvalida("No pudimos procesar la imagen.");

  if (tipo === "image/jpeg") {
    // JPEG no tiene canal alfa: sin esto, lo transparente sale negro.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img.fuente, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolver) =>
    canvas.toBlob(resolver, tipo, calidad),
  );
  if (!blob) throw new ImagenInvalida("No pudimos procesar la imagen.");
  return blob;
}

let webpSoportado: boolean | null = null;

async function soportaWebp(): Promise<boolean> {
  if (webpSoportado !== null) return webpSoportado;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const blob = await new Promise<Blob | null>((resolver) =>
    canvas.toBlob(resolver, "image/webp", 0.5),
  );
  webpSoportado = blob?.type === "image/webp";
  return webpSoportado;
}
