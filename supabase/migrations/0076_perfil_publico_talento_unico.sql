-- 0076 — El enlace público (booking) muestra siempre el Perfil de Talento (issue #175, 4/4 app).
--
-- `perfil_publico` tenía dos ramas según `modo_activo`: en modo Creador mostraba una
-- identidad completamente distinta (nombre, foto, biografía) desde `perfiles_creador`. Con
-- un único perfil personal, el booking siempre es el mismo sin importar en qué modo esté la
-- cuenta — sólo cambia si además suma "Perfil artístico" (`disciplinas`/`otro_detalle`,
-- cuando la función de Creador está activa).
--
-- Se pierden `tipo` (ya no hace falta distinguir) y `biografia` (era el resumen de
-- trayectoria propio del Creador, separado de `experiencia` de Talento — #161 ya lo había
-- dejado como único campo del lado Creador; ahora ese campo se retira junto con el resto de
-- la identidad de `perfiles_creador`, mismo criterio aceptado para el nombre de compañía).
drop function if exists public.perfil_publico(uuid);

create function public.perfil_publico(p_token uuid)
returns table (
  nombre text, texto text, habilidades text[],
  disciplinas disciplina_artistica[], otro_detalle text, fotos text[],
  ubicacion_publica text, edad integer, genero text, genero_descripcion text,
  videoreel_url text, redes jsonb
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    t.nombre,
    t.experiencia,
    t.habilidades,
    coalesce(c.disciplinas, '{}'::disciplina_artistica[]),
    c.otro_detalle,
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
    t.redes
  from perfiles p
  join perfiles_talento t on t.id = p.id
  left join perfiles_creador c on c.id = p.id
  where p.enlace_token = p_token
    and p.enlace_publico_activo;
$function$;

revoke all on function public.perfil_publico(uuid) from public;
grant execute on function public.perfil_publico(uuid) to anon, authenticated;
