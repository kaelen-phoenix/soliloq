-- Notificaciones push de la app nativa (#389): los teléfonos con la app, por su token de
-- Firebase Cloud Messaging (Android; iPhone cuando haya cuenta de Apple, #390). Es el
-- equivalente de `push_suscripciones` (las del navegador, 0050): el envío lo hace el servidor
-- (`enviarPush`, `src/lib/push-servidor.ts`) con el cliente service-role.
--
-- Un token es de un teléfono, no de una cuenta: si en ese teléfono se ingresa con otra cuenta,
-- el aviso tiene que dejar de llegarle a la anterior. Por eso se registra con
-- `registrar_dispositivo_push`, que se queda con la última cuenta, y no con un insert directo
-- (RLS no deja tocar la fila de otra cuenta).

create table dispositivos_push (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfiles (id) on delete cascade,
  token text not null unique check (length(token) between 20 and 4096),
  plataforma text not null check (plataforma in ('android', 'ios')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index idx_dispositivos_push_perfil on dispositivos_push (perfil_id);

alter table dispositivos_push enable row level security;

-- Cada quien ve y borra los suyos (al cerrar sesión, la app borra el de ese teléfono).
create policy "dispositivos_push_propio_select" on dispositivos_push
  for select using (perfil_id = auth.uid());

create policy "dispositivos_push_propio_delete" on dispositivos_push
  for delete using (perfil_id = auth.uid());

grant select, delete on dispositivos_push to authenticated;

/** Registra el teléfono para la cuenta que llama (la última que ingresó en él). */
create or replace function public.registrar_dispositivo_push(p_token text, p_plataforma text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'sin sesión';
  end if;
  insert into dispositivos_push (perfil_id, token, plataforma)
  values (auth.uid(), p_token, p_plataforma)
  on conflict (token) do update
    set perfil_id = excluded.perfil_id,
        plataforma = excluded.plataforma,
        actualizado_en = now();
end;
$$;

revoke all on function public.registrar_dispositivo_push(text, text) from public, anon;
grant execute on function public.registrar_dispositivo_push(text, text) to authenticated;
