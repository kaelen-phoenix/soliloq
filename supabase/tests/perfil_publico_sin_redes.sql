-- El enlace público muestra las redes solo a quien tiene cuenta completa (0095, 0097).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh perfil_publico_sin_redes.sql
--
-- A tiene redes, enlace público activo y un Proyecto publicado (eso la hace visible sin
-- sesión por la política de Creador). Sin sesión: `perfil_publico` la muestra pero con las
-- redes vacías, y la columna `redes` no se puede leer. B comparte una sala con A: adentro de
-- la app sí ve sus redes.

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated, anon;
insert into ctx (k, v) values
  ('a', 'c1111111-1111-1111-1111-11111111cccc'),
  ('b', 'c2222222-2222-2222-2222-22222222cccc'),
  ('sala', 'c3333333-3333-3333-3333-33333333cccc');

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='a'), 'psr-a@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='b'), 'psr-b@test.local', 'authenticated', 'authenticated');
update perfiles set aprobado_en = now(), enlace_publico_activo = true where id = (select v from ctx where k='a');
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_publica, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero, redes) values
  ((select v from ctx where k='a'), 'Ana Redes', '1990-01-01', 'x', 'Palermo', -34.58, -58.42, 'AR', 'sin_especificar',
   '{"instagram": "https://instagram.com/ana.redes"}'::jsonb);
insert into obras (creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, estado)
  values ((select v from ctx where k='a'), 'Obra de Ana', 'x', 0, 0, 'AR', 'publicada');
insert into salas (id, titulo) values ((select v from ctx where k='sala'), 'Sala PSR');
insert into sala_integrantes (sala_id, perfil_id) values
  ((select v from ctx where k='sala'), (select v from ctx where k='a')),
  ((select v from ctx where k='sala'), (select v from ctx where k='b'));
insert into ctx (k, v) select 'token_a', enlace_token from perfiles where id = (select v from ctx where k='a');

-- ── T1 · sin sesión: el enlace muestra el perfil, sin redes; la columna no se lee ──
set local role anon;
set local request.jwt.claims = '{}';
create temp table t1 as select * from public.perfil_publico((select v from ctx where k='token_a'));
do $$ begin
  if (select nombre from t1) is distinct from 'Ana Redes' then
    raise exception 'T1: el enlace público tendría que seguir mostrando el perfil';
  end if;
  if (select redes from t1) <> '{}'::jsonb then
    raise exception 'T1: el enlace público no tendría que devolver las redes (devolvió %)', (select redes from t1);
  end if;
  begin
    perform redes from perfiles_talento where id = (select v from ctx where k='a');
    raise exception 'T1: sin sesión no se tendría que poder leer la columna redes';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── T1b · con cuenta incompleta (B sin aprobar todavía) tampoco ─────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"c2222222-2222-2222-2222-22222222cccc"}';
create temp table t1b as select * from public.perfil_publico((select v from ctx where k='token_a'));
reset role;
do $$ begin
  if (select redes from t1b) <> '{}'::jsonb then
    raise exception 'T1b: una cuenta sin completar no tendría que ver las redes';
  end if;
end $$;

-- ── T1c · con cuenta completa, el enlace sí muestra las redes (0097) ────────
update perfiles set aprobado_en = now(), normas_aceptadas_en = now() where id = (select v from ctx where k='b');
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_publica, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero)
  values ((select v from ctx where k='b'), 'Beto Registrado', '1990-01-01', 'x', 'Almagro', -34.6, -58.42, 'AR', 'sin_especificar');
set local role authenticated;
set local request.jwt.claims = '{"sub":"c2222222-2222-2222-2222-22222222cccc"}';
create temp table t1c as select * from public.perfil_publico((select v from ctx where k='token_a'));
do $$ begin
  if (select redes->>'instagram' from t1c) is distinct from 'https://instagram.com/ana.redes' then
    raise exception 'T1c: con cuenta completa, el enlace tendría que mostrar las redes';
  end if;
  -- …y no hay chat de dos personas: ni contactar ni responder (0097).
  begin
    perform public.contactar_desde_perfil((select v from ctx where k='token_a'));
    raise exception 'T1c: contactar_desde_perfil ya no tendría que poder ejecutarse';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into intereses_equipo (de_perfil, a_perfil, interesa) values (auth.uid(), (select v from ctx where k='a'), true);
    raise exception 'T1c: ya no se tendría que poder insertar un contacto';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── T2 · adentro de la app, quien comparte sala con A ve sus redes ──────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"c2222222-2222-2222-2222-22222222cccc"}';
do $$ begin
  if (select redes->>'instagram' from perfiles_talento where id = (select v from ctx where k='a'))
     is distinct from 'https://instagram.com/ana.redes' then
    raise exception 'T2: quien comparte sala tendría que ver las redes dentro de la app';
  end if;
end $$;
reset role;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
