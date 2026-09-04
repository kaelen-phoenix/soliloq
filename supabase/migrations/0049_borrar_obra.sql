-- Borrar un proyecto (issue #81). `obras` (0008) tenía select/insert/update pero no delete,
-- así que el dueño no podía eliminarlo. Se agrega la policy que falta.
--
-- Todo lo que cuelga de `obras` ya es `on delete cascade` (roles, postulaciones, descartes,
-- salas, denuncias, fotos_obra), así que un `delete` del dueño arrastra el árbol entero.
-- Los archivos del Storage los limpia la app antes de borrar la fila (Storage no cascadea).

create policy "obras_delete_propia" on obras
  for delete using (creador_id = auth.uid());
