-- 0113 — El perfil compartido, completo y con nombre propio (#384).
--
-- 1. Redes para todos: el enlace público muestra las redes y el sitio web también a quien no
--    tiene cuenta. Deja atrás 0095 (sin redes en el enlace) y la regla de 0097 (redes solo con
--    cuenta completa). Lo demás no cambia: la edad oculta y el perfil oculto a personas nuevas
--    se siguen respetando, y sigue sin haber chat de dos personas. La columna `redes` sigue sin
--    poder leerse sin sesión: el único camino es `perfil_publico`.
-- 2. URL con nombre: `perfiles.enlace_alias` (`yalope.com/p/ana-perez`), elegido por la
--    persona, único, en minúsculas, números y guiones. El código de siempre sigue andando.
--    `perfil_publico` pasa a recibir cualquiera de los dos (cambia la firma: se borra y se
--    vuelve a crear con los mismos permisos).
-- 3. Visitas: cuántas veces se abrió el enlace, por día, sin guardar quién lo abrió. Las
--    registra `registrar_visita_enlace` (la llama el navegador de quien visita); las del
--    propio dueño no cuentan. La persona ve solo las suyas.

alter table public.perfiles
  add column if not exists enlace_alias text
  constraint perfiles_enlace_alias_formato check (
    enlace_alias ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(enlace_alias) between 3 and 40
    -- Que no se confunda con un código de enlace.
    and enlace_alias !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
create unique index if not exists uq_perfiles_enlace_alias on public.perfiles (enlace_alias);

drop function if exists public.perfil_publico(uuid);

create function public.perfil_publico(p_clave text)
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
    -- #384: las redes y el sitio web se ven también sin cuenta (deja atrás 0095/0097).
    t.redes
  from perfiles p
  join perfiles_talento t on t.id = p.id
  left join perfiles_creador c on c.id = p.id
  where (
      p.enlace_alias = lower(p_clave)
      or p.enlace_token = case when p_clave ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p_clave::uuid end
    )
    and p.enlace_publico_activo
    and not public.perfil_oculto_a_nuevos(p.id);
$function$;

revoke all on function public.perfil_publico(text) from public;
grant execute on function public.perfil_publico(text) to anon, authenticated, service_role;

create table if not exists public.visitas_enlace (
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  dia date not null,
  cantidad integer not null default 0 check (cantidad >= 0),
  primary key (perfil_id, dia)
);
alter table public.visitas_enlace enable row level security;
create policy visitas_enlace_select_propias on public.visitas_enlace
  for select using (perfil_id = auth.uid());
revoke all on public.visitas_enlace from anon, authenticated;
grant select on public.visitas_enlace to authenticated;

create or replace function public.registrar_visita_enlace(p_clave text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil uuid;
begin
  select p.id into v_perfil
  from perfiles p
  where p.enlace_publico_activo
    and (
      p.enlace_alias = lower(p_clave)
      or p.enlace_token = case when p_clave ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p_clave::uuid end
    )
    and not public.perfil_oculto_a_nuevos(p.id);
  -- Un enlace apagado, oculto o inexistente no cuenta; tampoco las visitas del propio dueño.
  if v_perfil is null or v_perfil = auth.uid() then
    return;
  end if;
  insert into visitas_enlace (perfil_id, dia, cantidad)
    values (v_perfil, (now() at time zone 'America/Argentina/Buenos_Aires')::date, 1)
  on conflict (perfil_id, dia) do update set cantidad = visitas_enlace.cantidad + 1;
end;
$$;

revoke all on function public.registrar_visita_enlace(text) from public;
grant execute on function public.registrar_visita_enlace(text) to anon, authenticated;
