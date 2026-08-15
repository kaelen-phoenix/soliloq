import { PantallaMensaje } from "@/components/ui/pantalla-mensaje";

/**
 * Ruta inexistente, y también lo que se ve cuando un `notFound()` corta una pantalla: una
 * obra borrada, un perfil que ya no está, o una fila que RLS esconde. Ese último caso es el
 * más común y es indistinguible de "no existe" a propósito — decir "existe pero no podés
 * verlo" filtra justamente lo que las políticas esconden.
 */
export default function NoEncontrado() {
  return (
    <PantallaMensaje
      titulo="Acá no hay nada"
      detalle="La página que buscás no existe, o el contenido ya no está disponible."
    />
  );
}
