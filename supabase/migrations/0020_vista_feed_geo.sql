-- El feed pasa a filtrar por distancia y por género. Los dos filtros viven acá, en Postgres,
-- y no en el cliente: filtrar en el navegador obliga a traerse todos los roles del mundo
-- para descartarlos ahí, que es exactamente el bug que este change viene a arreglar.

-- La vista expone a la vez el nombre viejo (`locacion_ensayos`) y los nuevos: durante la
-- ventana entre aplicar esta migración y desplegar el código, el código VIEJO sigue leyendo
-- el feed sin romperse. El nombre viejo se va recién en 0021, ya con el código nuevo arriba.
-- Sin esto, migrar la base y desplegar Vercel tendrían que ser simultáneos, que es
-- justamente lo que el corte en dos migraciones venía a evitar.
drop function if exists public.feed_para_talento(uuid);
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
    o.locacion_ensayos, -- compatibilidad con el código todavía desplegado; se va en 0021
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

-- `p_radio_metros` null significa "todo el mundo", no "sin configurar". Va con default para
-- que las llamadas viejas de un solo argumento sigan resolviendo durante el deploy.
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
    -- Un rol sin géneros buscados le llega a todo el mundo, y quien eligió no declarar su
    -- género recibe todo igual.
    and (
      cardinality(f.generos_buscados) = 0
      or t.genero = 'sin_especificar'
      or t.genero = any (f.generos_buscados)
    )
    -- El operador <@> de earthdistance devuelve millas y no usa el índice GiST; se compara
    -- con earth_box para que sí lo use, y earth_distance afina el borde de la caja.
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
