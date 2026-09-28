-- 0083 — Eliminar un Equipo libera a sus Talentos y borra su Sala (issue #215).
--
-- Borrar un Proyecto ya hacía todo lo que pide #215 por cascada: `intereses_match` y
-- `matches` (y con ellos `convocatorias`) caen con la obra, así que `buscar_talento` —que
-- solo excluye por `intereses_match` (0058)— vuelve a mostrar a esos Talentos; y
-- `salas.obra_id` es `on delete cascade`, así que la sala y sus mensajes se van con ella.
--
-- Con un Equipo, lo primero ya pasaba igual, pero `salas.equipo_id` era `on delete set null`
-- (0046): la sala sobrevivía sin iniciativa, con sus integrantes y mensajes, y pasaba a verse
-- como una sala 1:1 de "armar equipo". Decisión de #215: la sala se borra, igual que con un
-- Proyecto.

alter table salas drop constraint if exists salas_equipo_id_fkey;
alter table salas
  add constraint salas_equipo_id_fkey
  foreign key (equipo_id) references equipos (id) on delete cascade;
