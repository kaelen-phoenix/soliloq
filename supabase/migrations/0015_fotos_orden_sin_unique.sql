-- El `orden` de las fotos es una preferencia de visualización, no una clave: exigir
-- unicidad obligaba a reordenamientos transaccionales frágiles y hacía colisionar el
-- alta de una foto nueva después de borrar una del medio. Se conserva el índice para
-- ordenar, pero sin restricción de unicidad. La foto principal es la de menor `orden`.
alter table fotos_talento drop constraint fotos_talento_talento_id_orden_key;
