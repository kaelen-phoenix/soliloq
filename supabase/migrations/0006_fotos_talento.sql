-- Fotos del portfolio del talento. `orden = 0` es la foto principal (se usa en tarjetas y listados).
create table fotos_talento (
  id uuid primary key default gen_random_uuid(),
  talento_id uuid not null references perfiles_talento (id) on delete cascade,
  storage_path text not null,
  orden smallint not null,
  creado_en timestamptz not null default now(),
  unique (talento_id, orden)
);

create index idx_fotos_talento_talento on fotos_talento (talento_id, orden);

-- Como mucho 5 fotos por talento.
create function public.validar_max_fotos_talento()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from fotos_talento where talento_id = new.talento_id) >= 5 then
    raise exception 'Un talento no puede tener más de 5 fotos';
  end if;
  return new;
end;
$$;

create trigger antes_de_insertar_foto_talento
  before insert on fotos_talento
  for each row execute procedure public.validar_max_fotos_talento();
