-- Marca de que un talento ya vio las tarjetas de ejemplo del feed (ver
-- `src/lib/onboarding-ejemplo.ts`). Se muestran una sola vez en la vida de la cuenta.
--
-- Es una columna y no `localStorage` porque el onboarding tiene que ser una vez **por
-- persona**, no una vez por navegador: con `localStorage`, cambiar de teléfono o entrar
-- desde la compu volvería a mostrar el tutorial a alguien que ya lo hizo.
--
-- `null` = todavía no lo vio. Eso hace que las cuentas que ya existen entren en el caso de
-- "primera vez" sin backfill, que es justo lo que se busca: el ejemplo no es sólo para los
-- que se registren de ahora en adelante, lo tiene que ver todo el mundo una vez.
--
-- Se guarda el timestamptz y no un booleano porque cuesta lo mismo y responde una pregunta
-- más: cuándo. Sirve para saber si alguien pasó por el onboarding antes o después de un
-- cambio en las tarjetas.
--
-- La escritura la cubre `perfil_talento_update_propio` (0007), que ya permite a cada quien
-- actualizar su propia fila. No hace falta política nueva.

alter table perfiles_talento
  add column if not exists onboarding_visto_en timestamptz;
