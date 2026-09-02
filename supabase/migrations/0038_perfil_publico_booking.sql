-- El enlace público pasa de "vidriera" mínima a **booking**: la carta de presentación que
-- un artista le pasa a una directora de casting. `perfil_publico` amplía su proyección con
-- edad (no la fecha), ubicación pública, género, videoreel, redes y obras previas.
--
-- Revierte a conciencia la restricción de 0037 (que dejaba todo eso afuera por privacidad):
-- el enlace sigue siendo opt-in y revocable, y la página sigue `noindex`. No se abre
-- ninguna política anónima nueva: todo pasa por esta RPC `security definer`.
--
-- Solo redefine la función. Sin cambios de tabla ni de enum. `drop` primero porque cambia
-- el tipo de retorno (columnas OUT nuevas) y `create or replace` no lo permite; nada en la
-- base depende de ella (la llaman el código y `contactar_desde_perfil`, no una vista ni una
-- policy). Las columnas viejas mantienen nombre y tipo, así que el código ya desplegado
-- sigue funcionando contra la versión nueva.

drop function if exists public.perfil_publico(uuid);

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
    extract(year from age(t.fecha_nacimiento))::int,
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
    null::int,
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
