-- El cupo de un equipo puede llegar a 10 integrantes (issue #101). Estaba topado en 6
-- desde 0044. Solo cambia el rango del check; nada más de `equipos` se toca.

alter table equipos drop constraint equipos_cupo_check;
alter table equipos add constraint equipos_cupo_check check (cupo between 1 and 10);
