-- Fecha de nacimiento y ubicación exacta privadas (#255, 0089).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh datos_privados_talento.sql
--
-- A es Talento (edad oculta, en el buscador, con foto). B es Creador. C es Talento con la
-- edad visible pero fuera del buscador, y comparte una sala con B.
--   - B no puede leer de nadie `fecha_nacimiento`, `ubicacion_texto`, `ubicacion_place_id`
--     ni las coordenadas (ni con `select *`), pero sí el resto del perfil.
--   - `edad_publica` da la edad de C (visible) y null para A (oculta).
--   - `buscar_talento` sigue encontrando a A por texto, edad y radio, y ya no trae a C
--     (apagó «Aparecer en el buscador», aunque comparta sala con B).
--   - A lee su fila entera con `mi_perfil_talento()` y la sigue editando.
--   - `feed_para_talento` corre para uno mismo y no da nada para otro id.

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('a', '9aaaaaaa-1111-1111-1111-11111111aaaa'),
  ('b', '9bbbbbbb-2222-2222-2222-22222222bbbb'),
  ('c', '9ccccccc-3333-3333-3333-33333333cccc'),
  ('sala', '9ccccccc-0000-0000-0000-00000000cccc'),
  ('obra', '9ddddddd-4444-4444-4444-44444444dddd');

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='a'), 'dp-a@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='b'), 'dp-b@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='c'), 'dp-c@test.local', 'authenticated', 'authenticated');
insert into perfiles_talento (id, nombre, fecha_nacimiento, edad_visible, aparece_en_buscador, ubicacion_texto, ubicacion_place_id, ubicacion_publica, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero) values
  ((select v from ctx where k='a'), 'Ana Privada', (current_date - interval '30 years 10 days')::date, false, true, 'Calle Falsa 123', 'place-a', 'Palermo', -34.58, -58.42, 'AR', 'sin_especificar'),
  ((select v from ctx where k='c'), 'Ciro Privado', (current_date - interval '40 years 10 days')::date, true, false, 'Otra Calle 456', 'place-c', 'Almagro', -34.60, -58.42, 'AR', 'sin_especificar'),
  -- B también es Talento: el feed (`feed_talento`) muestra al creador por su Perfil de Talento.
  ((select v from ctx where k='b'), 'Beto Creador', '1985-01-01', true, false, 'x', null, 'Caballito', -34.61, -58.44, 'AR', 'sin_especificar');
insert into perfiles_creador (id, disciplinas) values ((select v from ctx where k='b'), '{direccion}');
insert into fotos_talento (talento_id, storage_path, orden) values
  ((select v from ctx where k='a'), (select v from ctx where k='a') || '/f.jpg', 0),
  ((select v from ctx where k='c'), (select v from ctx where k='c') || '/f.jpg', 0);
insert into salas (id, titulo) values ((select v from ctx where k='sala'), 'Sala DP');
insert into sala_integrantes (sala_id, perfil_id) values
  ((select v from ctx where k='sala'), (select v from ctx where k='b')),
  ((select v from ctx where k='sala'), (select v from ctx where k='c'));

-- ── T1 · B no lee las columnas privadas de nadie, sí el resto ───────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"9bbbbbbb-2222-2222-2222-22222222bbbb"}';
do $$
declare
  col text;
begin
  foreach col in array array['fecha_nacimiento', 'ubicacion_texto', 'ubicacion_place_id', 'ubicacion_lat', 'ubicacion_lng', '*'] loop
    begin
      execute format('select %s from perfiles_talento where id = %L', col, (select v from ctx where k='c'));
      raise exception 'T1: «select %» sobre perfiles_talento tenía que rechazarse', col;
    exception when insufficient_privilege then null;
    end;
  end loop;
  -- Lo público sigue ahí (C comparte sala con B, así que su fila se ve).
  if (select nombre from perfiles_talento where id = (select v from ctx where k='c')) is distinct from 'Ciro Privado' then
    raise exception 'T1: B tendría que seguir leyendo el nombre de C';
  end if;
end $$;

