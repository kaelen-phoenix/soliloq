-- 0104 — `devolver_uso_ia` solo desde el servidor (#343).
--
-- En 0103 quedó ejecutable por cualquier sesión: alguien podía llamarla directo desde el
-- navegador después de cada uso y no llegar nunca al tope. Ahora la llama solo el servidor
-- (service role), cuando la llamada al modelo de esa misma acción falló, con el perfil explícito.

drop function if exists public.devolver_uso_ia();

create or replace function public.devolver_uso_ia(p_perfil_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from usos_ia
  where id = (
    select id from usos_ia
    where perfil_id = p_perfil_id and creado_en > now() - interval '5 minutes'
    order by creado_en desc
    limit 1
  );
end;
$$;

revoke all on function public.devolver_uso_ia(uuid) from public, anon, authenticated;
grant execute on function public.devolver_uso_ia(uuid) to service_role;
