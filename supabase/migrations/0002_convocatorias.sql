-- Obras y roles: el "tablero" de convocatorias del creador.
create type estado_obra as enum ('borrador', 'publicada', 'cerrada');
create type tipo_rol as enum ('actuacion', 'tecnica');

create table obras (
  id uuid primary key default gen_random_uuid(),
  creador_id uuid not null references perfiles_creador (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 200),
  sinopsis text check (char_length(sinopsis) <= 2000),
  locacion_ensayos text not null,
  fecha_estreno_estimada date,
  estado estado_obra not null default 'borrador',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index idx_obras_creador on obras (creador_id);
create index idx_obras_estado on obras (estado);

create table roles (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  tipo tipo_rol not null,
  edad_minima integer check (edad_minima >= 0),
  edad_maxima integer check (edad_maxima >= 0),
  vacantes integer not null check (vacantes > 0),
  descripcion text check (char_length(descripcion) <= 2000),
  creado_en timestamptz not null default now(),
  constraint rango_etario_valido check (
    edad_minima is null or edad_maxima is null or edad_minima <= edad_maxima
  )
);

create index idx_roles_obra on roles (obra_id);

-- Postulaciones: una fila por talento y rol; el estado solo lo cambia el creador (ver RLS).
create type estado_postulacion as enum ('pendiente', 'en_duda', 'aprobado', 'rechazado');

create table postulaciones (
  id uuid primary key default gen_random_uuid(),
  rol_id uuid not null references roles (id) on delete cascade,
  talento_id uuid not null references perfiles_talento (id) on delete cascade,
  estado estado_postulacion not null default 'pendiente',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (rol_id, talento_id)
);

create index idx_postulaciones_rol on postulaciones (rol_id);
create index idx_postulaciones_talento on postulaciones (talento_id);
create index idx_postulaciones_estado on postulaciones (estado);

-- Descartes: registra qué roles ya vio y descartó un talento, para no repetirlos en el feed.
create table descartes (
  id uuid primary key default gen_random_uuid(),
  rol_id uuid not null references roles (id) on delete cascade,
  talento_id uuid not null references perfiles_talento (id) on delete cascade,
  creado_en timestamptz not null default now(),
  unique (rol_id, talento_id)
);

create index idx_descartes_talento on descartes (talento_id);
