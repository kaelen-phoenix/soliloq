-- Notificaciones in-app. La inserción queda reservada a los triggers (ver 0005_triggers.sql).
create type tipo_notificacion as enum ('match', 'sala_creada');

create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references perfiles (id) on delete cascade,
  tipo tipo_notificacion not null,
  obra_id uuid references obras (id) on delete cascade,
  rol_id uuid references roles (id) on delete cascade,
  sala_id uuid,
  leida_en timestamptz,
  creado_en timestamptz not null default now()
);

create index idx_notificaciones_destinatario on notificaciones (destinatario_id, leida_en);

-- Sala de proyecto: una por obra, creada automáticamente en la primera aprobación.
create table salas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null unique references obras (id) on delete cascade,
  creado_en timestamptz not null default now()
);

alter table notificaciones
  add constraint notificaciones_sala_fk foreign key (sala_id) references salas (id) on delete cascade;

create table sala_integrantes (
  sala_id uuid not null references salas (id) on delete cascade,
  perfil_id uuid not null references perfiles (id) on delete cascade,
  incorporado_en timestamptz not null default now(),
  primary key (sala_id, perfil_id)
);

create index idx_sala_integrantes_perfil on sala_integrantes (perfil_id);

create table mensajes (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid not null references salas (id) on delete cascade,
  autor_id uuid not null references perfiles (id) on delete cascade,
  contenido text not null check (char_length(trim(contenido)) between 1 and 2000),
  creado_en timestamptz not null default now()
);

create index idx_mensajes_sala on mensajes (sala_id, creado_en);
