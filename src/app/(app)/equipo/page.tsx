import { redirect } from "next/navigation";

/**
 * «Armar equipo» (el feed de personas sueltas, 0033) se sacó: confundía con los Equipos del
 * Creador y no tenía uso real. La base no se toca (`busca_equipo`, `feed_equipo`) por si
 * vuelve. Sigue `/equipo/responder/[deId]`: contestarle a quien te contactó desde tu perfil
 * público, que abre un chat directo.
 */
export default function EquipoPage() {
  redirect("/");
}
