"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

/**
 * Código QR de un string, generado en el cliente (nada sale a un servicio externo). Se
 * dibuja como SVG con `fill="currentColor"`, así el color lo pone el contenedor. Trae la
 * zona de silencio de 4 módulos que los lectores necesitan; el fondo lo aporta quien lo usa
 * (normalmente una tarjeta blanca).
 */
export function CodigoQr({
  valor,
  tam = 168,
  className = "",
}: {
  valor: string;
  tam?: number;
  className?: string;
}) {
  const svg = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(valor);
    qr.make();
    const n = qr.getModuleCount();
    const m = 4; // zona de silencio
    const lado = n + m * 2;
    let rects = "";
    for (let fila = 0; fila < n; fila++) {
      for (let col = 0; col < n; col++) {
        if (qr.isDark(fila, col)) {
          rects += `<rect x="${col + m}" y="${fila + m}" width="1.05" height="1.05"/>`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges" fill="currentColor">${rects}</svg>`;
  }, [valor]);

  return (
    <div
      className={`text-texto [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className}`}
      style={{ width: tam, height: tam }}
      role="img"
      aria-label="Código QR del enlace del perfil"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
