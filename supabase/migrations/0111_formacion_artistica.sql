-- 0111 — «Formación artística» en el Perfil (#379).
--
-- Un campo opcional, aparte de la Trayectoria (`experiencia`), para estudios, escuelas,
-- carreras, cursos, talleres y seminarios. Mismo tope que la Trayectoria (2000 caracteres).
-- Es parte del Perfil de Talento, que desde #175 es el único perfil personal: lo ve quien
-- ve el perfil, también en el enlace público.
--
-- Desde 0089 la lectura de `perfiles_talento` va por columna: la nueva necesita su grant
-- (insertar y modificar ya los cubre el permiso de tabla). `mi_perfil_talento` devuelve la
-- fila entera, así que la incluye sola. `perfil_publico` suma la columna: cambia lo que
-- devuelve, así que se borra y se vuelve a crear con los mismos permisos.

alter table public.perfiles_talento
  add column if not exists formacion text
  constraint perfiles_talento_formacion_check check (char_length(formacion) <= 2000);

grant select (formacion) on public.perfiles_talento to anon, authenticated;

drop function if exists public.perfil_publico(uuid);

create function public.perfil_publico(p_token uuid)
returns table(nombre text, texto text, formacion text, habilidades text[], disciplinas disciplina_artistica[], otro_detalle text, fotos text[], ubicacion_publica text, edad integer, genero text, genero_descripcion text, videoreel_url text, redes jsonb)
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    t.nombre,
    t.experiencia,
    t.formacion,
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

revoke all on function public.perfil_publico(uuid) from public;
grant execute on function public.perfil_publico(uuid) to anon, authenticated, service_role;
