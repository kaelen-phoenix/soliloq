-- 0070 — Métricas de obra para el modelo de match/convocatoria (issue #138).
--
-- #117 retiró `postulaciones`/`descartes` del swipe: `metricas_obra` (0026/0027) seguía
-- contando esas tablas y mostraba ceros para toda actividad nueva. Se redefine sobre
-- `intereses_match`/`matches`/`convocatorias`, al nivel de la obra entera (no por rol: el
-- cupo ya es por obra desde #107/#152, no por rol individual).
--
-- Definiciones:
--   alcance          = talentos que decidieron algo sobre la obra (Me interesa o Paso).
--                       No hay tracking de impresiones pasivas (tampoco lo había con el
--                       flujo viejo: `descartes` + `postulaciones` era ya "decisiones", no
--                       "se le mostró la tarjeta").
--   interes_recibido = de esos, cuántos marcaron Me interesa (`interesa = true`).
--   matches          = filas de `matches` de la obra (interés mutuo, materializado).
--   convocados/cupo  = igual que en `/matches` y `iniciativa_en_cierre`: `aceptados_iniciativa`
--                       sobre `cupo_iniciativa`.
--
-- Cambia la firma de salida (de una fila por rol a una sola fila por obra), así que hay que
-- borrar la función antes de recrearla.
drop function if exists public.metricas_obra(uuid);

create function public.metricas_obra(p_obra_id uuid)
returns table (
  alcance integer,
  interes_recibido integer,
  matches integer,
  convocados integer,
  cupo integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*)::int from intereses_match im
       where im.obra_id = p_obra_id and im.de_perfil <> o.creador_id),
    (select count(*)::int from intereses_match im
       where im.obra_id = p_obra_id and im.de_perfil <> o.creador_id and im.interesa),
    (select count(*)::int from matches m where m.obra_id = p_obra_id),
    public.aceptados_iniciativa(p_obra_id, null),
    public.cupo_iniciativa(p_obra_id, null)
  from obras o
  where o.id = p_obra_id
    and public.es_dueno_de_obra(p_obra_id);
$$;

-- El drop se lleva los grants, así que hay que volver a ponerlos (mismo patrón que 0027).
revoke all on function public.metricas_obra(uuid) from public, anon;
grant execute on function public.metricas_obra(uuid) to authenticated;
