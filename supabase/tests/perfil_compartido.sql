-- El perfil compartido (#384, migración 0113): completo y con redes también sin cuenta,
-- con nombre propio además del código, y con un contador de visitas que solo ve su dueña.
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh perfil_compartido.sql

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated, anon;
insert into ctx (k, v) values
  ('a', 'c1111111-1111-1111-1111-11111111cccc'),
  ('b', 'c2222222-2222-2222-2222-22222222cccc');

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='a'), 'pc-a@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='b'), 'pc-b@test.local', 'authenticated', 'authenticated');
update perfiles set aprobado_en = now(), enlace_publico_activo = true where id = (select v from ctx where k='a');
insert into perfiles_talento (id, nombre, fecha_nacimiento, edad_visible, ubicacion_texto, ubicacion_publica, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero, redes) values
  ((select v from ctx where k='a'), 'Ana Compartida', '1990-01-01', false, 'x', 'Palermo', -34.58, -58.42, 'AR', 'sin_especificar',
   '{"instagram": "https://instagram.com/ana.compartida", "sitio": "https://ana.com.ar"}'::jsonb);
insert into ctx (k, v) select 'token_a', enlace_token from perfiles where id = (select v from ctx where k='a');

-- ── T1 · sin sesión: el perfil completo, con redes y sitio; la edad oculta, oculta ──
set local role anon;
set local request.jwt.claims = '{}';
create temp table t1 as select * from public.perfil_publico((select v::text from ctx where k='token_a'));
do $$ begin
  if (select nombre from t1) is distinct from 'Ana Compartida' then
    raise exception 'T1: el enlace tendría que mostrar el perfil';
  end if;
  if (select redes->>'instagram' from t1) is distinct from 'https://instagram.com/ana.compartida'
     or (select redes->>'sitio' from t1) is distinct from 'https://ana.com.ar' then
    raise exception 'T1: sin cuenta, el enlace tendría que mostrar redes y sitio (#384)';
  end if;
  if (select edad from t1) is not null then
    raise exception 'T1: la edad oculta no se tendría que mostrar';
  end if;
  -- La columna sigue sin poder leerse directo: el único camino es el enlace.
  begin
    perform redes from perfiles_talento where id = (select v from ctx where k='a');
    raise exception 'T1: sin sesión no se tendría que poder leer la columna redes';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── T2 · nombre propio: andan el nombre y el código; formato y unicidad ──────
update perfiles set enlace_alias = 'ana-compartida' where id = (select v from ctx where k='a');
set local role anon;
set local request.jwt.claims = '{}';
create temp table t2 as select * from public.perfil_publico('Ana-Compartida');
reset role;
do $$ begin
  if (select nombre from t2) is distinct from 'Ana Compartida' then
    raise exception 'T2: el enlace con nombre (sin importar mayúsculas) tendría que andar';
  end if;
  if (select count(*) from public.perfil_publico((select v::text from ctx where k='token_a'))) <> 1 then
    raise exception 'T2: el código tendría que seguir andando';
  end if;
  begin
    update perfiles set enlace_alias = 'Ana Pérez!' where id = (select v from ctx where k='b');
    raise exception 'T2: un nombre con espacios, mayúsculas o signos no tendría que aceptarse';
  exception when check_violation then null;
  end;
  begin
    update perfiles set enlace_alias = 'ana-compartida' where id = (select v from ctx where k='b');
    raise exception 'T2: dos personas no pueden tener el mismo nombre de enlace';
  exception when unique_violation then null;
  end;
end $$;

-- ── T3 · visitas: cuentan las ajenas, no las propias ni las de un enlace apagado ──
set local role anon;
set local request.jwt.claims = '{}';
select public.registrar_visita_enlace('ana-compartida');
select public.registrar_visita_enlace((select v::text from ctx where k='token_a'));
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"c1111111-1111-1111-1111-11111111cccc"}';
select public.registrar_visita_enlace('ana-compartida');
create temp table t3_propias as select coalesce(sum(cantidad), 0) as n from visitas_enlace;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"c2222222-2222-2222-2222-22222222cccc"}';
create temp table t3_ajenas as select count(*) as n from visitas_enlace;
reset role;
update perfiles set enlace_publico_activo = false where id = (select v from ctx where k='a');
set local role anon;
set local request.jwt.claims = '{}';
select public.registrar_visita_enlace('ana-compartida');
create temp table t3_apagado as select * from public.perfil_publico('ana-compartida');
reset role;
do $$ begin
  if (select n from t3_propias) <> 2 then
    raise exception 'T3: tendrían que contarse 2 visitas ajenas y ninguna propia (hay %)', (select n from t3_propias);
  end if;
  if (select n from t3_ajenas) <> 0 then
    raise exception 'T3: otra persona no tendría que ver las visitas de A';
  end if;
  if (select sum(cantidad) from visitas_enlace where perfil_id = (select v from ctx where k='a')) <> 2 then
    raise exception 'T3: con el enlace apagado la visita no tendría que contarse';
  end if;
  if exists (select 1 from t3_apagado) then
    raise exception 'T3: con el enlace apagado el perfil no tendría que verse';
  end if;
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
