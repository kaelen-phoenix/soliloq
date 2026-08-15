"use client";

import { useEffect, useState } from "react";

/**
 * Confirmación efímera de "se guardó".
 *
 * Existe porque editar el perfil no navega a ningún lado: el formulario ya vive en
 * `/perfil`, así que al guardar la pantalla queda exactamente igual y no hay forma de saber
 * si pasó algo. En el alta no hace falta — ahí la navegación es la confirmación.
 *
 * Se apaga sola: un cartel de éxito que se queda fijo termina mintiendo apenas la persona
 * toca el siguiente campo.
 */
export function useAvisoGuardado(milisegundos = 4000) {
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (!guardado) return;
    const t = setTimeout(() => setGuardado(false), milisegundos);
    return () => clearTimeout(t);
  }, [guardado, milisegundos]);

  return [guardado, setGuardado] as const;
}

export function AvisoGuardado({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    // `role="status"` y `aria-live` para que un lector de pantalla lo anuncie: si el cambio
    // es sólo visual, quien no ve la pantalla se queda sin la confirmación.
    <p role="status" aria-live="polite" className="text-sm font-medium text-exito-600">
      Cambios guardados.
    </p>
  );
}
