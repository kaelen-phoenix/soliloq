-- 0097 — Sin chat de dos personas: quien tiene cuenta ve el perfil público completo (#283).
--
-- Decisión de producto: se saca «Contactar» desde el perfil público y el chat directo que
-- abría. A cambio, en el enlace público quien tiene una cuenta completa en Yalope (aprobada,
-- con las Normas aceptadas, con Perfil de Talento y no suspendida) ve también las redes, y
-- contacta por donde quiera. Sin cuenta, la vidriera sigue sin redes (0095): registrarse sigue
-- siendo el camino para llegar a alguien. Yalope queda enfocada en Proyectos y Equipos.
--
-- No se borra nada: las funciones y la tabla quedan (y los chats directos que ya existen
-- siguen andando), pero ya no se puede crear un contacto nuevo:
--   - `contactar_desde_perfil` deja de poder ejecutarse desde una sesión;
--   - `intereses_equipo` no acepta inserts ni updates desde una sesión (era el camino de
--     «Armar equipo» y de responder un contacto; el trigger que abría la sala no se dispara).

revoke execute on function public.contactar_desde_perfil(uuid) from public, anon, authenticated;
revoke insert, update on intereses_equipo from anon, authenticated;

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
    -- 0095 + 0097: las redes, solo para quien tiene una cuenta completa en Yalope.
    case
      when exists (
        select 1
        from perfiles yo
        join perfiles_talento mi_talento on mi_talento.id = yo.id
        where yo.id = auth.uid()
          and yo.aprobado_en is not null
          and yo.normas_aceptadas_en is not null
          and yo.suspendido_en is null
      ) then t.redes
      else '{}'::jsonb
    end
  from perfiles p
  join perfiles_talento t on t.id = p.id
  left join perfiles_creador c on c.id = p.id
  where p.enlace_token = p_token
    and p.enlace_publico_activo
    and not public.perfil_oculto_a_nuevos(p.id);
$function$;
