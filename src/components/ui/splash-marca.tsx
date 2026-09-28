import { ISOTIPO_TRAZOS, ISOTIPO_VIEWBOX } from "@/lib/marca-isotipo";

/**
 * Splash de apertura (#245): el isotipo se arma sobre el negro de escena —los brazos largos
 * suben, las «manos» se abren escalonadas, con una luz de reflector detrás— y todo se va
 * solo en ~1,3 s. Mientras tanto la app ya se está pintando debajo.
 *
 * Es CSS puro (`.splash-marca` en `globals.css`), renderizado en el HTML: no espera a que
 * cargue JavaScript para aparecer ni para irse. `SCRIPT_SPLASH` (en `layout.tsx`) lo omite
 * antes del primer pintado si ya se vio en esta pestaña, si el sistema pide reducir el
 * movimiento, o si el navegador está automatizado (los e2e).
 *
 * Mismos trazos y tintas que los íconos de la app (`_marca-icono.tsx`): naranja el brazo
 * izquierdo, rojo el derecho.
 */
const TINTA_BRAZO = { izq: "#f2571e", der: "#e62d03" } as const;

export function SplashMarca() {
  return (
    <div className="splash-marca" aria-hidden="true">
      <div className="splash-marca__luz" />
      <svg viewBox={ISOTIPO_VIEWBOX} className="splash-marca__isotipo">
        {ISOTIPO_TRAZOS.map((t, i) => (
          // El `translate` va en el <g>: un `transform` de CSS sobre el <path> reemplaza su
          // atributo `transform`, y la animación desarmaría la «Y».
          <g key={i} transform={`translate(${t.x},${t.y})`}>
            <path
              d={t.d}
              fill={TINTA_BRAZO[t.brazo]}
              // 0 y 1 son las «manos» cortas; 2 y 3, los brazos largos que bajan al tronco.
              className={i < 2 ? `splash-marca__mano splash-marca__mano--${t.brazo}` : "splash-marca__brazo"}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
