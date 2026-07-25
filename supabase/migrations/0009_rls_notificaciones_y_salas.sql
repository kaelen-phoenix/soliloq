alter table notificaciones enable row level security;
alter table salas enable row level security;
alter table sala_integrantes enable row level security;
alter table mensajes enable row level security;

-- notificaciones: lectura y marcado (update) solo del destinatario. Sin policy de
-- insert: solo la crean los triggers, que corren como SECURITY DEFINER y la sortean.
create policy "notificaciones_select_propia" on notificaciones
  for select using (destinatario_id = auth.uid());

create policy "notificaciones_update_propia" on notificaciones
  for update using (destinatario_id = auth.uid());

-- salas: solo sus integrantes la ven. La usa es_integrante_de_sala (SECURITY DEFINER)
-- para no depender de una subquery directa a sala_integrantes desde esta misma policy.
create policy "salas_select_integrante" on salas
  for select using (public.es_integrante_de_sala(id));

-- sala_integrantes: un integrante ve la lista completa de integrantes de su sala.
create policy "sala_integrantes_select_propia" on sala_integrantes
  for select using (public.es_integrante_de_sala(sala_id));

-- mensajes: leer y escribir solo si se integra la sala.
create policy "mensajes_select_integrante" on mensajes
  for select using (public.es_integrante_de_sala(sala_id));

create policy "mensajes_insert_integrante" on mensajes
  for insert with check (autor_id = auth.uid() and public.es_integrante_de_sala(sala_id));
