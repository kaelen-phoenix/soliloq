-- Una cuenta puede tener perfil de talento, de creador, o ambos. `perfiles.rol`
-- deja de ser la fuente de verdad sobre qué puede hacer la persona (pasa a
-- registrar solo con qué rol arrancó): la verdad es la existencia de las filas
-- en `perfiles_talento` / `perfiles_creador`, que no puede desincronizarse.
alter table perfiles add column modo_activo rol_usuario;

-- Las cuentas existentes abren donde ya estaban.
update perfiles set modo_activo = rol where rol is not null;
