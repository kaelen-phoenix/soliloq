-- RLS de tablas nuevas + cascada de borrado de cuenta + visibilidad de edad.
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh rls_y_borrados.sql

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('ca', '11111111-1111-1111-1111-11111111aaaa'),   -- creador A
  ('cb', '22222222-2222-2222-2222-22222222bbbb'),   -- creador B
  ('ta', '33333333-3333-3333-3333-33333333cccc');   -- talento A

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='ca'), 'ca@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='cb'), 'cb@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='ta'), 'ta@test.local', 'authenticated', 'authenticated');
update perfiles set modo_activo = 'creador' where id in ((select v from ctx where k='ca'), (select v from ctx where k='cb'));
update perfiles set modo_activo = 'talento', enlace_publico_activo = true where id = (select v from ctx where k='ta');
insert into perfiles_creador (id, nombre, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais) values
  ((select v from ctx where k='ca'), 'Creador A', 'x', 0, 0, 'AR'),
  ((select v from ctx where k='cb'), 'Creador B', 'x', 0, 0, 'AR');
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero, edad_visible)
  values ((select v from ctx where k='ta'), 'Talento A', '1990-06-15', 'x', 0, 0, 'AR', 'sin_especificar', true);
insert into fotos_talento (talento_id, storage_path, orden)
  values ((select v from ctx where k='ta'), (select v from ctx where k='ta') || '/f.jpg', 0);
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais)
  values ('aaaaaaaa-0000-0000-0000-00000000aaaa', (select v from ctx where k='ca'), 'Obra de A', 'x', 0, 0, 'AR');
insert into ctx (k, v) values ('obra_a', 'aaaaaaaa-0000-0000-0000-00000000aaaa');

-- ── T1 · obras_delete_propia (0049): B no puede borrar la obra de A ──────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-22222222bbbb"}';
delete from obras where id = (select v from ctx where k='obra_a');
reset role;
do $$ begin assert (select count(*) from obras where id = (select v from ctx where k='obra_a')) = 1,
  'T1: B no debería poder borrar la obra de A'; end $$;

-- A sí puede
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-11111111aaaa"}';
delete from obras where id = (select v from ctx where k='obra_a');
reset role;
do $$ begin assert (select count(*) from obras where id = (select v from ctx where k='obra_a')) = 0,
  'T1: A debería poder borrar su obra'; end $$;

-- ── T2 · chats_destacados: solo filas propias ──────────────────────────────
-- (sala mínima para el FK)
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais)
  values ('bbbbbbbb-0000-0000-0000-00000000bbbb', (select v from ctx where k='ca'), 'Obra 2', 'x', 0, 0, 'AR');
insert into salas (id, obra_id) values ('cccccccc-0000-0000-0000-00000000cccc', 'bbbbbbbb-0000-0000-0000-00000000bbbb');
insert into ctx (k, v) values ('sala', 'cccccccc-0000-0000-0000-00000000cccc');
insert into chats_destacados (perfil_id, sala_id) values ((select v from ctx where k='ca'), (select v from ctx where k='sala'));

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-33333333cccc"}';  -- talento A
do $$ begin
  assert (select count(*) from chats_destacados) = 0, 'T2: TA no debería ver el destacado de CA';
end $$;
-- TA intenta borrar el destacado ajeno → no afecta filas
delete from chats_destacados where sala_id = (select v from ctx where k='sala');
reset role;
do $$ begin assert (select count(*) from chats_destacados) = 1,
  'T2: TA no debería poder borrar el destacado de CA'; end $$;

-- ── T3 · push_suscripciones: solo propias; no se pisa el endpoint ajeno ─────
insert into push_suscripciones (perfil_id, endpoint, p256dh, auth)
  values ((select v from ctx where k='ca'), 'https://push.example/ca', 'k', 'a');

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-33333333cccc"}';  -- talento A
do $$ begin
  assert (select count(*) from push_suscripciones) = 0, 'T3: TA no ve la suscripción de CA';
end $$;
-- TA intenta apropiarse del endpoint de CA (upsert on conflict endpoint)
do $$ begin
  begin
    insert into push_suscripciones (perfil_id, endpoint, p256dh, auth)
      values ((select v from ctx where k='ta'), 'https://push.example/ca', 'x', 'y')
    on conflict (endpoint) do update set perfil_id = excluded.perfil_id, p256dh = excluded.p256dh;
  exception when others then null;  -- RLS lo puede cortar con error; también vale
  end;
end $$;
reset role;
do $$ begin assert (select perfil_id from push_suscripciones where endpoint = 'https://push.example/ca')
  = (select v from ctx where k='ca'), 'T3: el endpoint de CA no debería cambiar de dueño'; end $$;

-- ── T4 · edad_visible: perfil_publico y buscar_talento ─────────────────────
do $$
declare v_edad int;
begin
  select edad into v_edad from perfil_publico((select enlace_token from perfiles where id = (select v from ctx where k='ta')));
  assert v_edad is not null, 'T4: con edad_visible=true la edad se muestra en el perfil público';
end $$;

update perfiles_talento set edad_visible = false where id = (select v from ctx where k='ta');
do $$
declare v_edad int;
begin
  select edad into v_edad from perfil_publico((select enlace_token from perfiles where id = (select v from ctx where k='ta')));
  assert v_edad is null, 'T4: con edad_visible=false la edad NO se muestra en el perfil público';
end $$;

-- buscar_talento como CB: TA sigue apareciendo (prioriza, no excluye) pero con edad null
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-22222222bbbb"}';  -- creador B
do $$
declare r record;
begin
  select * into r from buscar_talento(p_edad_min => 20, p_edad_max => 25)
  where id = (select v from ctx where k='ta');
  assert r.id is not null, 'T4: TA (36 años) debe aparecer igual buscando 20-25 (prioriza, no excluye)';
  assert r.edad is null, 'T4: buscar_talento no devuelve la edad si está oculta';
end $$;
reset role;

-- ── T5 · cascada de borrado de cuenta ─────────────────────────────────────
-- (lo que hace auth.admin.deleteUser: delete de auth.users → FK cascade)
delete from auth.users where id = (select v from ctx where k='ca');
do $$
declare v uuid := '11111111-1111-1111-1111-11111111aaaa';
begin
  assert (select count(*) from perfiles where id = v) = 0, 'T5: perfiles borrado';
  assert (select count(*) from perfiles_creador where id = v) = 0, 'T5: perfiles_creador borrado';
  assert (select count(*) from obras where creador_id = v) = 0, 'T5: obras del creador borradas';
  assert (select count(*) from chats_destacados where perfil_id = v) = 0, 'T5: chats_destacados borrado';
  assert (select count(*) from push_suscripciones where perfil_id = v) = 0, 'T5: push_suscripciones borrado';
  assert (select count(*) from salas where obra_id = 'bbbbbbbb-0000-0000-0000-00000000bbbb') = 0, 'T5: sala de la obra borrada';
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
