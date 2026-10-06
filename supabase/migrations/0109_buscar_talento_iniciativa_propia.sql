-- 0109 — `buscar_talento`: la iniciativa tiene que ser de quien busca (#372, revisión de #373).
--
-- 0108 sumó `p_obra_id` / `p_equipo_id` y excluye a quien ya está en la sala de esa
-- iniciativa. La función es `security definer`: pasando el id de un Proyecto o Equipo ajeno,
-- los Talentos que desaparecían revelaban quién está en una sala privada. Ahora una
-- iniciativa que no es de quien busca no devuelve filas. Misma firma que 0108.

create or replace function public.buscar_talento(
  p_texto text default null::text,
  p_edad_min integer default null::integer,
  p_edad_max integer default null::integer,
  p_generos genero_persona[] default '{}'::genero_persona[],
  p_habilidades text[] default '{}'::text[],
  p_lat double precision default null::double precision,
  p_lng double precision default null::double precision,
  p_radio_metros integer default null::integer,
  p_limite integer default 24,
  p_offset integer default 0,
  p_obra_id uuid default null::uuid,
  p_equipo_id uuid default null::uuid
)
returns table(id uuid, nombre text, edad integer, ubicacion_publica text, habilidades text[], foto_principal_path text)
language sql
stable
security definer
set search_path = public
as $function$
  select
    t.id,
    t.nombre,
    case when t.edad_visible
         then extract(year from age(t.fecha_nacimiento))::int end as edad,
    t.ubicacion_publica,
    t.habilidades,
    (
      select f.storage_path from fotos_talento f
      where f.talento_id = t.id
      order by f.orden
      limit 1
    ) as foto_principal_path
  from perfiles_talento t
  where t.id <> auth.uid()
    and public.puede_buscar_talento()
    and t.aparece_en_buscador
    and not public.hay_bloqueo(t.id)
    and exists (select 1 from fotos_talento f where f.talento_id = t.id)
    -- La iniciativa tiene que ser de quien busca: si no, el filtro por sala dejaría deducir
    -- quién está en la sala privada de otro Creador. Una ajena no devuelve nada.
    and (
      (p_obra_id is null and p_equipo_id is null)
      or exists (select 1 from obras o where o.id = p_obra_id and o.creador_id = auth.uid())
      or exists (select 1 from equipos e where e.id = p_equipo_id and e.creador_id = auth.uid())
    )
    -- Decisiones del Creador: solo las de esta iniciativa (sin iniciativa, todas).
    and not exists (
      select 1 from intereses_match im
      where im.de_perfil = auth.uid() and im.a_perfil = t.id
        and (
          (p_obra_id is null and p_equipo_id is null)
          or coalesce(im.obra_id, im.equipo_id) = coalesce(p_obra_id, p_equipo_id)
        )
    )
    -- Quien ya está en la sala de esta iniciativa no se vuelve a ofrecer.
    and not exists (
      select 1 from sala_integrantes si
      join salas s on s.id = si.sala_id
      where si.perfil_id = t.id
        and (p_obra_id is not null or p_equipo_id is not null)
        and coalesce(s.obra_id, s.equipo_id) = coalesce(p_obra_id, p_equipo_id)
    )
    and (
      p_texto is null
      or t.nombre ilike '%' || p_texto || '%'
      or t.experiencia ilike '%' || p_texto || '%'
      or exists (
        select 1 from unnest(t.habilidades) h
        where h ilike '%' || p_texto || '%'
      )
    )
    and (cardinality(p_generos) = 0 or t.genero = any (p_generos))
    and (cardinality(p_habilidades) = 0 or t.habilidades && p_habilidades)
    and (
      p_lat is null or p_lng is null or p_radio_metros is null
      or (
        ll_to_earth(t.ubicacion_lat, t.ubicacion_lng)
          <@ earth_box(ll_to_earth(p_lat, p_lng), p_radio_metros)
        and earth_distance(
              ll_to_earth(t.ubicacion_lat, t.ubicacion_lng),
              ll_to_earth(p_lat, p_lng)
            ) <= p_radio_metros
      )
    )
  order by
    case
      when p_texto is not null and t.nombre ilike '%' || p_texto || '%' then 0
      else 1
    end,
    case
      when p_edad_min is null and p_edad_max is null then 0
      when extract(year from age(t.fecha_nacimiento))::int
           between coalesce(p_edad_min, 0) and coalesce(p_edad_max, 200) then 0
      when extract(year from age(t.fecha_nacimiento))::int
           between coalesce(p_edad_min, 0) - 5 and coalesce(p_edad_max, 200) + 5 then 1
      else 2
    end,
    t.nombre asc,
    t.id asc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
$function$;
