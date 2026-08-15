-- Los conteos de `metricas_obra` volvían como `bigint`, que no entra en el entero seguro de
-- JavaScript y por eso viaja serializado como texto. Sumar dos de esos en el cliente
-- concatena en vez de sumar, y el bug es silencioso: no falla, muestra un número mal.
--
-- Ninguna de estas cuentas se acerca a 2^31, así que `int` es el tipo correcto y elimina la
-- ambigüedad en el origen en lugar de parchear cada lugar que consume el dato.
--
-- Cambiar el tipo de retorno obliga a borrar la función antes: `create or replace` no puede
-- redefinir la firma de salida.

drop function if exists public.metricas_obra(uuid);

create function public.metricas_obra(p_obra_id uuid)
returns table (
  rol_id uuid,
  rol_nombre text,
  vacantes integer,
  alcance integer,
  postulaciones integer,
  pendientes integer,
  en_duda integer,
  aprobados integer,
  rechazados integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.id,
    r.nombre,
    r.vacantes,
    -- Alcance = a cuánta gente se le mostró la tarjeta y decidió algo. Postularse y
    -- descartar son excluyentes entre sí, así que la suma no cuenta a nadie dos veces.
    ((select count(*) from descartes d where d.rol_id = r.id)
      + (select count(*) from postulaciones p where p.rol_id = r.id))::int,
    (select count(*) from postulaciones p where p.rol_id = r.id)::int,
    (select count(*) from postulaciones p where p.rol_id = r.id and p.estado = 'pendiente')::int,
    (select count(*) from postulaciones p where p.rol_id = r.id and p.estado = 'en_duda')::int,
    (select count(*) from postulaciones p where p.rol_id = r.id and p.estado = 'aprobado')::int,
    (select count(*) from postulaciones p where p.rol_id = r.id and p.estado = 'rechazado')::int
  from roles r
  where r.obra_id = p_obra_id
    and public.es_dueno_de_obra(p_obra_id)
  order by r.creado_en;
$$;

-- El drop se lleva los grants, así que hay que volver a ponerlos.
revoke all on function public.metricas_obra(uuid) from public, anon;
grant execute on function public.metricas_obra(uuid) to authenticated;
