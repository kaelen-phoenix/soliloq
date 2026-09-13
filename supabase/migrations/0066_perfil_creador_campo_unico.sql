-- 0066 — Perfil de Creador: un solo campo de trayectoria (issue #161).
--
-- `descripcion` y `biografia` pedían lo mismo por duplicado — en el formulario de edición
-- y también en la vidriera pública, que mostraba "Sobre el proyecto" (descripcion) y
-- "Biografía" (biografia) como dos secciones separadas. Se deja `biografia` como el único
-- campo; `perfil_publico` deja de exponer `descripcion` en `texto` para el Creador.
--
-- La columna `descripcion` no se elimina (se preserva lo que haya cargado), sólo deja de
-- leerse y escribirse.

create or replace function public.perfil_publico(p_token uuid)
returns table (
  tipo text, nombre text, texto text, habilidades text[],
  disciplinas disciplina_artistica[], otro_detalle text, fotos text[],
  ubicacion_publica text, edad integer, genero text, genero_descripcion text,
  videoreel_url text, redes jsonb, biografia text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
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
    null::text
  from perfiles p
  join perfiles_talento t on t.id = p.id
  where p.enlace_token = p_token
    and p.enlace_publico_activo
    and p.modo_activo = 'talento'

  union all

  select
    'creador'::text,
    c.nombre,
    null::text,  -- #161: `descripcion` ya no se muestra; `biografia` es el único campo.
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
    c.biografia
  from perfiles p
  join perfiles_creador c on c.id = p.id
  where p.enlace_token = p_token
    and p.enlace_publico_activo
    and p.modo_activo = 'creador';
$function$;

revoke all on function public.perfil_publico(uuid) from public;
grant execute on function public.perfil_publico(uuid) to anon, authenticated;
