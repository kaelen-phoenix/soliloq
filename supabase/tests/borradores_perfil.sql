-- Borrador del alta (issue #383, migración 0112): cada persona ve y escribe solo el suyo, y
-- se borra solo al crear el Perfil de Talento. begin/rollback: no deja rastro.
--   supabase/tests/run.sh borradores_perfil.sql

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('a', 'a3333333-1111-1111-1111-111111111111'),
  ('b', 'b3333333-2222-2222-2222-222222222222');
insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='a'), 'bp-a@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='b'), 'bp-b@test.local', 'authenticated', 'authenticated');

-- A guarda su borrador.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a3333333-1111-1111-1111-111111111111"}';
insert into borradores_perfil (perfil_id, paso, datos) values (auth.uid(), 3, '{"nombre":"Ana"}');
update borradores_perfil set paso = 4 where perfil_id = auth.uid();
reset role;

-- B no lo ve ni lo puede tocar, ni escribir uno a nombre de A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"b3333333-2222-2222-2222-222222222222"}';
create temp table b_ve as select * from borradores_perfil;
update borradores_perfil set paso = 1 where perfil_id = 'a3333333-1111-1111-1111-111111111111';
delete from borradores_perfil where perfil_id = 'a3333333-1111-1111-1111-111111111111';
do $$ begin
  begin
    insert into borradores_perfil (perfil_id, paso) values ('a3333333-1111-1111-1111-111111111111', 1);
    raise exception 'T2: B no debería poder escribir un borrador de A';
  exception when others then
    if sqlerrm like 'T2:%' then raise; end if;
  end;
end $$;
reset role;

do $$ begin
  assert (select count(*) from b_ve) = 0, 'T1: B no debería ver el borrador de A';
  assert (select paso from borradores_perfil where perfil_id = (select v from ctx where k='a')) = 4,
    'T2: B no debería poder cambiar ni borrar el borrador de A';
end $$;

-- Al crear el Perfil de Talento, el borrador se va solo.
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero)
  values ((select v from ctx where k='a'), 'Ana', '1995-01-01', 'x', 0, 0, 'AR', 'sin_especificar');
do $$ begin
  assert not exists (select 1 from borradores_perfil where perfil_id = (select v from ctx where k='a')),
    'T3: al completar el perfil, el borrador debería borrarse';
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
