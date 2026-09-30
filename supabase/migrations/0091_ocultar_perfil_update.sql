-- 0091 — «Ocultar mi perfil»: cerrar el camino por UPDATE (#265, review de #266).
--
-- 0090 puso la regla solo en el INSERT de `intereses_equipo`, y descartar (`interesa =
-- false`) siempre se permite. Como `intereses_update_propio` deja editar la fila propia, se
-- podía insertar un descarte a alguien oculto y después pasarlo a `interesa = true`: un
-- contacto que 0090 tenía que rechazar. La misma condición va ahora también en el UPDATE.

drop policy if exists oculto_a_nuevos_intereses_equipo_update on intereses_equipo;
create policy oculto_a_nuevos_intereses_equipo_update on intereses_equipo as restrictive for update
  with check (
    not interesa
    or not public.perfil_oculto_a_nuevos(a_perfil)
    or public.me_contacto(a_perfil)
  );
