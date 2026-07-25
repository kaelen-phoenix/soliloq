-- Con perfil dual, una persona puede ser talento y creador a la vez. Como el id de
-- `perfiles_talento` y el de `perfiles_creador` son el mismo uuid de `perfiles`,
-- alcanza con comparar el creador de la obra contra el talento que consulta.

-- El feed deja de mostrar los roles de obras propias.
create or replace function public.feed_para_talento(p_talento_id uuid)
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
    and not exists (
      select 1 from postulaciones p where p.rol_id = f.rol_id and p.talento_id = p_talento_id
    )
    and not exists (
      select 1 from descartes d where d.rol_id = f.rol_id and d.talento_id = p_talento_id
    )
  order by f.obra_creado_en desc;
$$;

-- El feed es la interfaz; el trigger es la garantía.
create or replace function public.validar_alta_postulacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado_obra estado_obra;
  v_vacantes integer;
  v_aprobados integer;
  v_creador_id uuid;
begin
  select o.estado, r.vacantes, o.creador_id
    into v_estado_obra, v_vacantes, v_creador_id
    from roles r join obras o on o.id = r.obra_id
    where r.id = new.rol_id;

  if v_creador_id = new.talento_id then
    raise exception 'No podés postularte a una obra propia';
  end if;

  if v_estado_obra <> 'publicada' then
    raise exception 'Esta convocatoria ya no está publicada';
  end if;

  select count(*) into v_aprobados from postulaciones where rol_id = new.rol_id and estado = 'aprobado';
  if v_aprobados >= v_vacantes then
    raise exception 'Este rol ya cubrió sus vacantes';
  end if;

  return new;
end;
$$;
