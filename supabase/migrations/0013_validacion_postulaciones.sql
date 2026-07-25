-- Valida en el servidor lo que la UI ya evita en el camino feliz: no se puede
-- postular a un rol de una obra que no está publicada ni a uno sin vacantes libres.
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
begin
  select o.estado, r.vacantes into v_estado_obra, v_vacantes
    from roles r join obras o on o.id = r.obra_id
    where r.id = new.rol_id;

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

create trigger antes_de_insertar_postulacion
  before insert on postulaciones
  for each row execute procedure public.validar_alta_postulacion();
