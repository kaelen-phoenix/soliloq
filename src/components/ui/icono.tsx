type NombreIcono =
  | "feed"
  | "postulaciones"
  | "salas"
  | "perfil"
  | "tablero"
  | "campana"
  | "mas"
  | "cruz"
  | "corazon"
  | "cambiar"
  | "flecha-derecha"
  | "chevron"
  | "imagen"
  | "bandera"
  | "reloj"
  | "buscar"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "x"
  | "linkedin"
  | "vimeo"
  | "sitio";

const TRAZOS: Record<NombreIcono, React.ReactNode> = {
  feed: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 10h18" />
    </>
  ),
  postulaciones: (
    <>
      <path d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2Z" />
    </>
  ),
  salas: <path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.38 8.38 0 0 1 4 11.5a8.5 8.5 0 0 1 17 0Z" />,
  perfil: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-3.9 3.6-7 8-7s8 3.1 8 7" />
    </>
  ),
  tablero: (
    <>
      <rect x="3" y="4" width="7" height="16" rx="1.5" />
      <rect x="14" y="4" width="7" height="9" rx="1.5" />
    </>
  ),
  campana: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 6-2 7-2 7h16s-2-1-2-7Z" />
      <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  cruz: <path d="M6 6l12 12M18 6 6 18" />,
  corazon: <path d="M20.3 5.7a5 5 0 0 0-7.1 0L12 6.9l-1.2-1.2a5 5 0 1 0-7.1 7.1l8.3 8.3 8.3-8.3a5 5 0 0 0 0-7.1Z" />,
  cambiar: <path d="M7 4 3 8l4 4M3 8h13a5 5 0 0 1 0 10h-2" />,
  "flecha-derecha": <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  imagen: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </>
  ),
  bandera: (
    <>
      <path d="M4 21V4" />
      <path d="M4 5h11l-1.5 3.5L15 12H4" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.3-4.3" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M16.5 7.5h.01" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10 9.5 5 2.5-5 2.5z" />
    </>
  ),
  tiktok: <path d="M10 20a3 3 0 1 0-3-3v0M10 17V4c.5 3 3 5 6 5" />,
  x: <path d="M5 5l14 14M19 5 5 19" />,
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10v7M8 7v.01M12 17v-3.5a1.5 1.5 0 0 1 3 0V17M12 17v-7" />
    </>
  ),
  vimeo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5z" />
    </>
  ),
  sitio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17M3.5 15h17" />
      <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
};

export function Icono({
  nombre,
  className = "h-5 w-5",
  relleno = false,
}: {
  nombre: NombreIcono;
  className?: string;
  relleno?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={relleno ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
