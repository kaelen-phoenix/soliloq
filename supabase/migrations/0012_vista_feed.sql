-- Vista del feed: roles de obras publicadas, compatibles con la edad del talento,
-- con vacantes libres, excluyendo lo ya postulado o descartado. security_invoker
-- hace que se evalúe con los permisos (y RLS) del usuario que consulta, no del dueño
-- de la vista, así solo trae roles que el talento ya podría ver por sí mismo.
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
    o.id as obra_id,
    o.titulo as obra_titulo,
    o.sinopsis as obra_sinopsis,
    o.locacion_ensayos,
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

-- El filtro por edad y por "ya clasificado" depende del talento que consulta,
-- así que se resuelve en una función parametrizada en lugar de en la vista.
create or replace function public.feed_para_talento(p_talento_id uuid)
returns setof feed_talento
language sql
security invoker
stable
as $$
  select f.*
  from feed_talento f
  join perfiles_talento t on t.id = p_talento_id
  where (
      f.edad_minima is null
      or f.edad_maxima is null
      or extract(year from age(t.fecha_nacimiento))::int between f.edad_minima and f.edad_maxima
    )
    and not exists (
      select 1 from postulaciones p where p.rol_id = f.rol_id and p.talento_id = p_talento_id
    )
    and not exists (
      select 1 from descartes d where d.rol_id = f.rol_id and d.talento_id = p_talento_id
    )
  order by f.obra_creado_en desc;
$$;
