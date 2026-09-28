-- «Contactar» entre personas y armado de equipo 1:1 (#101), roto desde 0077 (#241, 0085).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh contactar_equipo.sql
--
-- A contacta a B → B abre «¿quién me escribió?» (perfil_para_responder) → B responde →
-- interés mutuo → el trigger `al_marcar_interes` abre la sala 1:1 con el nombre de los dos
-- (nombre_de_perfil). Más `feed_equipo`, la lista de /equipo. Las tres funciones fallaban
-- con "column ... does not exist" por leer columnas que 0077 borró de perfiles_creador.

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('a', '91111111-1111-1111-1111-11111111aaaa'),
  ('b', '92222222-2222-2222-2222-22222222bbbb');

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='a'), 'ce-a@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='b'), 'ce-b@test.local', 'authenticated', 'authenticated');
update perfiles set busca_equipo = true where id in ((select v from ctx where k='a'), (select v from ctx where k='b'));
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_publica, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero) values
  ((select v from ctx where k='a'), 'Ana Contacto', '1995-01-01', 'x', 'Palermo', -34.58, -58.42, 'AR', 'sin_especificar'),
  ((select v from ctx where k='b'), 'Beto Contacto', '1995-01-01', 'x', 'Caballito', -34.61, -58.44, 'AR', 'sin_especificar');
-- B también es Creador: sus disciplinas tienen que seguir saliendo (0077 las conservó).
insert into perfiles_creador (id, disciplinas) values ((select v from ctx where k='b'), '{direccion}');

-- ── T1 · nombre_de_perfil lee el nombre del Perfil de Talento ────────────────
do $$ begin
  assert public.nombre_de_perfil((select v from ctx where k='a')) = 'Ana Contacto',
    'T1: nombre_de_perfil debería devolver el nombre del Perfil de Talento';
  assert public.nombre_de_perfil(gen_random_uuid()) = 'Alguien',
    'T1: sin perfil debería devolver «Alguien»';
end $$;

-- ── T2 · feed_equipo (la lista de /equipo) corre y trae a la otra persona ─────
set local role authenticated;
set local request.jwt.claims = '{"sub":"91111111-1111-1111-1111-11111111aaaa"}';
create temp table t2 as select * from public.feed_equipo(null);
reset role;
do $$ begin
  assert exists (select 1 from t2 where perfil_id = (select v from ctx where k='b')
                 and nombre = 'Beto Contacto' and ubicacion_publica = 'Caballito'
                 and 'direccion' = any (disciplinas) and distancia_metros > 0),
    'T2: feed_equipo debería traer a B con nombre, zona, disciplinas y distancia';
end $$;

-- ── T3 · A contacta a B; B puede ver quién le escribió ───────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"91111111-1111-1111-1111-11111111aaaa"}';
insert into intereses_equipo (de_perfil, a_perfil, interesa)
  values ((select v from ctx where k='a'), (select v from ctx where k='b'), true);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"92222222-2222-2222-2222-22222222bbbb"}';
create temp table t3 as select * from public.perfil_para_responder((select v from ctx where k='a'));
reset role;
do $$ begin
  assert (select nombre from t3) = 'Ana Contacto',
    'T3: perfil_para_responder debería mostrarle a B quién lo contactó';
  assert (select ubicacion_publica from t3) = 'Palermo',
    'T3: perfil_para_responder debería traer la zona del Perfil de Talento';
end $$;

-- ── T4 · B responde: interés mutuo → sala 1:1 con el nombre de los dos ────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"92222222-2222-2222-2222-22222222bbbb"}';
insert into intereses_equipo (de_perfil, a_perfil, interesa)
  values ((select v from ctx where k='b'), (select v from ctx where k='a'), true);
reset role;
do $$ begin
  assert exists (
    select 1 from salas s
    join sala_integrantes i1 on i1.sala_id = s.id and i1.perfil_id = (select v from ctx where k='a')
    join sala_integrantes i2 on i2.sala_id = s.id and i2.perfil_id = (select v from ctx where k='b')
    where s.obra_id is null and s.equipo_id is null
      and s.titulo = 'Beto Contacto y Ana Contacto'
  ), 'T4: el interés mutuo debería abrir la sala 1:1 con el nombre de los dos';
end $$;

-- ── T5 · nombre_de_perfil no se puede llamar desde la API (0086) ─────────────
do $$ begin
  if has_function_privilege('anon', 'public.nombre_de_perfil(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.nombre_de_perfil(uuid)', 'execute') then
    raise exception 'T5: anon/authenticated no deberían poder ejecutar nombre_de_perfil';
  end if;
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
