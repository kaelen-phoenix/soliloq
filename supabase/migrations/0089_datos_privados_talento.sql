-- 0089 — La fecha de nacimiento y la ubicación exacta no salen de la base para otras cuentas (#255).
--
-- Las políticas de `perfiles_talento` dejan leer la fila entera a quien puede ver el perfil
-- (Creadores por el buscador, compañeros de sala…), y la app la pedía con `select("*")`:
-- aunque en pantalla solo se muestre el barrio y la edad solo si `edad_visible`, llegaban al
-- navegador la fecha de nacimiento exacta, la dirección escrita (`ubicacion_texto`, que
-- puede ser el domicilio), su place id de Google y las coordenadas exactas.
--
-- RLS filtra filas, no columnas: acá se sacan esas cinco columnas del privilegio SELECT de
-- las sesiones de usuario (`anon`, `authenticated`). Siguen pudiendo escribirlas (INSERT/
-- UPDATE no se tocan): el formulario del perfil propio las guarda igual.
--
-- Quién las necesita, y por dónde las lee ahora:
--   - el perfil propio → `mi_perfil_talento()` (la fila entera, solo la de uno);
--   - la edad de otra persona → `edad_publica(id)` (la edad, y solo si la dejó visible);
--   - `buscar_talento` (edad para priorizar, coordenadas para el radio) y
--     `feed_para_talento` (edad y ubicación propias para filtrar roles) pasan a security
--     definer, con las condiciones de acceso escritas en la función.
--
-- OJO al agregar columnas a `perfiles_talento`: no quedan legibles solas. Hay que sumarlas
-- con `grant select (columna) on perfiles_talento to anon, authenticated` si son públicas.

-- ── Privilegios por columna ─────────────────────────────────────────────────
revoke select on perfiles_talento from anon, authenticated;

do $$
declare
  columnas text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into columnas
  from information_schema.columns
  where table_schema = 'public' and table_name = 'perfiles_talento'
    and column_name not in (
      'fecha_nacimiento', 'ubicacion_texto', 'ubicacion_place_id', 'ubicacion_lat', 'ubicacion_lng'
    );
  execute format('grant select (%s) on perfiles_talento to anon, authenticated', columnas);
end $$;

-- ── El perfil propio, entero ────────────────────────────────────────────────
create or replace function public.mi_perfil_talento()
returns setof perfiles_talento
language sql
stable
security definer
set search_path = public
as $$
  select * from perfiles_talento where id = auth.uid();
$$;

revoke all on function public.mi_perfil_talento() from public;
grant execute on function public.mi_perfil_talento() to authenticated;

-- ── La edad de otra persona, solo si la dejó visible ───────────────────────
-- Devuelve la edad de quien eligió mostrarla (lo mismo que ya se ve en su perfil), nunca la
-- fecha. A quien la ocultó, `null`.
create or replace function public.edad_publica(p_perfil uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when edad_visible and fecha_nacimiento is not null
              then extract(year from age(fecha_nacimiento))::int end
  from perfiles_talento
  where id = p_perfil;
$$;

revoke all on function public.edad_publica(uuid) from public;
grant execute on function public.edad_publica(uuid) to authenticated;

-- ── buscar_talento: security definer con el acceso escrito ──────────────────
-- Antes era invoker y el acceso lo daba RLS, que para esta tabla es la unión de varias
-- políticas (buscador, compañeros de sala, Creador con Proyecto publicado, postulados…): así
-- podía salir en una búsqueda alguien que apagó «Aparecer en el buscador» solo por compartir
-- una sala. Ahora dice exactamente lo que es el buscador: lo usa un Creador, y muestra a
-- quien lo tiene prendido y no está bloqueado. Todo lo demás, igual que en 0058.
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
  p_offset integer default 0
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
$function$;

-- ── feed_para_talento: security definer, solo para uno mismo ────────────────
-- Lee la edad y la ubicación del propio talento para filtrar roles. La vista `feed_talento`
-- ya corría con los permisos de su dueño, así que el resultado no cambia; lo nuevo es que
-- solo se puede pedir el feed propio (antes se podía pasar otro `p_talento_id`).
create or replace function public.feed_para_talento(p_talento_id uuid, p_radio_metros integer default null::integer)
returns setof feed_talento
language sql
stable
security definer
set search_path = public
as $function$
  select f.*
  from feed_talento f
  join perfiles_talento t on t.id = p_talento_id
  where p_talento_id = auth.uid()
    and f.creador_id <> p_talento_id
    and (
      f.edad_minima is null
      or f.edad_maxima is null
      or extract(year from age(t.fecha_nacimiento))::int between f.edad_minima and f.edad_maxima
    )
    and (
      cardinality(f.generos_buscados) = 0
      or t.genero = 'sin_especificar'
      or t.genero = any (f.generos_buscados)
    )
    and (
      p_radio_metros is null
      or (
        ll_to_earth(f.obra_ubicacion_lat, f.obra_ubicacion_lng)
          <@ earth_box(ll_to_earth(t.ubicacion_lat, t.ubicacion_lng), p_radio_metros)
        and earth_distance(
              ll_to_earth(f.obra_ubicacion_lat, f.obra_ubicacion_lng),
              ll_to_earth(t.ubicacion_lat, t.ubicacion_lng)
            ) <= p_radio_metros
      )
    )
    and not exists (
      select 1 from intereses_match im
      where im.de_perfil = p_talento_id and im.obra_id = f.obra_id
    )
    and not exists (
      select 1 from sala_integrantes si
      join salas s on s.id = si.sala_id
      where s.obra_id = f.obra_id and si.perfil_id = p_talento_id
    )
  order by f.obra_creado_en desc;
$function$;
