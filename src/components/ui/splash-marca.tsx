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
 *
 * Alrededor, cuatro estrellitas dan una vuelta mientras se arma la «Y» (#261): dos en el
 * naranja del isotipo y dos claras, como destellos. Cada una va a su ángulo y radio (un poco
 * distintos, para que la órbita no se vea de regla) y la órbita entera gira.
 */
const TINTA_BRAZO = { izq: "#f2571e", der: "#e62d03" } as const;

/** Estrella de cuatro puntas, en una caja de 10×10. */
const TRAZO_ESTRELLA =
  "M5 0C5.6 3.4 6.6 4.4 10 5C6.6 5.6 5.6 6.6 5 10C4.4 6.6 3.4 5.6 0 5C3.4 4.4 4.4 3.4 5 0Z";

const ESTRELLAS = [
  { angulo: 20, radio: 78, tamano: 10, tinta: "#f2571e", demora: 0.05 },
  { angulo: 115, radio: 70, tamano: 7, tinta: "#ffe4d6", demora: 0.15 },
  { angulo: 205, radio: 82, tamano: 9, tinta: "#f2571e", demora: 0.1 },
  { angulo: 295, radio: 66, tamano: 6, tinta: "#ffe4d6", demora: 0.2 },
] as const;

export function SplashMarca() {
  return (
    <div className="splash-marca" aria-hidden="true">
      <div className="splash-marca__luz" />
      <div className="splash-marca__orbita">
        {ESTRELLAS.map((e, i) => (
          <span
            key={i}
            className="splash-marca__estrella"
            style={
              {
                "--angulo": `${e.angulo}deg`,
                "--radio": `${e.radio}px`,
                "--demora": `${e.demora}s`,
                width: e.tamano,
                height: e.tamano,
              } as React.CSSProperties
            }
          >
            <svg viewBox="0 0 10 10">
              <path d={TRAZO_ESTRELLA} fill={e.tinta} />
            </svg>
          </span>
        ))}
      </div>
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
