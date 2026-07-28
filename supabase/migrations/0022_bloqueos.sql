-- Bloqueo mutuo entre dos cuentas: dejan de verse en todas las superficies de la app.
--
-- Se resuelve con políticas RLS **restrictivas**, no con filtros en el cliente ni en la
-- vista del feed. Las políticas existentes son permisivas y se combinan con OR: agregar
-- otra permisiva no quita nada. Una restrictiva se combina con AND, así que recorta sobre
-- todas las demás a la vez, y no hay pantalla ni query que se la saltee.
--
-- Todo el archivo es idempotente: se puede pegar en el SQL Editor de Supabase y volver a
-- correr después con `supabase db push` sin efectos.

create table if not exists bloqueos (
  -- Par canónico: siempre perfil_menor < perfil_mayor, así el mismo bloqueo no puede
  -- entrar dos veces con las personas al revés.
  perfil_menor uuid not null references perfiles (id) on delete cascade,
  perfil_mayor uuid not null references perfiles (id) on delete cascade,
  -- Quién pidió el bloqueo. Es cuál de los dos del par, pero hace falta explícito: sin esto
  -- no hay forma de que sólo quien bloqueó pueda deshacerlo.
  creado_por uuid not null references perfiles (id) on delete cascade,
  motivo text,
  creado_en timestamptz not null default now(),
  primary key (perfil_menor, perfil_mayor),
  constraint bloqueo_ordenado check (perfil_menor < perfil_mayor),
  constraint bloqueo_autor_del_par check (creado_por in (perfil_menor, perfil_mayor))
);

-- Para una base donde este archivo ya corrió en su versión anterior, sin `creado_por`.
--
-- El backfill de abajo asigna la autoría a `perfil_menor`, que es una elección arbitraria:
-- el orden del par es por UUID y no dice nada sobre quién bloqueó a quién. Para las filas
-- anteriores a esta migración esa información no existe en ningún lado, así que no hay nada
-- mejor que adivinar. La consecuencia concreta de adivinar mal es que quien deshace el
-- bloqueo termina siendo la persona bloqueada. Revisar a mano las filas preexistentes.
alter table bloqueos add column if not exists creado_por uuid references perfiles (id) on delete cascade;
update bloqueos set creado_por = perfil_menor where creado_por is null;
alter table bloqueos alter column creado_por set not null;

do $$ begin
  alter table bloqueos add constraint bloqueo_autor_del_par check (creado_por in (perfil_menor, perfil_mayor));
exception when duplicate_object then null;
end $$;

alter table bloqueos enable row level security;

-- El bloqueo es asimétrico en la administración y simétrico en el efecto: quien bloquea ve
-- y deshace su bloqueo; la persona bloqueada no puede ni enterarse de que existe, porque
-- eso filtraría exactamente lo que el bloqueo intenta evitar.
--
-- Hoy no hay interfaz: los bloqueos se cargan a mano desde el SQL Editor de Supabase, donde
-- la clave de servicio saltea RLS. Estas políticas están igual porque son la definición de
-- qué puede hacer cada persona con su propio bloqueo, y sin ellas la tabla queda cerrada de
-- una forma que parece intencional pero es sólo un olvido.

drop policy if exists "bloqueos_lectura_propia" on bloqueos;
create policy "bloqueos_lectura_propia" on bloqueos
  for select using (creado_por = auth.uid());

-- Se exige `creado_por = auth.uid()` además de la pertenencia al par: sin eso, cualquiera
-- de los dos podría anotar al otro como autor y quedarse sin poder deshacerlo.
drop policy if exists "bloqueos_alta_propia" on bloqueos;
create policy "bloqueos_alta_propia" on bloqueos
  for insert with check (
    creado_por = auth.uid() and auth.uid() in (perfil_menor, perfil_mayor)
  );

-- Sólo quien bloqueó puede deshacerlo. Si la política mirara únicamente la pertenencia al
-- par, la persona bloqueada podría borrar el bloqueo a ciegas — no necesita leerlo para
-- eso, le alcanza con un delete sobre el par, que conoce.
drop policy if exists "bloqueos_baja_propia" on bloqueos;
create policy "bloqueos_baja_propia" on bloqueos
  for delete using (creado_por = auth.uid());

-- SECURITY DEFINER siguiendo el patrón de 0005: una política que subconsulte una tabla con
-- RLS puede entrar en recursión entre políticas.
create or replace function public.hay_bloqueo(p_otro_perfil uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from bloqueos
    where perfil_menor = least(auth.uid(), p_otro_perfil)
      and perfil_mayor = greatest(auth.uid(), p_otro_perfil)
  );
$$;

-- ¿Quién es el creador dueño de este rol? Necesario para cortar los roles sin depender de
-- que la política de `obras` ya haya filtrado.
create or replace function public.creador_de_rol(p_rol_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select o.creador_id from roles r join obras o on o.id = r.obra_id where r.id = p_rol_id;
$$;

-- --- Políticas restrictivas -------------------------------------------------------------
-- Cada una responde a una superficie concreta donde hoy se pueden cruzar:
--   perfiles_creador  → el perfil de creador es público para cualquier autenticado
--   obras / roles     → el feed muestra roles de cualquier obra publicada
--   perfiles_talento  → la bandeja de postulantes, si una se postuló a la obra de la otra
--   fotos_talento     → las fotos acompañan al perfil
--   obras_previas     → historial visible junto al perfil de creador

drop policy if exists "bloqueo_perfil_creador" on perfiles_creador;
create policy "bloqueo_perfil_creador" on perfiles_creador
  as restrictive for select using (not public.hay_bloqueo(id));

drop policy if exists "bloqueo_perfil_talento" on perfiles_talento;
create policy "bloqueo_perfil_talento" on perfiles_talento
  as restrictive for select using (not public.hay_bloqueo(id));

drop policy if exists "bloqueo_fotos_talento" on fotos_talento;
create policy "bloqueo_fotos_talento" on fotos_talento
  as restrictive for select using (not public.hay_bloqueo(talento_id));

drop policy if exists "bloqueo_obras_previas" on obras_previas;
create policy "bloqueo_obras_previas" on obras_previas
  as restrictive for select using (not public.hay_bloqueo(creador_id));

drop policy if exists "bloqueo_obras" on obras;
create policy "bloqueo_obras" on obras
  as restrictive for select using (not public.hay_bloqueo(creador_id));

drop policy if exists "bloqueo_roles" on roles;
create policy "bloqueo_roles" on roles
  as restrictive for select using (not public.hay_bloqueo(public.creador_de_rol(id)));

-- La vista `feed_talento` es `security_invoker`, así que hereda estas políticas sola: los
-- roles de la persona bloqueada desaparecen del feed sin tocar la función del feed.

-- Y que tampoco puedan postularse ni ser clasificadas: sin esto, una postulación previa
-- seguiría existiendo y el bloqueo sería solo visual.
drop policy if exists "bloqueo_postulaciones" on postulaciones;
create policy "bloqueo_postulaciones" on postulaciones
  as restrictive for select
  using (not public.hay_bloqueo(talento_id) and not public.hay_bloqueo(public.creador_de_rol(rol_id)));

drop policy if exists "bloqueo_postulaciones_insert" on postulaciones;
create policy "bloqueo_postulaciones_insert" on postulaciones
  as restrictive for insert
  with check (not public.hay_bloqueo(public.creador_de_rol(rol_id)));
