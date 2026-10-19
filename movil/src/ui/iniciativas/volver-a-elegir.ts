/**
 * #423: al entrar a «Un equipo» o «Un proyecto» desde la pregunta «¿Qué querés armar?», la pestaña
 * Iniciativas tiene que volver a mostrar esa pregunta cuando se sale del formulario sin crear
 * nada (con «Volver», «Cancelar», el botón atrás de Android o el gesto de iPhone). Al crear, en
 * cambio, la pregunta ya no vuelve. La pestaña lo lee al recuperar el foco.
 */
let pendiente = false;

/** Se marca al entrar al formulario de creación. */
export function marcarVolverAElegir() {
  pendiente = true;
}

/** Se limpia al crear la iniciativa: ya no hay que volver a la pregunta. */
export function olvidarVolverAElegir() {
  pendiente = false;
}

/** Devuelve si hay que mostrar la pregunta y la limpia. */
export function consumirVolverAElegir() {
  const valor = pendiente;
  pendiente = false;
  return valor;
}
