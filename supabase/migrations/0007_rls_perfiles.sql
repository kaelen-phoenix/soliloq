alter table perfiles enable row level security;
alter table perfiles_talento enable row level security;
alter table perfiles_creador enable row level security;
alter table obras_previas enable row level security;
alter table fotos_talento enable row level security;

-- perfiles: cada quien lee y actualiza solo su propia fila. La inserción la hace el trigger de auth.
create policy "perfiles_select_propio" on perfiles
  for select using (id = auth.uid());

create policy "perfiles_update_propio" on perfiles
  for update using (id = auth.uid());

-- perfiles_talento: el talento lee y edita el suyo; un creador lo lee solo si ese
-- talento se postuló a alguna de sus obras (requisito de visibilidad de la spec).
create policy "perfil_talento_select_propio" on perfiles_talento
  for select using (id = auth.uid());

create policy "perfil_talento_select_para_creador" on perfiles_talento
  for select using (public.talento_se_postulo_a_mis_obras(id));

create policy "perfil_talento_insert_propio" on perfiles_talento
  for insert with check (id = auth.uid());

create policy "perfil_talento_update_propio" on perfiles_talento
  for update using (id = auth.uid());

-- perfiles_creador: perfil público de lectura para cualquier usuario autenticado.
create policy "perfil_creador_select_publico" on perfiles_creador
  for select using (auth.uid() is not null);

create policy "perfil_creador_insert_propio" on perfiles_creador
  for insert with check (id = auth.uid());

create policy "perfil_creador_update_propio" on perfiles_creador
  for update using (id = auth.uid());

-- obras_previas: siguen la visibilidad pública del perfil de creador, pero solo el
-- dueño puede escribir.
create policy "obras_previas_select_publico" on obras_previas
  for select using (auth.uid() is not null);

create policy "obras_previas_insert_propio" on obras_previas
  for insert with check (creador_id = auth.uid());

create policy "obras_previas_delete_propio" on obras_previas
  for delete using (creador_id = auth.uid());

-- fotos_talento: mismas reglas de visibilidad que el perfil de talento.
create policy "fotos_talento_select_propio" on fotos_talento
  for select using (talento_id = auth.uid());

create policy "fotos_talento_select_para_creador" on fotos_talento
  for select using (public.talento_se_postulo_a_mis_obras(talento_id));

create policy "fotos_talento_insert_propio" on fotos_talento
  for insert with check (talento_id = auth.uid());

create policy "fotos_talento_update_propio" on fotos_talento
  for update using (talento_id = auth.uid());

create policy "fotos_talento_delete_propio" on fotos_talento
  for delete using (talento_id = auth.uid());
