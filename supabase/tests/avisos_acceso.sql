-- Avisos de acceso en la campanita (#247, #248, 0092).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh avisos_acceso.sql
--
-- ADM es admin; SUS es admin suspendido. P pide acceso sin invitación; I llega invitado;
-- Q pide acceso y después un admin invita su email.
--   - Por P y por Q, cada admin activo recibe `solicitud_acceso` (de_perfil = quién); SUS no.
--   - I entró con invitación: no genera solicitud ni aviso de habilitación.
--   - ADM aprueba a P: P recibe `acceso_habilitado` y la solicitud de P queda leída.
--   - ADM invita el email de Q: Q queda aprobado y recibe `acceso_habilitado`.
--   - Ninguno de esos avisos nace con el push marcado (lo despacha el servidor).

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('adm', 'b1111111-1111-1111-1111-11111111bbbb'),
  ('sus', 'b2222222-2222-2222-2222-22222222bbbb'),
  ('p', 'b3333333-3333-3333-3333-33333333bbbb'),
  ('i', 'b4444444-4444-4444-4444-44444444bbbb'),
  ('q', 'b5555555-5555-5555-5555-55555555bbbb');

-- Los dos admins (se crean sin invitación, así que nacen pendientes: se aprueban acá).
insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='adm'), 'aa-adm@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='sus'), 'aa-sus@test.local', 'authenticated', 'authenticated');
update perfiles set es_admin = true, aprobado_en = now() where id in ((select v from ctx where k='adm'), (select v from ctx where k='sus'));
update perfiles set suspendido_en = now() where id = (select v from ctx where k='sus');

-- I llega con invitación.
set local role authenticated;
set local request.jwt.claims = '{"sub":"b1111111-1111-1111-1111-11111111bbbb"}';
select public.admin_crear_invitacion('aa-i@test.local');
reset role;

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='p'), 'aa-p@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='i'), 'aa-i@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='q'), 'aa-q@test.local', 'authenticated', 'authenticated');

-- ── T1 · solicitudes: a cada admin activo, por P y por Q; no por I ─────────
do $$
declare
  adm uuid := (select v from ctx where k='adm');
  sus uuid := (select v from ctx where k='sus');
begin
  if (select count(*) from notificaciones where destinatario_id = adm and tipo = 'solicitud_acceso'
      and de_perfil in ((select v from ctx where k='p'), (select v from ctx where k='q'))) <> 2 then
    raise exception 'T1: ADM tendría que tener una solicitud por P y otra por Q';
  end if;
  if exists (select 1 from notificaciones where destinatario_id = sus and tipo = 'solicitud_acceso') then
    raise exception 'T1: un admin suspendido no tendría que recibir solicitudes';
  end if;
  if exists (select 1 from notificaciones where tipo in ('solicitud_acceso', 'acceso_habilitado')
             and (de_perfil = (select v from ctx where k='i') or destinatario_id = (select v from ctx where k='i'))) then
    raise exception 'T1: I entró con invitación: no tendría que generar avisos de acceso';
  end if;
  if exists (select 1 from notificaciones where tipo = 'solicitud_acceso' and push_enviado_en is not null
             and destinatario_id = adm) then
    raise exception 'T1: el push no tendría que nacer marcado';
  end if;
end $$;

-- ── T2 · ADM aprueba a P: aviso a P y su solicitud leída ───────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"b1111111-1111-1111-1111-11111111bbbb"}';
select public.admin_aprobar_usuario((select v from ctx where k='p'));
reset role;
do $$ begin
  if not exists (select 1 from notificaciones where destinatario_id = (select v from ctx where k='p')
                 and tipo = 'acceso_habilitado' and push_enviado_en is null) then
    raise exception 'T2: P tendría que recibir acceso_habilitado';
  end if;
  if exists (select 1 from notificaciones where tipo = 'solicitud_acceso'
             and de_perfil = (select v from ctx where k='p') and leida_en is null) then
    raise exception 'T2: la solicitud de P tendría que quedar leída para los admins';
  end if;
  if exists (select 1 from notificaciones where tipo = 'solicitud_acceso'
             and de_perfil = (select v from ctx where k='q') and leida_en is not null) then
    raise exception 'T2: la solicitud de Q sigue pendiente: no tendría que marcarse leída';
  end if;
end $$;

-- ── T3 · ADM invita el email de Q (que ya esperaba): queda habilitado y avisado ──
set local role authenticated;
set local request.jwt.claims = '{"sub":"b1111111-1111-1111-1111-11111111bbbb"}';
select public.admin_crear_invitacion('aa-q@test.local');
reset role;
do $$ begin
  if (select aprobado_en from perfiles where id = (select v from ctx where k='q')) is null then
    raise exception 'T3: invitar el email de Q tendría que habilitarlo';
  end if;
  if not exists (select 1 from notificaciones where destinatario_id = (select v from ctx where k='q')
                 and tipo = 'acceso_habilitado') then
    raise exception 'T3: Q tendría que recibir acceso_habilitado';
  end if;
end $$;

-- ── T4 · aprobar dos veces no duplica el aviso ──────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"b1111111-1111-1111-1111-11111111bbbb"}';
select public.admin_aprobar_usuario((select v from ctx where k='p'));
reset role;
do $$ begin
  if (select count(*) from notificaciones where destinatario_id = (select v from ctx where k='p')
      and tipo = 'acceso_habilitado') <> 1 then
    raise exception 'T4: aprobar dos veces no tendría que duplicar el aviso';
  end if;
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