-- ── T2 · edad_publica: la de C (visible), null para A (oculta) ──────────────
do $$ begin
  if public.edad_publica((select v from ctx where k='c')) is distinct from 40 then
    raise exception 'T2: edad_publica de C tendría que ser 40, dio %', public.edad_publica((select v from ctx where k='c'));
  end if;
  if public.edad_publica((select v from ctx where k='a')) is not null then
    raise exception 'T2: edad_publica de A (oculta) tendría que ser null';
  end if;
end $$;

-- ── T3 · buscar_talento sigue andando (texto, edad, radio) y respeta el toggle ─
create temp table t3_texto as select * from public.buscar_talento(p_texto => 'Privad', p_limite => 1000);
create temp table t3_radio as
  select * from public.buscar_talento(p_lat => -34.58, p_lng => -58.42, p_radio_metros => 1000, p_limite => 1000);
create temp table t3_lejos as
  select * from public.buscar_talento(p_lat => -31.42, p_lng => -64.18, p_radio_metros => 1000, p_limite => 1000);
create temp table t3_edad as
  select id from public.buscar_talento(p_texto => 'Privad', p_edad_min => 29, p_edad_max => 31, p_limite => 1000);
do $$
declare
  a uuid := (select v from ctx where k='a');
  c uuid := (select v from ctx where k='c');
begin
  if not exists (select 1 from t3_texto where id = a and edad is null) then
    raise exception 'T3: A tendría que salir por texto, sin edad (la ocultó)';
  end if;
  if exists (select 1 from t3_texto where id = c) then
    raise exception 'T3: C apagó «Aparecer en el buscador»: no tendría que salir aunque comparta sala';
  end if;
  if not exists (select 1 from t3_radio where id = a) then raise exception 'T3: A tendría que salir en un radio de 1 km de su zona'; end if;
  if exists (select 1 from t3_lejos where id = a) then raise exception 'T3: A no tendría que salir en Córdoba'; end if;
  -- El filtro de edad prioriza, no excluye (0052), y tiene que poder leer la fecha.
  if not exists (select 1 from t3_edad where id = a) then
    raise exception 'T3: buscar con rango de edad tendría que seguir trayendo a A';
  end if;
end $$;
reset role;

-- ── T4 · A lee su fila entera y la sigue editando ───────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"9aaaaaaa-1111-1111-1111-11111111aaaa"}';
create temp table t4 as select * from public.mi_perfil_talento();
update perfiles_talento set fecha_nacimiento = '1991-02-03', ubicacion_texto = 'Nueva 789' where id = auth.uid();
create temp table t4b as select * from public.mi_perfil_talento();
reset role;
do $$ begin
  if (select count(*) from t4) <> 1 or (select ubicacion_texto from t4) <> 'Calle Falsa 123'
     or (select ubicacion_place_id from t4) <> 'place-a' or (select ubicacion_lat from t4) is null then
    raise exception 'T4: mi_perfil_talento tendría que traer la fila propia entera';
  end if;
  if (select fecha_nacimiento from t4b) <> '1991-02-03' or (select ubicacion_texto from t4b) <> 'Nueva 789' then
    raise exception 'T4: A tendría que poder seguir editando su fecha y su ubicación';
  end if;
end $$;

-- ── T5 · feed_para_talento: el propio trae el rol de B, el de otro no da nada ──
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, estado)
  values ((select v from ctx where k='obra'), (select v from ctx where k='b'), 'Obra feed DP', 'x', -34.6, -58.4, 'AR', 'publicada');
insert into roles (obra_id, nombre, tipo, vacantes)
  values ((select v from ctx where k='obra'), 'Rol feed DP', 'actuacion', 1);
set local role authenticated;
set local request.jwt.claims = '{"sub":"9aaaaaaa-1111-1111-1111-11111111aaaa"}';
create temp table t5_propio as select * from public.feed_para_talento((select v from ctx where k='a'), null);
create temp table t5_ajeno as select * from public.feed_para_talento((select v from ctx where k='c'), null);
reset role;
do $$ begin
  if not exists (select 1 from t5_propio where obra_id = (select v from ctx where k='obra')) then
    raise exception 'T5: A tendría que recibir el rol de B en su feed';
  end if;
  if exists (select 1 from t5_ajeno) then
    raise exception 'T5: feed_para_talento no tendría que devolver nada para otro talento';
  end if;
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
