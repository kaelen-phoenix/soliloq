-- Perfil base: uno por usuario de auth.users, define su rol único e inmutable en el prototipo.
create type rol_usuario as enum ('talento', 'creador');

create table perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol rol_usuario,
  onboarding_completo boolean not null default false,
  creado_en timestamptz not null default now()
);

-- Alta automática de la fila de perfil apenas se crea el usuario en auth.users.
create function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.manejar_nuevo_usuario();

-- Perfil de talento: 1:1 con perfiles, solo cuando rol = 'talento'.
create table perfiles_talento (
  id uuid primary key references perfiles (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 120),
  fecha_nacimiento date not null,
  locacion text not null,
  videoreel_url text,
  experiencia text check (char_length(experiencia) <= 2000),
  habilidades text[] not null default '{}',
  actualizado_en timestamptz not null default now(),
  constraint edad_minima check (fecha_nacimiento <= (current_date - interval '16 years'))
);

create type tipo_creador as enum ('director_independiente', 'compania');

create table perfiles_creador (
  id uuid primary key references perfiles (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 120),
  tipo tipo_creador not null,
  locacion text not null,
  descripcion text check (char_length(descripcion) <= 1000),
  imagen_url text,
  actualizado_en timestamptz not null default now()
);

create table obras_previas (
  id uuid primary key default gen_random_uuid(),
  creador_id uuid not null references perfiles_creador (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 200),
  anio integer not null check (anio between 1900 and extract(year from current_date)::int),
  rol_desempenado text not null check (char_length(rol_desempenado) between 1 and 120),
  creado_en timestamptz not null default now()
);

create index idx_obras_previas_creador on obras_previas (creador_id);
