-- El buscador/pila de talentos (#124) no vuelve a mostrar a alguien que el creador ya
-- decidió (❤️ o ✕ → `intereses_match` con `de_perfil = auth.uid()`). Resto igual que 0052.

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
    and exists (select 1 from fotos_talento f where f.talento_id = t.id)
    and not exists (
      select 1 from intereses_match im
      where im.de_perfil = auth.uid() and im.a_perfil = t.id
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
$$;
