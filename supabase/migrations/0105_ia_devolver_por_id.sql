-- 0105 — Devolver exactamente el uso de la acción que falló (#343).
--
-- 0104 borraba «el último uso de los últimos 5 minutos» de la persona: con dos acciones en
-- paralelo podía devolver la que salió bien. Ahora `consumir_uso_ia()` devuelve el id del uso
-- que anota, y el servidor devuelve ese mismo id si la llamada falla.

drop function if exists public.consumir_uso_ia();
create function public.consumir_uso_ia()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;

  -- Serializa: sin esto, pedidos en paralelo contarían lo mismo antes de insertar.
  perform pg_advisory_xact_lock(hashtext('consumir_uso_ia'));

  if not coalesce((select es_admin from perfiles where id = auth.uid()), false)
     and (select count(*) from usos_ia
          where perfil_id = auth.uid() and creado_en > now() - interval '1 day') >= 20 then
    raise exception 'limite_ia_persona';
  end if;
  if (select count(*) from usos_ia where creado_en > now() - interval '1 day') >= 500 then
    raise exception 'limite_ia_global';
  end if;

  insert into usos_ia (perfil_id) values (auth.uid()) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.consumir_uso_ia() from public, anon;
grant execute on function public.consumir_uso_ia() to authenticated;

drop function if exists public.devolver_uso_ia(uuid);
create function public.devolver_uso_ia(p_uso_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  delete from usos_ia where id = p_uso_id;
$$;
revoke all on function public.devolver_uso_ia(bigint) from public, anon, authenticated;
grant execute on function public.devolver_uso_ia(bigint) to service_role;
