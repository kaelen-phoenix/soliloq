-- Visibilidad de la edad (issue #110). El usuario decide si su edad aparece en el perfil
-- público; la fecha de nacimiento se sigue guardando y usándose para priorizar búsquedas.
--
-- Default `true` para no cambiar lo que ya se muestra hoy. El Creador no tenía fecha de
-- nacimiento: se agrega opcional (nullable) para que pueda mostrar su edad si quiere.

alter table perfiles_talento
  add column edad_visible boolean not null default true;

alter table perfiles_creador
  add column fecha_nacimiento date
    check (fecha_nacimiento is null or fecha_nacimiento <= (current_date - interval '16 years')),
  add column edad_visible boolean not null default true;

-- ------------------------------------------------------------------------------------------
-- `perfil_publico`: la edad solo sale si `edad_visible`. El resto igual que 0038.
-- ------------------------------------------------------------------------------------------
create or replace function public.perfil_publico(p_token uuid)
returns table (
  tipo text,
  nombre text,
  texto text,
  habilidades text[],
  disciplinas disciplina_artistica[],
  otro_detalle text,
  fotos text[],
  ubicacion_publica text,
  edad int,
  genero text,
  genero_descripcion text,
  videoreel_url text,
  redes jsonb,
  obras jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select
    'talento'::text,
    t.nombre,
    t.experiencia,
    t.habilidades,
    '{}'::disciplina_artistica[],
    null::text,
    coalesce(
      (select array_agg(f.storage_path order by f.orden)
       from fotos_talento f
       where f.talento_id = t.id),
      '{}'::text[]
    ),
    t.ubicacion_publica,
    case when t.edad_visible
         then extract(year from age(t.fecha_nacimiento))::int end,
    t.genero::text,
    t.genero_descripcion,
    t.videoreel_url,
    t.redes,
    '[]'::jsonb
  from perfiles p
  join perfiles_talento t on t.id = p.id
  where p.enlace_token = p_token
    and p.enlace_publico_activo
    and p.modo_activo = 'talento'

  union all

  select
    'creador'::text,
    c.nombre,
    c.descripcion,
    '{}'::text[],
    c.disciplinas,
    c.otro_detalle,
    case when c.imagen_url is not null then array[c.imagen_url] else '{}'::text[] end,
    c.ubicacion_publica,
    case when c.fecha_nacimiento is not null and c.edad_visible
         then extract(year from age(c.fecha_nacimiento))::int end,
    null::text,
    null::text,
    null::text,
    '{}'::jsonb,
    coalesce(
      (select jsonb_agg(
                jsonb_build_object('titulo', o.titulo, 'anio', o.anio, 'rol', o.rol_desempenado)
                order by o.anio desc)
       from obras_previas o
       where o.creador_id = c.id),
      '[]'::jsonb
    )
  from perfiles p
  join perfiles_creador c on c.id = p.id
  where p.enlace_token = p_token
    and p.enlace_publico_activo
    and p.modo_activo = 'creador';
$$;

revoke all on function public.perfil_publico(uuid) from public;
grant execute on function public.perfil_publico(uuid) to anon, authenticated;

-- ------------------------------------------------------------------------------------------
-- `buscar_talento`: la edad pasa de FILTRO (excluía) a PRIORIDAD (ordena). Los que caen en
-- el rango buscado van primero; ±5 años, después; el resto aparece igual, al final. Sin
-- rango buscado, no reordena por edad. La edad que se DEVUELVE respeta `edad_visible`
-- (null si está oculta), pero para ordenar se usa siempre la real. Resto igual que 0039.
-- ------------------------------------------------------------------------------------------
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
