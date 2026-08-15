-- Valores nuevos de los enums, solos y antes que todo lo demás.
--
-- `alter type ... add value` no puede convivir con el uso del valor nuevo en la misma
-- transacción, y la CLI envuelve cada archivo en una. Por eso esta migración no hace nada
-- más: la lógica que los usa vive en 0031.

-- `esperando_confirmacion`: el creador ya eligió, pero la postulación era vieja y hace falta
-- que el talento diga que sigue disponible antes de que haya equipo.
-- `vencida`: nadie decidió a tiempo y la espera se cerró sola.
alter type estado_postulacion add value if not exists 'esperando_confirmacion';
alter type estado_postulacion add value if not exists 'vencida';

-- `convocado`: te eligieron y falta que confirmes.
-- `espera_vencida`: la postulación se cerró por tiempo, sin decisión.
alter type tipo_notificacion add value if not exists 'convocado';
alter type tipo_notificacion add value if not exists 'espera_vencida';
