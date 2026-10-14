-- Ocultar iniciativas cerradas de la lista propia (#413). Un Proyecto o Equipo cerrado sigue
-- apareciendo en «Iniciativas»; para que no se acumulen, el dueño lo puede quitar de la vista.
-- No se borra nada: los datos y el chat con el equipo siguen, y se puede volver a mostrar.
--
-- Solo se oculta lo cerrado (obra `cerrada`, equipo no `activo`). Si después se reabre, la lista
-- lo vuelve a mostrar aunque tenga la marca (`itemsTablero` mira las dos cosas).

alter table obras add column oculta_en timestamptz;
alter table equipos add column oculta_en timestamptz;

/** Oculta (o vuelve a mostrar) un Proyecto o Equipo propio. Uno de los dos ids, no los dos. */
create or replace function public.ocultar_iniciativa(p_obra_id uuid, p_equipo_id uuid, p_ocultar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  if auth.uid() is null then
    raise exception 'sin sesión';
  end if;
  if (p_obra_id is null) = (p_equipo_id is null) then
    raise exception 'un proyecto o un equipo';
  end if;

  if p_obra_id is not null then
    update obras
       set oculta_en = case when p_ocultar then now() else null end
     where id = p_obra_id
       and creador_id = auth.uid()
       and (not p_ocultar or estado = 'cerrada')
    returning true into v_ok;
  else
    update equipos
       set oculta_en = case when p_ocultar then now() else null end
     where id = p_equipo_id
       and creador_id = auth.uid()
       and (not p_ocultar or not activo)
    returning true into v_ok;
  end if;

  if v_ok is null then
    raise exception 'no se puede ocultar';
  end if;
end;
$$;

revoke all on function public.ocultar_iniciativa(uuid, uuid, boolean) from public, anon;
grant execute on function public.ocultar_iniciativa(uuid, uuid, boolean) to authenticated;
