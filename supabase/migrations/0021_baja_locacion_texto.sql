-- Cierre de la migración de ubicación y género: la mitad "contract" del expand / contract.
--
-- APLICAR SOLO DESPUÉS de que el código nuevo esté desplegado en producción. Entre 0018 y
-- este archivo, el esquema acepta a los dos códigos a la vez (columnas viejas opcionales,
-- nuevas opcionales, vista con los dos nombres de columna). Eso es lo que permite migrar la
-- base y desplegar Vercel en momentos distintos, sin ventana de rotura.

-- 1. La vista deja de exponer el nombre viejo. Va primero porque depende de la columna que
--    se borra abajo. La función depende del tipo de retorno de la vista, así que se baja.
drop function if exists public.feed_para_talento(uuid, integer);
drop view if exists feed_talento;

create view feed_talento
  with (security_invoker = true)
  as
  select
    r.id as rol_id,
    r.nombre as rol_nombre,
    r.tipo as rol_tipo,
    r.edad_minima,
    r.edad_maxima,
    r.descripcion as rol_descripcion,
    r.vacantes,
    r.generos_buscados,
    o.id as obra_id,
    o.titulo as obra_titulo,
    o.sinopsis as obra_sinopsis,
    o.ubicacion_texto as obra_ubicacion_texto,
    o.ubicacion_lat as obra_ubicacion_lat,
    o.ubicacion_lng as obra_ubicacion_lng,
    o.ubicacion_pais as obra_ubicacion_pais,
    o.creado_en as obra_creado_en,
    c.id as creador_id,
    c.nombre as creador_nombre,
    c.imagen_url as creador_imagen_url
  from roles r
  join obras o on o.id = r.obra_id
  join perfiles_creador c on c.id = o.creador_id
  where o.estado = 'publicada'
    and (
      select count(*) from postulaciones p
      where p.rol_id = r.id and p.estado = 'aprobado'
    ) < r.vacantes;

create or replace function public.feed_para_talento(
  p_talento_id uuid,
  p_radio_metros integer default null
)
returns setof feed_talento
language sql
security invoker
stable
as $$
  select f.*
  from feed_talento f
  join perfiles_talento t on t.id = p_talento_id
  where f.creador_id <> p_talento_id
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
      select 1 from postulaciones p where p.rol_id = f.rol_id and p.talento_id = p_talento_id
    )
    and not exists (
      select 1 from descartes d where d.rol_id = f.rol_id and d.talento_id = p_talento_id
    )
  order by f.obra_creado_en desc;
$$;

-- 2. Red de seguridad: si alguien creó un perfil durante la ventana con el código viejo,
--    quedó sin ubicación y el `not null` de abajo fallaría. Se completa desde el texto viejo
--    con las coordenadas del centro de CABA, que es de donde eran todas las cuentas.
update perfiles_talento
   set ubicacion_texto = coalesce(ubicacion_texto, locacion, 'CABA, Argentina'),
       ubicacion_lat = coalesce(ubicacion_lat, -34.6037),
       ubicacion_lng = coalesce(ubicacion_lng, -58.3816),
       ubicacion_pais = coalesce(ubicacion_pais, 'AR')
 where ubicacion_lat is null or ubicacion_lng is null or ubicacion_texto is null or ubicacion_pais is null;

update perfiles_creador
   set ubicacion_texto = coalesce(ubicacion_texto, locacion, 'CABA, Argentina'),
       ubicacion_lat = coalesce(ubicacion_lat, -34.6037),
       ubicacion_lng = coalesce(ubicacion_lng, -58.3816),
       ubicacion_pais = coalesce(ubicacion_pais, 'AR')
 where ubicacion_lat is null or ubicacion_lng is null or ubicacion_texto is null or ubicacion_pais is null;

update obras
   set ubicacion_texto = coalesce(ubicacion_texto, locacion_ensayos, 'CABA, Argentina'),
       ubicacion_lat = coalesce(ubicacion_lat, -34.6037),
       ubicacion_lng = coalesce(ubicacion_lng, -58.3816),
       ubicacion_pais = coalesce(ubicacion_pais, 'AR')
 where ubicacion_lat is null or ubicacion_lng is null or ubicacion_texto is null or ubicacion_pais is null;

-- 3. Ahora sí, las columnas nuevas pasan a obligatorias. `ubicacion_place_id` sigue siendo
--    opcional de forma permanente: una ubicación puede existir sin haber pasado por Places.
alter table perfiles_talento
  alter column ubicacion_texto set not null,
  alter column ubicacion_lat set not null,
  alter column ubicacion_lng set not null,
  alter column ubicacion_pais set not null;

alter table perfiles_creador
  alter column ubicacion_texto set not null,
  alter column ubicacion_lat set not null,
  alter column ubicacion_lng set not null,
  alter column ubicacion_pais set not null;

alter table obras
  alter column ubicacion_texto set not null,
  alter column ubicacion_lat set not null,
  alter column ubicacion_lng set not null,
  alter column ubicacion_pais set not null;

-- 4. El género deja de tener default: de acá en adelante es una elección explícita, no algo
--    que se completa solo.
alter table perfiles_talento alter column genero drop default;

-- 5. Y se van las columnas viejas.
alter table perfiles_talento drop column locacion;
alter table perfiles_creador drop column locacion;
alter table obras drop column locacion_ensayos;
