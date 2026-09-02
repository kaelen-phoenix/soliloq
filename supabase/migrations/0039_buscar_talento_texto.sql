-- El buscador de talento solo miraba el nombre: escribir "clown", "canto" o "acrobacia"
-- no encontraba a nadie aunque lo tuviera cargado. `p_texto` pasa a matchear nombre,
-- cualquier habilidad y el texto de experiencia, y los resultados que matchean por nombre
-- quedan primero.
--
-- Solo redefine la función (SECURITY INVOKER, hereda la RLS y las restrictivas de bloqueo
-- igual que antes). `drop` primero: el cuerpo cambia pero también agrego un criterio de
-- orden, y `create or replace` va bien, pero mantengo el patrón de 0038 por las dudas.

create or replace function public.buscar_talento(
  p_texto        text default null,
  p_edad_min     int default null,
  p_edad_max     int default null,
  p_generos      genero_persona[] default '{}',
  p_habilidades  text[] default '{}',
  p_lat          double precision default null,
  p_lng          double precision default null,
  p_radio_metros int default null,
  p_limite       int default 24,
  p_offset       int default 0
)
returns table (
  id uuid,
  nombre text,
  edad int,
  ubicacion_publica text,
  habilidades text[],
  foto_principal_path text
)
language sql
security invoker
stable
as $$
  select
    t.id,
    t.nombre,
    extract(year from age(t.fecha_nacimiento))::int as edad,
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
    and exists (select 1 from fotos_talento f where f.talento_id = t.id)
    and (
      p_texto is null
      or t.nombre ilike '%' || p_texto || '%'
      or t.experiencia ilike '%' || p_texto || '%'
      or exists (
        select 1 from unnest(t.habilidades) h
        where h ilike '%' || p_texto || '%'
      )
    )
    and (
      p_edad_min is null
      or extract(year from age(t.fecha_nacimiento))::int >= p_edad_min
    )
    and (
      p_edad_max is null
      or extract(year from age(t.fecha_nacimiento))::int <= p_edad_max
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
    t.nombre asc,
    t.id asc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
$$;
