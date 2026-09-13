-- 0068 — Notificación de "nuevo Match" para el Creador (issue #160).
--
-- El trigger que materializa un match (0054+) no avisaba a nadie: el Creador sólo se
-- entera si entra a Call Back a mirar. Se agrega una notificación en el momento exacto en
-- que se crea el match (no en cada "Me interesa" — sólo cuando el interés se vuelve mutuo y
-- de verdad se inserta una fila nueva en `matches`).
--
-- El valor del enum se agrega en su propia transacción porque Postgres no permite usar un
-- valor de enum nuevo en la misma transacción que lo creó.
alter type tipo_notificacion add value if not exists 'nuevo_match';
