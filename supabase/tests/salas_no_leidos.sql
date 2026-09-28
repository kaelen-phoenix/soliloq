-- Mensajes sin leer en Salas (0082, issue #216): `salas_no_leidas` + `marcar_sala_leida`.
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh salas_no_leidos.sql
--
-- Ojo con el reloj: dentro de una transacción `now()` es siempre el mismo instante, así
-- que los mensajes "de antes" y "de después" de una marca de lectura se fechan a mano.

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('a', '71111111-1111-1111-1111-11111111aaaa'),   -- integrante A
  ('b', '72222222-2222-2222-2222-22222222bbbb'),   -- integrante B
  ('c', '73333333-3333-3333-3333-33333333cccc'),   -- ajeno a la sala
  ('d', '74444444-4444-4444-4444-44444444dddd'),   -- se incorpora tarde
  ('sala', 'dddddddd-0000-0000-0000-00000000dddd');

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='a'), 'nla@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='b'), 'nlb@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='c'), 'nlc@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='d'), 'nld@test.local', 'authenticated', 'authenticated');

-- Sala 1:1 (sin obra ni equipo, 0033). A y B entraron hace una hora.
insert into salas (id, titulo) values ((select v from ctx where k='sala'), 'Sala de prueba');
insert into sala_integrantes (sala_id, perfil_id, incorporado_en) values
  ((select v from ctx where k='sala'), (select v from ctx where k='a'), now() - interval '1 hour'),
  ((select v from ctx where k='sala'), (select v from ctx where k='b'), now() - interval '1 hour');

insert into mensajes (sala_id, autor_id, contenido, creado_en) values
  ((select v from ctx where k='sala'), (select v from ctx where k='b'), 'hola', now() - interval '30 minutes'),
  ((select v from ctx where k='sala'), (select v from ctx where k='b'), '¿están?', now() - interval '20 minutes'),
  ((select v from ctx where k='sala'), (select v from ctx where k='a'), 'sí', now() - interval '10 minutes');

-- ── T1 · A ve los 2 de B como no leídos; su propio mensaje no cuenta ──────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"71111111-1111-1111-1111-11111111aaaa"}';
create temp table t1 as select * from public.salas_no_leidas();
reset role;
do $$ begin
  assert (select count(*) from t1) = 1, 'T1: A debería tener exactamente una sala con no leídos';
  assert (select no_leidos from t1) = 2, 'T1: A debería tener 2 mensajes sin leer (los de B)';
  assert (select not es_de_iniciativa and not es_dueno from t1), 'T1: la sala 1:1 no es de iniciativa ni tiene dueño';
end $$;

-- ── T2 · B ve el de A; no los suyos ──────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"72222222-2222-2222-2222-22222222bbbb"}';
create temp table t2 as select * from public.salas_no_leidas();
reset role;
do $$ begin
  assert (select no_leidos from t2) = 1, 'T2: B debería tener 1 sin leer (el de A)';
end $$;

-- ── T3 · A marca la sala como leída: no le queda nada; B no cambia ───────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"71111111-1111-1111-1111-11111111aaaa"}';
select public.marcar_sala_leida((select v from ctx where k='sala'));
create temp table t3 as select * from public.salas_no_leidas();
reset role;
do $$ begin
  assert (select count(*) from t3) = 0, 'T3: después de leer, A no debería tener salas con no leídos';
  assert (select leido_hasta from sala_integrantes
          where sala_id = (select v from ctx where k='sala') and perfil_id = (select v from ctx where k='b')) is null,
    'T3: leer A no debería tocar la marca de B';
end $$;

-- ── T4 · un mensaje nuevo de B, posterior a la marca, vuelve a contar ────────
insert into mensajes (sala_id, autor_id, contenido, creado_en) values
  ((select v from ctx where k='sala'), (select v from ctx where k='b'), 'nuevo', now() + interval '1 minute');
set local role authenticated;
set local request.jwt.claims = '{"sub":"71111111-1111-1111-1111-11111111aaaa"}';
create temp table t4 as select * from public.salas_no_leidas();
reset role;
do $$ begin
  assert (select no_leidos from t4) = 1, 'T4: A debería tener 1 sin leer (el nuevo de B)';
end $$;

-- ── T5 · alguien ajeno no ve la sala ni puede tocar marcas ajenas ────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"73333333-3333-3333-3333-33333333cccc"}';
create temp table t5 as select * from public.salas_no_leidas();
select public.marcar_sala_leida((select v from ctx where k='sala'));
reset role;
do $$ begin
  assert (select count(*) from t5) = 0, 'T5: C no integra la sala, no debería ver no leídos';
  assert (select count(*) from sala_integrantes
          where sala_id = (select v from ctx where k='sala') and perfil_id = (select v from ctx where k='c')) = 0,
    'T5: marcar_sala_leida no debería sumar a C a la sala';
end $$;

-- ── T6 · quien entra tarde no ve el historial previo como nuevo ──────────────
insert into sala_integrantes (sala_id, perfil_id, incorporado_en) values
  ((select v from ctx where k='sala'), (select v from ctx where k='d'), now() - interval '15 minutes');
set local role authenticated;
set local request.jwt.claims = '{"sub":"74444444-4444-4444-4444-44444444dddd"}';
create temp table t6 as select * from public.salas_no_leidas();
reset role;
do $$ begin
  -- De lo de otros, solo el de A (hace 10 min) y el nuevo de B son posteriores a su entrada.
  assert (select no_leidos from t6) = 2, 'T6: D debería contar solo lo posterior a incorporarse (2)';
end $$;

-- ── T7 · un bloqueo esconde los mensajes y también los saca del conteo ───────
insert into bloqueos (perfil_menor, perfil_mayor, creado_por) values
  ((select v from ctx where k='a'), (select v from ctx where k='b'), (select v from ctx where k='a'));
set local role authenticated;
set local request.jwt.claims = '{"sub":"71111111-1111-1111-1111-11111111aaaa"}';
create temp table t7 as select * from public.salas_no_leidas();
reset role;
do $$ begin
  assert (select count(*) from t7) = 0, 'T7: con B bloqueado, sus mensajes no deberían contar para A';
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
