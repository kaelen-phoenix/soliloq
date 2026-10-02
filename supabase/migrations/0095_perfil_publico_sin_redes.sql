-- 0095 — El enlace público no muestra las redes: para contactar hay que registrarse.
--
-- Decisión de producto: el perfil que se comparte (`/p/[token]`) es la vidriera —fotos,
-- videoreel, trayectoria, habilidades, zona— pero las redes (Instagram, YouTube…) quedan para
-- dentro de la app. Quien quiera contactar a alguien se registra en Yalope: así crece la
-- comunidad y el contacto queda adentro, sin «regalar la agenda». Esto deja atrás 0038, que
-- había vuelto a mostrar el perfil completo en el enlace.
--
-- En la base y no solo en la pantalla:
--   - `perfil_publico` devuelve las redes vacías (misma firma, para no romper a quien la
--     llama);
--   - quien no tiene sesión (`anon`) no puede leer la columna `redes` de `perfiles_talento`
--     por ningún camino (la política de Creador con Proyecto publicado no pide sesión).

revoke select (redes) on perfiles_talento from anon;

create or replace function public.perfil_publico(p_token uuid)
returns table(nombre text, texto text, habilidades text[], disciplinas disciplina_artistica[], otro_detalle text, fotos text[], ubicacion_publica text, edad integer, genero text, genero_descripcion text, videoreel_url text, redes jsonb)
language sql
stable security definer
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
    -- 0095: las redes no salen por el enlace público.
    '{}'::jsonb
  from perfiles p
  join perfiles_talento t on t.id = p.id
  left join perfiles_creador c on c.id = p.id
  where p.enlace_token = p_token
    and p.enlace_publico_activo
    and not public.perfil_oculto_a_nuevos(p.id);
$function$;
