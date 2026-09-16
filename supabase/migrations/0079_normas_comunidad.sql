-- 0079 — Aceptación obligatoria de las Normas de la Comunidad (issue #180).
--
-- Antes de completar su Perfil de Talento o crear un Proyecto/Equipo, toda cuenta nueva
-- debe aceptar expresamente las Normas de la Comunidad. La aceptación se pide como un paso
-- obligatorio justo después del alta (mismo lugar para registro por email y por Google, ya
-- que este último no pasa por el formulario de `/ingresar`), antes de `/completar-perfil`.
--
-- No es retroactivo: las cuentas que ya existían no quedan bloqueadas por esto.

alter table perfiles add column if not exists normas_aceptadas_en timestamptz;
update perfiles set normas_aceptadas_en = now() where normas_aceptadas_en is null;
