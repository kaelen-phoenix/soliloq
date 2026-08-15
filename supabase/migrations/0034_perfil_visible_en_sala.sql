-- Ver el perfil de quien comparte sala con vos.
--
-- El agujero apareció con las salas sin obra: `perfil_talento_select_para_creador` deja ver
-- a un talento solo si se postuló a una obra propia. En una sala nacida de "armar equipo" no
-- hay obra ni postulación, así que dos personas que se eligieron mutuamente entraban a un
-- chat donde el otro figuraba como "Integrante", sin nombre y sin cara.
--
-- La política se mantiene angosta a propósito: no habilita a cualquiera con sesión, solo a
-- quien ya está en la misma sala — es decir, a quien la otra persona ya aceptó. La
-- alternativa que se descartó era abrir `perfiles_talento` a toda sesión iniciada, que
-- expondría fotos y fecha de nacimiento de todo el mundo a cualquier cuenta nueva.

create or replace function public.comparte_sala_con(p_perfil_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from sala_integrantes mio
    join sala_integrantes suyo on suyo.sala_id = mio.sala_id
    where mio.perfil_id = auth.uid()
      and suyo.perfil_id = p_perfil_id
  );
$$;

drop policy if exists "perfil_talento_select_companero_de_sala" on perfiles_talento;
create policy "perfil_talento_select_companero_de_sala" on perfiles_talento
  for select using (public.comparte_sala_con(id));

-- Las fotos siguen el mismo criterio: si ya comparten sala, la cara se ve.
drop policy if exists "fotos_talento_select_companero_de_sala" on fotos_talento;
create policy "fotos_talento_select_companero_de_sala" on fotos_talento
  for select using (public.comparte_sala_con(talento_id));

-- El bloqueo sigue mandando por encima: las políticas restrictivas de 0022 se combinan con
-- AND, así que compartir sala no vuelve visible a alguien que bloqueaste.
