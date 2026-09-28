-- 0086 — `nombre_de_perfil` deja de poder llamarse desde la API (review de #242, #241).
--
-- Es SECURITY DEFINER: con el permiso de EXECUTE que Postgres da por defecto a `public`,
-- cualquiera —incluso sin sesión, por /rest/v1/rpc— podía pedir el nombre de una persona por
-- su id. Estuvo rota desde 0077 hasta 0085, así que nadie pudo usarla así; 0085 la vuelve a
-- hacer funcionar, y por eso se cierra ahora.
--
-- La usan solo otras funciones de la base (`feed_equipo`, `perfil_para_responder`, el
-- trigger `al_marcar_interes`), todas SECURITY DEFINER: corren como el dueño, así que el
-- revoke no las afecta. La app nunca la llama directo.

revoke all on function public.nombre_de_perfil(uuid) from public, anon, authenticated;
