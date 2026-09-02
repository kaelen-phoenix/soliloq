-- Preferencias de cuenta: idioma de la interfaz y tema (claro/oscuro). Son de la cuenta,
-- no del rol, así que viven en `perfiles`. El idioma se autodetecta en el primer request
-- autenticado (por `Accept-Language`) y después se cambia en Ajustes. El tema arranca en
-- 'sistema' (sigue `prefers-color-scheme`).
--
-- Aditiva e idempotente.

alter table perfiles
  add column if not exists idioma text not null default 'es',
  add column if not exists tema text not null default 'sistema';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'perfiles_idioma_valido') then
    alter table perfiles add constraint perfiles_idioma_valido check (idioma in ('es', 'en'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'perfiles_tema_valido') then
    alter table perfiles add constraint perfiles_tema_valido check (tema in ('sistema', 'claro', 'oscuro'));
  end if;
end;
$$;
