-- Valor nuevo del enum de notificaciones, solo y antes de la lógica que lo usa: la CLI
-- envuelve cada archivo en una transacción y un valor recién agregado no se puede usar ahí
-- mismo. Ver 0030, mismo motivo.

-- `equipo_armado`: dos personas se eligieron mutuamente sin que haya un proyecto de por
-- medio. No es `match`, que siempre cuelga de una obra y de un rol.
alter type tipo_notificacion add value if not exists 'equipo_armado';
