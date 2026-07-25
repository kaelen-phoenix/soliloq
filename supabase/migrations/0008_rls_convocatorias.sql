alter table obras enable row level security;
alter table roles enable row level security;
alter table postulaciones enable row level security;
alter table descartes enable row level security;

-- obras: el dueño la ve siempre (cualquier estado); un talento solo si está publicada.
create policy "obras_select_propia" on obras
  for select using (creador_id = auth.uid());

create policy "obras_select_publicada" on obras
  for select using (estado = 'publicada');

create policy "obras_insert_propia" on obras
  for insert with check (creador_id = auth.uid());

create policy "obras_update_propia" on obras
  for update using (creador_id = auth.uid());

-- roles: mismas reglas de visibilidad heredadas de su obra.
create policy "roles_select_propio" on roles
  for select using (public.es_dueno_de_obra(obra_id));

create policy "roles_select_de_obra_publicada" on roles
  for select using (exists (select 1 from obras where id = obra_id and estado = 'publicada'));

create policy "roles_insert_propio" on roles
  for insert with check (public.es_dueno_de_obra(obra_id));

create policy "roles_update_propio" on roles
  for update using (public.es_dueno_de_obra(obra_id));

-- postulaciones: el talento crea y lee las suyas, pero NO puede tocar el estado
-- (columna reservada al creador). El creador de la obra las lee y las clasifica.
create policy "postulaciones_select_propia" on postulaciones
  for select using (talento_id = auth.uid());

create policy "postulaciones_select_para_creador" on postulaciones
  for select using (public.es_dueno_de_rol(rol_id));

create policy "postulaciones_insert_propia" on postulaciones
  for insert with check (talento_id = auth.uid());

-- El talento puede actualizar su propia fila, pero solo si el estado no cambia
-- (por ejemplo, para futuras columnas editables); el estado lo controla la policy siguiente.
create policy "postulaciones_update_creador_clasifica" on postulaciones
  for update
  using (public.es_dueno_de_rol(rol_id))
  with check (public.es_dueno_de_rol(rol_id));

-- descartes: solo el talento dueño lee y crea los suyos.
create policy "descartes_select_propio" on descartes
  for select using (talento_id = auth.uid());

create policy "descartes_insert_propio" on descartes
  for insert with check (talento_id = auth.uid());
