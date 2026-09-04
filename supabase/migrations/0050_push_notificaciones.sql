-- Notificaciones push (Web Push): un mensaje nuevo en una sala avisa aunque la app esté
-- cerrada. Esta migración solo guarda las suscripciones; el envío en sí (firmar y postear
-- a cada endpoint con `web-push`) lo hace la server action `notificarMensajeNuevo`, que
-- lee esta tabla con el cliente service-role.
--
-- Un perfil puede tener varias filas (un dispositivo = una suscripción = un endpoint).
-- `endpoint` es único porque lo es por diseño de la Push API — dos perfiles no pueden
-- terminar compartiendo el mismo.

create table push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);

create index idx_push_suscripciones_perfil on push_suscripciones (perfil_id);

alter table push_suscripciones enable row level security;

-- Cada quien administra sus propias suscripciones (activar/renovar/desactivar desde su
-- dispositivo). El envío efectivo pasa por el cliente service-role, que saltea RLS —
-- por eso no hace falta una policy de lectura para "los integrantes de mi sala" ni nada
-- parecido: nadie más necesita leer esta tabla desde el cliente.
create policy "push_suscripciones_propia_select" on push_suscripciones
  for select using (perfil_id = auth.uid());

create policy "push_suscripciones_propia_insert" on push_suscripciones
  for insert with check (perfil_id = auth.uid());

create policy "push_suscripciones_propia_update" on push_suscripciones
  for update using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

create policy "push_suscripciones_propia_delete" on push_suscripciones
  for delete using (perfil_id = auth.uid());
