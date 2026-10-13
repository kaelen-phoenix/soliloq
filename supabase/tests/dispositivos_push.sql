-- Teléfonos para push de la app nativa (#389, migración 0114): cada cuenta ve y borra los suyos,
-- y un teléfono queda de la última cuenta que ingresó en él. begin/rollback: no deja rastro.
--   supabase/tests/run.sh dispositivos_push.sql

begin;

insert into auth.users (id, email, aud, role) values
  ('a4444444-1111-1111-1111-111111111111', 'dp-a@test.local', 'authenticated', 'authenticated'),
  ('b4444444-2222-2222-2222-222222222222', 'dp-b@test.local', 'authenticated', 'authenticated');

-- A registra su teléfono (dos veces: no duplica).
set local role authenticated;
set local request.jwt.claims = '{"sub":"a4444444-1111-1111-1111-111111111111"}';
select registrar_dispositivo_push('token-de-prueba-del-telefono-1', 'android');
select registrar_dispositivo_push('token-de-prueba-del-telefono-1', 'android');
create temp table a_ve as select * from dispositivos_push;
reset role;

-- B no lo ve, no lo puede borrar ni insertar uno a nombre de A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"b4444444-2222-2222-2222-222222222222"}';
create temp table b_ve as select * from dispositivos_push;
delete from dispositivos_push where perfil_id = 'a4444444-1111-1111-1111-111111111111';
do $$ begin
  begin
    insert into dispositivos_push (perfil_id, token, plataforma)
    values ('a4444444-1111-1111-1111-111111111111', 'token-de-prueba-del-telefono-2', 'android');
    raise exception 'T3: B no debería poder insertar directo';
  exception when others then
    if sqlerrm like 'T3:%' then raise; end if;
  end;
end $$;
reset role;

do $$ begin
  assert (select count(*) from a_ve) = 1, 'T1: A debería ver su teléfono, una sola vez';
  assert (select count(*) from b_ve) = 0, 'T2: B no debería ver el teléfono de A';
  assert (select count(*) from dispositivos_push where perfil_id = 'a4444444-1111-1111-1111-111111111111') = 1,
    'T4: B no debería poder borrar el teléfono de A';
end $$;

-- En ese teléfono ingresa B: el teléfono pasa a ser de B y A deja de recibir.
set local role authenticated;
set local request.jwt.claims = '{"sub":"b4444444-2222-2222-2222-222222222222"}';
select registrar_dispositivo_push('token-de-prueba-del-telefono-1', 'android');
reset role;

do $$ begin
  assert (select perfil_id from dispositivos_push where token = 'token-de-prueba-del-telefono-1')
    = 'b4444444-2222-2222-2222-222222222222', 'T5: el teléfono debería quedar de la última cuenta';
  assert (select count(*) from dispositivos_push) = 1, 'T6: un token es una sola fila';
end $$;

-- Sin sesión no se registra nada.
set local role anon;
do $$ begin
  begin
    perform registrar_dispositivo_push('token-de-prueba-del-telefono-3', 'android');
    raise exception 'T7: anon no debería poder registrar';
  exception when others then
    if sqlerrm like 'T7:%' then raise; end if;
  end;
end $$;
reset role;

select 'TODOS LOS TESTS OK' as resultado;
rollback;
