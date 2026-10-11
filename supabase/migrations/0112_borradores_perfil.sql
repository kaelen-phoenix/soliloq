-- 0112 — Borrador del alta del perfil, para retomarlo desde cualquier dispositivo (#383).
--
-- El alta pasa a ser un asistente por pasos. Lo cargado se guarda acá a medida que se avanza
-- (y el paso en que quedó), así quien abandona puede volver a entrar —desde el mismo teléfono
-- u otro— y seguir donde estaba. Las fotos ya se suben a Storage al elegirlas: el borrador
-- solo recuerda dónde quedaron.
--
-- Un borrador por persona, que solo ella ve y toca. Cuando se crea su Perfil de Talento (el
-- alta terminó) el borrador ya no sirve y se borra solo. Con la cuenta se va en cascada.

create table if not exists public.borradores_perfil (
  perfil_id uuid primary key references public.perfiles(id) on delete cascade,
  paso smallint not null default 1 check (paso between 1 and 6),
  -- Tope holgado (lo que entra en el formulario completo) para que no sea un depósito libre.
  datos jsonb not null default '{}'::jsonb check (pg_column_size(datos) <= 65536),
  actualizado_en timestamptz not null default now()
);

alter table public.borradores_perfil enable row level security;

create policy borrador_perfil_select_propio on public.borradores_perfil
  for select using (perfil_id = auth.uid());
create policy borrador_perfil_insert_propio on public.borradores_perfil
  for insert with check (perfil_id = auth.uid());
create policy borrador_perfil_update_propio on public.borradores_perfil
  for update using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy borrador_perfil_delete_propio on public.borradores_perfil
  for delete using (perfil_id = auth.uid());

revoke all on public.borradores_perfil from anon;
grant select, insert, update, delete on public.borradores_perfil to authenticated;

create or replace function public.borrar_borrador_al_completar_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from borradores_perfil where perfil_id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_borrar_borrador_perfil on public.perfiles_talento;
create trigger trg_borrar_borrador_perfil
  after insert on public.perfiles_talento
  for each row execute function public.borrar_borrador_al_completar_perfil();
