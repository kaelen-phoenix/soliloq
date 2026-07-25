-- Funciones SECURITY DEFINER usadas por las políticas RLS. Se definen antes que las
-- políticas para evitar que una política subconsulte directamente tablas con RLS
-- que a su vez dependen de la misma tabla (recursión infinita entre policies).

-- ¿El usuario autenticado es el creador dueño de esta obra?
create or replace function public.es_dueno_de_obra(p_obra_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from obras where id = p_obra_id and creador_id = auth.uid()
  );
$$;

-- ¿El usuario autenticado es el creador dueño de este rol (vía su obra)?
create or replace function public.es_dueno_de_rol(p_rol_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from roles r join obras o on o.id = r.obra_id
    where r.id = p_rol_id and o.creador_id = auth.uid()
  );
$$;

-- ¿Existe alguna postulación del talento p_talento_id a un rol de una obra de auth.uid()?
-- Sostiene la visibilidad del perfil de talento para el creador: solo si se postuló.
create or replace function public.talento_se_postulo_a_mis_obras(p_talento_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from postulaciones p
    join roles r on r.id = p.rol_id
    join obras o on o.id = r.obra_id
    where p.talento_id = p_talento_id and o.creador_id = auth.uid()
  );
$$;

-- ¿El usuario autenticado integra esta sala? Evita que sala_integrantes
-- referencie su propia tabla dentro de la política de salas y viceversa.
create or replace function public.es_integrante_de_sala(p_sala_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from sala_integrantes where sala_id = p_sala_id and perfil_id = auth.uid()
  );
$$;
