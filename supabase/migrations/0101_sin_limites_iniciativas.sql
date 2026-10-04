-- 0101 — Sin límites de Proyecto y Equipo (#330).
--
-- Pedido: quitar los límites de las iniciativas. Hasta acá:
--   - una sola a la vez: no se podía publicar un Proyecto con un Equipo activo, ni al revés,
--     ni tener dos Equipos activos (triggers de 0057 e índice único);
--   - hasta 10 roles por Proyecto (trg_tope_roles) y cupo de hasta 10 en el cálculo;
--   - el Equipo pedía un cupo de 1 a 10.
-- Ahora cada persona arma todos los Proyectos y Equipos que quiera; un Equipo puede no tener
-- cupo (null = sin límite de integrantes). Las fotos siguen con un tope, más alto (10), como
-- resguardo de almacenamiento.
--
-- `mis_matches()` y `mis_convocados()` suman `obra_id`: con varios Proyectos, al convocar hay
-- que ofrecer los roles del Proyecto de ese match y no los de «la iniciativa activa».

drop trigger if exists trg_iniciativa_unica_obra on obras;
drop trigger if exists trg_iniciativa_unica_equipo on equipos;
drop function if exists public.chequear_iniciativa_unica_obra();
drop function if exists public.chequear_iniciativa_unica_equipo();
drop index if exists idx_equipos_uno_activo;

drop trigger if exists trg_tope_roles on roles;
drop function if exists public.chequear_tope_roles();

alter table equipos alter column cupo drop not null;
alter table equipos drop constraint if exists equipos_cupo_check;
alter table equipos add constraint equipos_cupo_check check (cupo is null or cupo >= 1);

create or replace function public.validar_max_fotos_obra()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if (select count(*) from fotos_obra where obra_id = new.obra_id) >= 10 then
    raise exception 'Una obra no puede tener más de 10 fotos';
  end if;
  return new;
end;
$function$;

create or replace function public.validar_max_fotos_equipo()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if (select count(*) from fotos_equipo where equipo_id = new.equipo_id) >= 10 then
    raise exception 'Un equipo no puede tener más de 10 fotos';
  end if;
  return new;
end;
$function$;

-- Sin el tope de 10 en los Proyectos; un Equipo sin cupo devuelve null.
create or replace function public.cupo_iniciativa(p_obra_id uuid, p_equipo_id uuid)
returns integer
language sql
stable
set search_path to 'public'
as $function$
  select case
    when p_equipo_id is not null then (select cupo from equipos where id = p_equipo_id)
    else coalesce((select sum(vacantes)::int from roles where obra_id = p_obra_id), 0)
  end;
$function$;

-- Sin cupo no hay cierre: `x >= null` es null, y un null acá sacaba al Equipo de los feeds.
create or replace function public.iniciativa_en_cierre(p_obra_id uuid, p_equipo_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(
    public.aceptados_iniciativa(p_obra_id, p_equipo_id) >= public.cupo_iniciativa(p_obra_id, p_equipo_id),
    false
  );
$function$;

drop function if exists public.mis_matches();
create function public.mis_matches()
returns table(
  match_id uuid, talento_id uuid, nombre text, foto_path text, expira_en timestamptz,
  es_equipo boolean, iniciativa_titulo text, iniciativa_foto text, cupo_lleno boolean,
  mostrado_en timestamptz, obra_id uuid
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    m.id,
    m.talento_id,
    t.nombre,
    (select f.storage_path from fotos_talento f
     where f.talento_id = m.talento_id order by f.orden limit 1),
    m.expira_en,
    m.equipo_id is not null,
    coalesce(o.titulo, e.titulo),
    coalesce(
      (select fo.storage_path from fotos_obra fo where fo.obra_id = m.obra_id order by fo.orden limit 1),
      (select fe.storage_path from fotos_equipo fe where fe.equipo_id = m.equipo_id order by fe.orden limit 1),
      (select ft.storage_path from fotos_talento ft where ft.talento_id = pc.id order by ft.orden limit 1)
    ),
    public.iniciativa_en_cierre(m.obra_id, m.equipo_id),
    m.mostrado_en,
    m.obra_id
  from matches m
  join perfiles_talento t on t.id = m.talento_id
  join perfiles_creador pc on pc.id = m.creador_id
  left join obras o on o.id = m.obra_id
  left join equipos e on e.id = m.equipo_id
  where m.creador_id = auth.uid()
    and m.expira_en > now()
    and m.aceptado_en is null
    and m.descartado_en is null
  order by m.creado_en desc;
$function$;

drop function if exists public.mis_convocados();
create function public.mis_convocados()
returns table(
  match_id uuid, convocatoria_id uuid, talento_id uuid, nombre text, foto_path text,
  es_equipo boolean, iniciativa_titulo text, iniciativa_foto text, estado text, obra_id uuid
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    m.id,
    (select c.id from convocatorias c
     where c.match_id = m.id and c.estado in ('pendiente', 'aceptada')
     order by c.creado_en desc limit 1),
    m.talento_id,
    t.nombre,
    (select f.storage_path from fotos_talento f
     where f.talento_id = m.talento_id order by f.orden limit 1),
    m.equipo_id is not null,
    coalesce(o.titulo, e.titulo),
    coalesce(
      (select fo.storage_path from fotos_obra fo where fo.obra_id = m.obra_id order by fo.orden limit 1),
      (select fe.storage_path from fotos_equipo fe where fe.equipo_id = m.equipo_id order by fe.orden limit 1),
      (select ft.storage_path from fotos_talento ft where ft.talento_id = pc.id order by ft.orden limit 1)
    ),
    case
      when exists (select 1 from convocatorias c where c.match_id = m.id and c.estado = 'aceptada')
        then 'en_sala'
      when exists (select 1 from convocatorias c where c.match_id = m.id and c.estado = 'pendiente')
        then 'esperando_confirmacion'
      else 'en_convocados'
    end,
    m.obra_id
  from matches m
  join perfiles_talento t on t.id = m.talento_id
  join perfiles_creador pc on pc.id = m.creador_id
  left join obras o on o.id = m.obra_id
  left join equipos e on e.id = m.equipo_id
  where m.creador_id = auth.uid()
    and m.aceptado_en is not null
    and m.descartado_en is null
    and not exists (
      select 1 from convocatorias c
      where c.match_id = m.id and c.estado in ('rechazada', 'baja')
    )
  order by m.aceptado_en desc;
$function$;

revoke all on function public.mis_matches() from public, anon;
grant execute on function public.mis_matches() to authenticated;
revoke all on function public.mis_convocados() from public, anon;
grant execute on function public.mis_convocados() to authenticated;
