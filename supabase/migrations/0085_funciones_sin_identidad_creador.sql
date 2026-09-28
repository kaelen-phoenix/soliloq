-- 0085 — Tres funciones que seguían leyendo la identidad de perfiles_creador (issue #241).
--
-- 0077 (#175) borró de `perfiles_creador` las columnas de identidad (nombre, ubicación,
-- imagen…): desde entonces la identidad de toda persona vive solo en `perfiles_talento`.
-- Estas tres funciones SQL no se actualizaron y fallan en cada llamada con
-- "column ... does not exist" (una función SQL no se revalida cuando se borra una columna
-- que usa):
--
--   - nombre_de_perfil      → la usa el trigger `al_marcar_interes` al abrir la sala cuando
--                             el interés de «Contactar» es mutuo.
--   - perfil_para_responder → /equipo/responder/[id], destino de la notificación «Alguien
--                             quiere contactarte desde tu perfil».
--   - feed_equipo           → /equipo.
--
-- Se redefinen con la misma firma y el mismo resultado, leyendo nombre y ubicación del
-- Perfil de Talento. `disciplinas`/`otro_detalle` siguen saliendo de `perfiles_creador` (0077
-- los conservó). `imagen_url` ya no existe en ningún lado: sale en null, y la pantalla ya
-- muestra la inicial cuando no hay imagen.
--
-- `supabase/tests/funciones_validas.sql` recrea todas las funciones SQL del esquema y falla
-- si alguna vuelve a quedar apuntando a una columna que no existe.

create or replace function public.nombre_de_perfil(p_perfil_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select nombre from perfiles_talento where id = p_perfil_id),
    'Alguien'
  );
$$;

create or replace function public.perfil_para_responder(p_de uuid)
returns table(
  perfil_id uuid, nombre text, pitch text, ubicacion_publica text,
  disciplinas disciplina_artistica[], otro_detalle text, habilidades text[],
  es_talento boolean, es_creador boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    p.id,
    public.nombre_de_perfil(p.id),
    p.pitch,
    t.ubicacion_publica,
    coalesce(c.disciplinas, '{}'::disciplina_artistica[]),
    c.otro_detalle,
    coalesce(t.habilidades, '{}'::text[]),
    t.id is not null,
    c.id is not null
  from perfiles p
  left join perfiles_talento t on t.id = p.id
  left join perfiles_creador c on c.id = p.id
  where p.id = p_de
    and exists (
      select 1 from intereses_equipo i
      where i.de_perfil = p_de and i.a_perfil = auth.uid() and i.interesa
    );
$$;

create or replace function public.feed_equipo(p_radio_metros integer default null)
returns table(
  perfil_id uuid, nombre text, pitch text, ubicacion_publica text,
  disciplinas disciplina_artistica[], otro_detalle text, habilidades text[],
  imagen_url text, es_talento boolean, es_creador boolean, distancia_metros integer
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with yo as (
    select p.id, t.ubicacion_lat as lat, t.ubicacion_lng as lng
    from perfiles p
    left join perfiles_talento t on t.id = p.id
    where p.id = auth.uid()
  )
  select
    p.id,
    public.nombre_de_perfil(p.id),
    p.pitch,
    t.ubicacion_publica,
    coalesce(c.disciplinas, '{}'::disciplina_artistica[]),
    c.otro_detalle,
    coalesce(t.habilidades, '{}'::text[]),
    -- La imagen de Creador se borró en 0077 y del Talento no se expone ninguna foto (viven
    -- en `fotos_talento`, detrás de sus políticas).
    null::text,
    t.id is not null,
    c.id is not null,
    case
      when yo.lat is null or t.ubicacion_lat is null then null
      else earth_distance(
             ll_to_earth(yo.lat, yo.lng),
             ll_to_earth(t.ubicacion_lat, t.ubicacion_lng)
           )::int
    end
  from perfiles p
  cross join yo
  left join perfiles_talento t on t.id = p.id
  left join perfiles_creador c on c.id = p.id
  where p.busca_equipo
    and p.id <> yo.id
    and (t.id is not null or c.id is not null)
    and not exists (
      select 1 from intereses_equipo i
      where i.de_perfil = yo.id and i.a_perfil = p.id
    )
    and not public.hay_bloqueo(p.id)
    and (
      p_radio_metros is null
      or yo.lat is null
      or earth_distance(
           ll_to_earth(yo.lat, yo.lng),
           ll_to_earth(t.ubicacion_lat, t.ubicacion_lng)
         ) <= p_radio_metros
    )
  order by 11 nulls last
  limit 50;
$$;
