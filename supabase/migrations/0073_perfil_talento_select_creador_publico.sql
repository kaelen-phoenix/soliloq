-- 0073 — RLS: el Perfil de Talento de quien crea un Proyecto/Equipo público se puede
-- consultar (issue #175, 3/3 DB).
--
-- Con 0072 la identidad que se muestra en el feed y en la placa de perfil de "quién creó
-- esto" pasa a ser siempre `perfiles_talento`. Hoy esa tabla sólo se puede leer (RLS) si es
-- el propio perfil, o si el Talento se postuló a una obra del Creador que pregunta
-- (`perfil_talento_select_para_creador`, 0007) — no contempla el caso nuevo: un Talento
-- mirando el feed, sin ninguna relación previa, abriendo el perfil de quien publicó.
--
-- No se amplía a "cualquier perfiles_talento es público" (eso expondría el perfil de
-- cualquier Talento a cualquiera, mucho más de lo que hacía falta) — sólo cuando esa
-- persona es dueña de un Proyecto publicado o un Equipo activo, el mismo alcance que tenía
-- `perfil_creador_select_publico` (0007) para la identidad de Creador que reemplaza.
create policy "perfil_talento_select_creador_publico" on perfiles_talento
  for select using (
    exists (select 1 from obras o where o.creador_id = perfiles_talento.id and o.estado = 'publicada')
    or exists (select 1 from equipos e where e.creador_id = perfiles_talento.id and e.activo)
  );
