-- Tope de usos de IA (#313 0100, #343 0103/0104). Se corre entero dentro de begin/rollback.
--   supabase/tests/run.sh usos_ia.sql

begin;

insert into auth.users (id, email, aud, role) values
  ('a7777777-7777-7777-7777-77777777aaaa', 'ia-a@test.local', 'authenticated', 'authenticated'),
  ('a8888888-8888-8888-8888-88888888aaaa', 'ia-admin@test.local', 'authenticated', 'authenticated');
update perfiles set es_admin = true where id = 'a8888888-8888-8888-8888-88888888aaaa';

set local role authenticated;
set local request.jwt.claims = '{"sub":"a7777777-7777-7777-7777-77777777aaaa"}';

-- ── T1 · veinte usos en el día pasan, el 21 no ──────────────────────────────
do $$ begin
  for i in 1..20 loop perform public.consumir_uso_ia(); end loop;
  begin
    perform public.consumir_uso_ia();
    raise exception 'T1: el uso 21 del día tendría que rechazarse';
  exception when others then
    if sqlerrm <> 'limite_ia_persona' then raise; end if;
  end;
end $$;

-- ── T2 · la sesión no puede devolverse usos (0104): solo el servidor ────────
do $$ begin
  begin
    perform public.devolver_uso_ia('a7777777-7777-7777-7777-77777777aaaa');
    raise exception 'T2: authenticated no tendría que poder devolver usos';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
-- El servidor devuelve el uso de un intento fallido y vuelve a haber lugar.
select public.devolver_uso_ia('a7777777-7777-7777-7777-77777777aaaa');
set local role authenticated;
set local request.jwt.claims = '{"sub":"a7777777-7777-7777-7777-77777777aaaa"}';
do $$ begin
  perform public.consumir_uso_ia();
end $$;

-- ── T3 · la tabla no se lee ni se escribe directo ───────────────────────────
do $$ begin
  begin
    perform 1 from usos_ia;
    raise exception 'T3: authenticated no tendría que poder leer usos_ia';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── T4 · admin no tiene tope por persona ────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"a8888888-8888-8888-8888-88888888aaaa"}';
do $$ begin
  for i in 1..25 loop perform public.consumir_uso_ia(); end loop;
end $$;
reset role;

-- ── T5 · sin sesión, no ─────────────────────────────────────────────────────
set local role anon;
do $$ begin
  begin
    perform public.consumir_uso_ia();
    raise exception 'T5: anon no tendría que poder consumir';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
