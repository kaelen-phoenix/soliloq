-- Para contactar desde un perfil público hay que tener perfil (0096).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh contactar_requiere_perfil.sql
--
-- A tiene perfil y enlace público. N se registró y todavía no armó su perfil: no puede
-- contactar a A (antes podía, y el chat directo quedaba con «Alguien»). Con perfil, sí.

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('a', 'd1111111-1111-1111-1111-11111111dddd'),
  ('n', 'd2222222-2222-2222-2222-22222222dddd');

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='a'), 'crp-a@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='n'), 'crp-n@test.local', 'authenticated', 'authenticated');
update perfiles set aprobado_en = now(), normas_aceptadas_en = now() where id in ((select v from ctx where k='a'), (select v from ctx where k='n'));
update perfiles set enlace_publico_activo = true where id = (select v from ctx where k='a');
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_publica, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero)
  values ((select v from ctx where k='a'), 'Ana Contactable', '1990-01-01', 'x', 'Palermo', -34.58, -58.42, 'AR', 'sin_especificar');
insert into ctx (k, v) select 'token_a', enlace_token from perfiles where id = (select v from ctx where k='a');

-- ── T1 · sin perfil, no contacta ────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"d2222222-2222-2222-2222-22222222dddd"}';
do $$ begin
  begin
    perform public.contactar_desde_perfil((select v from ctx where k='token_a'));
    raise exception 'T1: sin perfil no se tendría que poder contactar';
  exception when others then
    if sqlerrm <> 'perfil_incompleto' then raise; end if;
  end;
end $$;
reset role;

-- ── T2 · con perfil, contacta ───────────────────────────────────────────────
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_publica, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero)
  values ((select v from ctx where k='n'), 'Nico Nuevo', '1990-01-01', 'x', 'Almagro', -34.6, -58.42, 'AR', 'sin_especificar');
set local role authenticated;
set local request.jwt.claims = '{"sub":"d2222222-2222-2222-2222-22222222dddd"}';
select public.contactar_desde_perfil((select v from ctx where k='token_a'));
reset role;
do $$ begin
  if not exists (select 1 from intereses_equipo where de_perfil = (select v from ctx where k='n') and a_perfil = (select v from ctx where k='a') and interesa) then
    raise exception 'T2: con perfil, el contacto tendría que quedar registrado';
  end if;
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
