-- Convención: el primer segmento de la ruta del objeto es el uid del dueño
-- (ej. "{uid}/foto-1.jpg"), así la política compara ese segmento con auth.uid().
create policy "fotos_perfil_lectura_publica" on storage.objects
  for select using (bucket_id = 'fotos-perfil');

create policy "fotos_perfil_escritura_propia" on storage.objects
  for insert with check (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fotos_perfil_actualizacion_propia" on storage.objects
  for update using (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fotos_perfil_borrado_propio" on storage.objects
  for delete using (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
