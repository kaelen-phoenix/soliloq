-- Tope de usos de IA (#313, 0100). Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh usos_ia.sql

begin;

insert into auth.users (id, email, aud, role) values
  ('a7777777-7777-7777-7777-77777777aaaa', 'ia-a@test.local', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims = '{"sub":"a7777777-7777-7777-7777-77777777aaaa"}';

-- ── T1 · diez usos en el día pasan, el undécimo no ──────────────────────────
do $$ begin
  for i in 1..10 loop perform public.consumir_uso_ia(); end loop;
  begin
    perform public.consumir_uso_ia();
    raise exception 'T1: el uso 11 del día tendría que rechazarse';
  exception when others then
    if sqlerrm <> 'limite_ia_persona' then raise; end if;
  end;
end $$;

-- ── T2 · la tabla no se lee ni se escribe directo ───────────────────────────
do $$ begin
  begin
    perform 1 from usos_ia;
    raise exception 'T2: authenticated no tendría que poder leer usos_ia';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── T3 · sin sesión, no ─────────────────────────────────────────────────────
set local role anon;
do $$ begin
  begin
    perform public.consumir_uso_ia();
    raise exception 'T3: anon no tendría que poder consumir';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
