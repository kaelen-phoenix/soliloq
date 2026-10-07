import { redirect } from "next/navigation";

/**
 * «Armar equipo» (el feed de personas sueltas, 0033) se sacó: confundía con los Equipos del
 * Creador y no tenía uso real. La base no se toca (`busca_equipo`, `feed_equipo`) por si
 * vuelve. El chat de dos personas también se sacó (#283).
 */
export default function EquipoPage() {
  redirect("/");
}
