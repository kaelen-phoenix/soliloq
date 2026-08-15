-- Métricas de rendimiento de una convocatoria, para el tablero del creador.
--
-- Existe como función y no como consulta del cliente por una razón de privacidad: el
-- alcance real de un rol sale de `descartes`, y esa tabla solo la puede leer el propio
-- talento (`descartes_select_propio`). Abrir esa política al creador le mostraría *quién*
-- lo descartó, que no es información suya. Acá se devuelven únicamente conteos agregados:
-- el creador se entera de cuántos vieron el rol, nunca de quiénes lo pasaron de largo.
--
-- Por eso es SECURITY DEFINER, y por eso lo primero que hace es verificar la propiedad de
-- la obra: sin ese chequeo, cualquiera podría pedir las métricas de una obra ajena.

create or replace function public.metricas_obra(p_obra_id uuid)
returns table (
  rol_id uuid,
  rol_nombre text,
  vacantes integer,
  alcance bigint,
  postulaciones bigint,
  pendientes bigint,
  en_duda bigint,
  aprobados bigint,
  rechazados bigint
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
    (select count(*) from descartes d where d.rol_id = r.id)
      + (select count(*) from postulaciones p where p.rol_id = r.id),
    (select count(*) from postulaciones p where p.rol_id = r.id),
    (select count(*) from postulaciones p where p.rol_id = r.id and p.estado = 'pendiente'),
    (select count(*) from postulaciones p where p.rol_id = r.id and p.estado = 'en_duda'),
    (select count(*) from postulaciones p where p.rol_id = r.id and p.estado = 'aprobado'),
    (select count(*) from postulaciones p where p.rol_id = r.id and p.estado = 'rechazado')
  from roles r
  where r.obra_id = p_obra_id
    and public.es_dueno_de_obra(p_obra_id)
  order by r.creado_en;
$$;

-- `authenticated` y no `anon`: las métricas nunca son públicas. La función igual chequea
-- la propiedad, así que este grant no alcanza para ver obras ajenas.
revoke all on function public.metricas_obra(uuid) from public, anon;
grant execute on function public.metricas_obra(uuid) to authenticated;
