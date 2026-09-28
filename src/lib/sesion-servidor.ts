import { cache } from "react";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { createClient } from "@/lib/supabase/server";

/**
 * Usuario y estado de la cuenta, **una vez por request**. El layout de `(app)` y la página
 * los necesitan los dos, y cada uno los pedía por su cuenta: `auth.getUser()` es un viaje
 * a Supabase Auth y `leerEstadoCuenta` otro a la base, y la app corre en una región
 * distinta que Supabase — cada viaje de más se paga en la respuesta.
 *
 * `cache` de React memoiza por request (se descarta al terminar), así que no hay riesgo
 * de mezclar sesiones entre personas. El middleware corre aparte y no comparte esto.
 */
export const usuarioDeLaRequest = cache(async () => {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  return user;
});

export const estadoCuentaDeLaRequest = cache((userId: string) =>
  leerEstadoCuenta(createClient(), userId),
);
