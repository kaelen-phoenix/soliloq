-- Bucket de fotos de portfolio (talento) y de imagen de perfil (creador).
-- Convención de rutas: {bucket}/{user_id}/{archivo}. La carpeta raíz de cada objeto
-- es el uid del dueño, lo que permite expresar las políticas de storage.objects
-- comparando esa carpeta con auth.uid() sin tablas auxiliares.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-perfil',
  'fotos-perfil',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
