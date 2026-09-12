-- 0065 — Descripción del Equipo (issue #157).
--
-- La creación unificada de Proyecto/Equipo pide descripción para los dos; `obras` ya tiene
-- `sinopsis`, `equipos` no tenía nada equivalente.

alter table equipos add column if not exists descripcion text check (char_length(descripcion) <= 2000);
