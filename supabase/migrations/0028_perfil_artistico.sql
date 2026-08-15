-- Reemplaza el par director/compañía por las disciplinas que ejerce la persona.
--
-- `perfiles_creador.tipo` no gobernaba nada: solo cambiaba la etiqueta de un campo en el
-- alta y una línea en el perfil público. A cambio obligaba a elegir entre dos casilleros
-- que dejan afuera a la mayoría del medio — un vestuarista que quiere convocar gente no es
-- ni "director independiente" ni "compañía".
--
-- Las disciplinas van como array y no como columna única porque la gente hace varias cosas
-- a la vez: dirigir y actuar es la norma, no la excepción. Se guardan sin orden jerárquico,
-- y `otro_detalle` recoge lo que la lista cerrada no contempla, sin ensuciar el enum.

create type disciplina_artistica as enum (
  'actuacion',
  'direccion',
  'guion',
  'produccion',
  'dramaturgia',
  'vestuario',
  'escenografia',
  'iluminacion',
  'sonido',
  'coreografia',
  'danza',
  'musica',
  'fotografia',
  'edicion',
  'maquillaje',
  'asistencia_direccion',
  'otro'
);

alter table perfiles_creador
  add column disciplinas disciplina_artistica[] not null default '{}',
  add column otro_detalle text check (char_length(otro_detalle) <= 80);

-- Traduce lo que había: quien era "compañía" pasa a producción, y el resto a dirección.
-- Es la lectura más fiel del dato viejo, y de todos modos son 2 filas.
update perfiles_creador
set disciplinas = case
  when tipo = 'compania' then array['produccion']::disciplina_artistica[]
  else array['direccion']::disciplina_artistica[]
end
where cardinality(disciplinas) = 0;

-- `tipo` se baja recién ahora, después del backfill: si se cayera antes, el dato viejo se
-- perdería sin posibilidad de traducirlo.
alter table perfiles_creador drop column tipo;
drop type tipo_creador;
