-- Columnas de `perfiles` que el usuario no puede tocarse a sí mismo (#257, 0088).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh columnas_protegidas.sql
--
-- Como `authenticated`: no puede ponerse `es_admin`, `aprobado_en` ni levantarse
-- `suspendido_en`, pero sí sigue editando lo suyo (modo, tema, pitch, enlace…). Las RPC de
-- admin (security definer) siguen aprobando y suspendiendo.

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('u', '94444444-4444-4444-4444-44444444cccc'),
  ('adm', '95555555-5555-5555-5555-55555555dddd');

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='u'), 'cp-u@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='adm'), 'cp-adm@test.local', 'authenticated', 'authenticated');
update perfiles set aprobado_en = null, suspendido_en = now() where id = (select v from ctx where k='u');
update perfiles set es_admin = true, aprobado_en = now() where id = (select v from ctx where k='adm');

-- ── T1 · el usuario no puede tocar ninguna columna protegida ────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"94444444-4444-4444-4444-44444444cccc"}';
do $$
declare
  cambio text;
begin
  foreach cambio in array array[
    'es_admin = true',
    'aprobado_en = now()',
    'suspendido_en = null',
    'creado_en = now() - interval ''1 year''',
    'id = gen_random_uuid()'
  ] loop
    begin
      execute format('update perfiles set %s where id = auth.uid()', cambio);
      raise exception 'T1: «%» tenía que rechazarse', cambio;
    exception when others then
      if sqlerrm <> 'columna_protegida' then raise; end if;
    end;
  end loop;
end $$;

-- ── T2 · lo suyo lo sigue editando ─────────────────────────────────────────
update perfiles
set modo_activo = 'creador', tema = 'claro', pitch = 'hola', busca_equipo = true,
    enlace_publico_activo = true, enlace_token = gen_random_uuid(),
    normas_aceptadas_en = now(), tour_talento_visto_en = now()
where id = auth.uid();
reset role;

do $$ begin
  if not exists (select 1 from perfiles where id = (select v from ctx where k='u')
                 and pitch = 'hola' and busca_equipo and normas_aceptadas_en is not null) then
    raise exception 'T2: el usuario tenía que poder editar sus columnas propias';
  end if;
  if exists (select 1 from perfiles where id = (select v from ctx where k='u')
             and (es_admin or aprobado_en is not null or suspendido_en is null)) then
    raise exception 'T2: las columnas protegidas cambiaron';
  end if;
end $$;

-- ── T3 · las RPC de admin siguen pudiendo ───────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"95555555-5555-5555-5555-55555555dddd"}';
select public.admin_aprobar_usuario((select v from ctx where k='u'));
select public.admin_suspender_usuario((select v from ctx where k='u'), false);
reset role;

do $$ begin
  if not exists (select 1 from perfiles where id = (select v from ctx where k='u')
                 and aprobado_en is not null and suspendido_en is null) then
    raise exception 'T3: admin_aprobar_usuario / admin_suspender_usuario tenían que funcionar';
  end if;
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
