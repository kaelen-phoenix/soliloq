-- Género en dos columnas, no en una. El enum es lo único que participa del match; el texto
-- libre es identidad y no se filtra ni se indexa jamás. Un enum solo obligaría a alguien a
-- autodescribirse con la etiqueta de otro; un texto libre solo haría imposible el filtro,
-- que es exactamente el problema que tenía la locación.
create type genero_persona as enum ('mujer', 'varon', 'no_binarie', 'otro', 'sin_especificar');

alter table perfiles_talento
  add column genero genero_persona not null default 'sin_especificar',
  add column genero_descripcion text check (char_length(genero_descripcion) <= 60);

-- Las filas existentes quedan en 'sin_especificar', que no es "faltante" sino una elección
-- válida que hace match con todo: no declarar el género no puede costar oportunidades.
--
-- El default se mantiene hasta 0021: mientras el código viejo siga desplegado tiene que
-- poder insertar un perfil sin mandar `genero`, y sin default un `not null` se lo rechaza.

-- Array vacío = abierto a cualquier género, y es el default. Un rol al que no se le tocó
-- nada le llega a todo el mundo, que es el comportamiento actual y el que no debe cambiar
-- para las obras ya cargadas.
--
-- No se normaliza a una tabla `roles_generos`: son como mucho cuatro valores de un enum,
-- siempre se leen junto al rol y nunca se consultan por sí solos.
alter table roles
  add column generos_buscados genero_persona[] not null default '{}',
  add constraint generos_buscados_sin_sin_especificar check (
    not ('sin_especificar' = any (generos_buscados))
  );

comment on constraint generos_buscados_sin_sin_especificar on roles is
  'Buscar gente que no declaró su género no es un criterio de casting.';
