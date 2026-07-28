-- El bloqueo, dentro de la sala de proyecto.
--
-- 0022 cortó todas las superficies donde dos personas se cruzan *antes* de trabajar juntas
-- (feed, perfiles, postulaciones), pero dejó afuera la sala. El agujero concreto: dos
-- talentos bloqueados entre sí se postulan a roles distintos de la misma obra, ambos quedan
-- aprobados, y el trigger de match los mete en la misma sala. Ahí se ven la cara y se leen
-- los mensajes como si el bloqueo no existiera.
--
-- La sala es grupal, así que el bloqueo acá no puede ser "sacar a alguien de la sala": eso
-- se lo impondría al resto del elenco, que no bloqueó a nadie. Es un filtro **por
-- espectador**: A no ve a B y B no ve a A, y para todos los demás la sala sigue completa.
-- Las políticas restrictivas dan justo eso, porque `hay_bloqueo` se resuelve contra
-- `auth.uid()`: la misma fila se ve o no según quién pregunte.
--
-- Idempotente, igual que 0022.

-- Los mensajes de la persona bloqueada dejan de existir para quien la bloqueó, y viceversa.
-- Cubre las tres vías por las que hoy llegan mensajes al cliente: el render inicial del
-- servidor, el refetch de `recuperarPerdidos`, y el vivo de Realtime — `postgres_changes`
-- evalúa las políticas con el token de cada suscriptor, así que el filtro viaja solo.
drop policy if exists "bloqueo_mensajes" on mensajes;
create policy "bloqueo_mensajes" on mensajes
  as restrictive for select using (not public.hay_bloqueo(autor_id));

-- Y que tampoco aparezcan en la lista de integrantes. Sin esto el bloqueo sería a medias:
-- los mensajes desaparecen pero la cara, el nombre y el rol en la obra siguen ahí.
--
-- La fila propia nunca se filtra: `hay_bloqueo(auth.uid())` busca un par con
-- `least(uid,uid) = greatest(uid,uid)`, y el check `bloqueo_ordenado` (menor < mayor)
-- garantiza que ese par no puede existir.
drop policy if exists "bloqueo_sala_integrantes" on sala_integrantes;
create policy "bloqueo_sala_integrantes" on sala_integrantes
  as restrictive for select using (not public.hay_bloqueo(perfil_id));

-- `es_integrante_de_sala` es SECURITY DEFINER y saltea RLS, así que sigue viendo la tabla
-- entera: nadie pierde el acceso a su propia sala porque bloqueó a otro integrante. Eso es
-- deliberado — el bloqueo esconde personas, no expulsa a quien bloquea de su proyecto.
