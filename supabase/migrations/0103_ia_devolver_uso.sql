-- 0103 — Tope de IA más justo (#343).
--
-- `consumir_uso_ia()` (0100) anota el uso antes de llamar al modelo (así el tope frena aunque
-- lleguen pedidos en paralelo). Pero si la llamada fallaba, el uso quedaba contado igual: con
-- el modelo caído o sin crédito, cada toque al botón restaba y se llegaba al tope sin haber
-- recibido nada. Ahora:
--   - `devolver_uso_ia()` borra el último uso de quien llama (de los últimos 5 minutos) cuando
--     la llamada falla;
--   - el tope por persona sube de 10 a 20 por día;
--   - admins quedan fuera del tope por persona (siguen contando para el tope global de 500).

create or replace function public.consumir_uso_ia()
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  insert into usos_ia (perfil_id) values (auth.uid());
end;
$$;

create or replace function public.devolver_uso_ia()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  delete from usos_ia
  where id = (
    select id from usos_ia
    where perfil_id = auth.uid() and creado_en > now() - interval '5 minutes'
    order by creado_en desc
    limit 1
  );
end;
$$;

revoke all on function public.devolver_uso_ia() from public, anon;
grant execute on function public.devolver_uso_ia() to authenticated;
